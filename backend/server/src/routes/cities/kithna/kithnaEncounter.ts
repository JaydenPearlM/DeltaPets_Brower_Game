// ========================================
// routes/cities/kithna/kithnaEncounter.ts
// Roam encounter: player may find a Kithna non-starter egg while
// navigating between pages. Alpha scope only.
// ========================================

import { Router, Response } from "express";
import { randomInt as cryptoRandomInt } from "node:crypto";
import { requireUser, type AuthedRequest } from "../../../middleware/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { logger } from "../../../lib/logger";
import { getDeltaTime } from "../../../lib/deltaTime";
import { BASIC_EGG_HATCH_MINUTES } from "../../routePets/petsType";
import { insertBaseStats } from "../../routePets/petsStats";
import {
  getKithnaEggsForTime,
  type KithnaNonStarterSpecies,
} from "../../../shared/pets/KithnaSpecies";

export const kithnaRouter = Router();

// Alpha tuning. Move to game_config later if this needs to be adjustable
// without a redeploy.
const ROAM_FIND_CHANCE_PERCENT = 20; // 1 in 5 navigations
const ROAM_COOLDOWN_MS = 60_000; // 60 seconds between rolls per user

// In-memory cooldown tracker. Alpha-only, same pattern as the battle store
// in battlePve.ts, resets on server restart, fine for a handful of testers.
const lastRoamAttemptByUser = new Map<string, number>();

function pickRandomSpecies(
  pool: KithnaNonStarterSpecies[],
): KithnaNonStarterSpecies {
  return pool[cryptoRandomInt(pool.length)];
}

async function findOpenHatcherySlot(
  userId: string,
): Promise<{ id: string; slot_index: number } | null> {
  const { data, error } = await supabaseAdmin
    .from("hatchery_slots")
    .select("id, slot_index, unlocked, pet_id")
    .eq("user_id", userId)
    .eq("unlocked", true)
    .is("pet_id", null)
    .order("slot_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { id: data.id, slot_index: data.slot_index };
}

async function grantXpToActivePet(userId: string, amount: number) {
  // Writes directly to pets.xp, the field every frontend XP bar actually
  // reads. Do not write this to pet_stat_allocations.xp, that table is a
  // known dead end for player-visible XP, see rewards.ts giveXPToActivePet.
  const { data: pet, error } = await supabaseAdmin
    .from("pets")
    .select("id, xp")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!pet) return;

  const { error: updateError } = await supabaseAdmin
    .from("pets")
    .update({ xp: (pet.xp ?? 0) + amount })
    .eq("id", pet.id);

  if (updateError) throw updateError;
}

// ============================================================
// POST /api/kithna/roam
//
// Call this on client-side page navigation. Rolls a chance to find
// a Kithna non-starter egg. Cooldown gated per user, in memory.
// ============================================================
kithnaRouter.post(
  "/roam",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const now = Date.now();

      const lastAttempt = lastRoamAttemptByUser.get(userId) ?? 0;
      if (now - lastAttempt < ROAM_COOLDOWN_MS) {
        return res.json({
          found: false,
          reason: "cooldown",
          retry_after_ms: ROAM_COOLDOWN_MS - (now - lastAttempt),
        });
      }
      lastRoamAttemptByUser.set(userId, now);

      const roll = cryptoRandomInt(100);
      if (roll >= ROAM_FIND_CHANCE_PERCENT) {
        return res.json({ found: false, reason: "no_find" });
      }

      const timeOfDay = getDeltaTime(new Date(now)).timeOfDay;
      const pool = getKithnaEggsForTime(timeOfDay);

      if (!pool.length) {
        logger.error("[kithna/roam] no species configured for time", {
          timeOfDay,
        });
        return res.json({ found: false, reason: "no_pool" });
      }

      const openSlot = await findOpenHatcherySlot(userId);
      if (!openSlot) {
        return res.json({ found: false, reason: "hatchery_full" });
      }

      const species = pickRandomSpecies(pool);
      const hatchEndsAt = new Date(
        now + BASIC_EGG_HATCH_MINUTES * 60 * 1000,
      ).toISOString();

      const { data: insertedPet, error: insertError } = await supabaseAdmin
        .from("pets")
        .insert({
          user_id: userId,
          name: species.evolution.egg,
          species: species.id,
          line: species.line,
          stage: "egg",
          energy: 100,
          hatch_ends_at: hatchEndsAt,
          is_active: false,
          location: "hatchery",
        })
        .select("*")
        .single();

      if (insertError) {
        logger.error("[kithna/roam] pet insert failed", insertError);
        return res.status(500).json({ error: insertError.message });
      }

      await insertBaseStats(insertedPet.id, species.eggBaseStats);

      const { error: slotError } = await supabaseAdmin
        .from("hatchery_slots")
        .update({ pet_id: insertedPet.id })
        .eq("id", openSlot.id)
        .eq("user_id", userId);

      if (slotError) {
        logger.error("[kithna/roam] slot assignment failed", slotError);
        // Roll back the pet insert so we don't leave an orphaned egg with
        // no slot, better to fail the whole encounter than half-grant it.
        await supabaseAdmin.from("pets").delete().eq("id", insertedPet.id);
        return res.status(500).json({ error: slotError.message });
      }

      await grantXpToActivePet(userId, species.findXpReward);

      logger.info("[kithna/roam] egg found", {
        userId,
        speciesId: species.id,
        timeOfDay,
        slotIndex: openSlot.slot_index,
      });

      return res.json({
        found: true,
        egg_name: species.evolution.egg,
        egg_visual: species.eggVisual,
        time_of_day: timeOfDay,
        xp_awarded: species.findXpReward,
      });
    } catch (err: any) {
      logger.error("[kithna/roam] failed", err);
      return res.status(500).json({ error: err?.message ?? "Roam failed." });
    }
  },
);
