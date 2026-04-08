// ========================================
// routePets/petsType.ts
// Core route-level pet types
// ========================================

export type ElementalLine =
  | "null_element"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

export type PetGender = "male" | "female" | "null_gender";

export type WorldTimeState = "day" | "night";

export type EnsureEggBody = {
  line?: string;
  worldTime?: WorldTimeState | null;
  personalityKey?: string | null;
};

export const BASIC_EGG_HATCH_MINUTES = 2;
export const HATCH_ALLOCATION_POINTS = 7;

export type BaseStatsTemplate = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
  base_total: number;
};

export type Starter = {
  speciesId: string;
  eggName: string;
  hatchlingName: string;
  line: ElementalLine;
  baseStats: BaseStatsTemplate;
  variant?: "good" | "bad" | null;
  preferredTime?: WorldTimeState | null;
};
