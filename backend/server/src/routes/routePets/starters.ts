import { randomInt as cryptoRandomInt } from "crypto";
import {
  STARTER_SPROUTS as SHARED_STARTER_SPROUTS,
  findStarterByName as sharedFindStarterByName,
  getShadowNature as sharedGetShadowNature,
  getShadowSpeciesForPersonality as sharedGetShadowSpeciesForPersonality,
} from "../../shared/pets/species";
import type { Starter } from "./petsType";

export type ShadowNature = "good" | "bad";

export const STARTER_SPROUTS: Starter[] = SHARED_STARTER_SPROUTS as Starter[];

export function rollStarter(): Starter {
  const n = STARTER_SPROUTS.length;
  const idx = n > 0 ? cryptoRandomInt(n) : 0;
  return STARTER_SPROUTS[idx] ?? STARTER_SPROUTS[0];
}

export function findStarterByName(name: string | null | undefined) {
  return sharedFindStarterByName(name) as Starter | null;
}

export function getShadowNature(
  personalityKey: string | null | undefined,
): ShadowNature {
  return sharedGetShadowNature(personalityKey);
}

export function getShadowSpeciesForPersonality(
  personalityKey: string | null | undefined,
): Starter {
  const starter = sharedGetShadowSpeciesForPersonality(personalityKey);

  if (!starter) {
    throw new Error("Shadow starter species could not be resolved.");
  }

  return starter as Starter;
}
