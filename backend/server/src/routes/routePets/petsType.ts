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

export type EnsureEggBody = {
  line?: string; // ignored for now, kept for compatibility
};

export const BASIC_EGG_HATCH_MINUTES = 5;
export const HATCH_ALLOCATION_POINTS = 7;

export type BaseStatsTemplate = {
  hp: number;
  atk: number;
  magi: number; // maps to DB column base_magi
  def: number;
  spd: number;
  mana: number;
  base_total: number;
};

export type Starter = {
  name: string;
  line: ElementalLine;
  baseStats: BaseStatsTemplate;
};
