// backend/server/src/routes/routePets/pets.utils.ts

import { randomInt as cryptoRandomInt } from "crypto";
import type { ElementalLine, PetGender } from "./petsType";

/**
 * male 40%
 * female 50%
 * null_gender 10%
 */
export function rollGender(): PetGender {
  const r = cryptoRandomInt(100); // 0..99
  if (r < 40) return "male";
  if (r < 90) return "female";
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

export function elementMapForLine(_line: ElementalLine) {
  // keeping your current behavior exactly (all zeros)
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
  return base;
}

// verify base stats sum to 10 before hatch applies IV
export function sumBase5(b: {
  base_hp?: number | null;
  base_atk?: number | null;
  base_def?: number | null;
  base_spd?: number | null;
  base_magi?: number | null;
}) {
  return (
    (b.base_hp ?? 0) +
    (b.base_atk ?? 0) +
    (b.base_def ?? 0) +
    (b.base_spd ?? 0) +
    (b.base_magi ?? 0)
  );
}
