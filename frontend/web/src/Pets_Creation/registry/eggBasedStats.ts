// frontend/web/src/Pets_Creation/registry/eggBasedStats.ts

import { findStarterByName } from "./species";

export type EggMainStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number;
};

export function calcTotal(stats: EggMainStats) {
  return stats.hp + stats.atk + stats.def + stats.spd + stats.magi + stats.mana;
}

/**
 * Resolve egg base stats from the shared starter registry.
 * Species names must match the starter species name, not the egg container id.
 */
export function getEggBaseStatsOrThrow(speciesName: string): EggMainStats {
  const starter = findStarterByName(speciesName);

  if (!starter) {
    throw new Error(`Missing egg base stats for species: ${speciesName}`);
  }

  const stats: EggMainStats = {
    hp: Number(starter.baseStats.hp ?? 0),
    atk: Number(starter.baseStats.atk ?? 0),
    def: Number(starter.baseStats.def ?? 0),
    spd: Number(starter.baseStats.spd ?? 0),
    magi: Number(starter.baseStats.magi ?? 0),
    mana: Number(starter.baseStats.mana ?? 0),
  };

  const total = calcTotal(stats);
  if (total !== 10) {
    throw new Error(
      `Egg base stats for ${speciesName} must total 10, got ${total}`,
    );
  }

  return stats;
}

/**
 * Optional non-throwing version for safer UI usage.
 */
export function getEggBaseStats(speciesName: string): EggMainStats | null {
  const starter = findStarterByName(speciesName);
  if (!starter) return null;

  const stats: EggMainStats = {
    hp: Number(starter.baseStats.hp ?? 0),
    atk: Number(starter.baseStats.atk ?? 0),
    def: Number(starter.baseStats.def ?? 0),
    spd: Number(starter.baseStats.spd ?? 0),
    magi: Number(starter.baseStats.magi ?? 0),
    mana: Number(starter.baseStats.mana ?? 0),
  };

  return calcTotal(stats) === 10 ? stats : null;
}
