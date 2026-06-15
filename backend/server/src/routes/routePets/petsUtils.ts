// backend/server/src/routes/routePets/petsUtils.ts

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
