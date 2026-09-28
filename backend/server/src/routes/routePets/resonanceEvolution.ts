import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";
import { findPetSpeciesById } from "../../shared/pets/species/all-species";
import type { PetStage } from "../../shared/types/petStages";

export const resonanceEvolutionRouter = Router();

const evolutionRequestSchema = z.object({
  fromStage: z.literal("hatchling"),
  toStage: z.literal("lowform"),
});

function getDeltaRequirement(line: string): { slug: string; quantity: number } | null {
  if (line === "null_element" || line === "voidborne") {
    return { slug: "voidborne-delta", quantity: 15 };
  }
  if (["water", "fire", "earth", "air", "ice", "storm", "light", "shadow"].includes(line)) {
    return { slug: `${line}-delta`, quantity: 10 };
  }
  return null;
}

const evolutionResultSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(false), error: z.string() }),
  z.object({
    success: z.literal(true),
    pet: z.object({
      id: z.string(), name: z.string().nullable(), species: z.string().nullable(),
      line: z.string(), stage: z.literal("lowform"),
      hp_cur: z.number(), hp_max: z.number(), xp: z.number(),
    }),
    previous_hp: z.number(), previous_hp_max: z.number(),
    consumed_deltas: z.number(), delta_slug: z.string(),
  }),
]);

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

resonanceEvolutionRouter.get(
  "/resonance-evolution/pending",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { data: pets, error: petsError } = await supabaseAdmin
        .from("pets")
        .select("id, name, nickname, species, line, hp_cur, hp_max, level")
        .eq("user_id", userId).eq("stage", "hatchling")
        .eq("ran_away", false).gte("level", 15).gt("hp_cur", 0)
        .order("id");
      if (petsError) throw petsError;
      if (!pets?.length) return res.json({ pending: [] });

      const candidates = pets.flatMap((pet) => {
        const requirement = getDeltaRequirement(String(pet.line ?? ""));
        const nextName = getEvolutionName(String(pet.species ?? ""), "lowform");
        return requirement && nextName ? [{ pet, requirement, nextName }] : [];
      });
      if (!candidates.length) return res.json({ pending: [] });

      const { data: definitions, error: definitionsError } = await supabaseAdmin
        .from("item_defs").select("id, slug")
        .in("slug", [...new Set(candidates.map(({ requirement }) => requirement.slug))]);
      if (definitionsError) throw definitionsError;
      if (!definitions?.length) return res.json({ pending: [] });

      const { data: inventory, error: inventoryError } = await supabaseAdmin
        .from("inventory").select("item_id, qty").eq("user_id", userId)
        .in("item_id", definitions.map((item) => item.id));
      if (inventoryError) throw inventoryError;
      const quantities = new Map((inventory ?? []).map((row) => [row.item_id, row.qty]));
      const itemsBySlug = new Map(definitions.map((item) => [item.slug, item.id]));

      const pending = candidates.flatMap(({ pet, requirement, nextName }) => {
        const itemId = itemsBySlug.get(requirement.slug);
        const available = itemId ? quantities.get(itemId) ?? 0 : 0;
        if (!itemId || available < requirement.quantity) return [];
        // Reserve only within this response. The commit rechecks and charges atomically.
        quantities.set(itemId, available - requirement.quantity);
        return [{
          petId: pet.id, kithName: pet.nickname?.trim() || pet.name || "",
          evolvedName: pet.nickname?.trim() || nextName,
          speciesId: pet.species, fromStage: "hatchling", toStage: "lowform",
          element: pet.line === "null_element" ? "voidborne" : pet.line,
          currentHp: pet.hp_cur, maxHp: pet.hp_max,
          level: pet.level, requiredLevel: 15, requiredDeltas: requirement.quantity,
        }];
      });
      return res.json({ pending });
    } catch (error) {
      logger.error("[resonance-evolution] eligibility check failed", error);
      return res.status(500).json({ error: "Evolution eligibility could not be checked." });
    }
  },
);

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

      const { data: pet, error: petError } = await supabaseAdmin
        .from("pets")
        .select("id, user_id, name, species, line, stage, level, hp_cur, hp_max, xp, ran_away")
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

      if (!Number.isInteger(pet.level) || pet.level < 15) {
        return res.status(409).json({
          error: "This Kith must be level 15 or higher before Resonance Evolution.",
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

      const { data, error: evolveError } = await supabaseAdmin.rpc(
        "commit_resonance_evolution",
        { p_user_id: userId, p_pet_id: petId, p_species: pet.species, p_next_name: nextName },
      );

      if (evolveError) throw evolveError;

      const result = evolutionResultSchema.parse(data);
      if (!result.success) return res.status(409).json({ error: result.error });

      logger.info("[resonance-evolution] Kith evolved", {
        userId,
        petId,
        fromStage,
        toStage,
        previousHp: result.previous_hp,
        hpCur: result.pet.hp_cur,
        consumedDeltas: result.consumed_deltas,
        deltaSlug: result.delta_slug,
      });

      return res.json({
        pet: result.pet,
        previous_hp: result.previous_hp,
        previous_hp_max: result.previous_hp_max,
        consumed_deltas: result.consumed_deltas,
        delta_slug: result.delta_slug,
      });
    } catch (error) {
      logger.error("[POST /api/pets/:petId/resonance-evolution] failed", error);
      return res.status(500).json({
        error: "Resonance Evolution could not be saved.",
      });
    }
  },
);
