// src/features/pets/stats/types.ts

export type StatKey = "hp" | "atk" | "magi" | "def" | "spd" | "mana";

export type Stats = Record<StatKey, number>;

export const STAT_KEYS: StatKey[] = ["hp", "atk", "magi", "def", "spd", "mana"];

export function sumStats(s: Stats) {
  return STAT_KEYS.reduce((acc, k) => acc + (s[k] ?? 0), 0);
}
