// shared/pets/species/voidborne.ts

/**
 * Voidborne is the player-facing name for the existing null_element key.
 *
 * Keep null_element as the database and API value unless the project receives
 * a complete database migration.
 */
export const VOIDBORNE_ELEMENT_KEY = "null_element" as const;
export const VOIDBORNE_DISPLAY_NAME = "Voidborne" as const;
export const VOIDBORNE_EGG_NAME = "Bronzeheart Egg" as const;
export const VOIDBORNE_ENCOUNTER_CHANCE_PERMILLE = 1 as const;
export const VOIDBORNE_HATCH_BONUS_POINTS = 5 as const;
export const VOIDBORNE_STRONG_STAT_COUNT = 3 as const;
export const VOIDBORNE_WEAK_STAT_CHANCE = 0.1 as const;
export const VOIDBORNE_CAN_LEARN_SILVER_SKILLS = true as const;

/**
 * Shared Voidborne gameplay rules.
 *
 * Voidborne is an element, not a species.
 * Pets retain their normal identity, care systems, and species.
 */
export const VOIDBORNE_RULES = {
  canBreed: false,
  breedingPartnerLine: VOIDBORNE_ELEMENT_KEY,
  hasGender: false,
  maxStage: "mythical_legendary" as const,
  xpMultiplier: 0.7,
  encounterWeight: 0,
  catchFailureChancePercent: 3,
  hatchMinutes: {
    min: 1,
    max: 3,
  },
};

/**
 * Accept both the canonical database key and the player-facing name.
 *
 * Supporting "voidborne" here also protects older or partially migrated data.
 */
export function isVoidborneLine(line: string | null | undefined): boolean {
  const normalized = String(line ?? "")
    .trim()
    .toLowerCase();

  return normalized === VOIDBORNE_ELEMENT_KEY || normalized === "voidborne";
}
