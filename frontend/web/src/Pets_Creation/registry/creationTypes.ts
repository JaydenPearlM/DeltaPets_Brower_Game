// src/Pets_Creation/registry/creationTypes.ts

import type { Stats } from "./Stats/types";

/**
 * Element line (your game's elemental families)
 */
export type ElementLine =
  | "null_element"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

/**
 * Lifecycle stages (egg -> mythic_legendary)
 */
export type PetStage =
  | "egg"
  | "hatchling"
  | "lowform"
  | "highform"
  | "legion"
  | "mythic_legendary";

/**
 * Base template stats for egg stage.
 * Must total 10 (your design rule).
 *
 * We reuse the shared Stats type so stat keys never drift.
 */
export type BaseStats = Stats & {
  base_total: number; // should always be 10 for egg templates
};

export type Starter = {
  name: string;
  line: ElementLine;
  baseStats: BaseStats;
};
