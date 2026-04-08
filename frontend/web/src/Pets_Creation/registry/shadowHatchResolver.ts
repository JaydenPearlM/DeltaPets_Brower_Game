import { getShadowNature, resolveShadowSpecies } from "@shared/pets/species";

import { STARTER_SPROUTS } from "./species";
import type { Starter } from "./creationTypes";

export type ShadowMood = "good" | "bad";

function getStarterByName(name: string): Starter {
  const starter = STARTER_SPROUTS.find((s) => s.name === name);

  if (!starter) {
    throw new Error(`Starter species "${name}" not found.`);
  }

  return starter;
}

export function getShadowMood(personalityKey: string): ShadowMood {
  return getShadowNature(personalityKey);
}

export function getShadowColor(personalityKey: string): string {
  return getShadowMood(personalityKey) === "good" ? "#ff7a18" : "#9b5cff";
}

export function getShadowHatchSpecies(personalityKey: string): Starter {
  const species = resolveShadowSpecies(personalityKey);

  if (!species) {
    throw new Error("Shadow hatch species could not be resolved.");
  }

  return getStarterByName(species.evolution.hatchling);
}
