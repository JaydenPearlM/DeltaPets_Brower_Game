import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { applyHungerDecay } from "../../pets/hunger";
import { rollIV, sumStats } from "../../lib/stats/individualValues";

import {
  fetchActivePet,
  fetchHatcheryEgg,
  fetchHatcheryShelfSlots,
  fetchHatcherySlots,
  fetchStarterPetAnyStage,
} from "./petsRepo";

import {
  fetchBaseStatsMapped,
  fetchTotalPoints,
  insertBaseStats,
} from "./petsStats";

import { STARTER_SPROUTS, findStarterByName, rollStarter } from "./starters";

import {
  BASIC_EGG_HATCH_MINUTES,
  HATCH_ALLOCATION_POINTS,
  type ElementalLine,
} from "./petsType";

import {
  elementMapForLine,
  hatchPayload,
  msUntil,
  sumBase5,
} from "./petsUtils";

export const petsRouter = Router();

type EnsureEggBody = {
  line?: string;
};

function pickStarterForLine(line?: string | null) {
  const normalized = String(line ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return rollStarter();
  }

  const byLine =
    STARTER_SPROUTS.find((starter) => starter.line === normalized) ?? null;

  return byLine ?? rollStarter();
}

async function assignPetToMainParty(userId: string, petId: string) {
  const { data: existingRows, error: slotsError } = await supabaseAdmin
    .from("party_slots")
    .select("id, slot_index, pet_id")
    .eq("user_id", userId)
    .order("slot_index", { ascending: true });

  if (slotsError) throw slotsError;

  const rows = existingRows ?? [];

  const alreadyAssigned = rows.find((row: any) => row.pet_id === petId);
  if (alreadyAssigned) {
    return Number(alreadyAssigned.slot_index);
  }

  const usedSlots = new Set<number>(
    rows.map((row: any) => Number(row.slot_index)).filter(Number.isFinite),
  );

  const targetSlot =
    Array.from({ length: 4 }, (_, idx) => idx + 1).find(
      (slot) => !usedSlots.has(slot),
    ) ?? null;

  if (!targetSlot) {
    return null;
  }

  const { error: insertError } = await supabaseAdmin
    .from("party_slots")
    .insert({
      user_id: userId,
      slot_index: targetSlot,
      pet_id: petId,
    });

  if (insertError) throw insertError;

  return targetSlot;
}

/**
 * GET /api/pets/active
 * Used by PetPage to render the current active pet.
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

      const decayedHunger = await applyHungerDecay(pet.id);
      const hydratedPet = { ...pet, hunger: decayedHunger };

      const stats = await fetchBaseStatsMapped(hydratedPet.id);
      const points = await fetchTotalPoints(hydratedPet.id);
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

/**
 * POST /api/pets/ensure-egg
 * Creates the starter egg once, or returns the existing starter pet at any stage.
 */
