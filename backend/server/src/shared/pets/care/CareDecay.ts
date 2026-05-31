import { safeNum } from "../../../lib/utils";
import { CARE_DECAY_STEP_MINUTES } from "../../constants";
import { logger } from "../../../lib/logger";

export type CarePet = {
  id: string;
  hunger?: number | null;
  clean?: number | null;
  happy?: number | null;
  comfort?: number | null;
  rest?: number | null;
  energy?: number | null;
  neglect_hours?: number | null;
  ran_away?: boolean | null;
  runaway_at?: string | null;
  last_care_decay_at?: string | null;
};

const CARE_MAX = 50;
const ENERGY_MAX = 100;
const MIN = 0;

const HUNGER_STEP_MINUTES = CARE_DECAY_STEP_MINUTES.hunger;
const CLEAN_STEP_MINUTES = CARE_DECAY_STEP_MINUTES.clean;
const HAPPY_STEP_MINUTES = CARE_DECAY_STEP_MINUTES.happy;
const COMFORT_STEP_MINUTES = CARE_DECAY_STEP_MINUTES.comfort;
const REST_STEP_MINUTES = CARE_DECAY_STEP_MINUTES.rest;

const RUNAWAY_THRESHOLD_HOURS = 24;

// Energy does not decay over time.
// Energy only decreases from Gym/training actions.

declare const process:
  | {
      env?: {
        NODE_ENV?: string;
      };
    }
  | undefined;

const isDev =
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

function logCareDecay(
  kind: "skipped" | "output",
  payload: Record<string, unknown>,
) {
  if (isDev) {
    logger.debug(`[care/decay] ${kind}`, payload);
  }
}

const clampCare = (value: number) =>
  Math.max(MIN, Math.min(CARE_MAX, Math.round(value)));

const clampEnergy = (value: number) =>
  Math.max(MIN, Math.min(ENERGY_MAX, Math.round(value)));

function safeBool(value: unknown): boolean {
  return value === true;
}

function readLastCareTimestamp(pet: CarePet): string {
  return String(pet.last_care_decay_at ?? "").trim();
}

function stepsFromMinutes(elapsedMinutes: number, stepMinutes: number): number {
  if (elapsedMinutes <= 0) return 0;
  return Math.floor(elapsedMinutes / stepMinutes);
}

function buildRunawayState(args: {
  pet: CarePet;
  hunger: number;
  clean: number;
  happy: number;
  neglectBase: number;
  ranAwayBase: boolean;
  nowMs: number;
  elapsedHours: number;
  addElapsedHours: boolean;
}) {
  const {
    pet,
    hunger,
    clean,
    happy,
    neglectBase,
    ranAwayBase,
    nowMs,
    elapsedHours,
    addElapsedHours,
  } = args;

  const isNeglected = hunger <= 0 || clean <= 0 || happy <= 0;

  const neglectHours = isNeglected
    ? neglectBase + (addElapsedHours ? elapsedHours : 0)
    : 0;

  const runaway = ranAwayBase || neglectHours >= RUNAWAY_THRESHOLD_HOURS;
  const timestamp = new Date(nowMs).toISOString();
  const runawayAt = runaway ? String(pet.runaway_at ?? timestamp) : null;

  return {
    neglectHours,
    runaway,
    runawayAt,
  };
}

