// backend/server/src/shared/pets/species.ts

export type SharedElementLine =
  | "null_element"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

export type SharedBaseStats = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
  base_total: number;
};

export type SharedStarter = {
  name: string;
  line: SharedElementLine;
  baseStats: SharedBaseStats;
};

export type ShadowNature = "good" | "bad";

const GOOD_SHADOW_PERSONALITIES = new Set([
  "loyalist",
  "radiant",
  "guardian",
  "gentle",
  "royal",
  "scholar",
  "dreamer",
  "stoic",
  "brightspark",
]);

const BAD_SHADOW_PERSONALITIES = new Set([
  "gremlin",
  "shadowed",
  "feral",
  "blazeborn",
  "wildheart",
  "glutton",
  "prankster",
  "drifter",
  "anxious",
]);

export const STARTER_SPROUTS: SharedStarter[] = [
  {
    name: "Mizule",
    line: "water",
    baseStats: {
      hp: 1,
      atk: 0,
      magi: 3,
      def: 2,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Moltikyn",
    line: "fire",
    baseStats: {
      hp: 2,
      atk: 3,
      magi: 1,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Rootle",
    line: "earth",
    baseStats: {
      hp: 2,
      atk: 1,
      magi: 2,
      def: 2,
      spd: 1,
      mana: 2,
      base_total: 10,
    },
  },
  {
    name: "Zephyx",
    line: "air",
    baseStats: {
      hp: 1,
      atk: 2,
      magi: 2,
      def: 1,
      spd: 4,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Crybit",
    line: "ice",
    baseStats: {
      hp: 2,
      atk: 0,
      magi: 2,
      def: 1,
      spd: 2,
      mana: 3,
      base_total: 10,
    },
  },
  {
    name: "Votlet",
    line: "storm",
    baseStats: {
      hp: 1,
      atk: 5,
      magi: 0,
      def: 0,
      spd: 4,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Solkit",
    line: "light",
    baseStats: {
      hp: 2,
      atk: 2,
      magi: 2,
      def: 2,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Noctimp",
    line: "shadow",
    baseStats: {
      hp: 1,
      atk: 0,
      magi: 4,
      def: 1,
      spd: 1,
      mana: 3,
      base_total: 10,
    },
  },
  {
    name: "Flareclaw",
    line: "shadow",
    baseStats: {
      hp: 1,
      atk: 4,
      magi: 1,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
];

export function findStarterByName(name: string | null | undefined) {
  const normalized = (name ?? "").trim().toLowerCase();

  return (
    STARTER_SPROUTS.find(
      (starter) => starter.name.toLowerCase() === normalized,
    ) ?? null
  );
}

export function getShadowNature(
  personalityKey: string | null | undefined,
): ShadowNature {
  const key = (personalityKey ?? "").trim().toLowerCase();

  if (BAD_SHADOW_PERSONALITIES.has(key)) return "bad";
  if (GOOD_SHADOW_PERSONALITIES.has(key)) return "good";

  return "good";
}

export function getShadowSpeciesForPersonality(
  personalityKey: string | null | undefined,
) {
  const nature = getShadowNature(personalityKey);
  return findStarterByName(nature === "bad" ? "Noctimp" : "Flareclaw");
}
