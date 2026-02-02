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
    base: { hp: 3, atk: 2, magi: 4, def: 2, spd: 2 },
  },
  {
    key: "corona",
    name: "Corona",
    line: "fire",
    base: { hp: 3, atk: 5, magi: 1, def: 1, spd: 2 },
  },
  {
    key: "medidi",
    name: "Medidi",
    line: "earth",
    base: { hp: 5, atk: 4, magi: 0, def: 5, spd: 1 },
  },
  {
    key: "breezy",
    name: "Breezy",
    line: "air",
    base: { hp: 1, atk: 4, magi: 5, def: 1, spd: 4 },
  },
  {
    key: "crybit",
    name: "Crybit",
    line: "ice",
    base: { hp: 3, atk: 2, magi: 3, def: 3, spd: 1 },
  },
  {
    key: "ether",
    name: "Ether",
    line: "storm",
    base: { hp: 2, atk: 2, magi: 5, def: 1, spd: 4 },
  },
  {
    key: "terra",
    name: "Terra",
    line: "light",
    base: { hp: 4, atk: 3, magi: 3, def: 4, spd: 2 },
  },
  {
    key: "mason",
    name: "Mason",
    line: "shadow",
    base: { hp: 2, atk: 4, magi: 3, def: 1, spd: 5 },
  },
];
