// frontend/web/src/Pets_Creation/registry/shadowHatchResolver.ts

import {
  STARTER_SPROUTS,
  getShadowNature,
  getShadowSpeciesForPersonality,
} from "@shared/pets/species";
import type { Starter } from "./creationTypes";

export type ShadowMood = "good" | "bad";

function getStarterByName(name: string): Starter {
  const starter = STARTER_SPROUTS.find((s) => s.name === name);

  if (!starter) {
    throw new Error(`Starter species "${name}" not found.`);
  }

  return starter as Starter;
}

export function getShadowMood(personalityKey: string): ShadowMood {
  return getShadowNature(personalityKey);
}

export function getShadowColor(personalityKey: string): string {
  return getShadowMood(personalityKey) === "good" ? "#ff7a18" : "#9b5cff";
}

export function getShadowHatchSpecies(personalityKey: string): Starter {
  const starter = getShadowSpeciesForPersonality(personalityKey);

  if (!starter) {
    throw new Error("Shadow hatch species could not be resolved.");
  }

  return getStarterByName(starter.name);
}
