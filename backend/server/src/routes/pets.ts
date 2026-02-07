// backend/server/src/routes/pets.ts

import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { cooldownsFromPetRow } from "../lib/cooldowns";
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
  line?: string; // ignored for now, kept for compatibility
};

const BASIC_EGG_HATCH_MINUTES = 2;
const HATCH_ALLOCATION_POINTS = 7;

type BaseStatsTemplate = {
  hp: number;
  atk: number;
  magi: number; // maps to DB column base_magi
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

// Egg base stats must total 10
const STARTER_SPROUTS: Starter[] = [
  {
    name: "Centure",
    line: "water",
    baseStats: {
      hp: 2,
      atk: 1,
      magi: 3,
      def: 2,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Corona",
    line: "fire",
    baseStats: {
      hp: 2,
      atk: 3,
      magi: 1,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Medidi",
    line: "earth",
    baseStats: {
      hp: 3,
      atk: 2,
      magi: 0,
      def: 3,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Breezy",
    line: "air",
    baseStats: {
      hp: 1,
      atk: 2,
      magi: 3,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Crybit",
    line: "ice",
    baseStats: {
      hp: 2,
      atk: 1,
      magi: 2,
      def: 3,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Ether",
    line: "storm",
    baseStats: {
      hp: 1,
      atk: 1,
      magi: 4,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Terra",
    line: "light",
    baseStats: {
      hp: 2,
      atk: 2,
      magi: 2,
      def: 2,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Mason",
    line: "shadow",
    baseStats: {
      hp: 2,
      atk: 3,
      magi: 2,
      def: 1,
      spd: 2,
      mana: 0,
      base_total: 10,
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

function elementMapForLine(_line: ElementalLine) {
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
  return base;
}

// -----------------------------
// Stats helpers (MATCH YOUR DB)
// pet_stats columns: base_hp, base_atk, , base_def, base_spd, base_mana, base_total
// -----------------------------
async function fetchBaseStatsMapped(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stats")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const baseMagi =
    (data as any).base_magi ??
    // keep compatibility with older typos just in case
    (data as any).base_magi ??
    (data as any).base_magi ??
    0;

  return {
    pet_id: (data as any).pet_id,
    hp: (data as any).base_hp ?? 0,
    atk: (data as any).base_atk ?? 0,
    magi: baseMagi,
    def: (data as any).base_def ?? 0,
    spd: (data as any).base_spd ?? 0,
    mana: (data as any).base_mana ?? 0,
    base_total: (data as any).base_total ?? 0,
  };
}

async function insertBaseStats(petId: string, s: BaseStatsTemplate) {
  const { error } = await supabaseAdmin.from("pet_stats").insert({
    pet_id: petId,
    base_hp: s.hp,
    base_atk: s.atk,
    base_magi: s.magi, // ✅ correct DB column
    base_def: s.def,
    base_spd: s.spd,
    base_mana: s.mana,
    base_total: s.base_total,
  } as any);

  if (error) throw error;
}

async function updateBaseStats(petId: string, s: BaseStatsTemplate) {
  const { error } = await supabaseAdmin
    .from("pet_stats")
    .update({
      base_hp: s.hp,
      base_atk: s.atk,
      base_magi: s.magi, // ✅ correct DB column
      base_def: s.def,
      base_spd: s.spd,
      base_mana: s.mana,
      base_total: s.base_total,
    } as any)
    .eq("pet_id", petId);

  if (error) throw error;
}

function computeBaseTotal(
  s: Pick<BaseStatsTemplate, "hp" | "atk" | "magi" | "def" | "spd" | "mana">,
) {
  return (
    (s.hp ?? 0) +
    (s.atk ?? 0) +
    (s.magi ?? 0) +
    (s.def ?? 0) +
    (s.spd ?? 0) +
    (s.mana ?? 0)
  );
}

function allocateRandomHatchPoints(
  base: BaseStatsTemplate,
  points: number,
): BaseStatsTemplate {
  const out: BaseStatsTemplate = { ...base };
  const keys: Array<
    keyof Pick<BaseStatsTemplate, "hp" | "atk" | "magi" | "def" | "spd">
  > = ["hp", "atk", "magi", "def", "spd"];

  for (let i = 0; i < points; i++) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    (out as any)[k] = ((out as any)[k] ?? 0) + 1;
  }

  out.base_total = computeBaseTotal(out);
  return out;
}

// -----------------------------
// Active pet + hatchery egg (MATCH YOUR DB)
// -----------------------------
async function fetchActivePet(userId: string) {
  // Primary: is_active = true (because your pets table has it)
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
    if (data) return { pet: data, used: "is_active" as const };
  }

  // Fallback: newest non-egg pet (prevents pet:null softlock)
  {
    const { data, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .neq("stage", "egg")
      .order("hatched_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { pet: data ?? null, used: "newest_non_egg" as const };
  }
}

async function fetchHatcheryEgg(userId: string) {
  // Your DB has hatch_ends_at, so use that.
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

// -----------------------------
// Routes
// -----------------------------
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

petsRouter.get(
  "/list",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from("pets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ pets: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

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

petsRouter.post(
  "/ensure-egg",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();
      const _body = (req.body ?? {}) as EnsureEggBody;

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

      const { data: created, error } = await supabaseAdmin
        .from("pets")
        .insert({
          user_id: userId,
          name: starter.name,
          line: starter.line,
          stage: "egg",
          hatch_ends_at,
          unspent_points: 0,
          is_active: false, // eggs should not be active
        } as any)
        .select("*")
        .single();

      if (error) return res.status(500).json({ error: error.message });

      await insertBaseStats(created.id, starter.baseStats);

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

      // Deactivate any existing active pet (your DB supports is_active)
      await supabaseAdmin
        .from("pets")
        .update({ is_active: false } as any)
        .eq("user_id", userId)
        .eq("is_active", true);

      // Base stats + hatch points
      const existingBase = await fetchBaseStatsMapped(egg.id);
      const starterFallback = STARTER_SPROUTS.find(
        (s) => s.name === (egg.name ?? ""),
      )?.baseStats;

      const baseForHatch: BaseStatsTemplate = {
        hp: existingBase?.hp ?? starterFallback?.hp ?? 2,
        atk: existingBase?.atk ?? starterFallback?.atk ?? 2,
        magi: existingBase?.magi ?? starterFallback?.magi ?? 2,
        def: existingBase?.def ?? starterFallback?.def ?? 2,
        spd: existingBase?.spd ?? starterFallback?.spd ?? 2,
        mana: existingBase?.mana ?? starterFallback?.mana ?? 0,
        base_total:
          existingBase?.base_total ??
          starterFallback?.base_total ??
          computeBaseTotal({
            hp: existingBase?.hp ?? starterFallback?.hp ?? 2,
            atk: existingBase?.atk ?? starterFallback?.atk ?? 2,
            magi: existingBase?.magi ?? starterFallback?.magi ?? 2,
            def: existingBase?.def ?? starterFallback?.def ?? 2,
            spd: existingBase?.spd ?? starterFallback?.spd ?? 2,
            mana: existingBase?.mana ?? starterFallback?.mana ?? 0,
          }),
      };

      const hatchedStats = allocateRandomHatchPoints(
        baseForHatch,
        HATCH_ALLOCATION_POINTS,
      );

      if (existingBase) await updateBaseStats(egg.id, hatchedStats);
      else await insertBaseStats(egg.id, hatchedStats);

      const nowIso = new Date(serverNowMs).toISOString();

      // Hatch the egg into the active pet (no "location" in your DB)
      const { data: hatched, error } = await supabaseAdmin
        .from("pets")
        .update({
          stage: "baby",
          hatched_at: nowIso,
          hatch_ends_at: null,
          unspent_points: 0,
          is_active: true,
        } as any)
        .eq("id", egg.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.json({
        server_now: nowIso,
        pet: hatched,
        awarded_points: HATCH_ALLOCATION_POINTS,
        stats: hatchedStats,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);
