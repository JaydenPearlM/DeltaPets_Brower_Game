// ========================================
// routePets/routePets.ts
// Main pet creation / hatchery / active pet routes
// ========================================

import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { validateBody } from "../../middleware/validateRequest";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { rollIV, sumStats } from "../../lib/stats/individualValues";
import { applyCareDecay } from "../../shared/pets/care/CareDecay";
import { generatePetDescription } from "./petDescription";
import {
  fetchActivePet,
  fetchHatcheryEgg,
  fetchHatcherySlotGroups,
  fetchStarterPetAnyStage,
  releaseHatcherySlotsForPets,
} from "./petsRepo";
import {
  rollGrowthTraits,
  sanitizeGrowthStrongStats,
  sanitizeGrowthWeakStat,
} from "../../pets/growthTraits";
import { rollPersonality, getAllPersonalities } from "../../pets/personalities";
import { assignPetToMainParty } from "../../pets/partySlots";
import { logger } from "../../lib/logger";
import {
  fetchBaseStatsMapped,
  fetchTotalPoints,
  insertBaseStats,
} from "./petsStats";

import {
  findStarterByName,
  STARTERS,
  getStarterForSelection,
} from "./starters";

import {
  findNonStarterSpeciesByEggName,
  findNonStarterSpeciesById,
} from "../../shared/pets/species/all-species";
import { getWorldTimeOfDay } from "../../lib/deltaTime";

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

import {
  normalizePetForClient,
  updatePetCareStats,
} from "../../lib/petCareHelpers";

import { ensureEggSchema } from "../../lib/validation";
import { randomInt as cryptoRandomInt } from "node:crypto";

type HatchBaseRow = {
  pet_id: string;
  base_hp: number;
  base_atk: number;
  base_magi: number;
  base_def: number;
  base_spd: number;
  base_mana: number;
  base_total: number;
};

type EggRow = {
  id: string;
  user_id: string;
  name: string;
  species?: string;
  line?: ElementalLine | string | null;
  stage: string;
  hatch_ends_at?: string | null;
  personality_id?: string | null;
  personality_key?: string | null;
  passive_trait_id?: string | null;
  passive_trait_key?: string | null;
  growth_strong_stats?: string[] | null;
  growth_weak_stat?: string | null;
  hatch_time_alignment?: string | null;
  [key: string]: unknown;
};

type PetInsertPayload = {
  user_id: string;
  name: string;
  species?: string;
  line: ElementalLine;
  stage: string;
  energy: number;
  hatch_ends_at: string;
  is_active: boolean;
  location: string;
  personality_key?: string | null;
  passive_trait_id?: string | null;
  passive_trait_key?: string | null;
  hatch_time_alignment?: string | null;
  growth_strong_stats?: string[] | null;
  mutation_capacity?: number;
  growth_weak_stat?: string | null;
};

type HatchAllocationPayload = {
  pet_id: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number;
};

type PetLocationUpdatePayload = {
  location: string;
  is_active: boolean;
};

type AliuneHatchSignal = {
  condition: string | null;
  corruption: string | null;
};

const HATCH_CORRUPTION_ROLL_MAX = 1000;
const LOW_CORRUPTION_EGG_LOSS_CHANCE = 100; // 10%
const RISING_CORRUPTION_EGG_LOSS_CHANCE = 250; // 25%, tune later
const HIGH_CORRUPTION_EGG_LOSS_CHANCE = 650; // 65%, tune later
const TOO_HIGH_CORRUPTION_EGG_LOSS_CHANCE = 900; // 90%, tune later

function isMysteryEggProtected(egg: EggRow): boolean {
  const eggName = String(egg.name ?? "").toLowerCase();

  if (eggName.includes("mystery")) {
    return true;
  }

  // Alpha safety:
  // The first "Mystery Egg" can become a starter species like Shadow Solen.
  // Backend may store that egg as the starter egg name instead of literally "Mystery Egg".
  return Boolean(
    egg.species &&
    STARTERS.some((starter) => starter.speciesId === egg.species),
  );
}

async function fetchCurrentAliuneHatchSignal(
  nowIso: string,
): Promise<AliuneHatchSignal> {
  const { data, error } = await supabaseAdmin
    .from("aliune_signal_reports")
    .select("condition, corruption, starts_at, ends_at, created_at")
    .eq("enabled", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn(
      "[hatch] failed to read Aliune Signal; hatch continues safely",
      {
        error: error.message,
      },
    );

    return {
      condition: "stable",
      corruption: "none",
    };
  }

  return {
    condition: data?.condition ?? "stable",
    corruption: data?.corruption ?? "none",
  };
}

