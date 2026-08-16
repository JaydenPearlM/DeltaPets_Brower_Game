// ========================================
// Pets_Creation/registry/species.ts
// Frontend bridge to shared species registry
// ========================================

import {
  STARTER_SPROUTS as SHARED_STARTER_SPROUTS,
  findStarterByName as sharedFindStarterByName,
} from "@shared/pets/species";

import type { Starter } from "./creationTypes";

export const STARTER_SPROUTS: Starter[] = SHARED_STARTER_SPROUTS.map(
  (starter) => ({
    name: starter.hatchlingName,
    line: starter.line,
    baseStats: starter.baseStats,
  }),
);

export function findStarterByName(name: string | null | undefined) {
  const starter = sharedFindStarterByName(name);
  if (!starter) return null;

  return {
    name: starter.hatchlingName,
    line: starter.line,
    baseStats: starter.baseStats,
  } as Starter;
}
