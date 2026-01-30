import { STARTER_SPROUTS } from "../data/Pet_Tests";

export function rollStarterSprout() {
  const idx = Math.floor(Math.random() * STARTER_SPROUTS.length);
  return STARTER_SPROUTS[idx];
}