function getEggLossChancePermille(signal: AliuneHatchSignal): number {
  const condition = String(signal.condition ?? "stable").toLowerCase();
  const corruption = String(signal.corruption ?? "none").toLowerCase();

  const riskyCondition = condition === "unstable" || condition === "unbalanced";

  if (!riskyCondition) return 0;

  if (corruption === "low") {
    return LOW_CORRUPTION_EGG_LOSS_CHANCE;
  }

  if (corruption === "rising") {
    return RISING_CORRUPTION_EGG_LOSS_CHANCE;
  }

  if (corruption === "high") {
    return HIGH_CORRUPTION_EGG_LOSS_CHANCE;
  }

  if (corruption === "too high" || corruption === "too_high") {
    return TOO_HIGH_CORRUPTION_EGG_LOSS_CHANCE;
  }

  return 0;
}

async function hydrateHatchedPassiveTrait(pet: Record<string, any>) {
  if (!pet?.passive_trait_id && !pet?.passive_trait_key) return pet;

  let query = supabaseAdmin
    .from("passive_traits")
    .select("id,key,name,rarity,description,effect_summary,effects,stat_key")
    .eq("is_active", true);

  if (pet.passive_trait_id) {
    query = query.eq("id", pet.passive_trait_id);
  } else {
    query = query.eq("key", pet.passive_trait_key);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) return pet;

  return {
    ...pet,
    passive_trait_id: data.id,
    passive_trait_key: data.key,
    passive_trait_name: data.name,
    passive_trait_rarity: data.rarity,
    passive_trait_description: data.description,
    passive_trait_effect_summary: data.effect_summary,
    passive_trait_effects: data.effects,
    passive_trait_stat_key: data.stat_key,
  };
}

async function rollPassiveTrait() {
  const { data, error } = await supabaseAdmin
    .from("passive_traits")
    .select("id,key")
    .eq("is_active", true);

  if (error || !data?.length) return null;

  return data[cryptoRandomInt(0, data.length)];
}

export const petsRouter = Router();

petsRouter.patch(
  "/:petId/nickname",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const petId = req.params.petId;
      const nickname = String(req.body?.nickname ?? "").trim();

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          petId,
        )
      ) {
        return res.status(400).json({ error: "Invalid pet id." });
      }

      if (!nickname) {
        return res.status(400).json({ error: "Nickname is required." });
      }

      if (nickname.length > 24) {
        return res.status(400).json({
          error: "Nickname must be 24 characters or less.",
        });
      }

      const { data, error } = await supabaseAdmin
        .from("pets")
        .update({ nickname })
        .eq("id", petId)
        .eq("user_id", userId)
        .is("nickname", null)
        .select("id, nickname")
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(409).json({
          error: "This Delta's nickname is already locked.",
        });
      }

      return res.json({
        message: `Nickname locked in as ${data.nickname}.`,
        pet: data,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message ?? "Failed to save nickname.",
      });
    }
  },
);

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

      const normalizedPet = normalizePetForClient(pet);
      const hydratedPet = normalizePetForClient(applyCareDecay(normalizedPet));

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
          energy: hydratedPet.energy,
          neglect_hours: hydratedPet.neglect_hours,
          ran_away: hydratedPet.ran_away,
          runaway_at: hydratedPet.runaway_at ?? null,
          last_care_update: hydratedPet.last_care_update,
          last_care_decay_at: hydratedPet.last_care_decay_at,
        });
      }

      const points = await fetchTotalPoints(hydratedPet.id);
      const stats = points?.base ?? null;
      const elements = elementMapForLine(hydratedPet.line ?? null);

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
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? "Server error" });
    }
  },
);

