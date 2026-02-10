// backend/server/src/routes/pets.ts

import { Router } from "express";
import type { Response } from "express";
import { randomInt as cryptoRandomInt } from "crypto";

import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { cooldownsFromPetRow } from "../lib/cooldowns";
import { markRunawayIfNeeded } from "../lib/runaway";
import { syncPetDerivedStats } from "../lib/syncPetDerivedStats";

// ✅ IV helpers
import { rollIV, sumStats } from "../lib/stats/individualValues";

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
  const n = STARTER_SPROUTS.length;
  const idx = n > 0 ? cryptoRandomInt(n) : 0;
  return STARTER_SPROUTS[idx] ?? STARTER_SPROUTS[0];
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

// ✅ NEW helpers: verify base stats sum to 10 before hatch applies IV
function sumBase5(b: {
  base_hp?: number | null;
  base_atk?: number | null;
  base_def?: number | null;
  base_spd?: number | null;
  base_magi?: number | null;
}) {
  return (
    (b.base_hp ?? 0) +
    (b.base_atk ?? 0) +
    (b.base_def ?? 0) +
    (b.base_spd ?? 0) +
    (b.base_magi ?? 0)
  );
}

function findStarterByName(name: string | null | undefined) {
  const n = (name ?? "").trim().toLowerCase();
  return STARTER_SPROUTS.find((s) => s.name.toLowerCase() === n) ?? null;
}

// -----------------------------
// Stats helpers (MATCH YOUR DB)
// -----------------------------
async function fetchBaseStatsMapped(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stats")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    pet_id: (data as any).pet_id,
    hp: (data as any).base_hp ?? 0,
    atk: (data as any).base_atk ?? 0,
    magi: (data as any).base_magi ?? 0,
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
    base_magi: s.magi,
    base_def: s.def,
    base_spd: s.spd,
    base_mana: s.mana,
    base_total: s.base_total,
  } as any);

  if (error) throw error;
}

/**
 * ✅ IMPORTANT:
 * ignore allocations with level <= 1
 */
async function fetchAllocTotals(petId: string) {
  const { data, error } = await supabaseAdmin
    .from("pet_stat_allocations")
    .select("level, hp, atk, magi, def, spd")
    .eq("pet_id", petId)
    .gt("level", 1);

  if (error) throw error;

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, r: any) => {
      acc.hp += r.hp ?? 0;
      acc.atk += r.atk ?? 0;
      acc.magi += r.magi ?? 0;
      acc.def += r.def ?? 0;
      acc.spd += r.spd ?? 0;
      return acc;
    },
    { hp: 0, atk: 0, magi: 0, def: 0, spd: 0 },
  );

  return totals;
}

async function fetchTotalPoints(petId: string) {
  const base = await fetchBaseStatsMapped(petId);
  const alloc = await fetchAllocTotals(petId);

  if (!base) return null;

  const total = {
    hp: (base.hp ?? 0) + alloc.hp,
    atk: (base.atk ?? 0) + alloc.atk,
    magi: (base.magi ?? 0) + alloc.magi,
    def: (base.def ?? 0) + alloc.def,
    spd: (base.spd ?? 0) + alloc.spd,
    mana: base.mana ?? 0,
  };

  const total_points =
    total.hp +
    total.atk +
    total.magi +
    total.def +
    total.spd +
    (total.mana ?? 0);

  return { base, alloc, total, total_points };
}

