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
 * Lifecycle stages (egg -> mythical)
 */
export type PetStage =
  | "egg"
  | "baby"
  | "toddler"
  | "child"
  | "legion"
  | "mythical";

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
