import { useEffect, useMemo, useState } from "react";

type SpotlightElement =
  | "null"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

type SpotlightStage = "egg" | "hatchling" | "lowform";
type SpotlightStatKey = "hp" | "atk" | "def" | "spd" | "magi" | "mana";

type SpotlightStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number;
};

export type HomepageSpotlightPet = {
  id: string;
  species: string;
  nickname: string | null;
  level: number;
  element: SpotlightElement;
  stage: SpotlightStage;
  personality: string;
  description: string;
  stats: SpotlightStats;
  strengths: SpotlightStatKey[];
  weakness: SpotlightStatKey | null;
};

type SpotlightCache = {
  pet: HomepageSpotlightPet;
  expiresAt: number;
};

const CACHE_KEY = "deltapets:homepage-spotlight-pet";
const ROTATE_MS = 2 * 60 * 60 * 1000;

const SPECIES_POOL = [
  "Solite",
  "Voltlet",
  "Emberfin",
  "Mirelix",
  "Frosthop",
  "Zephira",
  "Glintail",
  "Noctimp",
  "Flareclaw",
  "Tidemoth",
  "Bramblet",
  "Stormloom",
  "Cindrake",
  "Mistuff",
  "Pebblit",
  "Luxel",
  "Gloamip",
  "Aquarel",
] as const;

const NICKNAME_POOL = [
  "Tavi",
  "Luno",
  "Pip",
  "Aster",
  "Miso",
  "Rune",
  "Kiko",
  "Bram",
  "Sable",
  "Nibb",
  "Veya",
  "Echo",
  "Nori",
  "Zuzu",
  "Mallow",
  "Flick",
] as const;

const PERSONALITY_POOL = [
  "Gentle",
  "Curious",
  "Brave",
  "Playful",
  "Shy",
  "Loyal",
  "Calm",
  "Clever",
  "Fiery",
  "Sleepy",
  "Bold",
  "Cheerful",
  "Mischievous",
  "Stubborn",
  "Dreamy",
  "Watchful",
  "Protective",
  "Swift",
] as const;

const ELEMENT_POOL: SpotlightElement[] = [
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
  "null",
];

/**
 * Spotlight should never show eggs.
 * Egg still exists in the game, it just does not roll here.
 */
const STAGE_POOL: SpotlightStage[] = ["hatchling", "lowform"];

const STAT_KEYS: SpotlightStatKey[] = [
  "hp",
  "atk",
  "def",
  "spd",
  "magi",
  "mana",
];

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDisplayName(species: string, nickname: string | null) {
  return nickname?.trim() || species;
}

function randomLevel() {
  return Math.floor(Math.random() * 10) + 1;
}

function createRandomStats(level: number): SpotlightStats {
  const base: SpotlightStats = {
    hp: 4 + Math.floor(Math.random() * 5),
    atk: 4 + Math.floor(Math.random() * 5),
    def: 4 + Math.floor(Math.random() * 5),
    spd: 4 + Math.floor(Math.random() * 5),
    magi: 4 + Math.floor(Math.random() * 5),
    mana: 4 + Math.floor(Math.random() * 5),
  };

  const levelBonus = Math.max(0, level - 1);

  for (let i = 0; i < levelBonus; i += 1) {
    const key = pickOne(STAT_KEYS);
    base[key] += 1 + Math.floor(Math.random() * 2);
  }

  return base;
}

function createStrengthWeaknessProfile() {
  const roll = Math.random();

  if (roll < 0.2) {
    return {
      strengths: [] as SpotlightStatKey[],
      weakness: null as SpotlightStatKey | null,
    };
  }

  if (roll < 0.4) {
    return {
      strengths: [] as SpotlightStatKey[],
      weakness: pickOne(STAT_KEYS),
    };
  }

  if (roll < 0.7) {
    const strength = pickOne(STAT_KEYS);
    const weaknessPool = STAT_KEYS.filter((key) => key !== strength);

    return {
      strengths: [strength],
      weakness: Math.random() < 0.75 ? pickOne(weaknessPool) : null,
    };
  }

  const shuffled = shuffle(STAT_KEYS);
  const strengths = [shuffled[0], shuffled[1]];
  const weaknessPool = STAT_KEYS.filter((key) => !strengths.includes(key));

  return {
    strengths,
    weakness: Math.random() < 0.85 ? pickOne(weaknessPool) : null,
  };
}

