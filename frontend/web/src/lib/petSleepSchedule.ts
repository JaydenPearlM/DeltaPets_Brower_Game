import type { DeltaTimeOfDay } from "./timers/useDeltaTime";

// Every pet has its own Day Pigeon / Night Owl preference, it's stored
// per-individual (see getStablePreference in PetDetailsPanel.tsx), not
// tied to species or element. This just takes that already-computed
// label plus the current time of day and says whether the pet should
// currently be shown asleep.
export function isPetAsleep(
  dayNightLabel: string | null | undefined,
  timeOfDay: DeltaTimeOfDay,
): boolean {
  if (dayNightLabel === "Night Owl") return timeOfDay === "day";
  // Day Pigeon, or unknown/"--", defaults to sleeping at night.
  return timeOfDay === "night";
}
