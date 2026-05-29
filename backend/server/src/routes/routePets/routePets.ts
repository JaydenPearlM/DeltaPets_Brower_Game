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
import {
  rollGrowthTraits,
  sanitizeGrowthStrongStats,
  sanitizeGrowthWeakStat,
} from "../../pets/growthTraits";
import { rollPersonality, getAllPersonalities } from "../../pets/personalities";
import { assignPetToMainParty } from "../../pets/partySlots";

import { fetchTotalPoints, insertBaseStats } from "./petsStats";

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

import {
  normalizePetForClient,
  updatePetCareStats,
} from "../../lib/petCareHelpers";

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
  hatch_time_alignment?: string | null;
  growth_strong_stats?: string[] | null;
  growth_weak_stat?: string | null;
};

type MinimalPetInsertPayload = {
  user_id: string;
  name: string;
  line: ElementalLine;
  stage: string;
  energy: number; // ADD THIS LINE
  hatch_ends_at: string;
  is_active: boolean;
  location: string;
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

export const petsRouter = Router();

petsRouter.patch(
  "/:petId/nickname",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const petId = req.params.petId;
      const nickname = String(req.body?.nickname ?? "").trim();

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
    } catch (e: any) {
      return res.status(500).json({
        error: e?.message ?? "Failed to save nickname.",
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
    const requestedLine = req.body?.line ?? null;

    try {
      const userId = req.user!.id;
      const worldTime = req.body?.worldTime ?? null;
      const personalityKey = req.body?.personalityKey ?? null;

      console.log("[ensure-egg] requested_line:", requestedLine);

      const existingPet = await fetchStarterPetAnyStage(userId);

      if (existingPet) {
        const existingResolvedLine =
          existingPet.line ?? requestedLine ?? "water";

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

      console.log("[ensure-egg] resolved_line:", resolvedLine);
      console.log("[ensure-egg] starter_species_id:", starter.speciesId);

      const { strongStats, weakStat } = rollGrowthTraits();

      console.log("[ensure-egg] growth traits locked ->", {
        speciesId: starter.speciesId,
        strongStats,
        weakStat,
      });

      const fullInsertPayload = {
        user_id: userId,
        name: starter.eggName,
        species: starter.speciesId,
        line: resolvedLine,
        stage: "egg",
        energy: 100,
        hatch_ends_at: hatchEndsAt,
        is_active: false,
        location: "hatchery",
        personality_key: personalityKey ?? null,
        hatch_time_alignment: worldTime ?? null,
        growth_strong_stats: strongStats,
        growth_weak_stat: weakStat,
      } as PetInsertPayload;

      const fallbackInsertPayload = {
        user_id: userId,
        name: starter.eggName,
        line: resolvedLine,
        stage: "egg",
        energy: 100,
        hatch_ends_at: hatchEndsAt,
        is_active: false,
        location: "hatchery",
      } as MinimalPetInsertPayload;

      let insertedPet: EggRow | null = null;

      const fullInsertResult = await supabaseAdmin
        .from("pets")
        .insert(fullInsertPayload)
        .select("*")
        .single();

      if (fullInsertResult.error) {
        console.error(
          "[ensure-egg] full pets insert failed:",
          fullInsertResult.error,
        );

        const fallbackInsertResult = await supabaseAdmin
          .from("pets")
          .insert(fallbackInsertPayload)
          .select("*")
          .single();

        if (fallbackInsertResult.error) {
          console.error(
            "[ensure-egg] fallback pets insert failed:",
            fallbackInsertResult.error,
          );

          return res.status(500).json({
            success: false,
            requested_line: requestedLine,
            resolved_line: resolvedLine,
            error: fallbackInsertResult.error.message,
            full_insert_error: fullInsertResult.error.message,
            fallback_insert_error: fallbackInsertResult.error.message,
          });
        }

        insertedPet = fallbackInsertResult.data;
      } else {
        insertedPet = fullInsertResult.data;
      }

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
        console.error("[ensure-egg] insertBaseStats failed:", statsError);

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
        success: false,
        requested_line: requestedLine,
        resolved_line: null,
        error:
          error?.message ??
          error?.details ??
          error?.hint ??
          "Failed to ensure egg",
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

      // Step 1: Fetch the egg
      const { pet: egg } = await fetchHatcheryEgg(userId);

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

      // Step 2: Check if egg is ready
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

      // Step 3: Resolve starter species
      const typedEgg = egg as any;
      const starter = typedEgg.species
        ? (STARTERS.find((s) => s.speciesId === typedEgg.species) ?? null)
        : (STARTERS.find((s) => s.line === typedEgg.line) ?? null);

      if (!starter) {
        console.error("[hatch] no starter matched egg:", {
          egg_id: egg.id,
          egg_species: typedEgg.species,
          egg_line: typedEgg.line,
        });
        return res.status(500).json({ error: "Invalid egg species or line" });
      }

      // Step 4: Roll IVs (hatch bonus)
      const iv = rollIV(HATCH_ALLOCATION_POINTS);

      // Step 5: Roll gender
      const gender = rollGender();

      // Step 6: Get or roll personality
      let personalityId = egg.personality_id ?? null;
      let personalityKey = egg.personality_key ?? null;

      if (personalityId && !personalityKey) {
        // Backfill personality key
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
        personalityKey = rolled.key;
        personalityId = rolled.id;
      }

      // Step 7: Get or roll growth traits
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

      // Step 8: Generate description
      const description = generatePetDescription({
        species: starter.hatchlingName,
        name: starter.hatchlingName,
        nickname: null,
        stage: "hatchling",
        element: typedEgg.line ?? starter.line ?? null,
        personality_name: personalityKey,
        strengths,
        weakness,
      });

      const hatchTimeAlignment = typedEgg.hatch_time_alignment ?? null;

      // Step 9: Call the atomic hatch RPC function
      // This executes ALL hatch logic in a single database transaction
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
          p_hatchling_name: starter.hatchlingName,
          p_description: description,
          p_growth_strong_stats: strengths,
          p_growth_weak_stat: weakness,
          p_hatch_time_alignment: hatchTimeAlignment,
        },
      );

      if (hatchError) {
        console.error("[hatch] RPC failed:", hatchError);
        return res.status(500).json({ error: "Failed to hatch pet" });
      }

      // RPC returns array with single row
      const result = Array.isArray(hatchResult) ? hatchResult[0] : hatchResult;

      if (!result?.success) {
        console.error("[hatch] RPC returned failure:", result?.error_message);
        return res.status(500).json({
          error: result?.error_message || "Failed to hatch pet",
        });
      }

      const hatched = result.pet_row;

      // Step 10: Assign party slot (separate transaction - safe to fail)
      const assignedPartySlot = await assignPetToMainParty(userId, egg.id);

      let finalLocation: "active" | "storage" = "storage";
      let finalIsActive = false;
      let postHatchDestination: string | null = null;
      let storageResult: "party" | "storage" = "storage";

      if (assignedPartySlot) {
        const { error: activateErr } = await supabaseAdmin
          .from("pets")
          .update({
            location: "active",
            is_active: true,
          })
          .eq("id", egg.id)
          .eq("user_id", userId);

        if (activateErr) {
          console.error("[hatch] activate pet failed:", activateErr);
          // Non-fatal - pet is already hatched, just not activated
        } else {
          finalLocation = "active";
          finalIsActive = true;
          storageResult = "party";
          postHatchDestination = "/pet";
        }
      }

      // Step 11: Fetch final stats
      const points = await fetchTotalPoints(egg.id);

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
        error: "Failed to hatch pet",
      });
    }
  },
);

export default petsRouter;