function applyStrengthWeaknessToStats(
  stats: SpotlightStats,
  strengths: SpotlightStatKey[],
  weakness: SpotlightStatKey | null,
) {
  const next = { ...stats };

  strengths.forEach((key) => {
    next[key] += 3 + Math.floor(Math.random() * 3);
  });

  if (weakness) {
    next[weakness] = Math.max(
      1,
      next[weakness] - (2 + Math.floor(Math.random() * 2)),
    );
  }

  return next;
}

function getStagePhrase(stage: SpotlightStage) {
  switch (stage) {
    case "egg":
      return "still feels full of hidden potential";
    case "hatchling":
      return "is beginning to show its nature more clearly";
    case "lowform":
      return "has grown into a more defined and capable companion";
    default:
      return "still feels full of mystery";
  }
}

function getElementPhrase(element: SpotlightElement) {
  switch (element) {
    case "water":
      return "Its presence feels fluid, patient, and difficult to pin down.";
    case "fire":
      return "There is a sharp spark to it, like it is always one breath away from action.";
    case "earth":
      return "It gives off a steady, grounded presence that feels hard to shake.";
    case "air":
      return "It moves with a lightness that makes it seem difficult to catch or corner.";
    case "ice":
      return "Its temperament feels cool and precise, with a quiet edge underneath.";
    case "storm":
      return "There is a restless charge around it, like tension gathering before lightning.";
    case "light":
      return "It carries a bright, reassuring energy that stands out immediately.";
    case "shadow":
      return "It has a darker, stranger aura that makes its intentions harder to read.";
    case "null":
      return "Something about it feels unusual, almost outside the usual rules of Aliune.";
    default:
      return "It has a distinct presence that immediately sets it apart.";
  }
}

function getPersonalityPhrase(personality: string) {
  const p = personality.toLowerCase();

  if (p.includes("gentle") || p.includes("calm")) {
    return "Its behavior leans soft and measured rather than reckless.";
  }
  if (p.includes("curious") || p.includes("clever")) {
    return "It seems to study everything around it before deciding how to act.";
  }
  if (p.includes("brave") || p.includes("bold")) {
    return "It meets unfamiliar things head-on instead of shrinking away.";
  }
  if (p.includes("playful") || p.includes("cheerful")) {
    return "It turns even small moments into movement, attention, and mischief.";
  }
  if (p.includes("shy") || p.includes("dreamy")) {
    return "It can seem reserved at first, but there is clearly a lot going on beneath that quiet shell.";
  }
  if (p.includes("loyal") || p.includes("protective")) {
    return "It gives off the feeling that once it bonds, it stays committed.";
  }
  if (p.includes("fiery") || p.includes("stubborn")) {
    return "It has a strong will and does not like being pushed around.";
  }
  if (p.includes("sleepy")) {
    return "It moves at its own pace and does not rush unless it absolutely has to.";
  }
  if (p.includes("watchful") || p.includes("swift")) {
    return "It stays alert and reacts quickly to changes around it.";
  }

  return "Its personality already feels distinct, even this early in its growth.";
}

function getStrengthPhrase(strengths: SpotlightStatKey[]) {
  if (strengths.length === 0) {
    return "It does not lean too heavily into one obvious specialty yet.";
  }

  if (strengths.length === 1) {
    switch (strengths[0]) {
      case "hp":
        return "It looks built to stay standing even when a fight gets rough.";
      case "atk":
        return "It seems most comfortable when pressing the offense.";
      case "def":
        return "It appears naturally suited to holding its ground.";
      case "spd":
        return "It gives the impression that speed is one of its biggest advantages.";
      case "magi":
        return "There is a strong sense that its power comes from mystical force rather than brute strength.";
      case "mana":
        return "It feels unusually suited to sustaining magical output over time.";
      default:
        return "It already shows signs of a clear strength.";
    }
  }

  const has = (key: SpotlightStatKey) => strengths.includes(key);

  if (has("atk") && has("spd")) {
    return "It looks like the kind of Delta that strikes fast and keeps pressure on its target.";
  }
  if (has("hp") && has("def")) {
    return "It seems naturally built to absorb punishment and remain steady under pressure.";
  }
  if (has("magi") && has("mana")) {
    return "Its talents seem to favor sustained magical control over simple physical force.";
  }
  if (has("atk") && has("hp")) {
    return "It feels like an aggressive Delta that can also handle a rough exchange.";
  }
  if (has("def") && has("mana")) {
    return "It carries itself like a patient battler that can outlast the pace of a fight.";
  }
  if (has("spd") && has("magi")) {
    return "It gives off the sense of a quick, tricky fighter that relies on timing and strange power.";
  }

  return "It already shows a couple of strengths that make its future role easier to imagine.";
}

