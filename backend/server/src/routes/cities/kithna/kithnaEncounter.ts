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
import { insertBaseStats, fetchTotalPoints } from "../../routePets/petsStats";
import {
  getKithnaEggsForTime,
  type KithnaNonStarterSpecies,
} from "../../../shared/pets/KithnaSpecies";
import { rollNonStarterEggQuality } from "../../../shared/pets/eggQualityRoll";

export const kithnaRouter = Router();

// Alpha tuning. Move to game_config later if this needs to be adjustable
// without a redeploy.
const ROAM_FIND_CHANCE_PERCENT = 100; // alpha testing: guaranteed Kithna egg finds
const ROAM_COOLDOWN_MS = 60_000; // 60 seconds between rolls per user

// Lost Kith Registry tuning.
const LOST_REGISTRY_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours to recover

const RECOVERY_BASE_DOTS = 150;
const RECOVERY_DOTS_PER_LEVEL = 40;
const RECOVERY_DOTS_PER_STAT_POINT = 3;
const RECOVERY_MAX_BOND_DISCOUNT = 0.5; // up to 50% off at bond 100

const RECOVERY_BASE_CRYSTALS = 3;
const RECOVERY_CRYSTALS_PER_LEVELS = 5; // +1 crystal every 5 levels

async function computeRecoveryCost(pet: {
  id: string;
  level?: number | null;
  bond?: number | null;
}) {
  const level = Math.max(1, pet.level ?? 1);
  const bond = Math.max(0, Math.min(100, pet.bond ?? 0));

  const pointsResult = await fetchTotalPoints(pet.id);
  const totalPoints = pointsResult?.total_points ?? 17;

  const rawDots =
    RECOVERY_BASE_DOTS +
    level * RECOVERY_DOTS_PER_LEVEL +
    totalPoints * RECOVERY_DOTS_PER_STAT_POINT;

  const bondDiscount = (bond / 100) * RECOVERY_MAX_BOND_DISCOUNT;
  const dots = Math.max(1, Math.round(rawDots * (1 - bondDiscount)));

  const crystals =
    RECOVERY_BASE_CRYSTALS + Math.floor(level / RECOVERY_CRYSTALS_PER_LEVELS);

  return { dots, crystals };
}

// In-memory cooldown tracker. Alpha-only, same pattern as the battle store
// in battlePve.ts, resets on server restart, fine for a handful of testers.
const lastRoamAttemptByUser = new Map<string, number>();

type PendingKithnaEncounter = {
  species: KithnaNonStarterSpecies;
  eggQuality: Awaited<ReturnType<typeof rollNonStarterEggQuality>>;
  timeOfDay: "day" | "night";
};

const pendingRoamEncounterByUser = new Map<string, PendingKithnaEncounter>();
function pickRandomSpecies(
  pool: KithnaNonStarterSpecies[],
): KithnaNonStarterSpecies {
  return pool[cryptoRandomInt(pool.length)];
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
      const pendingEncounter = pendingRoamEncounterByUser.get(userId);

      if (pendingEncounter) {
        return res.json({
          found: true,
          egg_name: pendingEncounter.species.evolution.egg,
          egg_visual: pendingEncounter.species.eggVisual,
          time_of_day: pendingEncounter.timeOfDay,
        });
      }

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

      const species = pickRandomSpecies(pool);
      const eggQuality = await rollNonStarterEggQuality();

      pendingRoamEncounterByUser.set(userId, {
        species,
        eggQuality,
        timeOfDay,
      });

      logger.info("[kithna/roam] egg encounter found", {
        userId,
        speciesId: species.id,
        timeOfDay,
      });

      return res.json({
        found: true,
        egg_name: species.evolution.egg,
        egg_visual: species.eggVisual,
        time_of_day: timeOfDay,
      });
    } catch (err: any) {
      logger.error("[kithna/roam] failed", err);
      return res.status(500).json({ error: err?.message ?? "Roam failed." });
    }
  },
);

// ============================================================
// POST /api/kithna/roam/take
//
// Accepts the current pending Kithna egg encounter and creates the
// egg in the player's inventory.
// ============================================================
kithnaRouter.post(
  "/roam/take",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const pendingEncounter = pendingRoamEncounterByUser.get(userId);

      if (!pendingEncounter) {
        return res.status(409).json({ error: "No Kithna egg is waiting." });
      }

      pendingRoamEncounterByUser.delete(userId);

      const { species, eggQuality, timeOfDay } = pendingEncounter;

      const { data: insertedPet, error: insertError } = await supabaseAdmin
        .from("pets")
        .insert({
          user_id: userId,
          name: species.evolution.egg,
          species: species.id,
          line: species.line,
          stage: "egg",
          energy: 100,
          hatch_ends_at: null,
          pending_hatch_minutes: eggQuality.hatch_minutes,
          is_active: false,
          location: "inventory",
          hatch_time_alignment: species.preferredTime,
        })
        .select("*")
        .single();

      if (insertError) {
        pendingRoamEncounterByUser.set(userId, pendingEncounter);
        logger.error("[kithna/roam/take] pet insert failed", insertError);
        return res.status(500).json({ error: insertError.message });
      }

      try {
        await insertBaseStats(insertedPet.id, species.eggBaseStats);
      } catch (statsError: any) {
        await supabaseAdmin.from("pets").delete().eq("id", insertedPet.id);
        pendingRoamEncounterByUser.set(userId, pendingEncounter);
        logger.error("[kithna/roam/take] insertBaseStats failed", statsError);

        return res.status(500).json({
          error:
            statsError?.message ??
            statsError?.details ??
            "Failed to insert egg base stats",
        });
      }

      try {
        await grantXpToActivePet(userId, species.findXpReward);
      } catch (xpError) {
        logger.error("[kithna/roam/take] XP grant failed", xpError);
      }

      logger.info("[kithna/roam/take] egg taken", {
        userId,
        petId: insertedPet.id,
        speciesId: species.id,
        timeOfDay,
      });

      return res.json({
        taken: true,
        egg_id: insertedPet.id,
        egg_name: species.evolution.egg,
        location: "inventory",
        xp_awarded: species.findXpReward,
      });
    } catch (err: any) {
      logger.error("[kithna/roam/take] failed", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Taking the egg failed." });
    }
  },
);

