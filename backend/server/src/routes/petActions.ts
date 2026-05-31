import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import {
  CooldownKey,
  assertCooldownReady,
  calcNewCooldownEndsAtIso,
  colNameForKey,
  cooldownsFromPetRow,
} from "../pets/cooldowns";
import { fetchActivePet } from "./routePets/petsRepo";
import { safeNum } from "../lib/utils";
import { validateBody } from "../middleware/validateRequest";
import { petActionSchema } from "../lib/validation";

export const petActionsRouter = Router();

type Body = {
  action: CooldownKey; // "feed" | "clean" | "play" | "bond"
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

petActionsRouter.post(
  "/do",
  requireUser,
  validateBody(petActionSchema),
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const { action } = (req.body ?? {}) as Body;

    if (
      action !== "feed" &&
      action !== "clean" &&
      action !== "play" &&
      action !== "bond"
    ) {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Always load the ACTIVE pet, not just some random pet owned by the user.
    const { pet, used } = await fetchActivePet(userId);

    if (!pet) {
      return res.status(404).json({ error: "No pet found" });
    }

    // FIXED: Removed pet.is_runaway (doesn't exist in schema)
    if (pet.ran_away) {
      return res.status(409).json({
        error: "Your pet ran away.",
        server_now: nowIso,
        pet_source: used,
        pet,
      });
    }

    // Enforce cooldown
    try {
      assertCooldownReady(pet, action, nowMs);
    } catch (e: unknown) {
      const status = e?.status ?? 409;
      return res.status(status).json({
        error: e?.message ?? "Cooldown not ready",
        server_now: nowIso,
        cooldown_key: e?.cooldown_key ?? action,
        cooldown_ends_at: e?.cooldown_ends_at ?? null,
        cooldown_remaining_ms: e?.cooldown_remaining_ms ?? null,
        pet_source: used,
      });
    }

    // Your care system is 0–50, so keep these aligned with that scale.
    const hunger = safeNum(pet.hunger, 0);
    const clean = safeNum(pet.clean, 0);
    const happy = safeNum(pet.happy, 0);
    const bond = safeNum(pet.bond, 0);

    type PetCareActionPatch = Partial<{
      hunger: number;
      clean: number;
      happy: number;
      comfort: number;
      rest: number;
      energy: number;
      bond: number;
      cd_feed_ends_at: string;
      cd_clean_ends_at: string;
      cd_play_ends_at: string;
      cd_bond_ends_at: string;
    }>;

    const patch: PetCareActionPatch = {};

    // Apply cooldown by writing ends_at column
    const col = colNameForKey(action);
    patch[col] = calcNewCooldownEndsAtIso(nowMs, action);

    if (action === "feed") {
      const nextHunger = clamp(hunger + 15, 0, 50);
      const nextHappy = clamp(happy + 3, 0, 50);

      patch.hunger = nextHunger;
      patch.happy = nextHappy;
      // FIXED: Removed patch.happiness (doesn't exist)
      // FIXED: Removed patch.last_fed_at (doesn't exist)
    }

    if (action === "clean") {
      const nextClean = clamp(clean + 15, 0, 50);
      const nextHappy = clamp(happy + 2, 0, 50);

      patch.clean = nextClean;
      // FIXED: Removed patch.cleanliness (doesn't exist)
      patch.happy = nextHappy;
      // FIXED: Removed patch.happiness (doesn't exist)
    }

    if (action === "bond") {
      patch.bond = clamp(bond + 8, 0, 100);

      const nextHappy = clamp(happy + 5, 0, 50);
      patch.happy = nextHappy;
      // FIXED: Removed patch.happiness (doesn't exist)
    }

    if (action === "play") {
      const nextHappy = clamp(happy + 8, 0, 50);
      patch.happy = nextHappy;

      patch.energy = clamp(safeNum(pet.energy, 0) - 3, 0, 100);
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("pets")
      .update(patch)
      .eq("id", pet.id)
      .select("*")
      .single();

    if (upErr) {
      return res.status(500).json({ error: "Failed to update pet" });
    }

    return res.json({
      server_now: nowIso,
      pet_source: used,
      pet: updated,
      cooldowns: cooldownsFromPetRow(updated, nowMs),
    });
  },
);
