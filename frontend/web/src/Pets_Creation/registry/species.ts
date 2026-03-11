// src/Pets_Creation/registry/species.ts
import type { Starter } from "./creationTypes";

// Egg base stats must total 10
export const STARTER_SPROUTS: Starter[] = [
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

  // Shadow hatch - good personality = purple
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

  // Shadow hatch - bad personality = red
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