export function applyCareDecay<T extends CarePet>(pet: T): T {
  const nowMs = Date.now();
  const lastRaw = readLastCareTimestamp(pet);
  const lastMs = lastRaw ? new Date(lastRaw).getTime() : NaN;

  const hungerBase = clampCare(safeNum(pet.hunger, CARE_MAX));
  const cleanBase = clampCare(safeNum(pet.clean, CARE_MAX));
  const happyBase = clampCare(safeNum(pet.happy, CARE_MAX));
  const comfortBase = clampCare(safeNum(pet.comfort, CARE_MAX));
  const restBase = clampCare(safeNum(pet.rest, CARE_MAX));
  const energyBase = clampEnergy(safeNum(pet.energy, ENERGY_MAX));
  const neglectBase = Math.max(0, safeNum(pet.neglect_hours, 0));
  const ranAwayBase = safeBool(pet.ran_away);

  if (!Number.isFinite(lastMs)) {
    const fallbackTimestamp = new Date(nowMs).toISOString();

    logCareDecay("skipped", {
      petId: pet.id,
      reason: "invalid last timestamp",
      lastRaw,
      fallbackTimestamp,
    });

    const runawayState = buildRunawayState({
      pet,
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      neglectBase,
      ranAwayBase,
      nowMs,
      elapsedHours: 0,
      addElapsedHours: false,
    });

    return {
      ...pet,
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: runawayState.neglectHours,
      ran_away: runawayState.runaway,
      runaway_at: runawayState.runawayAt,
      last_care_decay_at: fallbackTimestamp,
    };
  }

  if (nowMs <= lastMs) {
    logCareDecay("skipped", {
      petId: pet.id,
      reason: "now <= last",
      lastRaw,
    });

    const runawayState = buildRunawayState({
      pet,
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      neglectBase,
      ranAwayBase,
      nowMs,
      elapsedHours: 0,
      addElapsedHours: false,
    });

    return {
      ...pet,
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: runawayState.neglectHours,
      ran_away: runawayState.runaway,
      runaway_at: runawayState.runawayAt,
      last_care_decay_at: pet.last_care_decay_at ?? lastRaw,
    };
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((nowMs - lastMs) / (1000 * 60)),
  );
  const elapsedHours = elapsedMinutes / 60;

  const hungerLoss = stepsFromMinutes(elapsedMinutes, HUNGER_STEP_MINUTES);
  const cleanLoss = stepsFromMinutes(elapsedMinutes, CLEAN_STEP_MINUTES);
  const happyLoss = stepsFromMinutes(elapsedMinutes, HAPPY_STEP_MINUTES);
  const comfortLoss = stepsFromMinutes(elapsedMinutes, COMFORT_STEP_MINUTES);
  const restLoss = stepsFromMinutes(elapsedMinutes, REST_STEP_MINUTES);

  const totalLoss = hungerLoss + cleanLoss + happyLoss + comfortLoss + restLoss;

  if (totalLoss <= 0) {
    const runawayState = buildRunawayState({
      pet,
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      neglectBase,
      ranAwayBase,
      nowMs,
      elapsedHours: 0,
      addElapsedHours: false,
    });

    return {
      ...pet,
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: runawayState.neglectHours,
      ran_away: runawayState.runaway,
      runaway_at: runawayState.runawayAt,
      last_care_decay_at:
        pet.last_care_decay_at ?? new Date(lastMs).toISOString(),
    };
  }

  const hunger = clampCare(hungerBase - hungerLoss);
  const clean = clampCare(cleanBase - cleanLoss);
  const happy = clampCare(happyBase - happyLoss);
  const comfort = clampCare(comfortBase - comfortLoss);
  const rest = clampCare(restBase - restLoss);
  const energy = energyBase;

  const runawayState = buildRunawayState({
    pet,
    hunger,
    clean,
    happy,
    neglectBase,
    ranAwayBase,
    nowMs,
    elapsedHours,
    addElapsedHours: true,
  });

  const timestamp = new Date(nowMs).toISOString();

  logCareDecay("output", {
    petId: pet.id,
    elapsedMinutes,
    losses: {
      hungerLoss,
      cleanLoss,
      happyLoss,
      comfortLoss,
      restLoss,
    },
    before: {
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: neglectBase,
    },
    after: {
      hunger,
      clean,
      happy,
      comfort,
      rest,
      energy,
      neglect_hours: runawayState.neglectHours,
      ran_away: runawayState.runaway,
      runaway_at: runawayState.runawayAt,
    },
    from: new Date(lastMs).toISOString(),
    to: timestamp,
  });

  return {
    ...pet,
    hunger,
    clean,
    happy,
    comfort,
    rest,
    energy,
    neglect_hours: runawayState.neglectHours,
    ran_away: runawayState.runaway,
    runaway_at: runawayState.runawayAt,
    last_care_decay_at: timestamp,
  };
}
