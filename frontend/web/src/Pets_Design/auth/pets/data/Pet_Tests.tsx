// ---------------------------------------------
// 🚨 TEMPORARY TEST DATA
// DELETE THIS FILE AFTER STARTER FLOW IS VERIFIED
// ---------------------------------------------

export type ElementalLine =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

export type BaseStats = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
};

export type StarterSprout = {
  key: string;
  name: string;
  line: ElementalLine;
  base: BaseStats;
};

export const STARTER_SPROUTS: StarterSprout[] = [
  {
    key: "centure",
    name: "Centure",
    line: "water",
    // Egg base stats must total 10
    base: { hp: 2, atk: 1, magi: 3, def: 2, spd: 2 },
  },
  {
    key: "corona",
    name: "Corona",
    line: "fire",
    base: { hp: 2, atk: 3, magi: 1, def: 1, spd: 3 },
  },
  {
    key: "medidi",
    name: "Medidi",
    line: "earth",
    base: { hp: 3, atk: 2, magi: 0, def: 3, spd: 2 },
  },
  {
    key: "breezy",
    name: "Breezy",
    line: "air",
    base: { hp: 1, atk: 2, magi: 3, def: 1, spd: 3 },
  },
  {
    key: "crybit",
    name: "Crybit",
    line: "ice",
    base: { hp: 2, atk: 1, magi: 2, def: 3, spd: 2 },
  },
  {
    key: "ether",
    name: "Ether",
    line: "storm",
    base: { hp: 1, atk: 1, magi: 4, def: 1, spd: 3 },
  },
  {
    key: "terra",
    name: "Terra",
    line: "light",
    base: { hp: 2, atk: 2, magi: 2, def: 2, spd: 2 },
  },
  {
    key: "mason",
    name: "Mason",
    line: "shadow",
    base: { hp: 2, atk: 3, magi: 2, def: 1, spd: 2 },
  },
];
