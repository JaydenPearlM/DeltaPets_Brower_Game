// backend/server/src/lib/deltaTime.ts

export type DeltaPhase =
  | "dawn"
  | "day"
  | "dusk"
  | "night"
  | "deep_night"
  | "pre_dawn";

export type DeltaTimeOfDay = "day" | "night";

export interface DeltaTime {
  phase: DeltaPhase;
  timeOfDay: DeltaTimeOfDay;
  deltaDay: number;
  minuteInCycle: number;
  percentThroughPhase: number;
  nextPhase: DeltaPhase;
  minutesUntilNextPhase: number;
  realTimestamp: string;
}

interface PhaseDefinition {
  name: DeltaPhase;
  durationMinutes: number;
  timeOfDay: DeltaTimeOfDay;
}

const DELTA_CYCLE_MINUTES = 360; // 6 real hours per full Delta day

const PHASES: PhaseDefinition[] = [
  { name: "dawn", durationMinutes: 45, timeOfDay: "day" },
  { name: "day", durationMinutes: 90, timeOfDay: "day" },
  { name: "dusk", durationMinutes: 45, timeOfDay: "day" },
  { name: "night", durationMinutes: 90, timeOfDay: "night" },
  { name: "deep_night", durationMinutes: 60, timeOfDay: "night" },
  { name: "pre_dawn", durationMinutes: 30, timeOfDay: "night" },
];

const totalMinutes = PHASES.reduce((sum, p) => sum + p.durationMinutes, 0);
if (totalMinutes !== DELTA_CYCLE_MINUTES) {
  throw new Error(
    `[deltaTime] Phase durations sum to ${totalMinutes}, expected ${DELTA_CYCLE_MINUTES}`,
  );
}

export function getDeltaTime(now: Date = new Date()): DeltaTime {
  const epochMs = now.getTime();
  const cycleMs = DELTA_CYCLE_MINUTES * 60 * 1000;

  const minuteInCycle = (epochMs % cycleMs) / 60_000;
  const deltaDay = Math.floor(epochMs / cycleMs);

  let elapsed = 0;
  let currentPhaseIndex = 0;

  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    if (minuteInCycle < elapsed + phase.durationMinutes) {
      currentPhaseIndex = i;
      break;
    }
    elapsed += phase.durationMinutes;
  }

  const currentPhaseDef = PHASES[currentPhaseIndex];
  const nextPhaseIndex = (currentPhaseIndex + 1) % PHASES.length;
  const nextPhaseDef = PHASES[nextPhaseIndex];

  const minuteIntoPhase = minuteInCycle - elapsed;
  const minutesUntilNextPhase =
    currentPhaseDef.durationMinutes - minuteIntoPhase;
  const percentThroughPhase = minuteIntoPhase / currentPhaseDef.durationMinutes;

  return {
    phase: currentPhaseDef.name,
    timeOfDay: currentPhaseDef.timeOfDay,
    deltaDay,
    minuteInCycle: Math.floor(minuteInCycle),
    percentThroughPhase: Math.round(percentThroughPhase * 100) / 100,
    nextPhase: nextPhaseDef.name,
    minutesUntilNextPhase: Math.round(minutesUntilNextPhase),
    realTimestamp: now.toISOString(),
  };
}

export function getWorldTimeOfDay(now?: Date): DeltaTimeOfDay {
  return getDeltaTime(now).timeOfDay;
}

export function formatDeltaTime(dt: DeltaTime): string {
  return (
    `[deltaTime] phase=${dt.phase} timeOfDay=${dt.timeOfDay} ` +
    `deltaDay=${dt.deltaDay} minuteInCycle=${dt.minuteInCycle} ` +
    `nextPhase=${dt.nextPhase} in ~${dt.minutesUntilNextPhase}min`
  );
}

export function getDeltaPhaseSchedule(): Array<{
  phase: DeltaPhase;
  startsAtMinute: number;
  durationMinutes: number;
  timeOfDay: DeltaTimeOfDay;
}> {
  let offset = 0;
  return PHASES.map((p) => {
    const entry = {
      phase: p.name,
      startsAtMinute: offset,
      durationMinutes: p.durationMinutes,
      timeOfDay: p.timeOfDay,
    };
    offset += p.durationMinutes;
    return entry;
  });
}
