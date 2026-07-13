// shared/pets/voidborne.ts

/**
 * Voidborne design notes
 *
 * Internal key:
 * - null_element
 *
 * Player-facing name:
 * - Voidborne
 *
 * Rules:
 * - No gender
 * - Cannot breed
 * - Can only evolve through:
 *   - Hatchling
 *   - Lowform
 *   - Highform
 * - Cannot evolve into Legion or Mythical Legendary
 * - Uses Voidborne stats currently
 * - Corruption encounters can buff or debuff Voidborne
 * - Can train into other elements for powerful moves
 * - Gains experience slower than normal elemental Kith
 *
 * IMPORTANT:
 * Keep "null_element" as the database/API enum key unless we do a full migration.
 * Use "Voidborne" only for UI/player-facing display text.
 */

import type { PetSpeciesRules, SharedElementLine } from "../petSpeciesTypes";

export const VOIDBORNE_ELEMENT_KEY = "null_element" as const;
export const VOIDBORNE_DISPLAY_NAME = "Voidborne" as const;

export const VOIDBORNE_RULES = {
  canBreed: false,
  hasGender: false,
  maxStage: "highform",
  xpRate: "slow",
  corruptionSensitive: true,
} as const;
