import type {
  SharedBaseStats,
  SharedElementLine,
  SpeciesEvolution,
  WorldTimeState,
} from "./starter-species";
import type {
  PetSpeciesIdentity,
  PetSpeciesRules,
  SharedBaseStats,
  SharedElementLine,
  SpeciesEvolution,
  WorldTimeState,
} from "../petSpeciesTypes";
import { isVoidborneLine, VOIDBORNE_RULES } from "./voidborne";

export const EGG_FIND_XP_REWARD = 30 as const;

export type KithnaEggPool = "day" | "night";

export type KithnaEggVisual = {
  element: SharedElementLine;
  displayName: string;
  eggName: string;
  shellColor: string;
  markingColor: string;
  glowColor: string;
};

export type KithnaNonStarterSpecies = {
  id: string;
  region: "kithna";
  tutorialLocked: boolean;
  line: SharedElementLine;
  preferredTime: WorldTimeState;
  eggPool: KithnaEggPool;
  evolution: SpeciesEvolution;
  eggBaseStats: SharedBaseStats;
  eggVisual: KithnaEggVisual;
  canRollAliuneCorruption: boolean;
  corruptedImage: null;
  findXpReward: typeof EGG_FIND_XP_REWARD;
};

export type KithnaPetTemplate = {
  id: string;
  line: SharedElementLine;
  preferredTime: WorldTimeState;
  hatchling: string;
  lowform: string;
  highform: string;
  legion: string;
  mythical_legendary?: string | null;
};

// NOTE: eggName values here are deliberately NOT "Water Egg" / "Earth Egg" /
// "Ice Egg" etc, those already belong to the starter system in species.ts.
// fetchStarterPetAnyStage() matches pets by name across every starter stage
// name, so reusing those names would make a roaming-found egg get mistaken
// for the player's starter egg. Kept distinct on purpose.
export const KITHNA_EGG_VISUALS: Record<SharedElementLine, KithnaEggVisual> = {
  null_element: {
    element: "null_element",
    displayName: "Neutral",
    eggName: "Kithna Bronzeheart Egg",
    shellColor: "bronze",
    markingColor: "pearl",
    glowColor: "soft bronze",
  },
  water: {
    element: "water",
    displayName: "Water",
    eggName: "Kithna Tideheart Egg",
    shellColor: "blue",
    markingColor: "aqua",
    glowColor: "soft blue",
  },
  fire: {
    element: "fire",
    displayName: "Fire",
    eggName: "Kithna Embercore Egg",
    shellColor: "red",
    markingColor: "orange",
    glowColor: "warm gold",
  },
  earth: {
    element: "earth",
    displayName: "Earth",
    eggName: "Kithna Rootbound Egg",
    shellColor: "brown",
    markingColor: "green",
    glowColor: "soft moss",
  },
  air: {
    element: "air",
    displayName: "Air",
    eggName: "Kithna Skywhorl Egg",
    shellColor: "sky blue",
    markingColor: "white",
    glowColor: "pale cyan",
  },
  ice: {
    element: "ice",
    displayName: "Ice",
    eggName: "Kithna Frostveil Egg",
    shellColor: "ice blue",
    markingColor: "white",
    glowColor: "frost blue",
  },
  storm: {
    element: "storm",
    displayName: "Storm",
    eggName: "Kithna Thundercrest Egg",
    shellColor: "violet",
    markingColor: "yellow",
    glowColor: "electric purple",
  },
  light: {
    element: "light",
    displayName: "Light",
    eggName: "Kithna Dawnshard Egg",
    shellColor: "gold",
    markingColor: "cream",
    glowColor: "soft gold",
  },
  shadow: {
    element: "shadow",
    displayName: "Shadow",
    eggName: "Kithna Duskmire Egg",
    shellColor: "deep purple",
    markingColor: "black",
    glowColor: "violet",
  },
};

const BALANCED_EGG_STATS: SharedBaseStats = {
  hp: 2,
  atk: 2,
  magi: 2,
  def: 1,
  spd: 2,
  mana: 1,
  base_total: 10,
};

export function createKithnaNonStarterSpecies(
  template: KithnaPetTemplate,
): KithnaNonStarterSpecies {
  const eggVisual = KITHNA_EGG_VISUALS[template.line];

  return {
    id: template.id,
    region: "kithna",
    tutorialLocked: true,
    line: template.line,
    preferredTime: template.preferredTime,
    eggPool: template.preferredTime,
    evolution: {
      egg: eggVisual.eggName,
      hatchling: template.hatchling,
      lowform: template.lowform,
      highform: template.highform,
      legion: template.legion,
      mythical_legendary: template.mythical_legendary ?? null,
    },
    eggBaseStats: BALANCED_EGG_STATS,
    eggVisual,
    canRollAliuneCorruption: true,
    corruptedImage: null,
    findXpReward: EGG_FIND_XP_REWARD,
  };
}

