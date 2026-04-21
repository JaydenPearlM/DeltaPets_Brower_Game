// ========================================
// routePets/routePets.ts
// Main pet creation / hatchery / active pet routes
// ========================================

import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { rollIV, sumStats } from "../../lib/stats/individualValues";
import { applyCareDecay } from "../../shared/pets/care/CareDecay";
import { generatePetDescription } from "./petDescription";
import {
  fetchActivePet,
  fetchHatcheryEgg,
  fetchHatcheryShelfSlots,
  fetchHatcherySlots,
  fetchStarterPetAnyStage,
} from "./petsRepo";

import { fetchTotalPoints, insertBaseStats } from "./petsStats";

// STARTERS needed for hatch fallback lookup + starter selection at egg creation
import {
  findStarterByName,
  STARTERS,
  getStarterForSelection,
} from "./starters";

import {
  BASIC_EGG_HATCH_MINUTES,
  HATCH_ALLOCATION_POINTS,
  type ElementalLine,
} from "./petsType";

import {
  elementMapForLine,
  hatchPayload,
  msUntil,
  rollGender,
  sumBase5,
} from "./petsUtils";

export const petsRouter = Router();

function normalizeCarePet<T extends Record<string, any>>(pet: T): T {
  return {
    ...pet,
    clean: Number(pet.clean ?? pet.cleanliness ?? 0),
    cleanliness: Number(pet.cleanliness ?? pet.clean ?? 0),
    happy: Number(pet.happy ?? pet.happiness ?? 0),
    happiness: Number(pet.happiness ?? pet.happy ?? 0),
    comfort: Number(pet.comfort ?? 0),
    rest: Number(pet.rest ?? 0),
    ran_away: Boolean(pet.ran_away ?? pet.is_runaway),
    is_runaway: Boolean(pet.is_runaway ?? pet.ran_away),
    last_care_update:
      pet.last_care_update ??
      pet.last_care_decay_at ??
      new Date().toISOString(),
    last_care_decay_at:
      pet.last_care_decay_at ??
      pet.last_care_update ??
      new Date().toISOString(),
  };
}

async function updatePetCareStats(
  petId: string,
  updates: {
    hunger: number;
    clean: number;
    happy: number;
    comfort: number;
    rest: number;
    neglect_hours: number;
    ran_away: boolean;
    runaway_at: string | null;
    last_care_update: string;
    last_care_decay_at: string;
  },
) {
  const { error } = await supabaseAdmin
    .from("pets")
    .update({
      hunger: updates.hunger,
      clean: updates.clean,
      cleanliness: updates.clean,
      happy: updates.happy,
      happiness: updates.happy,
      comfort: updates.comfort,
      rest: updates.rest,
      neglect_hours: updates.neglect_hours,
      ran_away: updates.ran_away,
      is_runaway: updates.ran_away,
      runaway_at: updates.runaway_at,
      last_care_update: updates.last_care_update,
      last_care_decay_at: updates.last_care_decay_at,
    })
    .eq("id", petId);

  if (error) throw error;
}

// ---------------------------------------------------------------
// Personality roll
// Pull the real keys directly from public.personalities
// so backend logic always matches Supabase.
// ---------------------------------------------------------------
type PersonalityRow = {
  id: string;
  key: string;
};

