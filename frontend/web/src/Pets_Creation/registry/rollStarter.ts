import { rollIV, addStats } from "./Stats";
import { STARTER_SPROUTS } from "./species";

export function rollStarterSprout() {
  const idx = Math.floor(Math.random() * STARTER_SPROUTS.length);
  const sprout = STARTER_SPROUTS[idx];

  const iv = rollIV(7);
  const level1Stats = addStats(sprout.baseStats, iv);

  return {
    ...sprout,
    iv,
    level1Stats,
  };
}