// KITHNA EGG NAME / ELEMENT QUICK LIST
// null_element: KITHNA_EGG_VISUALS.null_element.eggName // "Kithna Bronzeheart Egg" / Neutral / bronze egg
// water: KITHNA_EGG_VISUALS.water.eggName // "Kithna Tideheart Egg"
// fire: KITHNA_EGG_VISUALS.fire.eggName // "Kithna Embercore Egg"
// earth: KITHNA_EGG_VISUALS.earth.eggName // "Kithna Rootbound Egg"
// air: KITHNA_EGG_VISUALS.air.eggName // "Kithna Skywhorl Egg"
// ice: KITHNA_EGG_VISUALS.ice.eggName // "Kithna Frostveil Egg"
// storm: KITHNA_EGG_VISUALS.storm.eggName // "Kithna Thundercrest Egg"
// light: KITHNA_EGG_VISUALS.light.eggName // "Kithna Dawnshard Egg"
// shadow: KITHNA_EGG_VISUALS.shadow.eggName // "Kithna Duskmire Egg"
//
// COPY/PASTE PET TEMPLATE
// Paste this inside KITHNA_NON_STARTER_SPECIES after filling every blank.
// This only asks for the character identity. The egg name, egg visuals,
// egg stats, region, find XP, and corruption settings are filled by code.
//
// createKithnaNonStarterSpecies({
//   id: "kithna_day_pet_00",
//   line: "water",
//   preferredTime: "day",
//   hatchling: "",
//   lowform: "",
//   highform: "",
//   legion: "",
//   mythical_legendary: null,
// }),
//
// PLACEHOLDER NAMES: every hatchling/lowform/highform/legion name below is a
// placeholder, picked only to be distinct from existing species and to ship
// today. Swap any of these anytime, they are plain strings, nothing else in
// the codebase reads or depends on the specific text.

