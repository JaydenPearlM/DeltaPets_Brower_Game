export type EggElement =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

// Handy for UI dropdowns / validation.
export const EGG_ELEMENTS: EggElement[] = [
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
];

export type EggStats = {
  power: number;
  defense: number;
  speed: number;
  luck: number;
};

export type HatcheryEgg = {
  id: string;
  element: EggElement;
  level: 0; // hatchery L0 only for now
  base_stats: EggStats;
  hatch_ends_at: string; // ISO timestamp (server-authoritative later)
};
