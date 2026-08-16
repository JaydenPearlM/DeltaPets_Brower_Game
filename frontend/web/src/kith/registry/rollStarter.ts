// ========================================
// Pets_Creation/registry/rollStarter.ts
// Frontend random starter helper
// ========================================

import { STARTER_SPROUTS } from "./species";
import type { Starter } from "./creationTypes";

export function rollStarter(): Starter {
  if (!STARTER_SPROUTS.length) {
    throw new Error("No starter species found in registry.");
  }

  const index = Math.floor(Math.random() * STARTER_SPROUTS.length);
  return STARTER_SPROUTS[index] as Starter;
}
