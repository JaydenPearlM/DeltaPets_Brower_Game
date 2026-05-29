// ========================================
// routePets/petsUtils.ts
// Shared route helpers for hatch timing, gender rolls, and stat checks
// ========================================

import { randomInt as cryptoRandomInt } from "crypto";
import type { ElementalLine, PetGender } from "./petsType";

/**
 * Gender roll:
 * - male: 49.995%
 * - female: 49.995%
 * - null_gender: 0.01%
 *
 * cryptoRandomInt(100_000) => 0..99,999
 */
export function rollGender(): PetGender {
  const r = cryptoRandomInt(100_000);

  if (r < 49_995) return "male";
  if (r < 99_990) return "female";
  return "null_gender";
}

export function msUntil(iso: string | null | undefined, nowMs: number) {
  if (!iso) return 0;

  const end = Date.parse(iso);
  if (!Number.isFinite(end)) return 0;

  return Math.max(0, end - nowMs);
}

export function hatchPayload(pet: any, serverNowMs: number) {
  const hatch_remaining_ms = msUntil(pet?.hatch_ends_at, serverNowMs);
  const ready =
    hatch_remaining_ms === 0 && pet?.stage === "egg" && !!pet?.hatch_ends_at;

  return {
    ready,
    hatch_ends_at: pet?.hatch_ends_at ?? null,
    hatch_remaining_ms,
  };
}

export function elementMapForLine(line: ElementalLine) {
  // keeping current behavior for now
  const base: Record<ElementalLine, number> = {
    null_element: 0,
    water: 0,
    fire: 0,
    earth: 0,
    air: 0,
    ice: 0,
    storm: 0,
    light: 0,
    shadow: 0,
  };

  base[line] = 1;

  return base;
}

/**
 * Verify base egg/template stats sum to 10 before hatch IVs are applied.
 */
export function sumBase5(b: {
  base_hp?: number | null;
  base_atk?: number | null;
  base_def?: number | null;
  base_spd?: number | null;
  base_magi?: number | null;
  base_mana?: number | null;
}) {
  return (
    Number(b.base_hp ?? 0) +
    Number(b.base_atk ?? 0) +
    Number(b.base_def ?? 0) +
    Number(b.base_spd ?? 0) +
    Number(b.base_magi ?? 0) +
    Number(b.base_mana ?? 0)
  );
}
