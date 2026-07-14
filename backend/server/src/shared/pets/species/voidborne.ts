// shared/pets/species/voidborne.ts

/**
 * Voidborne is the player-facing name for the existing null_element key.
 *
 * Keep null_element as the database and API value unless the project receives
 * a complete database migration.
 */
export const VOIDBORNE_ELEMENT_KEY = "null_element" as const;
export const VOIDBORNE_DISPLAY_NAME = "Voidborne" as const;

/**
 * Shared Voidborne gameplay rules.
 *
 * Voidborne is an element, not a species.
 * Pets retain their normal identity, gender, care systems, and species.
 */
export const VOIDBORNE_RULES = {
  canBreed: true,
  breedingPartnerLine: VOIDBORNE_ELEMENT_KEY,
  hasGender: true,
  maxStage: "mythical_legendary" as const,
  xpMultiplier: 0.7,
  encounterWeight: 100,
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
