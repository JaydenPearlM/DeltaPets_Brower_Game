// frontend/web/src/Pets_Creation/registry/species.ts

// Shared species registry (single source of truth)
import {
  STARTER_SPROUTS as SHARED_STARTER_SPROUTS,
  findStarterByName as sharedFindStarterByName,
} from "@shared/pets/species";

import type { Starter } from "./creationTypes";

/*
  Frontend registry now pulls species directly from the shared module.
  This prevents frontend/backend species drift.
*/

export const STARTER_SPROUTS: Starter[] =
  SHARED_STARTER_SPROUTS as unknown as Starter[];

/*
  Utility wrapper so existing frontend code continues working
  without needing to change imports everywhere.
*/

export function findStarterByName(name: string | null | undefined) {
  return sharedFindStarterByName(name) as Starter | null;
}
