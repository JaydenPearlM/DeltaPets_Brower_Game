import type { Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth";
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { safeNum } from "../../lib/utils";
import { careSnapshot, normalizePetForClient } from "../../lib/petCareHelpers";
import { applyCareDecay } from "../../shared/pets/care/CareDecay";
import { fetchActivePet } from "../routePets/petsRepo";
import { calcNewCooldownEndsAtIso, colNameForKey, cooldownsFromPetRow } from "../../pets/cooldowns";

const actionSchema = z.enum(["feed", "clean", "play", "bond", "pet"]);
export type OwnedCareAction = z.infer<typeof actionSchema>;
const actionBody = z.object({ action: actionSchema }).strict();
const numeric = z.number().nullable().optional();
const petSchema = z.object({
  id: z.string().uuid(),
  hunger: numeric, clean: numeric, happy: numeric, comfort: numeric,
  rest: numeric, energy: numeric, bond: numeric, neglect_hours: numeric,
  ran_away: z.boolean().nullable().optional(),
  runaway_at: z.string().nullable().optional(),
  last_care_decay_at: z.string().nullable().optional(),
  personality_key: z.string().nullable().optional(),
  hatch_time_alignment: z.string().nullable().optional(),
}).passthrough();
const clamp = (value: number, max = 50) => Math.max(0, Math.min(max, value));

export async function performOwnedCare(userId: string, action: OwnedCareAction) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { pet: rawPet, used } = await fetchActivePet(userId);
    if (!rawPet) throw new AppError("No active pet found.", 404);
    const pet = petSchema.parse(rawPet);
    if (pet.ran_away) throw new AppError("Your pet ran away.", 409);
    const nowMs = Date.now();
    const patch: Record<string, unknown> = {};

    // Preserve the effects of the actual PetPage actions, including petting decay.
    if (action === "pet") {
      const current = applyCareDecay(normalizePetForClient(pet));
      if (current.ran_away) throw new AppError("Your pet ran away.", 409);
      Object.assign(patch, {
        hunger: current.hunger, clean: current.clean,
        happy: clamp(safeNum(current.happy, 50) + 5),
        comfort: clamp(safeNum(current.comfort, 50) + 10),
        rest: current.rest, energy: current.energy,
        neglect_hours: Math.max(0, Math.round(safeNum(current.neglect_hours))),
        ran_away: false, runaway_at: current.runaway_at ?? null,
        last_care_decay_at: new Date(nowMs).toISOString(),
      });
    } else {
      patch[colNameForKey(action)] = calcNewCooldownEndsAtIso(nowMs, action);
      if (action === "feed") {
        patch.hunger = clamp(safeNum(pet.hunger) + 15);
        patch.happy = clamp(safeNum(pet.happy) + 3);
      } else if (action === "clean") {
        patch.clean = clamp(safeNum(pet.clean) + 15);
        patch.happy = clamp(safeNum(pet.happy) + 2);
      } else if (action === "play") {
        patch.happy = clamp(safeNum(pet.happy) + 8);
        patch.energy = clamp(safeNum(pet.energy) - 3, 100);
      } else {
        patch.bond = clamp(safeNum(pet.bond) + 8, 100);
        patch.happy = clamp(safeNum(pet.happy) + 5);
      }
    }

    const { data, error } = await supabaseAdmin.rpc("perform_owned_care", {
      p_user_id: userId, p_pet_id: pet.id, p_action: action,
      p_expected: careSnapshot(pet), p_patch: patch,
    });
    if (error) {
      if (error.code === "P0001" && error.message === "CARE_STALE") continue;
      const messages: Record<string, string> = {
        CARE_NO_PET: "No active pet found.",
        CARE_RUNAWAY: "Your pet ran away.",
        CARE_NO_ITEM: "You need an owned care item in your server inventory first.",
        CARE_COOLDOWN: "That care action is still cooling down.",
      };
      if (error.code === "P0001" && messages[error.message]) {
        throw new AppError(messages[error.message], error.message === "CARE_NO_PET" ? 404 : 409);
      }
      throw new AppError("Failed to perform care action.", 500);
    }
    const result = z.object({ pet: petSchema, consumed_slug: z.string().nullable() }).parse(data);
    return {
      success: true, server_now: new Date(nowMs).toISOString(), pet_source: used,
      pet: result.pet, consumed_slug: result.consumed_slug,
      cooldowns: cooldownsFromPetRow(result.pet, nowMs),
    };
  }
  throw new AppError("Your pet changed during care. Please try again.", 409);
}

export function ownedCareHandler(fixedAction?: OwnedCareAction) {
  return async (req: AuthedRequest, res: Response) => {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const parsed = (fixedAction ? z.object({}).strict() : actionBody).safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid care action body." });
    try {
      const action = fixedAction ?? actionBody.parse(parsed.data).action;
      return res.json(await performOwnedCare(req.user.id, action));
    } catch (error) {
      return res.status(error instanceof AppError ? error.statusCode : 500).json({
        error: error instanceof AppError ? error.message : "Failed to perform care action.",
      });
    }
  };
}
