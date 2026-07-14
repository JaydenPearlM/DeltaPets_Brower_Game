// ========================================
// shared/pets/species/kithna-species.ts
// Wild Kithna species only. Starter species live in starter-species.ts.
// ========================================

import type {
  SharedBaseStats,
  SharedElementLine,
  SpeciesEvolution,
} from "./starter-species";
import type { PetSpeciesIdentity, PetSpeciesRules } from "./pet-species-types";

import { isVoidborneLine, VOIDBORNE_RULES } from "./voidborne";

export const EGG_FIND_XP_REWARD = 30 as const;

export type KithnaEggVisual = {
  element: SharedElementLine;
  displayName: string;
  eggName: string;
  shellColor: string;
  markingColor: string;
  glowColor: string;
};

export type KithnaNonStarterSpecies = PetSpeciesIdentity & {
  source: "kithna";
  region: "kithna";
  tutorialLocked: boolean;
  eggVisual: KithnaEggVisual;
  canRollAliuneCorruption: boolean;
  corruptedImage: null;
  findXpReward: typeof EGG_FIND_XP_REWARD;
};

export type KithnaPetTemplate = {
  id: string;
  line: SharedElementLine;
  hatchling: string;
  lowform: string;
  highform: string;

  /**
   * Legion is required for every species.
   */
  legion: string;

  /**
   * Mythical Legendary may not exist yet.
   */
  mythical_legendary: string | null;

  eggBaseStats?: SharedBaseStats;
  rules?: Partial<PetSpeciesRules>;
};

/**
 * Canonical elemental egg visuals used by normal Kithna encounters.
 * Mystery Egg remains exclusive to the starter flow.
 */
