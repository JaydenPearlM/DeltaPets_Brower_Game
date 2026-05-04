// backend/server/src/shared/constants.ts

export const CARE_MIN = 0;
export const CARE_MAX = 50;

export const CARE_DECAY_STEP_MINUTES = {
  hunger: 30,
  clean: 45,
  happy: 40,
  comfort: 60,
  rest: 75,
  energy: 90,
} as const;

export type CareStat = keyof typeof CARE_DECAY_STEP_MINUTES;
