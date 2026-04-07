import "./eggGrowthTraits.css";

export type EggStatKey = "hp" | "atk" | "magi" | "def" | "spd" | "mana";

export type EggGrowthTraits = {
  strongStats: EggStatKey[];
  weakStat: EggStatKey | null;
};

const STAT_KEYS: EggStatKey[] = ["hp", "atk", "magi", "def", "spd", "mana"];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

/**
 * Possible outcomes:
 * - 2 good, 1 weak
 * - 2 good, no weak
 * - 1 good, 1 weak
 * - 1 good, no weak
 * - 0 good, 1 weak
 * - 0 good, no weak
 */
export function rollEggGrowthTraits(): EggGrowthTraits {
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

  const shuffled = shuffle(STAT_KEYS);
  const strongStats = shuffled.slice(0, strongCount);

  let weakStat: EggStatKey | null = null;

  if (hasWeak) {
    const weakPool = STAT_KEYS.filter((stat) => !strongStats.includes(stat));
    weakStat = weakPool.length > 0 ? pickRandom(weakPool) : null;
  }

  return {
    strongStats,
    weakStat,
  };
}

const STAT_LABELS: Record<EggStatKey, string> = {
  hp: "vital",
  atk: "fierce",
  magi: "mystic",
  def: "sturdy",
  spd: "swift",
  mana: "arcane",
};

function joinTraitWords(stats: EggStatKey[]) {
  return stats.map((stat) => STAT_LABELS[stat]);
}

export function getEggGrowthFlavorText(traits: EggGrowthTraits): string {
  const { strongStats, weakStat } = traits;

  if (strongStats.length === 2) {
    const [a, b] = joinTraitWords(strongStats);

    if (weakStat) {
      return `This egg carries a ${a} and ${b} aura, but one flaw lingers within.`;
    }

    return `This egg carries a ${a} and ${b} aura.`;
  }

  if (strongStats.length === 1) {
    const [a] = joinTraitWords(strongStats);

    if (weakStat) {
      return `This egg feels ${a}, though a weakness hides beneath the shell.`;
    }

    return `This egg gives off a ${a} aura.`;
  }

  if (weakStat) {
    return "This egg feels unstable.";
  }

  return "This egg feels ordinary.";
}

type EggStats = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
  total: number;
};

type SelectedEggStatsProps = {
  selectedEgg: {
    stats: EggStats;
    growthTraits: EggGrowthTraits;
  } | null;
};

const STAT_ROWS: Array<{ key: EggStatKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "magi", label: "MAGI" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
  { key: "mana", label: "MANA" },
];

function getStatCardClassName(isStrong: boolean, isWeak: boolean) {
  const classNames = ["selectedEggStatCard"];

  if (isStrong) {
    classNames.push("selectedEggStatCardStrong");
  }

  if (isWeak) {
    classNames.push("selectedEggStatCardWeak");
  }

  return classNames.join(" ");
}

export function SelectedEggStats({ selectedEgg }: SelectedEggStatsProps) {
  if (!selectedEgg) {
    return (
      <section className="selectedEggPanel">
        <h3 className="selectedEggTitle">Selected Egg Stats</h3>
        <p className="selectedEggEmpty">Select an egg.</p>
      </section>
    );
  }

  const { stats, growthTraits } = selectedEgg;
  const flavorText = getEggGrowthFlavorText(growthTraits);

  return (
    <section className="selectedEggPanel">
      <h3 className="selectedEggTitle">Selected Egg Stats</h3>

      <div className="selectedEggGrid">
        {STAT_ROWS.map(({ key, label }) => {
          const isStrong = growthTraits.strongStats.includes(key);
          const isWeak = growthTraits.weakStat === key;

          return (
            <div key={key} className={getStatCardClassName(isStrong, isWeak)}>
              <span className="selectedEggStatLabel">{label}</span>
              <span className="selectedEggStatValue">{stats[key]}</span>
            </div>
          );
        })}

        <div className="selectedEggStatCard selectedEggTotalCard">
          <span className="selectedEggStatLabel">TOTAL</span>
          <span className="selectedEggStatValue">{stats.total}</span>
        </div>
      </div>

      <div className="selectedEggFlavorText">{flavorText}</div>
    </section>
  );
}