async function getAllPersonalities(): Promise<PersonalityRow[]> {
  const { data, error } = await supabaseAdmin
    .from("personalities")
    .select("id, key")
    .order("key", { ascending: true });

  if (error) {
    throw new Error(`Failed to load personalities: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("No personalities found in public.personalities");
  }

  return data;
}

async function rollPersonality(): Promise<PersonalityRow> {
  const personalities = await getAllPersonalities();
  const randomIndex = Math.floor(Math.random() * personalities.length);
  return personalities[randomIndex];
}

// ---------------------------------------------------------------
// Strength / weakness
// Egg rolls these ONCE and they stay with the pet forever.
// ---------------------------------------------------------------
type GrowthStatKey = "hp" | "atk" | "def" | "spd" | "magi" | "mana";

const GROWTH_STAT_KEYS: GrowthStatKey[] = [
  "hp",
  "atk",
  "def",
  "spd",
  "magi",
  "mana",
];

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function rollGrowthTraits(): {
  strongStats: GrowthStatKey[];
  weakStat: GrowthStatKey | null;
} {
  const patternRoll = Math.random();

  let strongCount = 0;
  let hasWeak = false;

  if (patternRoll < 0.2) {
    strongCount = 2;
    hasWeak = true;
  } else if (patternRoll < 0.45) {
    strongCount = 2;
    hasWeak = false;
  } else if (patternRoll < 0.7) {
    strongCount = 1;
    hasWeak = true;
  } else if (patternRoll < 0.88) {
    strongCount = 1;
    hasWeak = false;
  } else if (patternRoll < 0.96) {
    strongCount = 0;
    hasWeak = true;
  } else {
    strongCount = 0;
    hasWeak = false;
  }

  const shuffledStats = shuffleArray(GROWTH_STAT_KEYS);
  const strongStats = shuffledStats.slice(0, strongCount);

  let weakStat: GrowthStatKey | null = null;

  if (hasWeak) {
    const weakPool = GROWTH_STAT_KEYS.filter(
      (stat) => !strongStats.includes(stat),
    );
    weakStat = weakPool[Math.floor(Math.random() * weakPool.length)] ?? null;
  }

  return { strongStats, weakStat };
}

function sanitizeGrowthStrongStats(value: unknown): GrowthStatKey[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => String(entry).toLowerCase())
    .filter((entry): entry is GrowthStatKey =>
      GROWTH_STAT_KEYS.includes(entry as GrowthStatKey),
    )
    .slice(0, 2);
}

function sanitizeGrowthWeakStat(value: unknown): GrowthStatKey | null {
  if (typeof value !== "string") return null;

  const normalized = value.toLowerCase();
  return GROWTH_STAT_KEYS.includes(normalized as GrowthStatKey)
    ? (normalized as GrowthStatKey)
    : null;
}

// ---------------------------------------------------------------
// Party slot assignment
// ---------------------------------------------------------------
async function assignPetToMainParty(userId: string, petId: string) {
  const { data: existingRows, error: slotsError } = await supabaseAdmin
    .from("party_slots")
    .select("id, slot_index, pet_id")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (slotsError) throw slotsError;

  const rows = existingRows ?? [];

  const alreadyAssigned = rows.find((row: any) => row.pet_id === petId);
  if (alreadyAssigned) return Number(alreadyAssigned.slot_index);

  const usedSlots = new Set<number>(
    rows.map((row: any) => Number(row.slot_index)).filter(Number.isFinite),
  );

  const targetSlot =
    Array.from({ length: 4 }, (_, idx) => idx + 1).find(
      (slot) => !usedSlots.has(slot),
    ) ?? null;

  if (!targetSlot) return null;

  const { error: insertError } = await supabaseAdmin
    .from("party_slots")
    .insert({ user_id: userId, slot_index: targetSlot, pet_id: petId });

  if (insertError) throw insertError;
  return targetSlot;
}

// ============================================================
// GET /api/pets/active
// ============================================================
petsRouter.get(
  "/active",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet } = await fetchActivePet(userId);

      if (!pet) {
        return res.status(404).json({
          error: "No active pet found",
          server_now: new Date(serverNowMs).toISOString(),
          pet: null,
          stats: null,
          points: null,
          elements: null,
          hatch: null,
        });
      }

      const normalizedPet = normalizeCarePet(pet);
      const hydratedPet = normalizeCarePet(applyCareDecay(normalizedPet));

      const careChanged =
        hydratedPet.hunger !== normalizedPet.hunger ||
        hydratedPet.clean !== normalizedPet.clean ||
        hydratedPet.happy !== normalizedPet.happy ||
        hydratedPet.comfort !== normalizedPet.comfort ||
        hydratedPet.rest !== normalizedPet.rest ||
        hydratedPet.neglect_hours !== normalizedPet.neglect_hours ||
        hydratedPet.ran_away !== normalizedPet.ran_away ||
        hydratedPet.runaway_at !== normalizedPet.runaway_at ||
        hydratedPet.last_care_decay_at !== normalizedPet.last_care_decay_at;

      if (careChanged) {
        await updatePetCareStats(hydratedPet.id, {
          hunger: hydratedPet.hunger,
          clean: hydratedPet.clean,
          happy: hydratedPet.happy,
          comfort: hydratedPet.comfort,
          rest: hydratedPet.rest,
          neglect_hours: hydratedPet.neglect_hours,
          ran_away: hydratedPet.ran_away,
          runaway_at: hydratedPet.runaway_at ?? null,
          last_care_update: hydratedPet.last_care_update,
          last_care_decay_at: hydratedPet.last_care_decay_at,
        });
      }

      const points = await fetchTotalPoints(hydratedPet.id);
      const stats = points?.base ?? null;
      const elements = elementMapForLine(
        (hydratedPet.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        pet: hydratedPet,
        hatch:
          hydratedPet.stage === "egg"
            ? hatchPayload(hydratedPet, serverNowMs)
            : null,
        stats,
        points,
        elements,
        cooldowns: null,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

// ============================================================
// POST /api/pets/ensure-egg
// ============================================================
petsRouter.post(
  "/ensure-egg",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const requestedLine = req.body?.line ?? null;
      const worldTime = req.body?.worldTime ?? null;
      const personalityKey = req.body?.personalityKey ?? null;

      console.log("[ensure-egg] requested_line:", requestedLine);

      const existingPet = await fetchStarterPetAnyStage(userId);

      if (existingPet) {
        return res.status(200).json({
          success: true,
          existing: true,
          requested_line: requestedLine,
          resolved_line: existingPet.line ?? existingPet.element ?? null,
          pet: existingPet,
        });
      }

      const starter = getStarterForSelection({
        line: requestedLine,
        worldTime,
        personalityKey,
      });

      const resolvedLine = starter.line;
      const now = new Date();
      const hatchEndsAt = new Date(
        now.getTime() + BASIC_EGG_HATCH_MINUTES * 60 * 1000,
      ).toISOString();

      console.log("[ensure-egg] resolved_line:", resolvedLine);
      console.log("[ensure-egg] starter_species_id:", starter.speciesId);

      const { strongStats, weakStat } = rollGrowthTraits();

      console.log("[ensure-egg] growth traits locked ->", {
        speciesId: starter.speciesId,
        strongStats,
        weakStat,
      });

      const { data: insertedPet, error: insertError } = await supabaseAdmin
        .from("pets")
        .insert({
          user_id: userId,
          name: starter.eggName,
          species: starter.speciesId,
          line: resolvedLine,
          stage: "egg",
          hatch_ends_at: hatchEndsAt,
          is_active: false,
          location: "hatchery",
          personality_key: personalityKey ?? null,
          hatch_time_alignment: worldTime ?? null,
          growth_strong_stats: strongStats,
          growth_weak_stat: weakStat,
        } as any)
        .select("*")
        .single();

      if (insertError) {
        console.error("[ensure-egg] pets insert failed:", insertError);
        return res.status(500).json({ error: insertError.message });
      }

      try {
        await insertBaseStats(insertedPet.id, starter.baseStats);
      } catch (statsError: any) {
        console.error("[ensure-egg] insertBaseStats failed:", statsError);
        return res.status(500).json({
          error: statsError?.message ?? "Failed to insert base stats",
        });
      }

      return res.status(200).json({
        success: true,
        existing: false,
        requested_line: requestedLine,
        resolved_line: resolvedLine,
        starter_species_id: starter.speciesId,
        pet: insertedPet,
      });
    } catch (error: any) {
      console.error("[ensure-egg] failed:", error);
      return res.status(500).json({
        error: error?.message ?? "Failed to ensure egg",
      });
    }
  },
);

// ============================================================
// GET /api/pets/hatchery
// ============================================================
petsRouter.get(
  "/hatchery",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const [{ slots }, { shelfSlots }] = await Promise.all([
        fetchHatcherySlots(userId),
        fetchHatcheryShelfSlots(userId),
      ]);

      const slotMapper = (slot: any) => ({
        id: slot.id,
        slot_index: slot.slot_index,
        unlocked: slot.unlocked,
        pet: slot.pet
          ? {
              id: slot.pet.id,
              name: slot.pet.name ?? null,
              stage: slot.pet.stage ?? null,
              line: slot.pet.line ?? null,
              growth_strong_stats: slot.pet.growth_strong_stats ?? [],
              growth_weak_stat: slot.pet.growth_weak_stat ?? null,
            }
          : null,
        hatch:
          slot.pet && slot.pet.stage === "egg"
            ? hatchPayload(slot.pet, serverNowMs)
            : null,
      });

      const shelfMapper = (slot: any) => ({
        id: slot.id,
        slot_index: slot.slot_index,
        unlocked: slot.unlocked,
        item_key: slot.item_key,
      });

      const firstEggSlot =
        slots.find(
          (slot) =>
            slot.pet &&
            slot.pet.stage === "egg" &&
            slot.pet.hatch_ends_at != null,
        ) ?? null;

      const egg = firstEggSlot?.pet ?? null;

      if (!egg) {
        return res.json({
          server_now: new Date(serverNowMs).toISOString(),
          slots: slots.map(slotMapper),
          shelf_slots: shelfSlots.map(shelfMapper),
          pet: null,
          hatch: null,
          stats: null,
          points: null,
          elements: null,
        });
      }

      const points = await fetchTotalPoints(egg.id);
      const stats = points?.base ?? null;
      const elements = elementMapForLine(
        (egg.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        slots: slots.map(slotMapper),
        shelf_slots: shelfSlots.map(shelfMapper),
        pet: {
          id: egg.id,
          name: egg.name ?? null,
          stage: egg.stage ?? null,
          line: egg.line ?? null,
          growth_strong_stats: egg.growth_strong_stats ?? [],
          growth_weak_stat: egg.growth_weak_stat ?? null,
        },
        hatch: hatchPayload(egg, serverNowMs),
        stats,
        points,
        elements,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

// ============================================================
// POST /api/pets/hatch
// ============================================================
petsRouter.post(
  "/hatch",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet: egg } = await fetchHatcheryEgg(userId);

      if (!egg) {
        console.error("[hatch] no hatchery egg found for user:", userId);
        return res.status(404).json({ error: "No hatchery egg found" });
      }

      const remaining = msUntil(egg.hatch_ends_at, serverNowMs);

      if (remaining > 0) {
        console.warn("[hatch] egg is not ready yet");
        return res.status(409).json({
          error: "Egg is not ready yet",
          server_now: new Date(serverNowMs).toISOString(),
          hatch: hatchPayload(egg, serverNowMs),
        });
      }

      console.log(
        "[hatch] egg found -> line=%s, ready=%s",
        (egg as any).line ?? "unknown",
        true,
      );

      const starter =
        STARTERS.find((s) => s.speciesId === egg.species) ??
        findStarterByName(egg.name) ??
        STARTERS.find((s) => s.line === (egg as any).line) ??
        null;

      if (!starter) {
        console.error(
          `[hatch] could not resolve starter for egg line: ${(egg as any).line ?? "unknown"}`,
        );
        return res.status(500).json({
          error: `Could not resolve starter for egg (line: ${(egg as any).line ?? "unknown"})`,
        });
      }

      console.log("[hatch] starter resolved -> %s", starter.hatchlingName);

      const existingPoints = await fetchTotalPoints(egg.id);

      if (!existingPoints?.base) {
        await insertBaseStats(egg.id, starter.baseStats);
      }

      const { data: baseRaw, error: baseRawErr } = await supabaseAdmin
        .from("pet_stats")
        .select(
          "pet_id, base_hp, base_atk, base_magi, base_def, base_spd, base_mana, base_total",
        )
        .eq("pet_id", egg.id)
        .maybeSingle();

      if (baseRawErr) {
        console.error("[hatch] pet_stats select failed:", baseRawErr);
        return res.status(500).json({ error: baseRawErr.message });
      }

      if (!baseRaw) {
        console.error(
          "[hatch] missing pet_stats row after ensure for pet:",
          egg.id,
        );
        return res
          .status(500)
          .json({ error: "Missing pet_stats row after ensure." });
      }

      const baseSum = sumBase5({
        base_hp: (baseRaw as any).base_hp,
        base_atk: (baseRaw as any).base_atk,
        base_def: (baseRaw as any).base_def,
        base_spd: (baseRaw as any).base_spd,
        base_magi: (baseRaw as any).base_magi,
        base_mana: (baseRaw as any).base_mana,
      });

      if (baseSum !== 10) {
        console.warn("[hatch] baseSum was not 10, repairing base stats");

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

        if (fixErr) {
          console.error("[hatch] pet_stats repair failed:", fixErr);
          return res.status(500).json({ error: fixErr.message });
        }

        (baseRaw as any).base_hp = starter.baseStats.hp;
        (baseRaw as any).base_atk = starter.baseStats.atk;
        (baseRaw as any).base_def = starter.baseStats.def;
        (baseRaw as any).base_spd = starter.baseStats.spd;
        (baseRaw as any).base_magi = starter.baseStats.magi;
        (baseRaw as any).base_mana = starter.baseStats.mana ?? 0;
        (baseRaw as any).base_total = 10;
      }

      console.log("[hatch] base stats loaded -> total=%s", 10);

      const iv = rollIV(HATCH_ALLOCATION_POINTS);

      if (sumStats(iv) !== HATCH_ALLOCATION_POINTS) {
        console.error("[hatch] IV generation failed integrity check:", iv);
        throw new Error("IV generation failed integrity check");
      }

      const { error: ivUpsertErr } = await supabaseAdmin
        .from("pet_stat_allocations")
        .upsert(
          {
            pet_id: egg.id,
            level: 1,
            hp: iv.hp,
            atk: iv.atk,
            def: iv.def,
            spd: iv.spd,
            magi: iv.magi,
            mana: iv.mana,
          } as any,
          { onConflict: "pet_id,level" },
        );

      if (ivUpsertErr) {
        console.error(
          "[hatch] pet_stat_allocations upsert failed:",
          ivUpsertErr,
        );
        return res.status(500).json({ error: ivUpsertErr.message });
      }

      const ivTotal = sumStats(iv);

      console.log("[hatch] hatch bonus rolled -> total=%s", ivTotal);
      console.log("[hatch] final level 1 stats -> total=%s", 10 + ivTotal);

      const baseHp = Number((baseRaw as any).base_hp ?? 0);
      const baseAtk = Number((baseRaw as any).base_atk ?? 0);
      const baseDef = Number((baseRaw as any).base_def ?? 0);
      const baseSpd = Number((baseRaw as any).base_spd ?? 0);
      const baseMagi = Number((baseRaw as any).base_magi ?? 0);
      const baseMana = Number((baseRaw as any).base_mana ?? 0);

      const totalHp = baseHp + iv.hp;
      const totalAtk = baseAtk + iv.atk;
      const totalDef = baseDef + iv.def;
      const totalSpd = baseSpd + iv.spd;
      const totalMagi = baseMagi + iv.magi;
      const totalMana = baseMana + iv.mana;
      const hpMax = Math.max(1, totalHp * 2);

      const nowIso = new Date(serverNowMs).toISOString();

      const gender = rollGender();

      let personalityId = egg.personality_id ?? null;
      let personalityKey = egg.personality_key ?? null;

      if (personalityId) {
        if (!personalityKey) {
          const { data: personalityRow, error: personalityRowError } =
            await supabaseAdmin
              .from("personalities")
              .select("id, key")
              .eq("id", personalityId)
              .maybeSingle();

          if (personalityRowError) {
            console.error(
              "[hatch] failed to backfill personality key from personality_id:",
              personalityRowError,
            );
            return res.status(500).json({ error: personalityRowError.message });
          }

          if (!personalityRow?.key) {
            console.error(
              "[hatch] personality_id exists on egg but no matching personality row found:",
              personalityId,
            );
            return res.status(500).json({
              error: `Missing personalities row for id "${personalityId}"`,
            });
          }

          personalityKey = personalityRow.key;
        }
      } else {
        personalityKey = rollPersonality();
        personalityId = await resolvePersonalityId(personalityKey);
      }

      // -----------------------------
      // preserve egg strengths / weakness
      // egg is the source of truth
      // fallback roll only for older eggs with missing saved traits
      // -----------------------------
      const savedStrongStats = sanitizeGrowthStrongStats(
        (egg as any).growth_strong_stats,
      );

      const savedWeakStat = sanitizeGrowthWeakStat(
        (egg as any).growth_weak_stat,
      );

      const fallbackTraits =
        savedStrongStats.length > 0 || savedWeakStat
          ? null
          : rollGrowthTraits();

      const strengths =
        savedStrongStats.length > 0
          ? savedStrongStats
          : (fallbackTraits?.strongStats ?? []);

      const weakness = savedWeakStat ?? fallbackTraits?.weakStat ?? null;

      console.log("[hatch] growth traits ->", {
        pet_id: egg.id,
        egg_growth_strong_stats: (egg as any).growth_strong_stats ?? null,
        egg_growth_weak_stat: (egg as any).growth_weak_stat ?? null,
        savedStrengths: savedStrongStats,
        savedWeakness: savedWeakStat,
        fallbackTraits,
        finalStrengths: strengths,
        finalWeakness: weakness,
      });

      // -----------------------------
      // build description
      // -----------------------------
      const description = generatePetDescription({
        species: starter.hatchlingName,
        name: starter.hatchlingName,
        nickname: null,
        stage: "hatchling",
        element: (egg as any).line ?? starter.line ?? null,
        personality_name: personalityKey,
        strengths,
        weakness,
      });

      const hatchTimeAlignment = (egg as any).hatch_time_alignment ?? null;

      const petUpdatePayload: Record<string, any> = {
        name: starter.hatchlingName,
        stage: "hatchling",
        hatched_at: nowIso,
        hatch_ends_at: null,
        unspent_points: 0,
        is_active: false,
        location: "storage",
        gender,

        atk: totalAtk,
        def: totalDef,
        spd: totalSpd,
        magi: totalMagi,
        mana: totalMana,
        hp_max: hpMax,
        hp_cur: hpMax,

        // full care on hatch
        hunger: 50,
        clean: 50,
        cleanliness: 50,
        happy: 50,
        happiness: 50,
        comfort: 50,
        rest: 50,
        energy: 50,
        bond: 0,
        neglect_hours: 0,
        ran_away: false,
        is_runaway: false,
        runaway_at: null,
        last_care_update: nowIso,
        last_care_decay_at: nowIso,

        description,
        hatch_time_alignment: hatchTimeAlignment,
        growth_strong_stats: strengths,
        growth_weak_stat: weakness,
      };

      if (!egg.personality_id && personalityId) {
        petUpdatePayload.personality_id = personalityId;
      }

      if (
        (!egg.personality_key || egg.personality_key !== personalityKey) &&
        personalityKey
      ) {
        petUpdatePayload.personality_key = personalityKey;
      }

      const { data: hatched, error: hatchUpdateError } = await supabaseAdmin
        .from("pets")
        .update(petUpdatePayload)
        .eq("id", egg.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (hatchUpdateError) {
        console.error("[hatch] pets update failed:", hatchUpdateError);
        return res.status(500).json({ error: hatchUpdateError.message });
      }

      console.log("[hatch] pet updated -> stage=hatchling");

      const assignedPartySlot = await assignPetToMainParty(userId, egg.id);

      console.log(
        "[hatch] party slot assigned -> %s",
        assignedPartySlot ?? "none",
      );

      let finalLocation: "active" | "storage" = "storage";
      let finalIsActive = false;
      let postHatchDestination: string | null = null;
      let storageResult: "party" | "storage" = "storage";

      if (assignedPartySlot) {
        const { error: activateErr } = await supabaseAdmin
          .from("pets")
          .update({ location: "active", is_active: true } as any)
          .eq("id", egg.id)
          .eq("user_id", userId);

        if (activateErr) {
          console.error("[hatch] activate pet failed:", activateErr);
          return res.status(500).json({ error: activateErr.message });
        }

        finalLocation = "active";
        finalIsActive = true;
        storageResult = "party";
        postHatchDestination = "/pet";
      } else {
        const { error: storeErr } = await supabaseAdmin
          .from("pets")
          .update({ location: "storage", is_active: false } as any)
          .eq("id", egg.id)
          .eq("user_id", userId);

        if (storeErr) {
          console.error("[hatch] store pet failed:", storeErr);
          return res.status(500).json({ error: storeErr.message });
        }

        finalLocation = "storage";
        finalIsActive = false;
        storageResult = "storage";
        postHatchDestination = null;
      }

      const points = await fetchTotalPoints(egg.id);

      console.log(
        "[hatch] destination -> %s",
        postHatchDestination ?? "storage",
      );
      console.log("[hatch] success");

      return res.json({
        server_now: nowIso,
        pet: {
          ...hatched,
          name: starter.hatchlingName,
          location: finalLocation,
          is_active: finalIsActive,
          description,
        },
        awarded_points: HATCH_ALLOCATION_POINTS,
        iv,
        points,
        gender,
        personality_key: personalityKey,
        personality_id: personalityId,
        party_slot_assigned: assignedPartySlot,
        post_hatch_destination: postHatchDestination,
        storage_result: storageResult,
        is_mystery_starter_hatch: true,
        starter_species_id: starter.speciesId,
      });
    } catch (e: any) {
      console.error("[POST /api/pets/hatch] crash:", e);
      return res.status(500).json({
        error: e?.message ?? "Server error",
      });
    }
  },
);

export default petsRouter;
