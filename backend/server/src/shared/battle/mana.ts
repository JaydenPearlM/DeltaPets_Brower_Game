export const MEND_MP_COST = 1;

/** Saved Mana is base + allocations; passive Mana is added exactly once. */
export function maximumMp(savedMana: unknown, passiveMana: unknown = 0): number | null {
  if (typeof savedMana !== "number" || !Number.isFinite(savedMana)
    || typeof passiveMana !== "number" || !Number.isFinite(passiveMana)) return null;
  const maximum = Math.max(0, savedMana + passiveMana) * 3;
  return Number.isSafeInteger(maximum) ? maximum : null;
}

/** Older battle snapshots have no MP. Never infer a refill when recovering them. */
export type BattleMp = { mpMax?: number; mpCur?: number };

export function hasBattleMp(mp: BattleMp): mp is { mpMax: number; mpCur: number } {
  return Number.isSafeInteger(mp.mpMax) && Number.isSafeInteger(mp.mpCur)
    && mp.mpMax! >= 0 && mp.mpCur! >= 0 && mp.mpCur! <= mp.mpMax!;
}
