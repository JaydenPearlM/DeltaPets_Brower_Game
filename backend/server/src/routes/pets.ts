// backend/server/src/routes/pets.ts

import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { cooldownsFromPetRow } from "../lib/cooldowns";

// Optional runaway hook (keep if you have it)
import { markRunawayIfNeeded } from "../lib/runaway";

export const petsRouter = Router();

type ElementalLine =
  | "null_element"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

type EnsureEggBody = {
  line?: string; // ignored for starters, but kept for backward compatibility
};

const BASIC_EGG_HATCH_MINUTES = 2;
const HATCH_ALLOCATION_POINTS = 7;

// -----------------------------
// Character-based starter stats
// -----------------------------
type BaseStatsTemplate = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
  base_total: number;
};

type Starter = {
  name: string;
  line: ElementalLine;
  baseStats: BaseStatsTemplate;
};

// ⚠️ Replace these baseStats with your real character templates.
// These are placeholders to show structure.
const STARTER_SPROUTS: Starter[] = [
  {
    name: "Centure",
    line: "water",
    baseStats: {
      hp: 3,
      atk: 2,
      magi: 4,
      def: 2,
      spd: 2,
      mana: 0,
      base_total: 13,
    },
  },
  {
    name: "Corona",
    line: "fire",
    baseStats: {
      hp: 3,
      atk: 5,
      magi: 1,
      def: 1,
      spd: 2,
      mana: 0,
      base_total: 12,
    },
  },
  {
    name: "Medidi",
    line: "earth",
    baseStats: {
      hp: 5,
      atk: 4,
      magi: 0,
      def: 5,
      spd: 1,
      mana: 0,
      base_total: 15,
    },
  },
  {
    name: "Breezy",
    line: "air",
    baseStats: {
      hp: 1,
      atk: 4,
      magi: 5,
      def: 1,
      spd: 4,
      mana: 0,
      base_total: 15,
    },
  },
  {
    name: "Crybit",
    line: "ice",
    baseStats: {
      hp: 3,
      atk: 2,
      magi: 3,
      def: 3,
      spd: 1,
      mana: 0,
      base_total: 12,
    },
  },
  {
    name: "Ether",
    line: "storm",
    baseStats: {
      hp: 2,
      atk: 2,
      magi: 5,
      def: 1,
      spd: 4,
      mana: 0,
      base_total: 14,
    },
  },
  {
    name: "Terra",
    line: "light",
    baseStats: {
      hp: 4,
      atk: 3,
      magi: 3,
      def: 4,
      spd: 2,
      mana: 0,
      base_total: 16,
    },
  },
  {
    name: "Mason",
    line: "shadow",
    baseStats: {
      hp: 2,
      atk: 4,
      magi: 3,
      def: 1,
      spd: 5,
      mana: 0,
      base_total: 15,
    },
  },
];

function rollStarter(): Starter {
  return STARTER_SPROUTS[Math.floor(Math.random() * STARTER_SPROUTS.length)];
}

function msUntil(iso: string | null | undefined, nowMs: number) {
  if (!iso) return 0;
  const end = Date.parse(iso);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - nowMs);
}

function hatchPayload(pet: any, serverNowMs: number) {
  const hatch_remaining_ms = msUntil(pet?.hatch_ends_at, serverNowMs);
  const ready =
    hatch_remaining_ms === 0 && pet?.stage === "egg" && !!pet?.hatch_ends_at;

  return {
    ready,
    hatch_ends_at: pet?.hatch_ends_at ?? null,
    hatch_remaining_ms,
  };
}

/**
 * You do NOT have a pet_elements table.
 * For pre-alpha we return a simple element map derived from the pet.line.
 * (Your DB has pet_element_affinities, but it needs an element lookup to map line -> element_id.)
 */
function elementMapForLine(line: ElementalLine) {
  const base: Record<ElementalLine, number> = {
    null_element: 0,
    water: 0,
    fire: 0,
    earth: 0,
    air: 0,
    ice: 0,
    storm: 0,
    light: 0,
    shadow: 0,
  };

  if (line in base) base[line] = 10;
  return base;
}

