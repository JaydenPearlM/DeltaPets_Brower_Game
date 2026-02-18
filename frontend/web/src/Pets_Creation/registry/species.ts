// src/Pets_Creation/registry/species.ts
import type { Starter } from "./creationTypes";

// Egg base stats must total 10
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
