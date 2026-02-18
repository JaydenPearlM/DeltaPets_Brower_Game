// backend/server/src/routes/routePets/starters.ts

import { randomInt as cryptoRandomInt } from "crypto";
import type { Starter } from "./petsType";

// These are test Starters

export const STARTER_SPROUTS: Starter[] = [
  {
    name: "Centure",
    line: "water",
    baseStats: {
      hp: 2,
      atk: 1,
      magi: 3,
      def: 2,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Corona",
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
    name: "Medidi",
    line: "earth",
    baseStats: {
      hp: 3,
      atk: 2,
      magi: 0,
      def: 3,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Breezy",
    line: "air",
    baseStats: {
      hp: 1,
      atk: 2,
      magi: 3,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Crybit",
    line: "ice",
    baseStats: {
      hp: 2,
      atk: 1,
      magi: 2,
      def: 3,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Ether",
    line: "storm",
    baseStats: {
      hp: 1,
      atk: 1,
      magi: 4,
      def: 1,
      spd: 3,
      mana: 0,
      base_total: 10,
    },
  },
  {
    name: "Terra",
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
    name: "Mason",
    line: "shadow",
    baseStats: {
      hp: 2,
      atk: 3,
      magi: 2,
      def: 1,
      spd: 2,
      mana: 0,
      base_total: 10,
    },
  },
];

export function rollStarter(): Starter {
  const n = STARTER_SPROUTS.length;
  const idx = n > 0 ? cryptoRandomInt(n) : 0;
  return STARTER_SPROUTS[idx] ?? STARTER_SPROUTS[0];
}

// single source of truth for matching by name (case-insensitive)
export function findStarterByName(name: string | null | undefined) {
  const n = (name ?? "").trim().toLowerCase();
  return STARTER_SPROUTS.find((s) => s.name.toLowerCase() === n) ?? null;
}