petsRouter.post(
  "/ensure-egg",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const body = (req.body ?? {}) as EnsureEggBody;
      const existing = await fetchStarterPetAnyStage(userId);

      if (existing) {
        return res.json({
          ok: true,
          created: false,
          pet: existing,
        });
      }

      const starter = pickStarterForLine(body.line);
      const nowMs = Date.now();
      const hatchEndsAt = new Date(
        nowMs + BASIC_EGG_HATCH_MINUTES * 60 * 1000,
      ).toISOString();

      const { data: insertedPet, error: insertPetError } = await supabaseAdmin
        .from("pets")
        .insert({
          user_id: userId,
          name: starter.name,
          stage: "egg",
          line: starter.line,
          location: "hatchery",
          is_active: false,
          hatch_ends_at: hatchEndsAt,
          unspent_points: 0,
        } as any)
        .select("*")
        .single();

      if (insertPetError) {
        return res.status(500).json({ error: insertPetError.message });
      }

      await insertBaseStats(insertedPet.id, starter.baseStats);

      return res.json({
        ok: true,
        created: true,
        pet: insertedPet,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

/**
 * GET /api/pets/hatchery
 * Used by HatcheryPage.
 */
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
          slots: slots.map((slot) => ({
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
          })),
          shelf_slots: shelfSlots.map((slot) => ({
            id: slot.id,
            slot_index: slot.slot_index,
            unlocked: slot.unlocked,
            item_key: slot.item_key,
          })),
          pet: null,
          hatch: null,
          stats: null,
          points: null,
          elements: null,
        });
      }

      const stats = await fetchBaseStatsMapped(egg.id);
      const points = await fetchTotalPoints(egg.id);
      const elements = elementMapForLine(
        (egg.line ?? "null_element") as ElementalLine,
      );

      return res.json({
        server_now: new Date(serverNowMs).toISOString(),
        slots: slots.map((slot) => ({
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
        })),
        shelf_slots: shelfSlots.map((slot) => ({
          id: slot.id,
          slot_index: slot.slot_index,
          unlocked: slot.unlocked,
          item_key: slot.item_key,
        })),
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

/**
 * POST /api/pets/hatch
 * Hatches the current egg. If a party slot is open, place the pet there.
 */
petsRouter.post(
  "/hatch",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const serverNowMs = Date.now();

      const { pet: egg } = await fetchHatcheryEgg(userId);
      if (!egg) {
        return res.status(404).json({ error: "No hatchery egg found" });
      }

      const remaining = msUntil(egg.hatch_ends_at, serverNowMs);
      if (remaining > 0) {
        return res.status(409).json({
          error: "Egg is not ready yet",
          server_now: new Date(serverNowMs).toISOString(),
          hatch: hatchPayload(egg, serverNowMs),
        });
      }

      const starter = findStarterByName(egg.name) ?? STARTER_SPROUTS[0];

      const baseRowMapped = await fetchBaseStatsMapped(egg.id);
      if (!baseRowMapped) {
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
        return res.status(500).json({ error: baseRawErr.message });
      }

      if (!baseRaw) {
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

      const iv = rollIV(HATCH_ALLOCATION_POINTS);
      if (sumStats(iv) !== HATCH_ALLOCATION_POINTS) {
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
        return res.status(500).json({ error: ivUpsertErr.message });
      }

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

      const { data: hatched, error: hatchUpdateError } = await supabaseAdmin
        .from("pets")
        .update({
          stage: "hatchling",
          hatched_at: nowIso,
          hatch_ends_at: null,
          unspent_points: 0,
          is_active: false,
          location: "storage",
          atk: totalAtk,
          def: totalDef,
          spd: totalSpd,
          magi: totalMagi,
          mana: totalMana,
          hp_max: hpMax,
          hp_cur: hpMax,
        } as any)
        .eq("id", egg.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (hatchUpdateError) {
        return res.status(500).json({ error: hatchUpdateError.message });
      }

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
          } as any)
          .eq("id", egg.id)
          .eq("user_id", userId);

        if (activateErr) {
          return res.status(500).json({ error: activateErr.message });
        }

        finalLocation = "active";
        finalIsActive = true;
        storageResult = "party";
        postHatchDestination = "/pet";
      } else {
        const { error: storeErr } = await supabaseAdmin
          .from("pets")
          .update({
            location: "storage",
            is_active: false,
          } as any)
          .eq("id", egg.id)
          .eq("user_id", userId);

        if (storeErr) {
          return res.status(500).json({ error: storeErr.message });
        }

        finalLocation = "storage";
        finalIsActive = false;
        storageResult = "storage";
        postHatchDestination = null;
      }

      const points = await fetchTotalPoints(egg.id);

      return res.json({
        server_now: nowIso,
        pet: {
          ...hatched,
          location: finalLocation,
          is_active: finalIsActive,
        },
        awarded_points: HATCH_ALLOCATION_POINTS,
        iv,
        points,
        party_slot_assigned: assignedPartySlot,
        post_hatch_destination: postHatchDestination,
        storage_result: storageResult,
        is_mystery_starter_hatch: Boolean(findStarterByName(egg.name)),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

export default petsRouter;
