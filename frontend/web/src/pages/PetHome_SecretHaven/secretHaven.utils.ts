// src/pages/PetHome_SecretHaven/secretHaven.utils.ts

import { FURNITURE } from "./secretHaven.data";
import type { PlacedFurniture, RoomKey } from "./secretHaven.types";

export function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

export function storageKey(userId: string, roomKey: RoomKey) {
  return `deltapets.home.${userId}.${roomKey}`;
}

export function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function getItemSizeTiles(item: PlacedFurniture) {
  const def = FURNITURE[item.kind];
  if (item.rot === 90) return { w: def.h, h: def.w };
  return { w: def.w, h: def.h };
}

export function tilesUsed(items: PlacedFurniture[]) {
  return items.reduce(
    (sum, it) => sum + (FURNITURE[it.kind]?.tilesCost ?? 0),
    0,
  );
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
