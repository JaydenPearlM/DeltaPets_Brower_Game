// backend/server/src/shared/constants.ts

export const CARE_MIN = 0;
export const CARE_MAX = 50;

export const CARE_DECAY_STEP_MINUTES = {
  hunger: 240,
  clean: 360,
  happy: 300,
  comfort: 480,
  rest: 600,
  energy: 360,
} as const;