/**
 * Your pet_stats table uses base_* columns:
 * base_hp, base_atk, base_magi (or sometimes your typo base_magiuc), base_def, base_spd, base_mana, base_total
 *
 * This helper:
 * - fetches the row
 * - maps it into the shape your frontend already expects: { hp, atk, magi, def, spd, mana, base_total }
 * - supports BOTH base_magi and base_magiuc to avoid breaking your current DB if it has the typo
 */
async function fetchBaseStatsMapped(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stats")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Support typo: base_magiuc
  const baseMagi = (data as any).base_magi ?? (data as any).base_magiuc ?? 0;

  return {
    pet_id: (data as any).pet_id,
    hp: (data as any).base_hp ?? 0,
    atk: (data as any).base_atk ?? 0,
    magi: (data as any).base_Magi ?? 0,
    def: (data as any).base_def ?? 0,
    spd: (data as any).base_spd ?? 0,
    mana: (data as any).base_mana ?? 0,
    base_total: (data as any).base_total ?? 0,
  };
}

/**
 * Insert pet_stats using your base_* schema.
 * Supports BOTH base_magi and base_magiuc columns (in case your DB has the typo).
 */
async function insertBaseStats(petId: string, s: BaseStatsTemplate) {
  // Try correct column name first: base_magi
  {
    const { error } = await supabaseAdmin.from("pet_stats").insert({
      pet_id: petId,
      base_hp: s.hp,
      base_atk: s.atk,
      base_magi: s.magi,
      base_def: s.def,
      base_spd: s.spd,
      base_mana: s.mana,
      base_total: s.base_total,
    } as any);

    if (!error) return;

    // If the DB doesn't have base_magi, we fall through and try base_magiuc
    const msg = error.message?.toLowerCase?.() ?? "";
    if (!msg.includes("base_magi") && !msg.includes("column")) {
      // Some other error -> throw
      throw error;
    }
  }

  // Fallback: typo column base_magiuc
  {
    const { error } = await supabaseAdmin.from("pet_stats").insert({
      pet_id: petId,
      base_hp: s.hp,
      base_atk: s.atk,
      base_magiuc: s.magi,
      base_def: s.def,
      base_spd: s.spd,
      base_mana: s.mana,
      base_total: s.base_total,
    } as any);

    if (error) throw error;
  }
}

/**
 * Compatibility helpers:
 * - If you have pets.location, use it.
 * - Else fallback to pets.is_active.
 */
async function fetchActivePet(userId: string) {
  // Try "location = active"
  {
    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .eq("location", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) return { pet: data ?? null, used: "location" as const };
  }

  // Fallback: "is_active = true"
  {
    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { pet: data ?? null, used: "is_active" as const };
  }
}

async function fetchHatcheryEgg(userId: string) {
  // Try "location = hatchery"
  {
    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .eq("stage", "egg")
      .eq("location", "hatchery")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error) return { pet: data ?? null, used: "location" as const };
  }

  // Fallback: stage egg + has hatch timer set
  {
    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .eq("stage", "egg")
      .not("hatch_ends_at", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { pet: data ?? null, used: "hatch_ends_at" as const };
  }
}

/**
 * GET /api/pets/active
 */
petsRouter.get(
  "/active",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet } = await fetchActivePet(userId);

      if (!pet) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          pet: null,
          stats: null,
          elements: null,
          cooldowns: null,
        });
      }

      const petAfterRunaway = markRunawayIfNeeded
        ? await markRunawayIfNeeded({ supabaseAdmin, pet, serverNowMs })
        : pet;

      const stats = await fetchBaseStatsMapped(petAfterRunaway.id);
      const elements = elementMapForLine(
        (petAfterRunaway.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: petAfterRunaway,
        stats,
        elements,
        cooldowns: cooldownsFromPetRow(petAfterRunaway, serverNowMs),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

/**
 * GET /api/pets/list
 */
petsRouter.get(
  "/list",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ pets: data ?? [] });
  },
);

/**
 * GET /api/pets/hatchery
 */