// ============================================================
// POST /api/kithna/roam/leave
//
// Declines the current pending encounter without creating an egg.
// ============================================================
kithnaRouter.post(
  "/roam/leave",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    pendingRoamEncounterByUser.delete(userId);

    logger.info("[kithna/roam/leave] egg left", { userId });

    return res.json({ left: true });
  },
);
// GET /api/kithna/lost-registry
//
// Lists the current user's runaway pets still inside the 48 hour
// recovery window, each with a computed recovery cost. Independent of
// team size, this fires whenever any pet has run away, not just when
// every pet is gone.
// ============================================================
kithnaRouter.get(
  "/lost-registry",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const now = Date.now();
      const cutoff = new Date(now - LOST_REGISTRY_WINDOW_MS).toISOString();

      const { data, error } = await supabaseAdmin
        .from("pets")
        .select("id, name, species, line, level, bond, stage, runaway_at")
        .eq("user_id", userId)
        .eq("ran_away", true)
        .gte("runaway_at", cutoff)
        .order("runaway_at", { ascending: true });

      if (error) throw error;

      const pets = data ?? [];

      const entries = await Promise.all(
        pets.map(async (pet: any) => {
          const cost = await computeRecoveryCost(pet);
          const runawayAtMs = new Date(pet.runaway_at).getTime();
          const expiresAtMs = runawayAtMs + LOST_REGISTRY_WINDOW_MS;

          return {
            pet_id: pet.id,
            name: pet.name,
            species: pet.species,
            line: pet.line,
            level: pet.level,
            bond: pet.bond,
            stage: pet.stage,
            runaway_at: pet.runaway_at,
            expires_at: new Date(expiresAtMs).toISOString(),
            hours_remaining: Math.max(
              0,
              Math.round((expiresAtMs - now) / (60 * 60 * 1000)),
            ),
            dots_cost: cost.dots,
            crystals_cost: cost.crystals,
          };
        }),
      );

      return res.json({ entries });
    } catch (err: any) {
      logger.error("[kithna/lost-registry] failed", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to load lost registry." });
    }
  },
);

// ============================================================
// POST /api/kithna/lost-registry/recover
//
// Recovers a specific runaway pet if it's still inside the window and
// the user can afford it in the chosen currency. Atomic spend via the
// spend_wallet RPC, refunds automatically if the pet update fails.
// ============================================================
kithnaRouter.post(
  "/lost-registry/recover",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const petId = String(req.body?.petId ?? "").trim();
      const currency = req.body?.currency === "crystals" ? "crystals" : "dots";

      if (!petId) {
        return res.status(400).json({ error: "petId is required." });
      }

      const { data: pet, error: petError } = await supabaseAdmin
        .from("pets")
        .select("id, user_id, level, bond, ran_away, runaway_at")
        .eq("id", petId)
        .eq("user_id", userId)
        .maybeSingle();

      if (petError) throw petError;

      if (!pet) {
        return res.status(404).json({ error: "That Delta was not found." });
      }

      if (!pet.ran_away || !pet.runaway_at) {
        return res.status(400).json({ error: "That Delta has not run away." });
      }

      const runawayAtMs = new Date(pet.runaway_at).getTime();
      if (Date.now() - runawayAtMs >= LOST_REGISTRY_WINDOW_MS) {
        return res.status(400).json({
          error: "The recovery window for that Delta has expired.",
        });
      }

      const cost = await computeRecoveryCost(pet);
      const amount = currency === "crystals" ? cost.crystals : cost.dots;

      const { data: spent, error: spendError } = await supabaseAdmin.rpc(
        "spend_wallet",
        {
          p_user_id: userId,
          p_dots: currency === "dots" ? amount : 0,
          p_crystals: currency === "crystals" ? amount : 0,
        },
      );

      if (spendError) throw spendError;

      if (!spent) {
        return res
          .status(400)
          .json({ error: `Not enough ${currency} to recover this Delta.` });
      }

      const { error: updateError } = await supabaseAdmin
        .from("pets")
        .update({
          ran_away: false,
          runaway_at: null,
          is_active: false,
          location: "storage",
        })
        .eq("id", petId);

      if (updateError) {
        // Refund since the charge went through but the recovery didn't.
        await supabaseAdmin.rpc("increment_wallet", {
          p_user_id: userId,
          p_dots: currency === "dots" ? amount : 0,
          p_crystals: currency === "crystals" ? amount : 0,
        });
        throw updateError;
      }

      // Deliberately not auto-assigning a party slot here. The pet lands
      // in storage as "recovered but benched", the player adds it to
      // their team through the normal MainTeam UI when they're ready.
      logger.info("[kithna/lost-registry] pet recovered", {
        userId,
        petId,
        currency,
        amount,
      });

      return res.json({
        success: true,
        pet_id: petId,
        currency,
        amount,
      });
    } catch (err: any) {
      logger.error("[kithna/lost-registry/recover] failed", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to recover Delta." });
    }
  },
);