// KITHNA EGG NAME / ELEMENT QUICK LIST
// null_element: KITHNA_EGG_VISUALS.null_element.eggName // "Kithna Silvervoid Egg"
// water: KITHNA_EGG_VISUALS.water.eggName // "Kithna Tideheart Egg"
// fire: KITHNA_EGG_VISUALS.fire.eggName // "Kithna Embercore Egg"
// earth: KITHNA_EGG_VISUALS.earth.eggName // "Kithna Rootbound Egg"
// air: KITHNA_EGG_VISUALS.air.eggName // "Kithna Skywhorl Egg"
// ice: KITHNA_EGG_VISUALS.ice.eggName // "Kithna Frostveil Egg"
// storm: KITHNA_EGG_VISUALS.storm.eggName // "Kithna Thundercrest Egg"
// light: KITHNA_EGG_VISUALS.light.eggName // "Kithna Dawnshard Egg"
// shadow: KITHNA_EGG_VISUALS.shadow.eggName // "Kithna Duskmire Egg"
//
// COPY/PASTE PET TEMPLATE
// Paste this inside KITHNA_NON_STARTER_SPECIES after filling every blank.
// Keep line and eggVisual using the same element.
// Keep preferredTime and eggPool matching: day/day or night/night.
//
// {
//   id: "kithna_day_pet_00",
//   region: "kithna",
//   tutorialLocked: true,
//   line: "water",
//   preferredTime: "day",
//   eggPool: "day",
//   evolution: {
//     egg: KITHNA_EGG_VISUALS.water.eggName,
//     hatchling: "",
//     lowform: "",
//     highform: "",
//     legion: "",
//     mythical_legendary: null,
//   },
//   eggBaseStats: BALANCED_EGG_STATS,
//   eggVisual: KITHNA_EGG_VISUALS.water,
//   canRollAliuneCorruption: true,
//   corruptedImage: null,
//   findXpReward: EGG_FIND_XP_REWARD,
// },
//
// PLACEHOLDER NAMES: every hatchling/lowform/highform/legion name below is a
// placeholder, picked only to be distinct from existing species and to ship
// today. Swap any of these anytime, they are plain strings, nothing else in
// the codebase reads or depends on the specific text.
export const KITHNA_NON_STARTER_SPECIES: KithnaNonStarterSpecies[] = [
  {
    id: "kithna_day_pet_01",
    region: "kithna",
    tutorialLocked: true,
    line: "water",
    preferredTime: "day",
    eggPool: "day",
    evolution: {
      egg: KITHNA_EGG_VISUALS.water.eggName,
      hatchling: "Ripplin",
      lowform: "Ripplume",
      highform: "Tidelume",
      legion: "Tidalyn",
      mythical_legendary: null,
    },
    eggBaseStats: BALANCED_EGG_STATS,
    eggVisual: KITHNA_EGG_VISUALS.water,
    canRollAliuneCorruption: true,
    corruptedImage: null,
    findXpReward: EGG_FIND_XP_REWARD,
  },
  {
    id: "kithna_day_pet_02",
    region: "kithna",
    tutorialLocked: true,
    line: "earth",
    preferredTime: "day",
    eggPool: "day",
    evolution: {
      egg: KITHNA_EGG_VISUALS.earth.eggName,
      hatchling: "Peblin",
      lowform: "Peblorn",
      highform: "Boulderin",
      legion: "Terralith",
      mythical_legendary: null,
    },
    eggBaseStats: BALANCED_EGG_STATS,
    eggVisual: KITHNA_EGG_VISUALS.earth,
    canRollAliuneCorruption: true,
    corruptedImage: null,
    findXpReward: EGG_FIND_XP_REWARD,
  },
  {
    id: "kithna_day_pet_03",
    region: "kithna",
    tutorialLocked: true,
    line: "light",
    preferredTime: "day",
    eggPool: "day",
    evolution: {
      egg: KITHNA_EGG_VISUALS.light.eggName,
      hatchling: "Glimmet",
      lowform: "Glimmeryn",
      highform: "Lumeryn",
      legion: "Lumaris",
      mythical_legendary: null,
    },
    eggBaseStats: BALANCED_EGG_STATS,
    eggVisual: KITHNA_EGG_VISUALS.light,
    canRollAliuneCorruption: true,
    corruptedImage: null,
    findXpReward: EGG_FIND_XP_REWARD,
  },
  {
    id: "kithna_night_pet_01",
    region: "kithna",
    tutorialLocked: true,
    line: "ice",
    preferredTime: "night",
    eggPool: "night",
    evolution: {
      egg: KITHNA_EGG_VISUALS.ice.eggName,
      hatchling: "Frilo",
      lowform: "Frilyn",
      highform: "Glacilyn",
      legion: "Glaciaris",
      mythical_legendary: null,
    },
    eggBaseStats: BALANCED_EGG_STATS,
    eggVisual: KITHNA_EGG_VISUALS.ice,
    canRollAliuneCorruption: true,
    corruptedImage: null,
    findXpReward: EGG_FIND_XP_REWARD,
  },
  {
    id: "kithna_night_pet_02",
    region: "kithna",
    tutorialLocked: true,
    line: "storm",
    preferredTime: "night",
    eggPool: "night",
    evolution: {
      egg: KITHNA_EGG_VISUALS.storm.eggName,
      hatchling: "Fulgus",
      lowform: "Fulgorn",
      highform: "Fulgarin",
      legion: "Fulgurex",
      mythical_legendary: null,
    },
    eggBaseStats: BALANCED_EGG_STATS,
    eggVisual: KITHNA_EGG_VISUALS.storm,
    canRollAliuneCorruption: true,
    corruptedImage: null,
    findXpReward: EGG_FIND_XP_REWARD,
  },
  {
    id: "kithna_night_pet_03",
    region: "kithna",
    tutorialLocked: true,
    line: "shadow",
    preferredTime: "night",
    eggPool: "night",
    evolution: {
      egg: KITHNA_EGG_VISUALS.shadow.eggName,
      hatchling: "Murklin",
      lowform: "Murkrin",
      highform: "Duskarin",
      legion: "Duskavus",
      mythical_legendary: null,
    },
    eggBaseStats: BALANCED_EGG_STATS,
    eggVisual: KITHNA_EGG_VISUALS.shadow,
    canRollAliuneCorruption: true,
    corruptedImage: null,
    findXpReward: EGG_FIND_XP_REWARD,
  },
];

export function getKithnaNonStarterSpecies(): KithnaNonStarterSpecies[] {
  return KITHNA_NON_STARTER_SPECIES;
}

export function getKithnaEggsForTime(
  preferredTime: WorldTimeState,
): KithnaNonStarterSpecies[] {
  return KITHNA_NON_STARTER_SPECIES.filter(
    (species) => species.preferredTime === preferredTime,
  );
}

export function findKithnaNonStarterByEggName(
  eggName: string | null | undefined,
): KithnaNonStarterSpecies | null {
  const normalized = (eggName ?? "").trim().toLowerCase();
  if (!normalized) return null;

  return (
    KITHNA_NON_STARTER_SPECIES.find(
      (species) => species.evolution.egg.toLowerCase() === normalized,
    ) ?? null
  );
}