// ============================================================
// POST /api/pets/ensure-egg
// ============================================================
petsRouter.post(
  "/ensure-egg",
  requireUser,
  validateBody(ensureEggSchema),
  async (req: AuthedRequest, res: Response) => {
    const requestedLine = req.body?.line ?? null;

    try {
      const userId = req.user!.id;
      const worldTime = req.body?.worldTime ?? null;
      const personalityKey = req.body?.personalityKey ?? null;

      logger.info("[intro] starter line requested", {
        requestedLine,
        worldTime,
        personalityKey,
      });

      logger.info("[ensure-egg] creating starter egg", {
        userId,
        requestedLine,
      });

      const existingPet = await fetchStarterPetAnyStage(userId);
      if (existingPet) {
        const existingResolvedLine =
          existingPet.line ?? requestedLine ?? "water";

        const existingStarter = findStarterByName(existingPet.name);
        const existingBaseStats = await fetchBaseStatsMapped(existingPet.id);

        if (!existingBaseStats && existingStarter) {
          logger.warn(
            "[ensure-egg] existing starter missing base stats; repairing",
            {
              petId: existingPet.id,
              requestedLine,
              resolvedLine: existingResolvedLine,
            },
          );

          await insertBaseStats(existingPet.id, existingStarter.baseStats);
        }

        logger.info("[ensure-egg] existing starter found", {
          petId: existingPet.id,
          requestedLine,
          resolvedLine: existingResolvedLine,
        });

        return res.status(200).json({
          success: true,
          existing: true,
          requested_line: requestedLine,
          resolved_line: existingResolvedLine,
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

      logger.info("[element] starter line resolved", { resolvedLine });
      logger.info("[ensure-egg] starter species resolved", {
        speciesId: starter.speciesId,
      });

      const { strongStats, weakStat } = rollGrowthTraits();
      const passiveTrait = await rollPassiveTrait();

      logger.info("[ensure-egg] growth traits locked", {
        speciesId: starter.speciesId,
        strongStats,
        weakStat,
      });

      logger.info("[ensure-egg] passive trait locked", {
        speciesId: starter.speciesId,
        passiveTraitId: passiveTrait?.id ?? null,
        passiveTraitKey: passiveTrait?.key ?? null,
      });

      const fullInsertPayload = {
        user_id: userId,
        name: "Prismatic Egg",
        species: starter.speciesId,
        line: resolvedLine,
        stage: "egg",
        energy: 100,
        hatch_ends_at: hatchEndsAt,
        is_active: false,
        location: "hatchery",
        personality_key: personalityKey ?? null,
        passive_trait_id: passiveTrait?.id ?? null,
        passive_trait_key: passiveTrait?.key ?? null,
        hatch_time_alignment: worldTime ?? null,
        growth_strong_stats: strongStats,
        growth_weak_stat: weakStat,
        mutation_capacity: 1,
      } as PetInsertPayload;
      const fullInsertResult = await supabaseAdmin
        .from("pets")
        .insert(fullInsertPayload)
        .select("*")
        .single();

      if (fullInsertResult.error) {
        logger.error(
          "[ensure-egg] full pets insert failed",
          fullInsertResult.error,
        );

        return res.status(500).json({
          success: false,
          requested_line: requestedLine,
          resolved_line: resolvedLine,
          error: fullInsertResult.error.message,
        });
      }

      const insertedPet = fullInsertResult.data;

      if (!insertedPet?.id) {
        return res.status(500).json({
          success: false,
          requested_line: requestedLine,
          resolved_line: resolvedLine,
          error: "Pet insert finished but no pet id was returned.",
        });
      }

      try {
        await insertBaseStats(insertedPet.id, starter.baseStats);
      } catch (statsError: any) {
        logger.error("[ensure-egg] insertBaseStats failed", statsError);

        return res.status(500).json({
          success: false,
          requested_line: requestedLine,
          resolved_line: resolvedLine,
          starter_species_id: starter.speciesId,
          pet: insertedPet,
          base_stats: starter.baseStats,
          error:
            statsError?.message ??
            statsError?.details ??
            "Failed to insert base stats",
        });
      }

      logger.info("[ensure-egg] egg ensured", {
        petId: insertedPet.id,
        resolvedLine,
        speciesId: starter.speciesId,
      });

      return res.status(200).json({
        success: true,
        existing: false,
        requested_line: requestedLine,
        resolved_line: resolvedLine,
        starter_species_id: starter.speciesId,
        pet: insertedPet,
      });
    } catch (err: any) {
      logger.error("[ensure-egg] failed", err);

      return res.status(500).json({
        success: false,
        requested_line: requestedLine,
        resolved_line: null,
        error:
          err?.message ?? err?.details ?? err?.hint ?? "Failed to ensure egg",
      });
    }
  },
);

// ============================================================
// POST /api/pets/rescue-egg
//
// The "Lost Kith" rescue flow. Only usable when the user currently has
// zero healthy pets (everything they own has run away). Grants one
// fresh random-line starter egg, same 2-minute hatch timer as a normal
// starter, so the player isn't locked out of the game entirely.
//
// Gated server-side on healthy pet count so this can't be spammed for
// free eggs while pets are still alive, the Lost Kith Registry is the
// path for that case instead.
// ============================================================
petsRouter.post(
  "/rescue-egg",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data: existingPets, error: existingPetsError } =
        await supabaseAdmin
          .from("pets")
          .select("id, ran_away")
          .eq("user_id", userId);

      if (existingPetsError) throw existingPetsError;

      const healthyCount = (existingPets ?? []).filter(
        (row: any) => !row?.ran_away,
      ).length;

      if (healthyCount > 0) {
        return res.status(400).json({
          success: false,
          error:
            "You still have a Delta. The rescue egg is only for when every Delta has run away.",
        });
      }

      const { data: openSlot, error: openSlotError } = await supabaseAdmin
        .from("hatchery_slots")
        .select("id, slot_index")
        .eq("user_id", userId)
        .eq("unlocked", true)
        .is("pet_id", null)
        .order("slot_index", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (openSlotError) throw openSlotError;

      if (!openSlot) {
        return res.status(400).json({
          success: false,
          error: "No open hatchery slot is available for a rescue egg.",
        });
      }

      const worldTime = getWorldTimeOfDay();
      const starter = getStarterForSelection({
        line: "random",
        worldTime,
        personalityKey: null,
      });

      const now = new Date();
      const hatchEndsAt = new Date(
        now.getTime() + BASIC_EGG_HATCH_MINUTES * 60 * 1000,
      ).toISOString();

      const { strongStats, weakStat } = rollGrowthTraits();
      const passiveTrait = await rollPassiveTrait();

      const { data: insertedPet, error: insertError } = await supabaseAdmin
        .from("pets")
        .insert({
          user_id: userId,
          name: starter.eggName,
          species: starter.speciesId,
          line: starter.line,
          stage: "egg",
          energy: 100,
          hatch_ends_at: hatchEndsAt,
          is_active: false,
          location: "hatchery",
          passive_trait_id: passiveTrait?.id ?? null,
          passive_trait_key: passiveTrait?.key ?? null,
          hatch_time_alignment: worldTime,
          growth_strong_stats: strongStats,
          growth_weak_stat: weakStat,
          mutation_capacity: 1,
        })
        .select("*")
        .single();

      if (insertError) {
        logger.error("[rescue-egg] pet insert failed", insertError);
        return res.status(500).json({
          success: false,
          error: insertError.message,
        });
      }

      if (
        insertedPet.species !== starter.speciesId ||
        insertedPet.line !== starter.line
      ) {
        logger.error("[rescue-egg] persisted identity mismatch", {
          petId: insertedPet.id,
          expectedSpecies: starter.speciesId,
          storedSpecies: insertedPet.species ?? null,
          expectedLine: starter.line,
          storedLine: insertedPet.line ?? null,
        });

        await supabaseAdmin.from("pets").delete().eq("id", insertedPet.id);

        return res.status(500).json({
          success: false,
          error: "Rescue egg identity was not stored correctly.",
        });
      }

      try {
        await insertBaseStats(insertedPet.id, starter.baseStats);
      } catch (statsError: any) {
        logger.error("[rescue-egg] insertBaseStats failed", statsError);
        await supabaseAdmin.from("pets").delete().eq("id", insertedPet.id);

        return res.status(500).json({
          success: false,
          error:
            statsError?.message ??
            statsError?.details ??
            "Failed to insert egg base stats",
        });
      }

      const { error: slotError } = await supabaseAdmin
        .from("hatchery_slots")
        .update({ pet_id: insertedPet.id })
        .eq("id", openSlot.id)
        .eq("user_id", userId);

      if (slotError) {
        logger.error("[rescue-egg] slot assignment failed", slotError);
        // Roll back the pet insert so we don't leave an orphaned egg with
        // no slot, better to fail the whole rescue than half-grant it.
        await supabaseAdmin.from("pets").delete().eq("id", insertedPet.id);
        return res.status(500).json({
          success: false,
          error: slotError.message,
        });
      }

      logger.info("[rescue-egg] rescue egg granted", {
        userId,
        petId: insertedPet.id,
        speciesId: starter.speciesId,
        line: starter.line,
        slotIndex: openSlot.slot_index,
      });

      return res.status(200).json({
        success: true,
        pet: insertedPet,
        slot_index: openSlot.slot_index,
      });
    } catch (err: any) {
      logger.error("[rescue-egg] failed", err);

      return res.status(500).json({
        success: false,
        error: err?.message ?? "Failed to grant rescue egg.",
      });
    }
  },
);

// ============================================================
// POST /api/pets/hatchery/move-to-hatchery
// ============================================================
petsRouter.post(
  "/hatchery/move-to-hatchery",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const petId = String(req.body?.petId ?? "");

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          petId,
        )
      ) {
        return res.status(400).json({ error: "Invalid pet id." });
      }

      const { data: egg, error: eggError } = await supabaseAdmin
        .from("pets")
        .select("id, stage, location, pending_hatch_minutes")
        .eq("id", petId)
        .eq("user_id", userId)
        .maybeSingle();

      if (eggError) throw eggError;

      if (!egg) {
        return res.status(404).json({ error: "Egg not found." });
      }

      if (
        egg.stage !== "egg" ||
        (egg.location !== "storage" && egg.location !== "inventory")
      ) {
        return res.status(400).json({
          error: "Only an egg in storage or inventory can enter the hatchery.",
        });
      }

      const { data: incubatingEgg, error: incubatingEggError } =
        await supabaseAdmin
          .from("pets")
          .select("id")
          .eq("user_id", userId)
          .eq("stage", "egg")
          .eq("location", "hatchery")
          .neq("id", petId)
          .limit(1)
          .maybeSingle();

      if (incubatingEggError) throw incubatingEggError;

      if (incubatingEgg) {
        return res.status(400).json({
          error:
            "Your current backend only supports 1 incubating egg right now. Multi-incubator wiring is the next pass.",
        });
      }

      const { data: openSlot, error: openSlotError } = await supabaseAdmin
        .from("hatchery_slots")
        .select("id, slot_index")
        .eq("user_id", userId)
        .eq("unlocked", true)
        .is("pet_id", null)
        .order("slot_index", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (openSlotError) throw openSlotError;

      if (!openSlot) {
        return res.status(400).json({
          error: "No open hatchery slot is available right now.",
        });
      }

      const previousLocation = egg.location;
      const hatchMinutes = egg.pending_hatch_minutes ?? 3;
      const hatchEndsAt = new Date(
        Date.now() + hatchMinutes * 60 * 1000,
      ).toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("pets")
        .update({
          location: "hatchery",
          is_active: false,
          hatch_ends_at: hatchEndsAt,
          pending_hatch_minutes: null,
        })
        .eq("id", petId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      const { error: slotError } = await supabaseAdmin
        .from("hatchery_slots")
        .update({ pet_id: petId })
        .eq("id", openSlot.id)
        .eq("user_id", userId);

      if (slotError) {
        await supabaseAdmin
          .from("pets")
          .update({
            location: previousLocation,
            hatch_ends_at: null,
            pending_hatch_minutes: hatchMinutes,
          })
          .eq("id", petId)
          .eq("user_id", userId);

        throw slotError;
      }

      return res.json({
        success: true,
        slot_index: openSlot.slot_index,
        hatch_ends_at: hatchEndsAt,
      });
    } catch (err: any) {
      logger.error("[hatchery] move egg to hatchery failed", err);

      return res.status(500).json({
        error: err?.message ?? "Failed to move egg to hatchery.",
      });
    }
  },
);