export const KITHNA_EGG_VISUALS: Record<SharedElementLine, KithnaEggVisual> = {
  null_element: {
    element: "null_element",
    displayName: "Voidborne",
    eggName: "Bronzeheart Egg",
    shellColor: "bronze",
    markingColor: "pearl",
    glowColor: "soft bronze",
  },

  water: {
    element: "water",
    displayName: "Water",
    eggName: "Tide Egg",
    shellColor: "blue",
    markingColor: "aqua",
    glowColor: "soft blue",
  },

  fire: {
    element: "fire",
    displayName: "Fire",
    eggName: "Ember Egg",
    shellColor: "red",
    markingColor: "orange",
    glowColor: "warm gold",
  },

  earth: {
    element: "earth",
    displayName: "Earth",
    eggName: "Grove Egg",
    shellColor: "brown",
    markingColor: "green",
    glowColor: "soft moss",
  },

  air: {
    element: "air",
    displayName: "Air",
    eggName: "Zephyr Egg",
    shellColor: "sky blue",
    markingColor: "white",
    glowColor: "pale cyan",
  },

  ice: {
    element: "ice",
    displayName: "Ice",
    eggName: "Frostveil Egg",
    shellColor: "ice blue",
    markingColor: "white",
    glowColor: "frost blue",
  },

  storm: {
    element: "storm",
    displayName: "Storm",
    eggName: "Storm Egg",
    shellColor: "violet",
    markingColor: "yellow",
    glowColor: "electric purple",
  },

  light: {
    element: "light",
    displayName: "Light",
    eggName: "Dawnshard Egg",
    shellColor: "gold",
    markingColor: "cream",
    glowColor: "soft gold",
  },

  shadow: {
    element: "shadow",
    displayName: "Shadow",
    eggName: "Eclipse Egg",
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

const STANDARD_KITHNA_RULES: PetSpeciesRules = {
  canBreed: true,
  breedingPartnerLine: "any",
  hasGender: true,
  maxStage: "legion",
  xpMultiplier: 1,
  encounterWeight: 100,
  catchFailureChancePercent: 0,
  hatchMinutes: {
    min: 3,
    max: 10,
  },
};

function mergeRules(
  base: PetSpeciesRules,
  overrides?: Partial<PetSpeciesRules>,
): PetSpeciesRules {
  return {
    ...base,
    ...overrides,

    hatchMinutes:
      overrides && "hatchMinutes" in overrides
        ? (overrides.hatchMinutes ?? null)
        : base.hatchMinutes,
  };
}

export function createKithnaNonStarterSpecies(
  template: KithnaPetTemplate,
): KithnaNonStarterSpecies {
  const eggVisual = KITHNA_EGG_VISUALS[template.line];

  const baseRules = isVoidborneLine(template.line)
    ? VOIDBORNE_RULES
    : STANDARD_KITHNA_RULES;

  const rules = mergeRules(baseRules, template.rules);
  const evolution: SpeciesEvolution = {
    egg: eggVisual.eggName,
    hatchling: template.hatchling,
    lowform: template.lowform,
    highform: template.highform,
    legion: template.legion,
    mythical_legendary:
      rules.maxStage === "legion"
        ? null
        : (template.mythical_legendary ?? null),
  };

  return {
    id: template.id,

    source: "kithna",
    region: "kithna",
    tutorialLocked: true,

    line: template.line,
    evolution,

    eggBaseStats: template.eggBaseStats ?? BALANCED_EGG_STATS,

    eggVisual,
    rules,

    canRollAliuneCorruption: true,
    corruptedImage: null,

    findXpReward: EGG_FIND_XP_REWARD,
  };
}

/**
 * Wild Kithna roster.
 *
 * Every species can appear during either world-time phase.
 * Day Pigeon / Night Owl belongs to the individual pet, not the species.
 * Do not add starters here.
 * Existing IDs are preserved because saved pets may already reference them.
 */
export const KITHNA_NON_STARTER_SPECIES: KithnaNonStarterSpecies[] = [
  createKithnaNonStarterSpecies({
    id: "kithna_day_pet_01",
    line: "water",

    hatchling: "Ripplin",
    lowform: "Ripplume",
    highform: "Tidelume",
    legion: "Tidalyn",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_day_pet_02",
    line: "earth",

    hatchling: "Peblin",
    lowform: "Peblorn",
    highform: "Boulderin",
    legion: "Terralith",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_day_pet_03",
    line: "light",

    hatchling: "Glimmet",
    lowform: "Glimmeryn",
    highform: "Lumeryn",
    legion: "Lumaris",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_night_pet_01",
    line: "ice",

    hatchling: "Frilo",
    lowform: "Frilyn",
    highform: "Glacilyn",
    legion: "Glaciaris",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_night_pet_02",
    line: "storm",

    hatchling: "Fulgus",
    lowform: "Fulgorn",
    highform: "Fulgarin",
    legion: "Fulgurex",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_night_pet_03",
    line: "shadow",

    hatchling: "Murklin",
    lowform: "Murkrin",
    highform: "Duskarin",
    legion: "Duskavus",
    mythical_legendary: null,
  }),

  // VOIDBORNE TEMPLATE — uncomment after names and stats are ready.
  // The factory automatically gives it:
  // - a short 1-3 minute hatch window
  // - normal gender rolling
  // - 70% normal XP gain
  // - dedicated Voidborne evolution requirements
  // - a 3% chance to escape when taken
  //
  // createKithnaNonStarterSpecies({
  //   id: "kithna_voidborne_pet_01",
  //   line: "null_element",
  //
  //   hatchling: "",
  //   lowform: "",
  //   highform: "",
  //   legion: "VOIDBORNE_LEGION_NAME",
  //   mythical_legendary: null,
  //
  //   eggBaseStats: {
  //     hp: 2,
  //     atk: 2,
  //     magi: 2,
  //     def: 1,
  //     spd: 2,
  //     mana: 1,
  //     base_total: 10,
  //   },
  // }),
];

export function getKithnaNonStarterSpecies(): KithnaNonStarterSpecies[] {
  return KITHNA_NON_STARTER_SPECIES;
}

/**
 * Returns every Kithna species that is enabled for encounters.
 *
 * The current world phase does not filter the species roster.
 */
export function getKithnaEncounterSpecies(): KithnaNonStarterSpecies[] {
  return KITHNA_NON_STARTER_SPECIES.filter(
    (species) => species.rules.encounterWeight > 0,
  );
}

/**
 * Temporary compatibility alias.
 *
 * Older encounter code may still pass the current world time here.
 * World time no longer filters which Kithna species can appear.
 */
export function getKithnaEggsForTime(
  _worldTime?: "day" | "night",
): KithnaNonStarterSpecies[] {
  return getKithnaEncounterSpecies();
}

export function findKithnaNonStarterByEggName(
  eggName: string | null | undefined,
): KithnaNonStarterSpecies | null {
  const normalized = (eggName ?? "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    KITHNA_NON_STARTER_SPECIES.find(
      (species) => species.evolution.egg.toLowerCase() === normalized,
    ) ?? null
  );
}
