import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";
import { findPetSpeciesById } from "../../shared/pets/species/all-species";
import type { PetStage } from "../../shared/types/petStages";

export const resonanceEvolutionRouter = Router();

const PET_STAGE_ORDER: readonly PetStage[] = [
  "egg",
  "hatchling",
  "lowform",
  "highform",
  "legion",
  "mythical_legendary",
];

const evolutionRequestSchema = z.object({
  fromStage: z.enum([
    "egg",
    "hatchling",
    "lowform",
    "highform",
    "legion",
    "mythical_legendary",
  ]),
  toStage: z.enum([
    "egg",
    "hatchling",
    "lowform",
    "highform",
    "legion",
    "mythical_legendary",
  ]),
});

function isNextStage(fromStage: PetStage, toStage: PetStage): boolean {
  const index = PET_STAGE_ORDER.indexOf(fromStage);
  return index >= 0 && PET_STAGE_ORDER[index + 1] === toStage;
}

function getEvolutionName(
  speciesId: string,
  toStage: PetStage,
): string | null {
  const species = findPetSpeciesById(speciesId);

  if (!species || !("evolution" in species)) {
    return null;
  }

  switch (toStage) {
    case "egg":
      return species.evolution.egg;
    case "hatchling":
      return species.evolution.hatchling;
    case "lowform":
      return species.evolution.lowform;
    case "highform":
      return species.evolution.highform;
    case "legion":
      return species.evolution.legion;
    case "mythical_legendary":
      return species.evolution.mythical_legendary;
    default:
      return null;
  }
}

resonanceEvolutionRouter.post(
  "/:petId/resonance-evolution",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const petId = String(req.params.petId ?? "").trim();
      const parsed = evolutionRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid Resonance Evolution stage transition.",
        });
      }

      const { fromStage, toStage } = parsed.data;

      if (!isNextStage(fromStage, toStage) || fromStage === "egg") {
        return res.status(409).json({
          error: "Resonance Evolution requires the next valid post-hatch stage.",
        });
      }

      const { data: pet, error: petError } = await supabaseAdmin
        .from("pets")
        .select("id, user_id, name, species, line, stage, hp_cur, hp_max, xp, ran_away")
        .eq("id", petId)
        .eq("user_id", userId)
        .maybeSingle();

      if (petError) throw petError;

      if (!pet) {
        return res.status(404).json({ error: "Kith not found." });
      }

      if (pet.ran_away) {
        return res.status(409).json({
          error: "A runaway Kith cannot evolve.",
        });
      }

      if (pet.stage !== fromStage) {
        return res.status(409).json({
          error: "This Kith has already changed stage. Refresh and try again.",
        });
      }

      if (Number(pet.hp_cur ?? 0) <= 0) {
        return res.status(409).json({
          error: "This Kith must be conscious before Resonance Evolution.",
        });
      }

      const nextName = getEvolutionName(String(pet.species ?? ""), toStage);

      if (!nextName) {
        return res.status(409).json({
          error: "This Kith does not have a configured evolution for that stage.",
        });
      }

      const previousHp = Number(pet.hp_cur ?? 1);
      const previousHpMax = Math.max(1, Number(pet.hp_max ?? 1));

      const { data: evolved, error: evolveError } = await supabaseAdmin
        .from("pets")
        .update({
          stage: toStage,
          name: nextName,
          hp_cur: 1,
        })
        .eq("id", petId)
        .eq("user_id", userId)
        .eq("stage", fromStage)
        .select("id, name, species, line, stage, hp_cur, hp_max, xp")
        .maybeSingle();

      if (evolveError) throw evolveError;

      if (!evolved) {
        return res.status(409).json({
          error: "Evolution state changed before it could be saved.",
        });
      }

      logger.info("[resonance-evolution] Kith evolved", {
        userId,
        petId,
        fromStage,
        toStage,
        previousHp,
        hpCur: evolved.hp_cur,
      });

      return res.json({
        pet: evolved,
        previous_hp: previousHp,
        previous_hp_max: previousHpMax,
      });
    } catch (error) {
      logger.error("[POST /api/pets/:petId/resonance-evolution] failed", error);
      return res.status(500).json({
        error: "Resonance Evolution could not be saved.",
      });
    }
  },
);
