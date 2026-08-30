import type { SharedBaseStats, SharedElementLine } from "./starter-species";

export type LegendaryClassification = "mythical_legendary";

export type LegendarySpeciesFoundation = {
  id: string;
  displayName: string;
  classification: LegendaryClassification;
  role: string;
  region: "kithna";
  eggName: string;
  primaryElement: SharedElementLine;
  hatchlingName: string;
  futureEvolutionNames: null;
  eggBaseStats: SharedBaseStats;
  hatchAllocationBonusPoints: number;
  gender: "null_gender";
  xpMultiplier: number;
  naturalElements: readonly SharedElementLine[];
  initialElementTrainingPercent: number;
  hatchMinutes: number;
  requiredTrainerLevel: number;
};

export const VELUNE_SPECIES_ID = "velune" as const;
export const VELUNE_LEGENDARY_KEY = "velune" as const;

export const VELUNE: LegendarySpeciesFoundation = {
  id: VELUNE_SPECIES_ID,
  displayName: "Velune",
  classification: "mythical_legendary",
  role: "Protector of Kithna",
  region: "kithna",
  eggName: "Legendary Egg",
  primaryElement: "air",
  hatchlingName: "Velune",
  futureEvolutionNames: null,
  eggBaseStats: {
    hp: 2,
    atk: 2,
    magi: 3,
    def: 2,
    spd: 3,
    mana: 2,
    base_total: 14,
  },
  hatchAllocationBonusPoints: 5,
  gender: "null_gender",
  xpMultiplier: 0.6,
  naturalElements: ["light", "ice", "air", "storm"],
  initialElementTrainingPercent: 5,
  hatchMinutes: 45,
  requiredTrainerLevel: 10,
};

export const LEGENDARY_SPECIES_REGISTRY: LegendarySpeciesFoundation[] = [
  VELUNE,
];

export function findLegendarySpeciesById(
  speciesId: string | null | undefined,
): LegendarySpeciesFoundation | null {
  const normalized = String(speciesId ?? "").trim();
  if (!normalized) return null;

  return (
    LEGENDARY_SPECIES_REGISTRY.find(
      (species) => species.id === normalized,
    ) ?? null
  );
}

// A Kithna navigation has a 40% chance to produce a Velune sighting.
// A legitimate sighting then receives the separately confirmed 5% egg roll.
export const VELUNE_SIGHTING_CHANCE_PERCENT = 40 as const;
export const VELUNE_EGG_CHANCE_PER_SIGHTING_PERCENT = 5 as const;

export const VELUNE_ELIGIBLE_LOCATION_KEYS = [
  "/cities/kithna",
  "/kithna/food",
  "/kithna/health",
  "/kithna/armor",
  "/kithna/weapons",
] as const;

export const VELUNE_SIGHTING_MESSAGES = [
  "You catch something moving out of the corner of your eye. When you turn toward it, nothing is there.",
  "A flash of pale light slips around a building and is gone before you can focus on it.",
  "Something moves above the rooftops. The skyline is empty when you look up.",
  "Frost briefly traces a nearby surface, then vanishes despite the mild air.",
  "A faint current brushes past you, though the air around Kithna is perfectly still.",
  "A strange shadow crosses the ground. Whatever cast it is already gone.",
] as const;
