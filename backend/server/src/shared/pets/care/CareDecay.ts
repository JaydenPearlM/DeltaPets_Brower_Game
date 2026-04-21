export type CarePet = {
  id: string;
  hunger: number;
  clean: number;
  happy: number;
  comfort?: number;
  rest?: number;
  energy?: number;
  neglect_hours: number;
  ran_away: boolean;
  runaway_at?: string | null;
  last_care_update: string;
  last_care_decay_at?: string | null;
};

const CARE_MAX = 50;
const ENERGY_MAX = 50;
const MIN = 0;

// slower, cleaner decay for a 0–50 system
const HUNGER_DECAY_PER_HOUR = 1.0;
const CLEAN_DECAY_PER_HOUR = 0.75;
const HAPPY_DECAY_PER_HOUR = 0.75;
const COMFORT_DECAY_PER_HOUR = 0.6;
const REST_DECAY_PER_HOUR = 0.5;
const ENERGY_DECAY_PER_HOUR = 0.35;

// only count neglect from the core needs
const RUNAWAY_THRESHOLD = 12; // hours

const clampCare = (value: number) => Math.max(MIN, Math.min(CARE_MAX, value));
const clampEnergy = (value: number) =>
  Math.max(MIN, Math.min(ENERGY_MAX, value));

function safeNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function applyCareDecay<T extends CarePet>(pet: T): T {
  const now = Date.now();

  const lastSource =
    pet.last_care_decay_at ??
    pet.last_care_update ??
    new Date(now).toISOString();

  const last = new Date(lastSource).getTime();

  const hungerBase = clampCare(safeNumber(pet.hunger, CARE_MAX));
  const cleanBase = clampCare(safeNumber(pet.clean, CARE_MAX));
  const happyBase = clampCare(safeNumber(pet.happy, CARE_MAX));
  const comfortBase = clampCare(safeNumber(pet.comfort, CARE_MAX));
  const restBase = clampCare(safeNumber(pet.rest, CARE_MAX));
  const energyBase = clampEnergy(safeNumber(pet.energy, ENERGY_MAX));
  const neglectBase = Math.max(0, safeNumber(pet.neglect_hours, 0));

  if (Number.isNaN(last) || now <= last) {
    return {
      ...pet,
      hunger: hungerBase,
      clean: cleanBase,
      happy: happyBase,
      comfort: comfortBase,
      rest: restBase,
      energy: energyBase,
      neglect_hours: neglectBase,
      last_care_update: lastSource,
      last_care_decay_at: lastSource,
    };
  }

  const hours = Math.max(0, (now - last) / (1000 * 60 * 60));

  const hunger = clampCare(hungerBase - hours * HUNGER_DECAY_PER_HOUR);
  const clean = clampCare(cleanBase - hours * CLEAN_DECAY_PER_HOUR);
  const happy = clampCare(happyBase - hours * HAPPY_DECAY_PER_HOUR);
  const comfort = clampCare(comfortBase - hours * COMFORT_DECAY_PER_HOUR);
  const rest = clampCare(restBase - hours * REST_DECAY_PER_HOUR);
  const energy = clampEnergy(energyBase - hours * ENERGY_DECAY_PER_HOUR);

  const isNeglected = hunger <= 0 || clean <= 0 || happy <= 0;
  const neglect_hours = isNeglected ? neglectBase + hours : 0;

  const ran_away = Boolean(pet.ran_away) || neglect_hours >= RUNAWAY_THRESHOLD;
  const nowIso = new Date(now).toISOString();

  const runaway_at =
    ran_away && !pet.runaway_at ? nowIso : (pet.runaway_at ?? null);

  return {
    ...pet,
    hunger,
    clean,
    happy,
    comfort,
    rest,
    energy,
    neglect_hours,
    ran_away,
    runaway_at,
    last_care_update: nowIso,
    last_care_decay_at: nowIso,
  };
}
