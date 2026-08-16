// ========================================
// shared/pets/species/kithna-species.ts
// Wild Kithna species only. Starter species live in starter-species.ts.
// ========================================

import {
  ELEMENT_EGG_NAMES,
  type SharedBaseStats,
  type SharedElementLine,
  type SpeciesEvolution,
} from "./starter-species";
import type { PetSpeciesIdentity, PetSpeciesRules } from "./pet-species-types";

import {
  isVoidborneLine,
  VOIDBORNE_EGG_NAME,
  VOIDBORNE_RULES,
} from "./voidborne";

export const EGG_FIND_XP_REWARD = 30 as const;

export type KithnaEggVisual = {
  element: SharedElementLine;
  displayName: string;
  eggName: string;
  shellColor: string;
  markingColor: string;
  glowColor: string;
};

export type KithnaRarity = "common" | "uncommon" | "rare" | "epic";
export type KithnaEncounterTime = "day" | "night";

export type KithnaTraitRarity = "common" | "uncommon" | "rare" | "epic";

export type KithnaRarityFactors = {
  eggRarity: KithnaRarity;
  passiveRarity: KithnaTraitRarity | null;
  mutationRarity: KithnaTraitRarity | null;
  bondLevel: number;
};
export type KithnaNonStarterSpecies = PetSpeciesIdentity & {
  source: "kithna";
  region: "kithna";
  tutorialLocked: boolean;
  rarity: KithnaRarity | null;
  encounterTime: KithnaEncounterTime | null;
  eggVisual: KithnaEggVisual;
  canRollAliuneCorruption: boolean;
  corruptedImage: null;
  findXpReward: typeof EGG_FIND_XP_REWARD;
};

export type KithnaPetTemplate = {
  id: string;
  line: SharedElementLine;
  rarity?: KithnaRarity;
  encounterTime?: KithnaEncounterTime;
  hatchling: string;
  lowform?: string;
  highform?: string;

  /**
   * Legion is required once the evolution line is finalized.
   */
  legion?: string;

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
    eggName: VOIDBORNE_EGG_NAME,
    shellColor: "bronze",
    markingColor: "pearl",
    glowColor: "soft bronze",
  },

  water: {
    element: "water",
    displayName: "Water",
    eggName: ELEMENT_EGG_NAMES.water,
    shellColor: "blue",
    markingColor: "aqua",
    glowColor: "soft blue",
  },

  fire: {
    element: "fire",
    displayName: "Fire",
    eggName: ELEMENT_EGG_NAMES.fire,
    shellColor: "red",
    markingColor: "orange",
    glowColor: "warm gold",
  },

  earth: {
    element: "earth",
    displayName: "Earth",
    eggName: ELEMENT_EGG_NAMES.earth,
    shellColor: "brown",
    markingColor: "green",
    glowColor: "soft moss",
  },

  air: {
    element: "air",
    displayName: "Air",
    eggName: ELEMENT_EGG_NAMES.air,
    shellColor: "sky blue",
    markingColor: "white",
    glowColor: "pale cyan",
  },

  ice: {
    element: "ice",
    displayName: "Ice",
    eggName: ELEMENT_EGG_NAMES.ice,
    shellColor: "ice blue",
    markingColor: "white",
    glowColor: "frost blue",
  },

  storm: {
    element: "storm",
    displayName: "Storm",
    eggName: ELEMENT_EGG_NAMES.storm,
    shellColor: "violet",
    markingColor: "yellow",
    glowColor: "electric purple",
  },

  light: {
    element: "light",
    displayName: "Light",
    eggName: ELEMENT_EGG_NAMES.light,
    shellColor: "gold",
    markingColor: "cream",
    glowColor: "soft gold",
  },

  shadow: {
    element: "shadow",
    displayName: "Shadow",
    eggName: ELEMENT_EGG_NAMES.shadow,
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
export const KITHNA_RARITY_RULES: Record<
  KithnaRarity,
  {
    encounterWeight: number;
    hatchMinutes: number;
    rarityBonusPoints: number;
  }
> = {
  common: {
    encounterWeight: 40,
    hatchMinutes: 2,
    rarityBonusPoints: 0,
  },

  uncommon: {
    encounterWeight: 25,
    hatchMinutes: 5,
    rarityBonusPoints: 1,
  },

  rare: {
    encounterWeight: 12,
    hatchMinutes: 10,
    rarityBonusPoints: 2,
  },

  epic: {
    encounterWeight: 5,
    hatchMinutes: 30,
    rarityBonusPoints: 3,
  },
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

  const rarityRules = template.rarity
    ? KITHNA_RARITY_RULES[template.rarity]
    : null;

  const rules = mergeRules(baseRules, {
    ...template.rules,

    encounterWeight:
      rarityRules?.encounterWeight ??
      template.rules?.encounterWeight ??
      baseRules.encounterWeight,

    ...(rarityRules
      ? {
          hatchMinutes: {
            min: rarityRules.hatchMinutes,
            max: rarityRules.hatchMinutes,
          },
        }
      : {}),
  });

  const evolution: SpeciesEvolution = {
    egg: eggVisual.eggName,
    hatchling: template.hatchling,
    lowform: template.lowform ?? template.hatchling,
    highform: template.highform ?? template.hatchling,
    legion: template.legion ?? template.hatchling,
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

    rarity: template.rarity ?? null,
    encounterTime: template.encounterTime ?? null,

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
 * Active wild Kithna roster.
 *
 * Retired Closed Alpha species are archived separately in:
 * backend/Retired/species.ts
 *
 * Do not add starters here.
 */
export const KITHNA_NON_STARTER_SPECIES: KithnaNonStarterSpecies[] = [
  createKithnaNonStarterSpecies({
    id: "kithna_clodian",
    line: "storm",
    rarity: "uncommon",
    encounterTime: "day",

    hatchling: "Clodian",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_pebelin",
    line: "earth",
    rarity: "common",
    encounterTime: "day",

    hatchling: "Pebelin",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_magmado",
    line: "fire",
    rarity: "rare",
    encounterTime: "night",

    hatchling: "Magmado",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_shade",
    line: "shadow",
    rarity: "common",
    encounterTime: "night",

    hatchling: "Shade",
    mythical_legendary: null,
  }),

  createKithnaNonStarterSpecies({
    id: "kithna_glimmer",
    line: "light",
    rarity: "epic",
    encounterTime: "night",

    hatchling: "Glimmer",
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
 */
export function getKithnaEncounterSpecies(): KithnaNonStarterSpecies[] {
  return KITHNA_NON_STARTER_SPECIES.filter(
    (species) => species.rules.encounterWeight > 0,
  );
}

/**
 * Returns Kithna species assigned to the current Delta time.
 */
export function getKithnaEggsForTime(
  worldTime: "day" | "night",
): KithnaNonStarterSpecies[] {
  return getKithnaEncounterSpecies().filter(
    (species) => species.encounterTime === worldTime,
  );
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
