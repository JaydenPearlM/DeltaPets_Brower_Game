// ========================================
// routePets/routePets.ts
// Main pet creation / hatchery / active pet routes
// ========================================

import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { applyHungerDecay } from "../../pets/hunger";
import { rollIV, sumStats } from "../../lib/stats/individualValues";
import { applyCareDecay } from "../../shared/pets/care/CareDecay";

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

// ---------------------------------------------------------------
// Personality roll
// IMPORTANT:
// These keys MUST match the real keys in public.personalities.
// ---------------------------------------------------------------
const PERSONALITY_KEYS = [
  "gremlin",
  "sprinter",
  "loyalist",
  "scholar",
  "radiant",
  "guardian",
  "anxious",
  "wildheart",
  "brightspark",
  "prankster",
  "shadowed",
  "drifter",
  "glutton",
  "dreamer",
  "stoic",
  "tinker",
  "feral",
  "blazeborn",
  "gentle",
  "royal",
] as const;

type PersonalityKey = (typeof PERSONALITY_KEYS)[number];

function rollPersonality(): PersonalityKey {
  return PERSONALITY_KEYS[Math.floor(Math.random() * PERSONALITY_KEYS.length)];
}

async function resolvePersonalityId(key: PersonalityKey): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("personalities")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve personality "${key}": ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(`No personality found for key "${key}"`);
  }

  return data.id;
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

      const hydratedPet = applyCareDecay(pet);

      const careChanged =
        hydratedPet.hunger !== pet.hunger ||
        hydratedPet.clean !== pet.clean ||
        hydratedPet.happy !== pet.happy ||
        hydratedPet.neglect_hours !== pet.neglect_hours ||
        hydratedPet.ran_away !== pet.ran_away ||
        hydratedPet.last_care_update !== pet.last_care_update;

      if (careChanged) {
        await updatePetCareStats(hydratedPet.id, {
          hunger: hydratedPet.hunger,
          clean: hydratedPet.clean,
          happy: hydratedPet.happy,
          neglect_hours: hydratedPet.neglect_hours,
          ran_away: hydratedPet.ran_away,
          last_care_update: hydratedPet.last_care_update,
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
//
// FIX:
// - respects frontend requested line
// - resolves starter from your real starter system
// - returns requested_line + resolved_line
// - keeps mystery egg behavior (name hidden until hatch)
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
//
// The mystery is revealed here.
// - Starter found by egg.line (not egg.name; it's "Mystery Egg")
// - gender rolled at hatch
// - personality is only rolled if the egg does not already have one
// - if personality_id already exists, we preserve it and backfill personality_key
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
