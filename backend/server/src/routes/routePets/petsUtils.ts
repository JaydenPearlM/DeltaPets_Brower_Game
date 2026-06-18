// backend/server/src/routes/routePets/petsUtils.ts

import { randomInt } from "crypto";
import type { ElementalLine, PetGender } from "./petsType";

export const VALID_ELEMENTS = [
  "null",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
] as const;

export type ElementKey = (typeof VALID_ELEMENTS)[number];

export function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function clampPercent(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "";

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "null_element" || normalized === "null") {
    return "Voidborne";
  }

  if (normalized === "null_gender") {
    return "Neutral";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeElement(value: string | null | undefined): ElementKey {
  if (!value) return "null";

  const v = String(value).trim().toLowerCase().replace(/\s+/g, "_");

  if (v === "null_element" || v === "voidborne") return "null";

  if (VALID_ELEMENTS.includes(v as ElementKey)) return v as ElementKey;

  return "null";
}

export function msUntil(value: string | null | undefined, nowMs = Date.now()) {
  if (!value) return 0;

  const endMs = new Date(value).getTime();

  if (!Number.isFinite(endMs)) return 0;

  return Math.max(0, endMs - nowMs);
}

export function hatchPayload(
  pet: { hatch_ends_at?: string | null },
  nowMs = Date.now(),
) {
  const hatchEndsAt = pet.hatch_ends_at ?? null;
  const hatchRemainingMs = msUntil(hatchEndsAt, nowMs);

  return {
    ready: hatchEndsAt ? hatchRemainingMs <= 0 : false,
    hatch_ends_at: hatchEndsAt,
    hatch_remaining_ms: hatchRemainingMs,
  };
}

export function elementMapForLine(line: ElementalLine | string | null) {
  const normalized = String(line ?? "null_element")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return {
    null_element:
      normalized === "null_element" || normalized === "null" ? 10 : 0,
    water: normalized === "water" ? 10 : 0,
    fire: normalized === "fire" ? 10 : 0,
    earth: normalized === "earth" ? 10 : 0,
    air: normalized === "air" ? 10 : 0,
    ice: normalized === "ice" ? 10 : 0,
    storm: normalized === "storm" ? 10 : 0,
    light: normalized === "light" ? 10 : 0,
    shadow: normalized === "shadow" ? 10 : 0,
  };
}

export function rollGender(): PetGender {
  const roll = randomInt(100_000);

  if (roll === 0) return "null_gender";
  if (roll < 50_000) return "male";

  return "female";
}

export function sumBase5(stats: {
  hp?: number | null;
  atk?: number | null;
  magi?: number | null;
  def?: number | null;
  spd?: number | null;
  mana?: number | null;
}) {
  return (
    safeNum(stats.hp) +
    safeNum(stats.atk) +
    safeNum(stats.magi) +
    safeNum(stats.def) +
    safeNum(stats.spd) +
    safeNum(stats.mana)
  );
}
