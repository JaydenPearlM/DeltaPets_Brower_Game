import type {
  SharedBaseStats,
  SharedElementLine,
  SpeciesEvolution,
  WorldTimeState,
} from "./species";

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

export const KITHNA_EGG_VISUALS: Record<SharedElementLine, KithnaEggVisual> = {
  null_element: {
    element: "null_element",
    displayName: "Voidborne",
    eggName: "Voidborne Egg",
    shellColor: "silver",
    markingColor: "pearl",
    glowColor: "soft silver",
  },
  water: {
    element: "water",
    displayName: "Water",
    eggName: "Water Egg",
    shellColor: "blue",
    markingColor: "aqua",
    glowColor: "soft blue",
  },
  fire: {
    element: "fire",
    displayName: "Fire",
    eggName: "Fire Egg",
    shellColor: "red",
    markingColor: "orange",
    glowColor: "warm gold",
  },
  earth: {
    element: "earth",
    displayName: "Earth",
    eggName: "Earth Egg",
    shellColor: "brown",
    markingColor: "green",
    glowColor: "soft moss",
  },
  air: {
    element: "air",
    displayName: "Air",
    eggName: "Air Egg",
    shellColor: "sky blue",
    markingColor: "white",
    glowColor: "pale cyan",
  },
  ice: {
    element: "ice",
    displayName: "Ice",
    eggName: "Ice Egg",
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
    eggName: "Light Egg",
    shellColor: "gold",
    markingColor: "cream",
    glowColor: "soft gold",
  },
  shadow: {
    element: "shadow",
    displayName: "Shadow",
    eggName: "Shadow Egg",
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

export const KITHNA_NON_STARTER_SPECIES: KithnaNonStarterSpecies[] = [
  {
    id: "kithna_day_pet_01",
    region: "kithna",
    tutorialLocked: true,
    line: "water",
    preferredTime: "day",
    eggPool: "day",
    evolution: {
      egg: "Water Egg",
      hatchling: "Day Hatchling 01",
      lowform: "Day Lowform 01",
      highform: "Day Highform 01",
      legion: "Day Legion 01",
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
      egg: "Earth Egg",
      hatchling: "Day Hatchling 02",
      lowform: "Day Lowform 02",
      highform: "Day Highform 02",
      legion: "Day Legion 02",
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
      egg: "Light Egg",
      hatchling: "Day Hatchling 03",
      lowform: "Day Lowform 03",
      highform: "Day Highform 03",
      legion: "Day Legion 03",
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
      egg: "Ice Egg",
      hatchling: "Night Hatchling 01",
      lowform: "Night Lowform 01",
      highform: "Night Highform 01",
      legion: "Night Legion 01",
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
      egg: "Storm Egg",
      hatchling: "Night Hatchling 02",
      lowform: "Night Lowform 02",
      highform: "Night Highform 02",
      legion: "Night Legion 02",
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
      egg: "Shadow Egg",
      hatchling: "Night Hatchling 03",
      lowform: "Night Lowform 03",
      highform: "Night Highform 03",
      legion: "Night Legion 03",
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
