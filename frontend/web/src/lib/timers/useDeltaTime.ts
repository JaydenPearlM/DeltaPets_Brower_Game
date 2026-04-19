import { useNow } from "./useNow";

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
  phaseLabel: string;
  phaseEmoji: string;
  phaseColor: string;
  timeOfDay: DeltaTimeOfDay;
  deltaDay: number;
  minuteInCycle: number;
  deltaHour24: number;
  deltaHour12: number;
  deltaMinute: number;
  meridiem: "AM" | "PM";
  digital24: string;
  digital12: string;
  percentThroughPhase: number;
  minutesUntilNextPhase: number;
}

export interface PhaseDefinition {
  name: DeltaPhase;
  durationMinutes: number;
  timeOfDay: DeltaTimeOfDay;
  label: string;
  emoji: string;
  color: string;
}

const DELTA_CYCLE_MINUTES = 360;
const DELTA_DAY_MINUTES = 24 * 60;
const DELTA_CLOCK_START_OFFSET_MINUTES = 5 * 60;

export const DELTA_PHASES: PhaseDefinition[] = [
  {
    name: "dawn",
    durationMinutes: 45,
    timeOfDay: "day",
    label: "Dawn",
    emoji: "🌅",
    color: "#f3a65a",
  },
  {
    name: "day",
    durationMinutes: 90,
    timeOfDay: "day",
    label: "Day",
    emoji: "☀️",
    color: "#f4cf63",
  },
  {
    name: "dusk",
    durationMinutes: 45,
    timeOfDay: "day",
    label: "Dusk",
    emoji: "🌇",
    color: "#d67b72",
  },
  {
    name: "night",
    durationMinutes: 90,
    timeOfDay: "night",
    label: "Night",
    emoji: "🌙",
    color: "#6f8cff",
  },
  {
    name: "deep_night",
    durationMinutes: 60,
    timeOfDay: "night",
    label: "Deep Night",
    emoji: "✨",
    color: "#8d6bff",
  },
  {
    name: "pre_dawn",
    durationMinutes: 30,
    timeOfDay: "night",
    label: "Pre-Dawn",
    emoji: "🌌",
    color: "#5c7fd8",
  },
];

export const PHASE_META: Record<
  DeltaPhase,
  { label: string; emoji: string; color: string }
> = Object.fromEntries(
  DELTA_PHASES.map((phase) => [
    phase.name,
    {
      label: phase.label,
      emoji: phase.emoji,
      color: phase.color,
    },
  ]),
) as Record<DeltaPhase, { label: string; emoji: string; color: string }>;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function to12Hour(hour24: number): { hour12: number; meridiem: "AM" | "PM" } {
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { hour12, meridiem };
}

function computeDeltaTime(nowMs: number): DeltaTime {
  const cycleMs = DELTA_CYCLE_MINUTES * 60 * 1000;
  const minuteInCycleRaw = (nowMs % cycleMs) / 60_000;
  const minuteInCycle = Math.floor(minuteInCycleRaw);
  const deltaDay = Math.floor(nowMs / cycleMs) + 1;

  let elapsed = 0;
  let currentPhaseIndex = 0;

  for (let i = 0; i < DELTA_PHASES.length; i += 1) {
    const phase = DELTA_PHASES[i];

    if (minuteInCycleRaw < elapsed + phase.durationMinutes) {
      currentPhaseIndex = i;
      break;
    }

    elapsed += phase.durationMinutes;
  }

  const current = DELTA_PHASES[currentPhaseIndex];
  const minuteIntoPhase = minuteInCycleRaw - elapsed;

  const deltaMinuteOfDay =
    (minuteInCycle * (DELTA_DAY_MINUTES / DELTA_CYCLE_MINUTES) +
      DELTA_CLOCK_START_OFFSET_MINUTES) %
    DELTA_DAY_MINUTES;

  const deltaHour24 = Math.floor(deltaMinuteOfDay / 60);
  const deltaMinute = Math.floor(deltaMinuteOfDay % 60);
  const { hour12: deltaHour12, meridiem } = to12Hour(deltaHour24);

  return {
    phase: current.name,
    phaseLabel: current.label,
    phaseEmoji: current.emoji,
    phaseColor: current.color,
    timeOfDay: current.timeOfDay,
    deltaDay,
    minuteInCycle,
    deltaHour24,
    deltaHour12,
    deltaMinute,
    meridiem,
    digital24: `${pad2(deltaHour24)}:${pad2(deltaMinute)}`,
    digital12: `${deltaHour12}:${pad2(deltaMinute)} ${meridiem}`,
    percentThroughPhase:
      Math.round((minuteIntoPhase / current.durationMinutes) * 100) / 100,
    minutesUntilNextPhase: Math.max(
      0,
      Math.ceil(current.durationMinutes - minuteIntoPhase),
    ),
  };
}

export function useDeltaTime(): DeltaTime {
  const nowMs = useNow(10_000);
  return computeDeltaTime(nowMs);
}
