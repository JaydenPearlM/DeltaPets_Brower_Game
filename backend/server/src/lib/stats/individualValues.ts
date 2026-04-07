import { randomInt as cryptoRandomInt } from "crypto";

export type MainStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number;
};

export function sumStats(s: MainStats) {
  return s.hp + s.atk + s.def + s.spd + s.magi + s.mana;
}

/**
 * Rolls "IV" allocation points (default 7).
 * These are NOT base stats. These are added at level 1 via pet_stat_allocations.
 */
export function rollIV(points = 7): MainStats {
  const keys: (keyof MainStats)[] = ["hp", "atk", "def", "spd", "magi", "mana"];
  const iv: MainStats = { hp: 0, atk: 0, def: 0, spd: 0, magi: 0, mana: 0 };

  for (let i = 0; i < points; i++) {
    const k = keys[cryptoRandomInt(keys.length)];
    iv[k] += 1;
  }

  return iv;
}
