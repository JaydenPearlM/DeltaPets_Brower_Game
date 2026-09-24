import type { ResonanceEvolutionPhase } from "./resonanceEvolution.types";

// Existing phase names keep the global provider's queue/commit contract intact.
export const PHASES: readonly Exclude<ResonanceEvolutionPhase, "idle">[] = [
  "warningTransparent", "warningRed", "elementReveal", "fadeGameplay",
  "environment", "summon", "elementalBuild", "strain", "hpDrain",
  "transformation", "reveal", "celebration", "complete",
];

export const NORMAL_DURATIONS: Record<Exclude<ResonanceEvolutionPhase, "idle">, number> = {
  warningTransparent: 1600, // White entrance, easing into its stop.
  warningRed: 950,         // Recoil, red collision, short impact hold.
  elementReveal: 850,      // Announcement flies toward the viewer.
  fadeGameplay: 600,       // Existing stage fades in.
  environment: 250,
  summon: 1000,
  elementalBuild: 750,     // Let the Hatchling settle before the strike.
  strain: 600,             // Lightning travels; no HP bar yet.
  hpDrain: 1200,           // Contact, visible drain to zero, 250ms hold.
  transformation: 2400,   // Form, seal, pressure; no orbiting geometry.
  reveal: 650,             // Bubble pops before HP recovery.
  celebration: 1600,
  complete: 1100,
};

export const REDUCED_DURATIONS = NORMAL_DURATIONS;

/** Visual-only recovery. This never changes a stored Kith's HP. */
export function recoveredPreviewHp(maxHp: number): number {
  return Math.max(1, Math.ceil(maxHp / 2));
}
