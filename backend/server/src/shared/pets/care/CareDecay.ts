import { safeNum } from "../../../lib/utils";

export type CarePet = {
  id: string;
  hunger?: number | null;
  clean?: number | null;
  cleanliness?: number | null;
  happy?: number | null;
  happiness?: number | null;
  comfort?: number | null;
  rest?: number | null;
  energy?: number | null;
  neglect_hours?: number | null;
  ran_away?: boolean | null;
  is_runaway?: boolean | null;
  runaway_at?: string | null;
  last_care_update?: string | null;
  last_care_decay_at?: string | null;
};

const CARE_MAX = 50;
const ENERGY_MAX = 50;
const MIN = 0;

// step-based decay intervals
const HUNGER_STEP_MINUTES = 90; // noticeable, but not needy
const CLEAN_STEP_MINUTES = 120; // every 2 hours
const HAPPY_STEP_MINUTES = 105; // mood drops a bit faster than clean
const COMFORT_STEP_MINUTES = 150; // slower
const REST_STEP_MINUTES = 180; // slowest care need
const ENERGY_STEP_MINUTES = 240; // slowest -- every 4 hours

const RUNAWAY_THRESHOLD_HOURS = 24;

/**
 * Change this to:
 * 60 * 60 * 1000  = once per hour
 * 2 * 60 * 60 * 1000 = once every 2 hours
 */
const CARE_LOG_INTERVAL_MS = 2 * 60 * 60 * 1000;

// In-memory log throttle map for dev console spam control
const lastCareLogAt = new Map<string, number>();

function logCareDecayThrottled(
  petId: string,
  kind: "skipped" | "output",
  payload: Record<string, unknown>,
) {
  const now = Date.now();
  const key = `${petId}:${kind}`;
  const last = lastCareLogAt.get(key) ?? 0;

  if (now - last < CARE_LOG_INTERVAL_MS) {
    return;
  }

  lastCareLogAt.set(key, now);
  console.log(`[care/decay] ${kind}`, payload);
}

const clampCare = (value: number) =>
  Math.max(MIN, Math.min(CARE_MAX, Math.round(value)));

const clampEnergy = (value: number) =>
  Math.max(MIN, Math.min(ENERGY_MAX, Math.round(value)));

function safeBool(value: unknown): boolean {
  return value === true;
}

function readLastCareTimestamp(pet: CarePet): string {
  return String(pet.last_care_decay_at ?? pet.last_care_update ?? "").trim();
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
  const cleanBase = clampCare(safeNum(pet.clean ?? pet.cleanliness, CARE_MAX));
  const happyBase = clampCare(safeNum(pet.happy ?? pet.happiness, CARE_MAX));
  const comfortBase = clampCare(safeNum(pet.comfort, CARE_MAX));
  const restBase = clampCare(safeNum(pet.rest, CARE_MAX));
  const energyBase = clampEnergy(safeNum(pet.energy, ENERGY_MAX));
  const neglectBase = Math.max(0, safeNum(pet.neglect_hours, 0));
  const ranAwayBase = safeBool(pet.ran_away ?? pet.is_runaway);

  if (!Number.isFinite(lastMs)) {
    const fallbackTimestamp = new Date(nowMs).toISOString();

    logCareDecayThrottled(pet.id, "skipped", {
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
      cleanliness: cleanBase,
      happy: happyBase,
      happiness: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: runawayState.neglectHours,
      ran_away: runawayState.runaway,
      is_runaway: runawayState.runaway,
      runaway_at: runawayState.runawayAt,
      last_care_update: fallbackTimestamp,
      last_care_decay_at: fallbackTimestamp,
    };
  }

  if (nowMs <= lastMs) {
    logCareDecayThrottled(pet.id, "skipped", {
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
      cleanliness: cleanBase,
      happy: happyBase,
      happiness: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: runawayState.neglectHours,
      ran_away: runawayState.runaway,
      is_runaway: runawayState.runaway,
      runaway_at: runawayState.runawayAt,
      last_care_update: pet.last_care_update ?? lastRaw,
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

  const energyLoss = stepsFromMinutes(elapsedMinutes, ENERGY_STEP_MINUTES);

  const totalLoss = hungerLoss + cleanLoss + happyLoss + comfortLoss + restLoss;

  if (totalLoss <= 0 && energyLoss <= 0) {
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
      cleanliness: cleanBase,
      happy: happyBase,
      happiness: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: runawayState.neglectHours,
      ran_away: runawayState.runaway,
      is_runaway: runawayState.runaway,
      runaway_at: runawayState.runawayAt,
      last_care_update: pet.last_care_update ?? new Date(lastMs).toISOString(),
      last_care_decay_at:
        pet.last_care_decay_at ?? new Date(lastMs).toISOString(),
    };
  }

  const hunger = clampCare(hungerBase - hungerLoss);
  const clean = clampCare(cleanBase - cleanLoss);
  const happy = clampCare(happyBase - happyLoss);
  const comfort = clampCare(comfortBase - comfortLoss);
  const rest = clampCare(restBase - restLoss);
  const energy = clampEnergy(energyBase - energyLoss);

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

  logCareDecayThrottled(pet.id, "output", {
    petId: pet.id,
    elapsedMinutes,
    losses: {
      hungerLoss,
      cleanLoss,
      happyLoss,
      comfortLoss,
      restLoss,
      energyLoss,
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
    cleanliness: clean,
    happy,
    happiness: happy,
    comfort,
    rest,
    energy,
    neglect_hours: runawayState.neglectHours,
    ran_away: runawayState.runaway,
    is_runaway: runawayState.runaway,
    runaway_at: runawayState.runawayAt,
    last_care_update: timestamp,
    last_care_decay_at: timestamp,
  };
}