petsRouter.get(
  "/hatchery",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet: egg } = await fetchHatcheryEgg(userId);

      if (!egg) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          pet: null,
          hatch: null,
          stats: null,
          elements: null,
        });
      }

      const stats = await fetchBaseStatsMapped(egg.id);
      const elements = elementMapForLine(
        (egg.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: egg,
        hatch: hatchPayload(egg, serverNowMs),
        stats,
        elements,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

/**
 * POST /api/pets/ensure-egg
 * Creates a starter egg if none exists in hatchery.
 * Base stats are CHARACTER-based (starter identity), not elemental.
 */
petsRouter.post(
  "/ensure-egg",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();
      const _body = (req.body ?? {}) as EnsureEggBody; // kept for backwards compat

      const { pet: existingEgg } = await fetchHatcheryEgg(userId);

      if (existingEgg) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          created: false,
          pet: existingEgg,
          hatch: hatchPayload(existingEgg, serverNowMs),
        });
      }

      const starter = rollStarter();

      const hatchMs = BASIC_EGG_HATCH_MINUTES * 60 * 1000;
      const hatch_ends_at = new Date(serverNowMs + hatchMs).toISOString();

      // Try insert with location=hatchery; if schema doesn't have it, fallback insert without location
      let created: any | null = null;

      {
        const { data, error } = await supabaseAdmin
          .from("pets")
          .insert({
            user_id: userId,
            name: starter.name,
            line: starter.line,
            stage: "egg",
            location: "hatchery",
            hatch_ends_at,
            unspent_points: 0,
          })
          .select("*")
          .single();

        if (!error) created = data;
      }

      if (!created) {
        const { data, error } = await supabaseAdmin
          .from("pets")
          .insert({
            user_id: userId,
            name: starter.name,
            line: starter.line,
            stage: "egg",
            hatch_ends_at,
            unspent_points: 0,
          })
          .select("*")
          .single();

        if (error) return res.status(500).json({ error: error.message });
        created = data;
      }

      // Insert CHARACTER-based base stats into pet_stats (base_* columns)
      await insertBaseStats(created.id, starter.baseStats);

      // IMPORTANT:
      // You don't have pet_elements table, so do NOT insert there.
      // For now, the hatchery endpoint derives elements from pet.line (pre-alpha safe).

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        created: true,
        pet: created,
        hatch: hatchPayload(created, serverNowMs),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

/**
 * POST /api/pets/hatch
 * Hatches oldest egg if ready.
 * Moves pet to ACTIVE if none exists, else STORAGE (if location exists).
 * If location doesn't exist, it just sets stage/unspent_points and leaves is_active untouched.
 */
petsRouter.post(
  "/hatch",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet: egg } = await fetchHatcheryEgg(userId);

      if (!egg) return res.status(404).json({ error: "No hatchery egg found" });

      const remaining = msUntil(egg.hatch_ends_at, serverNowMs);
      if (remaining > 0) {
        return res.status(409).json({
          error: "Egg is not ready yet",
          server_now: new Date(serverNowMs).toISOString(),
          hatch: hatchPayload(egg, serverNowMs),
        });
      }

      const { pet: activePet } = await fetchActivePet(userId);

      const nowIso = new Date(serverNowMs).toISOString();

      // Try update with location support
      {
        const nextLocation = activePet ? "storage" : "active";

        const { data, error } = await supabaseAdmin
          .from("pets")
          .update({
            stage: "sprout",
            location: nextLocation,
            hatched_at: nowIso,
            hatch_ends_at: null,
            unspent_points: HATCH_ALLOCATION_POINTS,
          })
          .eq("id", egg.id)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (!error) {
          return res.json({
            server_now: nowIso,
            pet: data,
            awarded_points: HATCH_ALLOCATION_POINTS,
            location: nextLocation,
          });
        }
      }

      // Fallback update (no location column)
      {
        const { data, error } = await supabaseAdmin
          .from("pets")
          .update({
            stage: "sprout",
            hatched_at: nowIso,
            hatch_ends_at: null,
            unspent_points: HATCH_ALLOCATION_POINTS,
          })
          .eq("id", egg.id)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) return res.status(500).json({ error: error.message });

        return res.json({
          server_now: nowIso,
          pet: data,
          awarded_points: HATCH_ALLOCATION_POINTS,
          location: activePet ? "storage" : "active",
        });
      }
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);