function getWeaknessPhrase(weakness: SpotlightStatKey | null) {
  if (!weakness) {
    return "It does not show any glaring weakness right away.";
  }

  switch (weakness) {
    case "hp":
      return "Even so, it may not enjoy drawn-out punishment.";
    case "atk":
      return "Its raw physical hits may not be where it shines most.";
    case "def":
      return "It may need care when facing heavier retaliation.";
    case "spd":
      return "It may not always be the first to move when things get tense.";
    case "magi":
      return "Mystical force does not seem to be its strongest lane.";
    case "mana":
      return "It may struggle more when long magical pressure is required.";
    default:
      return "It still has one softer edge that could shape how it grows.";
  }
}

function buildDescription(input: {
  species: string;
  nickname: string | null;
  stage: SpotlightStage;
  element: SpotlightElement;
  personality: string;
  strengths: SpotlightStatKey[];
  weakness: SpotlightStatKey | null;
}) {
  const label = getDisplayName(input.species, input.nickname);
  const stagePhrase = getStagePhrase(input.stage);
  const elementPhrase = getElementPhrase(input.element);
  const personalityPhrase = getPersonalityPhrase(input.personality);
  const strengthPhrase = getStrengthPhrase(input.strengths);
  const weaknessPhrase = getWeaknessPhrase(input.weakness);

  return `${label} ${stagePhrase}. ${elementPhrase} ${personalityPhrase} ${strengthPhrase} ${weaknessPhrase}`;
}

function readCache(): SpotlightCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpotlightCache;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.pet ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(pet: HomepageSpotlightPet) {
  if (typeof window === "undefined") return;

  const payload: SpotlightCache = {
    pet,
    expiresAt: Date.now() + ROTATE_MS,
  };

  window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

function createRandomSpotlightPet(): HomepageSpotlightPet {
  const species = pickOne(SPECIES_POOL);
  const nickname = Math.random() < 0.7 ? pickOne(NICKNAME_POOL) : null;
  const level = randomLevel();
  const element = pickOne(ELEMENT_POOL);
  const stage = pickOne(STAGE_POOL);
  const personality = pickOne(PERSONALITY_POOL);

  const profile = createStrengthWeaknessProfile();
  const baseStats = createRandomStats(level);
  const stats = applyStrengthWeaknessToStats(
    baseStats,
    profile.strengths,
    profile.weakness,
  );

  return {
    id: `spotlight-${species}-${element}-${stage}-${level}-${personality}`.toLowerCase(),
    species,
    nickname,
    level,
    element,
    stage,
    personality,
    stats,
    strengths: profile.strengths,
    weakness: profile.weakness,
    description: buildDescription({
      species,
      nickname,
      stage,
      element,
      personality,
      strengths: profile.strengths,
      weakness: profile.weakness,
    }),
  };
}

export function useHomepageSpotlightPet() {
  const [pet, setPet] = useState<HomepageSpotlightPet>(
    createRandomSpotlightPet,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCache();

    if (cached && cached.expiresAt > Date.now()) {
      setPet(cached.pet);
      setLoading(false);
      return;
    }

    const nextPet = createRandomSpotlightPet();
    writeCache(nextPet);
    setPet(nextPet);
    setLoading(false);
  }, []);

  const displayName = useMemo(() => {
    return getDisplayName(pet.species, pet.nickname);
  }, [pet.nickname, pet.species]);

  return {
    pet,
    displayName,
    loading,
  };
}
