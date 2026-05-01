export type GrowthStatKey = "hp" | "atk" | "def" | "spd" | "magi" | "mana";

export const GROWTH_STAT_KEYS: GrowthStatKey[] = [
  "hp",
  "atk",
  "def",
  "spd",
  "magi",
  "mana",
];

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function rollGrowthTraits(): {
  strongStats: GrowthStatKey[];
  weakStat: GrowthStatKey | null;
} {
  const patternRoll = Math.random();

  let strongCount = 0;
  let hasWeak = false;

  if (patternRoll < 0.2) {
    strongCount = 2;
    hasWeak = true;
  } else if (patternRoll < 0.45) {
    strongCount = 2;
    hasWeak = false;
  } else if (patternRoll < 0.7) {
    strongCount = 1;
    hasWeak = true;
  } else if (patternRoll < 0.88) {
    strongCount = 1;
    hasWeak = false;
  } else if (patternRoll < 0.96) {
    strongCount = 0;
    hasWeak = true;
  } else {
    strongCount = 0;
    hasWeak = false;
  }

  const shuffled = shuffleArray(GROWTH_STAT_KEYS);
  const strongStats = shuffled.slice(0, strongCount);

  let weakStat: GrowthStatKey | null = null;
  if (hasWeak) {
    const pool = GROWTH_STAT_KEYS.filter((s) => !strongStats.includes(s));
    weakStat = pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  return { strongStats, weakStat };
}

export function sanitizeGrowthStrongStats(value: unknown): GrowthStatKey[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((e) => String(e).toLowerCase())
    .filter((e): e is GrowthStatKey =>
      GROWTH_STAT_KEYS.includes(e as GrowthStatKey),
    )
    .slice(0, 2);
}

export function sanitizeGrowthWeakStat(value: unknown): GrowthStatKey | null {
  if (typeof value !== "string") return null;
  const n = value.toLowerCase();
  return GROWTH_STAT_KEYS.includes(n as GrowthStatKey)
    ? (n as GrowthStatKey)
    : null;
}
