// src/Pets_Creation/registry/shadowHatchResolver.ts
import type { Starter } from "./creationTypes";
import { STARTER_SPROUTS } from "./species";

export type ShadowMood = "violet" | "crimson";

const SHADOW_PERSONALITY_MAP: Record<string, ShadowMood> = {
  loyalist: "violet",
  radiant: "violet",
  guardian: "violet",
  gentle: "violet",
  royal: "violet",
  scholar: "violet",
  dreamer: "violet",
  stoic: "violet",
  brightspark: "violet",

  gremlin: "crimson",
  shadowed: "crimson",
  feral: "crimson",
  blazeborn: "crimson",
  wildheart: "crimson",
  glutton: "crimson",
  prankster: "crimson",
  drifter: "crimson",
  anxious: "crimson",
};

function getStarterByName(name: string): Starter {
  const starter = STARTER_SPROUTS.find((s) => s.name === name);

  if (!starter) {
    throw new Error(`Starter species "${name}" not found.`);
  }

  return starter;
}

export function getShadowMood(personalityKey: string): ShadowMood {
  return SHADOW_PERSONALITY_MAP[personalityKey] ?? "violet";
}

export function getShadowColor(personalityKey: string): string {
  return getShadowMood(personalityKey) === "violet" ? "#9b5cff" : "#ff3b3b";
}

export function getShadowHatchSpecies(personalityKey: string): Starter {
  const mood = getShadowMood(personalityKey);
  return mood === "violet"
    ? getStarterByName("Noctimp")
    : getStarterByName("Flareclaw");
}
