// backend/server/src/lib/careSanitizers.ts

import { CARE_MAX, CARE_MIN } from "../shared/constants";

export function clampCare(value: number) {
  if (Number.isNaN(value)) return CARE_MIN;
  return Math.max(CARE_MIN, Math.min(CARE_MAX, value));
}

export function normalizeCareValue(value: unknown) {
  if (typeof value !== "number") return CARE_MIN;
  return clampCare(value);
}