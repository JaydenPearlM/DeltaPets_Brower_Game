// src/Pets_Creation/registry/creationTypes.ts

import type { Stats } from "./Stats/types";

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

export type PetStage =
  | "egg"
  | "hatchling"
  | "lowform"
  | "highform"
  | "legion"
  | "mythical_legendary";

export type BaseStats = Stats & {
  base_total: number;
};

export type Starter = {
  name: string;
  line: ElementLine;
  baseStats: BaseStats;
};
