import type { DeltaPhase } from "./timers/useDeltaTime";

export type PetSleepState = "awake" | "drowsy" | "asleep";

export function getPetSleepState(
  dayNightLabel: string | null | undefined,
  phase: DeltaPhase,
): PetSleepState {
  if (dayNightLabel === "Day Pigeon") {
    if (phase === "dusk") {
      return "drowsy";
    }

    if (phase === "night" || phase === "deep_night" || phase === "twilight") {
      return "asleep";
    }

    return "awake";
  }

  if (dayNightLabel === "Night Owl") {
    if (phase === "twilight") {
      return "drowsy";
    }

    if (phase === "dawn" || phase === "day") {
      return "asleep";
    }

    return "awake";
  }

  return "awake";
}

export function isPetAsleep(
  dayNightLabel: string | null | undefined,
  phase: DeltaPhase,
): boolean {
  return getPetSleepState(dayNightLabel, phase) === "asleep";
}