// ============================================================
// POST /api/pets/hatchery/move-to-storage
// ============================================================
petsRouter.post(
  "/hatchery/move-to-storage",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const petId = String(req.body?.petId ?? "");

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          petId,
        )
      ) {
        return res.status(400).json({ error: "Invalid pet id." });
      }

      const { data: egg, error: eggError } = await supabaseAdmin
        .from("pets")
        .select("id, stage, location")
        .eq("id", petId)
        .eq("user_id", userId)
        .maybeSingle();

      if (eggError) throw eggError;

      if (!egg) {
        return res.status(404).json({ error: "Egg not found." });
      }

      if (egg.stage !== "egg" || egg.location !== "hatchery") {
        return res.status(400).json({
          error: "Only an egg in the hatchery can be moved to storage.",
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("pets")
        .update({
          location: "storage",
          is_active: false,
        })
        .eq("id", petId)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      try {
        await releaseHatcherySlotsForPets(userId, [petId]);
      } catch (slotCleanupError) {
        await supabaseAdmin
          .from("pets")
          .update({ location: "hatchery" })
          .eq("id", petId)
          .eq("user_id", userId);

        throw slotCleanupError;
      }

      return res.json({ success: true });
    } catch (err: any) {
      logger.error("[hatchery] move egg to storage failed", err);

      return res.status(500).json({
        error: err?.message ?? "Failed to move egg to storage.",
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

      const { slots, shelfSlots } = await fetchHatcherySlotGroups(userId);

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
              species: slot.pet.species ?? null,
              hatch_ends_at: slot.pet.hatch_ends_at ?? null,
              hatch_time_alignment: slot.pet.hatch_time_alignment ?? null,
              growth_strong_stats: slot.pet.growth_strong_stats ?? [],
              growth_weak_stat: slot.pet.growth_weak_stat ?? null,
              passive_trait_id: slot.pet.passive_trait_id ?? null,
              passive_trait_key: slot.pet.passive_trait_key ?? null,
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
      const elements = elementMapForLine(egg.line ?? null);

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
          passive_trait_id: egg.passive_trait_id ?? null,
          passive_trait_key: egg.passive_trait_key ?? null,
        },
        hatch: hatchPayload(egg, serverNowMs),
        stats,
        points,
        elements,
      });
    } catch (err: any) {
      logger.error("[pets/hatchery] failed", err);

      return res.status(500).json({
        error: err?.message ?? "Failed to load hatchery.",
        code: err?.code ?? null,
        details: err?.details ?? null,
        hint: err?.hint ?? null,
      });
    }
  },
);

