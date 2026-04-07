// src/features/pets/stats/calc.ts
import { STAT_KEYS, type Stats, sumStats } from "./types";

/** Roll `points` distributed randomly across stat keys (uniform key selection). */
export function rollIV(points = 7): Stats {
  const iv: Stats = { hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 };

  for (let i = 0; i < points; i++) {
    const k = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
    iv[k] += 1;
  }
  return iv;
}

export function addStats(a: Stats, b: Stats): Stats {
  const out = {} as Stats;
  for (const k of STAT_KEYS) out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  return out;
}

/** Egg base total must be 10 (your design rule). */
export function assertBaseTotal10(base: Stats) {
  const total = sumStats(base);
  if (total !== 10) throw new Error(`Base stats must total 10, got ${total}`);
}