// -----------------------------
// Active pet + hatchery egg
// -----------------------------
async function fetchActivePet(userId: string) {
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
          points: null,
          elements: null,
          cooldowns: null,
        });
      }

      const petAfterRunaway = markRunawayIfNeeded
        ? await markRunawayIfNeeded({ supabaseAdmin, pet, serverNowMs })
        : pet;

      const baseStats = await fetchBaseStatsMapped(petAfterRunaway.id);
      const points = await fetchTotalPoints(petAfterRunaway.id);

      const elements = elementMapForLine(
        (petAfterRunaway.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: petAfterRunaway,
        stats: baseStats,
        points,
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
          points: null,
          elements: null,
        });
      }

      const baseStats = await fetchBaseStatsMapped(egg.id);
      const points = await fetchTotalPoints(egg.id);

      const elements = elementMapForLine(
        (egg.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: egg,
        hatch: hatchPayload(egg, serverNowMs),
        stats: baseStats,
        points,
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
          is_active: false,
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

      await supabaseAdmin
        .from("pets")
        .update({ is_active: false } as any)
        .eq("user_id", userId)
        .eq("is_active", true);

      const baseRowMapped = await fetchBaseStatsMapped(egg.id);
      if (!baseRowMapped) {
        const starterFallback = STARTER_SPROUTS.find(
          (s) => s.name === (egg.name ?? ""),
        )?.baseStats;

        const baseForEgg: BaseStatsTemplate = starterFallback ?? {
          hp: 2,
          atk: 2,
          magi: 2,
          def: 2,
          spd: 2,
          mana: 0,
          base_total: 10,
        };

        await insertBaseStats(egg.id, baseForEgg);
      }

      const { data: baseRaw, error: baseRawErr } = await supabaseAdmin
        .from("pet_stats")
        .select(
          "pet_id, base_hp, base_atk, base_magi, base_def, base_spd, base_mana, base_total",
        )
        .eq("pet_id", egg.id)
        .maybeSingle();

      if (baseRawErr)
        return res.status(500).json({ error: baseRawErr.message });
      if (!baseRaw)
        return res
          .status(500)
          .json({ error: "Missing pet_stats row after ensure." });

      // ✅ GUARDRAIL: base must be exactly 10 before we add IV
      const baseSum = sumBase5({
        base_hp: (baseRaw as any).base_hp,
        base_atk: (baseRaw as any).base_atk,
        base_def: (baseRaw as any).base_def,
        base_spd: (baseRaw as any).base_spd,
        base_magi: (baseRaw as any).base_magi,
      });

      if (baseSum !== 10) {
        const starter = findStarterByName(egg.name);
        if (starter) {
          const { error: fixErr } = await supabaseAdmin
            .from("pet_stats")
            .update({
              base_hp: starter.baseStats.hp,
              base_atk: starter.baseStats.atk,
              base_def: starter.baseStats.def,
              base_spd: starter.baseStats.spd,
              base_magi: starter.baseStats.magi,
              base_mana: starter.baseStats.mana ?? 0,
              base_total: 10,
            } as any)
            .eq("pet_id", egg.id);

          if (fixErr) return res.status(500).json({ error: fixErr.message });

          (baseRaw as any).base_hp = starter.baseStats.hp;
          (baseRaw as any).base_atk = starter.baseStats.atk;
          (baseRaw as any).base_def = starter.baseStats.def;
          (baseRaw as any).base_spd = starter.baseStats.spd;
          (baseRaw as any).base_magi = starter.baseStats.magi;
          (baseRaw as any).base_total = 10;
        } else {
          console.warn("[hatch] baseSum != 10 but no starter match", {
            petId: egg.id,
            name: egg.name,
            baseSum,
          });
        }
      }

      await supabaseAdmin
        .from("pet_stat_allocations")
        .delete()
        .eq("pet_id", egg.id)
        .eq("level", 1);

      const iv = rollIV(HATCH_ALLOCATION_POINTS);
      if (sumStats(iv) !== HATCH_ALLOCATION_POINTS) {
        throw new Error("IV generation failed integrity check");
      }

      const nextBase = {
        base_hp: ((baseRaw as any).base_hp ?? 0) + iv.hp,
        base_atk: ((baseRaw as any).base_atk ?? 0) + iv.atk,
        base_def: ((baseRaw as any).base_def ?? 0) + iv.def,
        base_spd: ((baseRaw as any).base_spd ?? 0) + iv.spd,
        base_magi: ((baseRaw as any).base_magi ?? 0) + iv.magi,
        base_mana: (baseRaw as any).base_mana ?? 0,
        base_total: 10 + HATCH_ALLOCATION_POINTS, // ✅ force 17
      };

      const { error: baseUpdateErr } = await supabaseAdmin
        .from("pet_stats")
        .update(nextBase as any)
        .eq("pet_id", egg.id);

      if (baseUpdateErr)
        return res.status(500).json({ error: baseUpdateErr.message });

      const nowIso = new Date(serverNowMs).toISOString();

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

      await syncPetDerivedStats(egg.id, { refillHp: true });

      const points = await fetchTotalPoints(egg.id);

      return res.json({
        server_now: nowIso,
        pet: hatched,
        awarded_points: HATCH_ALLOCATION_POINTS,
        iv,
        points,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);
