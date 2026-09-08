export type SolenFoodPreference =
  | "meat"
  | "vegetables"
  | "balanced"
  | "unknown";

export type SolenStatKey = "hp" | "atk" | "magi" | "def" | "spd" | "mana";

export type SolenMemoryType =
  | "battle_win"
  | "battle_loss"
  | "fed"
  | "care"
  | "level_up"
  | "skill_learned"
  | "low_health"
  | "trainer_choice";

export interface SolenAwarenessState {
  hungry: boolean;
  dirty: boolean;
  unhappy: boolean;
  uncomfortable: boolean;
  tired: boolean;
  lowEnergy: boolean;
  lowHealth: boolean;
}

export interface SolenAwarenessInput {
  hunger: number;
  cleanliness: number;
  happiness: number;
  comfort: number;
  rest: number;
  energy: number;
  currentHp: number;
  maxHp: number;
}

export interface SolenStats {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
}

export interface SolenStatAwareness {
  strongestStat: SolenStatKey;
  weakestStat: SolenStatKey;
}

export interface SolenMemory {
  type: SolenMemoryType;
  createdAt: string;
  context?: Record<string, string | number | boolean | null>;
}

export const SOLEN_AWARENESS_THRESHOLDS = {
  hunger: 25,
  cleanliness: 25,
  happiness: 25,
  comfort: 25,
  rest: 25,
  energy: 20,
  healthPercent: 25,
} as const;

export const MAX_SOLEN_RECENT_MEMORIES = 20;

export function resolveSolenAwareness(
  input: SolenAwarenessInput,
): SolenAwarenessState {
  const healthPercent =
    input.maxHp > 0 ? (input.currentHp / input.maxHp) * 100 : 0;

  return {
    hungry: input.hunger <= SOLEN_AWARENESS_THRESHOLDS.hunger,
    dirty: input.cleanliness <= SOLEN_AWARENESS_THRESHOLDS.cleanliness,
    unhappy: input.happiness <= SOLEN_AWARENESS_THRESHOLDS.happiness,
    uncomfortable: input.comfort <= SOLEN_AWARENESS_THRESHOLDS.comfort,
    tired: input.rest <= SOLEN_AWARENESS_THRESHOLDS.rest,
    lowEnergy: input.energy <= SOLEN_AWARENESS_THRESHOLDS.energy,
    lowHealth: healthPercent <= SOLEN_AWARENESS_THRESHOLDS.healthPercent,
  };
}

export function resolveSolenFoodPreference(
  meatFedCount: number,
  vegetableFedCount: number,
): SolenFoodPreference {
  const totalFeedings = meatFedCount + vegetableFedCount;

  if (totalFeedings < 3) {
    return "unknown";
  }

  const difference = meatFedCount - vegetableFedCount;

  if (difference >= 2) {
    return "meat";
  }

  if (difference <= -2) {
    return "vegetables";
  }

  return "balanced";
}

export function resolveSolenStatAwareness(
  stats: SolenStats,
): SolenStatAwareness {
  const entries = Object.entries(stats) as Array<[SolenStatKey, number]>;

  const sorted = [...entries].sort((left, right) => right[1] - left[1]);

  return {
    strongestStat: sorted[0][0],
    weakestStat: sorted[sorted.length - 1][0],
  };
}

export function trimSolenMemories(memories: SolenMemory[]): SolenMemory[] {
  return [...memories]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, MAX_SOLEN_RECENT_MEMORIES);
}