// ============================================================
// POST /api/pets/hatch - REFACTORED WITH ATOMIC TRANSACTION
// ============================================================
petsRouter.post(
  "/hatch",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();
      const nowIso = new Date(serverNowMs).toISOString();

      const eggId = String(req.body?.eggId ?? "").trim();

      if (!eggId) {
        return res.status(400).json({ error: "Egg id is required" });
      }

      const { data: egg, error: eggError } = await supabaseAdmin
        .from("pets")
        .select("*")
        .eq("id", eggId)
        .eq("user_id", userId)
        .eq("stage", "egg")
        .not("hatch_ends_at", "is", null)
        .maybeSingle();

      if (eggError) throw eggError;

      if (!egg) {
        return res.status(404).json({ error: "No egg to hatch" });
      }

      if (egg.stage !== "egg") {
        return res.status(400).json({ error: "Pet is not an egg" });
      }

      const hatchEndsAt = egg.hatch_ends_at;

      if (!hatchEndsAt) {
        return res.status(400).json({ error: "Egg has no hatch timer" });
      }

      const readyMs = new Date(hatchEndsAt).getTime();

      if (serverNowMs < readyMs) {
        const remainingMs = readyMs - serverNowMs;

        return res.status(409).json({
          error: "Egg is not ready to hatch",
          server_now: nowIso,
          hatch_ends_at: hatchEndsAt,
          remaining_ms: remainingMs,
        });
      }

      const typedEgg = egg as EggRow;

      const aliuneSignal = await fetchCurrentAliuneHatchSignal(nowIso);
      const eggLossChance = isMysteryEggProtected(typedEgg)
        ? 0
        : getEggLossChancePermille(aliuneSignal);

      const eggCorrupted =
        eggLossChance > 0 &&
        cryptoRandomInt(HATCH_CORRUPTION_ROLL_MAX) < eggLossChance;

      if (eggCorrupted) {
        try {
          await releaseHatcherySlotsForPets(userId, [egg.id]);
        } catch (slotCleanupError) {
          logger.error(
            "[hatch] corrupted egg slot cleanup failed",
            slotCleanupError,
          );

          return res.status(500).json({
            error: "The egg corrupted, but cleanup failed.",
          });
        }

        const { error: deleteEggError } = await supabaseAdmin
          .from("pets")
          .delete()
          .eq("id", egg.id)
          .eq("user_id", userId)
          .eq("stage", "egg");

        if (deleteEggError) {
          logger.error("[hatch] corrupted egg delete failed", deleteEggError);

          return res.status(500).json({
            error: "The egg corrupted, but cleanup failed.",
          });
        }

        logger.warn("[hatch] egg lost to Aliune corruption", {
          eggId: egg.id,
          userId,
          condition: aliuneSignal.condition,
          corruption: aliuneSignal.corruption,
          eggLossChance,
        });

        return res.json({
          server_now: nowIso,
          pet: null,
          awarded_points: 0,
          iv: null,
          points: null,
          gender: null,
          personality_key: null,
          personality_id: null,
          party_slot_assigned: null,
          post_hatch_destination: null,
          storage_result: null,
          is_mystery_starter_hatch: false,
          starter_species_id: null,
          egg_lost: true,
          corruption_event: {
            outcome: "egg_lost",
            condition: aliuneSignal.condition,
            corruption: aliuneSignal.corruption,
            message:
              "Aliune Signal interference corrupted the egg. The shell fractured and the egg was lost.",
          },
        });
      }

      const starter = typedEgg.species
        ? (STARTERS.find((s) => s.speciesId === typedEgg.species) ?? null)
        : (STARTERS.find((s) => s.line === typedEgg.line) ?? null);

      const kithnaSpecies =
        findNonStarterSpeciesById(typedEgg.species) ??
        findNonStarterSpeciesByEggName(typedEgg.name);

      const hatchlingName =
        starter?.hatchlingName ?? kithnaSpecies?.evolution.hatchling ?? null;
      const hatchBaseStats =
        starter?.baseStats ?? kithnaSpecies?.eggBaseStats ?? null;
      const hatchSpeciesId = starter?.speciesId ?? kithnaSpecies?.id ?? null;
      const hatchLine =
        typedEgg.line ?? starter?.line ?? kithnaSpecies?.line ?? null;

      if (!hatchlingName || !hatchBaseStats || !hatchSpeciesId || !hatchLine) {
        logger.error("[hatch] no hatch species matched egg", {
          egg_id: egg.id,
          egg_species: typedEgg.species,
          egg_line: typedEgg.line,
        });

        return res.status(500).json({ error: "Invalid egg species or line" });
      }

      await insertBaseStats(egg.id, hatchBaseStats);

      const iv = rollIV(HATCH_ALLOCATION_POINTS);

      if (sumStats(iv) !== HATCH_ALLOCATION_POINTS) {
        logger.error("[hatch] invalid hatch allocation total", {
          eggId: egg.id,
          iv,
          expected: HATCH_ALLOCATION_POINTS,
        });

        return res.status(500).json({ error: "Invalid hatch stat roll" });
      }

      const gender = rollGender();

      let personalityId = egg.personality_id ?? null;
      let personalityKey = egg.personality_key ?? null;

      if (personalityId && !personalityKey) {
        const { data: personalityRow } = await supabaseAdmin
          .from("personalities")
          .select("id, key")
          .eq("id", personalityId)
          .maybeSingle();

        if (personalityRow?.key) {
          personalityKey = personalityRow.key;
        }
      }
      if (!personalityId || !personalityKey) {
        const rolled = await rollPersonality();
        personalityKey = rolled?.key ?? null;
        personalityId = rolled?.id ?? null;
      }

      let passiveTraitId = typedEgg.passive_trait_id ?? null;
      let passiveTraitKey = typedEgg.passive_trait_key ?? null;

      if (!passiveTraitId && !passiveTraitKey) {
        const rolledPassiveTrait = await rollPassiveTrait();
        passiveTraitId = rolledPassiveTrait?.id ?? null;
        passiveTraitKey = rolledPassiveTrait?.key ?? null;

        if (passiveTraitId || passiveTraitKey) {
          const { error: passiveTraitUpdateError } = await supabaseAdmin
            .from("pets")
            .update({
              passive_trait_id: passiveTraitId,
              passive_trait_key: passiveTraitKey,
            })
            .eq("id", egg.id)
            .eq("user_id", userId)
            .eq("stage", "egg");

          if (passiveTraitUpdateError) {
            logger.error(
              "[hatch] passive trait fallback failed",
              passiveTraitUpdateError,
            );
          }
        }
      }

      const savedStrongStats = sanitizeGrowthStrongStats(
        typedEgg.growth_strong_stats,
      );
      const savedWeakStat = sanitizeGrowthWeakStat(typedEgg.growth_weak_stat);

      const fallbackTraits =
        savedStrongStats.length > 0 || savedWeakStat
          ? null
          : rollGrowthTraits();

      const strengths =
        savedStrongStats.length > 0
          ? savedStrongStats
          : (fallbackTraits?.strongStats ?? []);

      const weakness = savedWeakStat ?? fallbackTraits?.weakStat ?? null;
      const description = generatePetDescription({
        species: hatchlingName,
        name: hatchlingName,
        nickname: null,
        stage: "hatchling",
        element: hatchLine,
        personality_name: personalityKey,
        strengths,
        weakness,
      });

      const hatchTimeAlignment = typedEgg.hatch_time_alignment ?? null;
      const growthWeakStatForRpc = weakness ?? "";
      const hatchTimeAlignmentForRpc = hatchTimeAlignment ?? "";

      const { data: hatchResult, error: hatchError } = await supabaseAdmin.rpc(
        "hatch_pet",
        {
          p_user_id: userId,
          p_egg_id: egg.id,
          p_iv_hp: iv.hp,
          p_iv_atk: iv.atk,
          p_iv_def: iv.def,
          p_iv_spd: iv.spd,
          p_iv_magi: iv.magi,
          p_iv_mana: iv.mana,
          p_gender: gender,
          p_personality_id: personalityId,
          p_personality_key: personalityKey,
          p_hatchling_name: hatchlingName,
          p_description: description,
          p_growth_strong_stats: strengths,
          p_growth_weak_stat: growthWeakStatForRpc,
          p_hatch_time_alignment: hatchTimeAlignmentForRpc,
          p_line: hatchLine,
        },
      );

      if (hatchError) {
        logger.error("[hatch] RPC failed", hatchError);

        return res.status(500).json({
          error: hatchError.message || "Failed to hatch pet",
          code: hatchError.code ?? null,
          details: hatchError.details ?? null,
          hint: hatchError.hint ?? null,
        });
      }

      const result = Array.isArray(hatchResult) ? hatchResult[0] : hatchResult;

      if (!result?.success) {
        logger.error("[hatch] RPC returned failure", result?.error_message);

        return res.status(500).json({
          error: result?.error_message || "Failed to hatch pet",
        });
      }

      try {
        await releaseHatcherySlotsForPets(userId, [egg.id]);
      } catch (slotCleanupError) {
        logger.error(
          "[hatch] hatched egg slot cleanup failed",
          slotCleanupError,
        );
      }

      const hatched = result.pet_row;

      const { data: existingActivePet, error: activePetError } =
        await supabaseAdmin
          .from("pets")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .neq("id", egg.id)
          .limit(1)
          .maybeSingle();

      if (activePetError) throw activePetError;

      const assignedPartySlot = await assignPetToMainParty(userId, egg.id);

      let finalLocation: "active" | "party" | "storage" = "storage";
      let finalIsActive = false;
      let postHatchDestination: string | null = null;
      let storageResult: "party" | "storage" = "storage";

      if (assignedPartySlot) {
        const shouldBecomeActive = !existingActivePet;

        const { error: activateErr } = await supabaseAdmin
          .from("pets")
          .update({
            location: "active",
            is_active: shouldBecomeActive,
          })
          .eq("id", egg.id)
          .eq("user_id", userId);

        if (activateErr) {
          logger.error("[hatch] activate pet failed", activateErr);

          const { error: rollbackPartyError } = await supabaseAdmin
            .from("party_slots")
            .delete()
            .eq("user_id", userId)
            .eq("pet_id", egg.id);

          if (rollbackPartyError) {
            logger.error(
              "[hatch] party assignment rollback failed",
              rollbackPartyError,
            );
          }
        } else {
          finalLocation = "active";
          finalIsActive = shouldBecomeActive;
          storageResult = "party";
          postHatchDestination = "/pet";
        }
      }

      const points = await fetchTotalPoints(egg.id);

      logger.info("[hatch] pet hatched", {
        petId: egg.id,
        speciesId: hatchSpeciesId,
        line: hatchLine,
        storageResult,
      });

      const hatchedPetForClient = await hydrateHatchedPassiveTrait({
        ...hatched,
        name: hatchlingName,
        location: finalLocation,
        is_active: finalIsActive,
        description,
        passive_trait_id: passiveTraitId,
        passive_trait_key: passiveTraitKey,
      });

      return res.json({
        server_now: nowIso,
        pet: hatchedPetForClient,
        awarded_points: HATCH_ALLOCATION_POINTS,
        iv,
        points,
        gender,
        personality_key: personalityKey,
        personality_id: personalityId,
        party_slot_assigned: assignedPartySlot,
        post_hatch_destination: postHatchDestination,
        storage_result: storageResult,
        is_mystery_starter_hatch: Boolean(starter),
        starter_species_id: starter?.speciesId ?? null,
      });
    } catch (err: any) {
      logger.error("[POST /api/pets/hatch] crash", err);

      return res.status(500).json({
        error: "Failed to hatch pet",
      });
    }
  },
);

export default petsRouter;
