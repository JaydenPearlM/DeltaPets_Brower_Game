// ========================================
// shared/pets/species.ts
// Shared species registry
// ========================================

import type { PetStage } from "../types/petStages";

export type SharedElementLine =
  | "null_element"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

export type SharedBaseStats = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
  base_total: number;
};

export type ShadowNature = "good" | "bad";
export type WorldTimeState = "day" | "night";

export type SpeciesEvolution = {
  egg: string;
  hatchling: string;
  lowform: string;
  highform: string;
  legion: string;
  mythical_legendary: string | null;
};

export type SharedSpecies = {
  id: string;
  line: SharedElementLine;
  variant?: ShadowNature | null;
  preferredTime?: WorldTimeState | null;
  evolution: SpeciesEvolution;
  eggBaseStats: SharedBaseStats;
};

/**
 * Legacy/shared starter shape used by some route files.
 * Keep this export for compatibility with routePets/starters.ts and frontend imports.
 */
export type StarterSprout = {
  speciesId: string;
  line: SharedElementLine;
  variant?: ShadowNature | null;
  preferredTime?: WorldTimeState | null;
  eggName: string;
  hatchlingName: string;
  lowformName: string;
  highformName: string;
  legionName: string;
  mythicalLegendaryName: string | null;
  baseStats: SharedBaseStats;
};

/**
 * Older starter shape still used in parts of the app.
 * "name" should remain the egg name so any old code that reads starter.name
 * still creates eggs, not lowforms.
 */
export type SharedStarter = {
  name: string;
  line: SharedElementLine;
  baseStats: SharedBaseStats;
  speciesId: string;
  variant?: ShadowNature | null;
  preferredTime?: WorldTimeState | null;
};

const GOOD_SHADOW_PERSONALITIES = new Set([
  "loyalist",
  "radiant",
  "guardian",
  "gentle",
  "royal",
  "scholar",
  "dreamer",
  "stoic",
  "brightspark",
]);

const BAD_SHADOW_PERSONALITIES = new Set([
  "gremlin",
  "shadowed",
  "feral",
  "blazeborn",
  "wildheart",
  "glutton",
  "prankster",
  "drifter",
  "anxious",
]);

