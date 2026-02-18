// frontend/web/src/Pets_Creation/registry/eggBasedStats.ts

export type EggMainStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number; // ✅ add mana
};

export function calcTotal(s: EggMainStats) {
  // ✅ include mana in total
  return s.hp + s.atk + s.def + s.spd + s.magi + s.mana;
}

/**
 * Key = starter species id (NOT egg container id).
 * Egg base stats must sum to 10.
 */
export const EGG_BASE_STATS: Record<string, EggMainStats> = {
  // ✅ PROD starter
  corona: { hp: 2, atk: 0, def: 0, spd: 2, magi: 3, mana: 3 }, // total = 10

  // Keep mystery_egg OUT of here unless you *want* a "default" egg roll.
  // mystery_egg: { ... } ❌ don't do this if mystery_egg just chooses a starter
};

export function getEggBaseStatsOrThrow(speciesId: string): EggMainStats {
  const s = EGG_BASE_STATS[speciesId];
  if (!s) throw new Error(`Missing egg base stats for species: ${speciesId}`);

  const total = calcTotal(s);
  if (total !== 10) {
    throw new Error(
      `Egg base stats for ${speciesId} must total 10, got ${total}`,
    );
  }

  return s;
}
