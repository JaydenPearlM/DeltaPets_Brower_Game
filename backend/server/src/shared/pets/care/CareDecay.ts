export type CarePet = {
  id: string;
  hunger: number;
  clean: number;
  happy: number;
  neglect_hours: number;
  ran_away: boolean;
  last_care_update: string;
};

const MAX = 100;
const MIN = 0;

const HUNGER_DECAY = 4;
const CLEAN_DECAY = 2;
const HAPPY_DECAY = 3;

const RUNAWAY_THRESHOLD = 12; // hours

const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));

export function applyCareDecay<T extends CarePet>(pet: T): T {
  const now = Date.now();
  const last = new Date(pet.last_care_update).getTime();

  if (!last || now <= last) return pet;

  const hours = (now - last) / (1000 * 60 * 60);

  const hunger = clamp(pet.hunger - hours * HUNGER_DECAY);
  const clean = clamp(pet.clean - hours * CLEAN_DECAY);
  const happy = clamp(pet.happy - hours * HAPPY_DECAY);

  const isNeglected = hunger === 0 || happy === 0;

  const neglect_hours = isNeglected ? (pet.neglect_hours || 0) + hours : 0;

  const ran_away = pet.ran_away || neglect_hours >= RUNAWAY_THRESHOLD;

  return {
    ...pet,
    hunger,
    clean,
    happy,
    neglect_hours,
    ran_away,
    last_care_update: new Date(now).toISOString(),
  };
}
