export type CarePet = {
  id: string;
  hunger?: number | null;
  clean?: number | null;
  cleanliness?: number | null;
  happy?: number | null;
  happiness?: number | null;
  comfort?: number | null;
  rest?: number | null;
  neglect_hours?: number | null;
  ran_away?: boolean | null;
  is_runaway?: boolean | null;
  runaway_at?: string | null;
  last_care_update?: string | null;
  last_care_decay_at?: string | null;
};

const MAX = 100;
const MIN = 0;

const HUNGER_DECAY_PER_HOUR = 4;
const CLEAN_DECAY_PER_HOUR = 2;
const HAPPY_DECAY_PER_HOUR = 3;
const COMFORT_DECAY_PER_HOUR = 2;
const REST_DECAY_PER_HOUR = 2;

const RUNAWAY_THRESHOLD_HOURS = 12;

const clamp = (value: number) =>
  Math.max(MIN, Math.min(MAX, Math.round(value)));

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function safeBool(value: unknown) {
  return value === true;
}

function readLastCareTimestamp(pet: CarePet) {
  return String(pet.last_care_decay_at ?? pet.last_care_update ?? "").trim();
}

export function applyCareDecay<T extends CarePet>(pet: T): T {
  const nowMs = Date.now();
  const lastRaw = readLastCareTimestamp(pet);
  const lastMs = lastRaw ? new Date(lastRaw).getTime() : NaN;

  if (!Number.isFinite(lastMs) || nowMs <= lastMs) {
    return {
      ...pet,
      clean: safeNum(pet.clean ?? pet.cleanliness),
      cleanliness: safeNum(pet.cleanliness ?? pet.clean),
      happy: safeNum(pet.happy ?? pet.happiness),
      happiness: safeNum(pet.happiness ?? pet.happy),
      comfort: safeNum(pet.comfort),
      rest: safeNum(pet.rest),
      ran_away: safeBool(pet.ran_away ?? pet.is_runaway),
      is_runaway: safeBool(pet.is_runaway ?? pet.ran_away),
      last_care_update:
        pet.last_care_update ??
        pet.last_care_decay_at ??
        new Date(nowMs).toISOString(),
      last_care_decay_at:
        pet.last_care_decay_at ??
        pet.last_care_update ??
        new Date(nowMs).toISOString(),
    };
  }

  const hoursPassed = (nowMs - lastMs) / (1000 * 60 * 60);

  const hunger = clamp(
    safeNum(pet.hunger) - hoursPassed * HUNGER_DECAY_PER_HOUR,
  );
  const clean = clamp(
    safeNum(pet.clean ?? pet.cleanliness) - hoursPassed * CLEAN_DECAY_PER_HOUR,
  );
  const happy = clamp(
    safeNum(pet.happy ?? pet.happiness) - hoursPassed * HAPPY_DECAY_PER_HOUR,
  );
  const comfort = clamp(
    safeNum(pet.comfort) - hoursPassed * COMFORT_DECAY_PER_HOUR,
  );
  const rest = clamp(safeNum(pet.rest) - hoursPassed * REST_DECAY_PER_HOUR);

  const isNeglected =
    hunger === 0 || clean === 0 || happy === 0 || comfort === 0 || rest === 0;

  const neglectHours = isNeglected
    ? safeNum(pet.neglect_hours) + hoursPassed
    : 0;

  const runaway =
    safeBool(pet.ran_away ?? pet.is_runaway) ||
    neglectHours >= RUNAWAY_THRESHOLD_HOURS;

  const timestamp = new Date(nowMs).toISOString();
  const runawayAt = runaway ? String(pet.runaway_at ?? timestamp) : null;

  return {
    ...pet,
    hunger,
    clean,
    cleanliness: clean,
    happy,
    happiness: happy,
    comfort,
    rest,
    neglect_hours: neglectHours,
    ran_away: runaway,
    is_runaway: runaway,
    runaway_at: runawayAt,
    last_care_update: timestamp,
    last_care_decay_at: timestamp,
  };
}