export const SHARED_SPECIES: SharedSpecies[] = [
  {
    id: "water_starter",
    line: "water",
    evolution: {
      egg: "Water Egg",
      hatchling: "Mizu",
      lowform: "Mizule",
      highform: "Zulelon",
      legion: "Aquilyth",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 1,
      atk: 1,
      magi: 3,
      def: 2,
      spd: 2,
      mana: 1,
      base_total: 10,
    },
  },
  {
    id: "fire_starter",
    line: "fire",
    evolution: {
      egg: "Fire Egg",
      hatchling: "Kindlekin",
      lowform: "Moltikyn",
      highform: "Magnakyn",
      legion: "Lavakyn",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 2,
      atk: 3,
      magi: 1,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
  {
    id: "earth_starter",
    line: "earth",
    evolution: {
      egg: "Earth Egg",
      hatchling: "Twiglet",
      lowform: "Rootle",
      highform: "Radaroot",
      legion: "Roovine",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 2,
      atk: 1,
      magi: 2,
      def: 2,
      spd: 1,
      mana: 2,
      base_total: 10,
    },
  },
  {
    id: "air_starter",
    line: "air",
    evolution: {
      egg: "Air Egg",
      hatchling: "Wistpip",
      lowform: "Zephyx",
      highform: "Phyxlion",
      legion: "Phyxion",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 1,
      atk: 2,
      magi: 2,
      def: 1,
      spd: 4,
      mana: 0,
      base_total: 10,
    },
  },
  {
    id: "ice_starter",
    line: "ice",
    evolution: {
      egg: "Ice Egg",
      hatchling: "Cribi",
      lowform: "Cribit",
      highform: "Crabbit",
      legion: "Crionyx",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 2,
      atk: 0,
      magi: 2,
      def: 1,
      spd: 2,
      mana: 3,
      base_total: 10,
    },
  },
  {
    id: "storm_starter",
    line: "storm",
    evolution: {
      egg: "Storm Egg",
      hatchling: "Volb",
      lowform: "Voltlet",
      highform: "Tovote",
      legion: "Voltaris",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 1,
      atk: 5,
      magi: 0,
      def: 0,
      spd: 4,
      mana: 0,
      base_total: 10,
    },
  },
  {
    id: "light_starter",
    line: "light",
    evolution: {
      egg: "Light Egg",
      hatchling: "Solen",
      lowform: "Solkit",
      highform: "Solaryn",
      legion: "Angelyx",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 2,
      atk: 2,
      magi: 2,
      def: 2,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    id: "shadow_night_bad",
    line: "shadow",
    variant: "bad",
    preferredTime: "night",
    evolution: {
      egg: "Night Shadow Egg",
      hatchling: "Esperon",
      lowform: "Noctimp",
      highform: "Nightmareimp",
      legion: "Espereonite",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 1,
      atk: 0,
      magi: 4,
      def: 1,
      spd: 1,
      mana: 3,
      base_total: 10,
    },
  },
  {
    id: "shadow_day_good",
    line: "shadow",
    variant: "good",
    preferredTime: "day",
    evolution: {
      egg: "Day Shadow Egg",
      hatchling: "Esperon",
      lowform: "Flareclaw",
      highform: "Shadeclaw",
      legion: "Nightvielclaw",
      mythical_legendary: null,
    },
    eggBaseStats: {
      hp: 1,
      atk: 4,
      magi: 1,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
];

export const PET_STAGES: PetStage[] = [
  "egg",
  "hatchling",
  "lowform",
  "highform",
  "legion",
  "mythical_legendary",
];

/**
 * Compatibility export for code that still expects a flat starter list.
 * Important: name = egg name.
 */
export const SHARED_STARTER_SPROUTS: SharedStarter[] = SHARED_SPECIES.map(
  (species) => ({
    name: species.evolution.egg,
    line: species.line,
    baseStats: species.eggBaseStats,
    speciesId: species.id,
    variant: species.variant ?? null,
    preferredTime: species.preferredTime ?? null,
  }),
);

/**
 * Compatibility export expected by routePets/starters.ts and frontend registry code.
 */
export const STARTER_SPROUTS: StarterSprout[] = SHARED_SPECIES.map(
  (species) => ({
    speciesId: species.id,
    line: species.line,
    variant: species.variant ?? null,
    preferredTime: species.preferredTime ?? null,
    eggName: species.evolution.egg,
    hatchlingName: species.evolution.hatchling,
    lowformName: species.evolution.lowform,
    highformName: species.evolution.highform,
    legionName: species.evolution.legion,
    mythicalLegendaryName: species.evolution.mythical_legendary,
    baseStats: species.eggBaseStats,
  }),
);

export function getAllSharedSpecies(): SharedSpecies[] {
  return SHARED_SPECIES;
}

export function getSpeciesStageName(
  species: SharedSpecies,
  stage: PetStage,
): string | null {
  switch (stage) {
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

export function isValidPetStage(stage: string): stage is PetStage {
  return PET_STAGES.includes(stage as PetStage);
}

export function getShadowNature(
  personalityKey: string | null | undefined,
): ShadowNature {
  const key = (personalityKey ?? "").trim().toLowerCase();
  if (BAD_SHADOW_PERSONALITIES.has(key)) return "bad";
  if (GOOD_SHADOW_PERSONALITIES.has(key)) return "good";
  return "good";
}

export function resolveShadowSpecies(
  personalityKey?: string | null,
  worldTime?: WorldTimeState | null,
): SharedSpecies | null {
  const nature = getShadowNature(personalityKey);

  const exact = SHARED_SPECIES.find(
    (species) =>
      species.line === "shadow" &&
      species.variant === nature &&
      (!worldTime || species.preferredTime === worldTime),
  );
  if (exact) return exact;

  return (
    SHARED_SPECIES.find(
      (species) => species.line === "shadow" && species.variant === nature,
    ) ?? null
  );
}

export function getStarterSpeciesFromSelection(
  line: SharedElementLine,
  personalityKey?: string | null,
  worldTime?: WorldTimeState | null,
): SharedSpecies | null {
  if (line === "shadow") {
    return resolveShadowSpecies(personalityKey, worldTime);
  }

  return SHARED_SPECIES.find((species) => species.line === line) ?? null;
}

/**
 * Compatibility lookup for old code. Returns the flat starter record.
 */
export function findStarterByName(
  name: string | null | undefined,
): StarterSprout | null {
  const normalized = (name ?? "").trim().toLowerCase();
  if (!normalized) return null;

  return (
    STARTER_SPROUTS.find((starter) =>
      [
        starter.eggName,
        starter.hatchlingName,
        starter.lowformName,
        starter.highformName,
        starter.legionName,
        starter.mythicalLegendaryName,
      ]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase() === normalized),
    ) ?? null
  );
}

export function findSpeciesByAnyStageName(
  name: string | null | undefined,
): SharedSpecies | null {
  const normalized = (name ?? "").trim().toLowerCase();
  if (!normalized) return null;

  return (
    SHARED_SPECIES.find((species) =>
      [
        species.evolution.egg,
        species.evolution.hatchling,
        species.evolution.lowform,
        species.evolution.highform,
        species.evolution.legion,
        species.evolution.mythical_legendary,
      ]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase() === normalized),
    ) ?? null
  );
}
