import type { TalentNode } from "../talentTreeRegistry";

// ─── FERAL TALENT TREE (WoW-Style Grid) ────────────────────
//
// 20 talents | 3 specs: Bleed, Frenzy, Predator
// 3 last-stand defense nodes mixed into combat rows
//
// Layout: 3 columns (Bleed left, Frenzy center, Predator right)
// Rows unlock by TOTAL POINTS SPENT in the Feral tree:
//   Row 1: 0 pts  (root)
//   Row 2: 4 pts
//   Row 3: 8 pts
//   Row 4: 12 pts
//   Row 5: 16 pts
//   Row 6: 22 pts (capstone row)
//
// NO connection lines between nodes.
// Arrows ONLY appear as rank-up indicators on multi-rank talents.
// ────────────────────────────────────────────────────────────

export const FERAL_NODES: TalentNode[] = [
  // ════════════════════════════════════════════════════════════
  // ROW 1 — ROOT (0 points required)
  // ════════════════════════════════════════════════════════════
  {
    id: "feral-root",
    tree: "feral",
    branch: "merge",
    shape: "square",
    name: "Feral Instinct",
    description: "+3% ATK per rank. Core Feral power. Unlocks the tree.",
    tradeoff: null,
    maxRank: 4,
    costPerRank: 1,
    requiredLevel: 1,
    requires: [],
    position: { x: 50, y: 4 },
    effects: [{ type: "attack_percent", value: 3 }],
  },

  // ════════════════════════════════════════════════════════════
  // ROW 2 — FOUNDATION (4 points spent)
  // ════════════════════════════════════════════════════════════
  {
    id: "feral-crimson-fangs",
    tree: "feral",
    branch: "bleed",
    shape: "circle",
    name: "Crimson Fangs",
    description:
      "Attacks gain 5% bleed chance per rank. Seeds all bleed builds.",
    tradeoff: null,
    maxRank: 3,
    costPerRank: 1,
    requiredLevel: 2,
    requires: [],
    position: { x: 20, y: 18 },
    effects: [{ type: "bleed_chance", value: 5 }],
  },
  {
    id: "feral-fang-over-fang",
    tree: "feral",
    branch: "attack",
    shape: "circle",
    name: "Fang Over Fang",
    description:
      "Each consecutive hit within 4s grants +2% ATK. Stacks 5x. Resets on miss.",
    tradeoff: null,
    maxRank: 3,
    costPerRank: 1,
    requiredLevel: 2,
    requires: [],
    position: { x: 50, y: 18 },
    effects: [{ type: "attack_percent", value: 2 }],
  },
  {
    id: "feral-reckless-charge",
    tree: "feral",
    branch: "attack",
    shape: "circle",
    name: "Reckless Charge",
    description:
      "First attack in combat deals 12% bonus damage. Ambush opener.",
    tradeoff: null,
    maxRank: 3,
    costPerRank: 1,
    requiredLevel: 2,
    requires: [],
    position: { x: 80, y: 18 },
    effects: [{ type: "attack", value: 4 }],
  },

  // ════════════════════════════════════════════════════════════
  // ROW 3 — SPEC DEVELOPMENT (8 points spent)
  // ════════════════════════════════════════════════════════════
  // -- Bleed --
  {
    id: "feral-savage-rend",
    tree: "feral",
    branch: "bleed",
    shape: "circle",
    name: "Savage Rend",
    description:
      "Bleed duration +1.5s per rank. Bleed ticks deal 10% more damage.",
    tradeoff: null,
    maxRank: 2,
    costPerRank: 1,
    requiredLevel: 3,
    requires: [],
    position: { x: 10, y: 32 },
    effects: [{ type: "bleed_power", value: 10 }],
  },
  {
    id: "feral-blood-scent",
    tree: "feral",
    branch: "bleed",
    shape: "circle",
    name: "Blood Scent",
    description: "+8% ATK against bleeding targets per rank.",
    tradeoff: null,
    maxRank: 2,
    costPerRank: 1,
    requiredLevel: 3,
    requires: [],
    position: { x: 30, y: 32 },
    effects: [{ type: "bleed_bonus_damage", value: 8 }],
  },
  // -- Frenzy --
  {
    id: "feral-swift-predator",
    tree: "feral",
    branch: "attack",
    shape: "circle",
    name: "Swift Predator",
    description: "+4% SPD per rank. Faster action in combat.",
    tradeoff: null,
    maxRank: 2,
    costPerRank: 1,
    requiredLevel: 3,
    requires: [],
    position: { x: 50, y: 32 },
    effects: [{ type: "speed_percent", value: 4 }],
  },
  // -- Predator --
  {
    id: "feral-blur-step",
    tree: "feral",
    branch: "attack",
    shape: "circle",
    name: "Blur Step",
    description: "+3% dodge chance per rank. Evasion for hunt-style play.",
    tradeoff: null,
    maxRank: 2,
    costPerRank: 1,
    requiredLevel: 3,
    requires: [],
    position: { x: 70, y: 32 },
    effects: [{ type: "dodge_chance", value: 3 }],
  },
  // -- DEFENSE (last-stand) --
  {
    id: "feral-adrenaline-spike",
    tree: "feral",
    branch: "attack",
    shape: "circle",
    name: "Adrenaline Spike",
    description: "Below 40% HP, gain 10% SPD. Panic reflex to stay alive.",
    tradeoff: null,
    maxRank: 2,
    costPerRank: 1,
    requiredLevel: 3,
    requires: [],
    position: { x: 90, y: 32 },
    effects: [{ type: "speed_percent", value: 10 }],
  },

  // ════════════════════════════════════════════════════════════
  // ROW 4 — MID POWER (12 points spent)
  // ════════════════════════════════════════════════════════════
  // -- Bleed --
  {
    id: "feral-shred-storm",
    tree: "feral",
    branch: "bleed",
    shape: "triangle",
    name: "Shred Storm",
    description: "Bleed has 20% chance to spread to a nearby enemy on tick.",
    tradeoff: null,
    maxRank: 1,
    costPerRank: 2,
    requiredLevel: 5,
    requires: [],
    position: { x: 20, y: 46 },
    effects: [{ type: "shred_storm_active", value: 1 }],
  },
  // -- Frenzy --
  {
    id: "feral-phantom-strikes",
    tree: "feral",
    branch: "attack",
    shape: "triangle",
    name: "Phantom Strikes",
    description: "10% chance per rank for attacks to hit twice at 60% damage.",
    tradeoff: null,
    maxRank: 2,
    costPerRank: 2,
    requiredLevel: 5,
    requires: [],
    position: { x: 50, y: 46 },
    effects: [{ type: "double_attack_chance", value: 10 }],
  },
  // -- Predator --
  {
    id: "feral-rush-synergy",
    tree: "feral",
    branch: "attack",
    shape: "triangle",
    name: "Rush Synergy",
    description: "Dodge triggers a counter-attack dealing 50% ATK damage.",
    tradeoff: null,
    maxRank: 1,
    costPerRank: 2,
    requiredLevel: 5,
    requires: [],
    position: { x: 80, y: 46 },
    effects: [{ type: "dodge_counter", value: 50 }],
  },

  // ════════════════════════════════════════════════════════════
  // ROW 5 — HIGH POWER (16 points spent)
  // ════════════════════════════════════════════════════════════
  // -- Bleed --
  {
    id: "feral-pain-engine",
    tree: "feral",
    branch: "bleed",
    shape: "triangle",
    name: "Pain Engine",
    description: "Each bleed tick on enemies grants +1% ATK for 6s. Stacks.",
    tradeoff: null,
    maxRank: 2,
    costPerRank: 2,
    requiredLevel: 7,
    requires: [],
    position: { x: 15, y: 60 },
    effects: [{ type: "damage_taken_attack_stack", value: 1 }],
  },
  // -- DEFENSE (last-stand) --
  {
    id: "feral-deathwish-gambit",
    tree: "feral",
    branch: "bleed",
    shape: "triangle",
    name: "Deathwish Gambit",
    description: "Below 20% HP, gain 25% ATK and bleed immunity on self.",
    tradeoff: "No safety net. Pure desperation power.",
    maxRank: 1,
    costPerRank: 3,
    requiredLevel: 7,
    requires: [],
    position: { x: 40, y: 60 },
    effects: [{ type: "deathwish_active", value: 1 }],
  },
  // -- Frenzy --
  {
    id: "feral-frenzy-state",
    tree: "feral",
    branch: "attack",
    shape: "triangle",
    name: "Frenzy State",
    description: "After landing 10 hits in a fight, gain 8% damage reduction.",
    tradeoff: null,
    maxRank: 1,
    costPerRank: 2,
    requiredLevel: 7,
    requires: [],
    position: { x: 60, y: 60 },
    effects: [{ type: "defense_percent", value: 8 }],
  },
  // -- DEFENSE (last-stand) --
  {
    id: "feral-last-breath",
    tree: "feral",
    branch: "attack",
    shape: "triangle",
    name: "Last Breath",
    description: "Survive a killing blow once per battle with 1 HP.",
    tradeoff: null,
    maxRank: 1,
    costPerRank: 3,
    requiredLevel: 7,
    requires: [],
    position: { x: 85, y: 60 },
    effects: [{ type: "death_save", value: 1 }],
  },

  // ════════════════════════════════════════════════════════════
  // ROW 6 — PRE-CAPSTONE + CAPSTONE (22 points spent)
  // ════════════════════════════════════════════════════════════
  {
    id: "feral-primal-fury",
    tree: "feral",
    branch: "merge",
    shape: "square",
    name: "Primal Fury",
    description: "Reduce enemy DEF by 12% for 6s on activation. 20s cooldown.",
    tradeoff: null,
    maxRank: 1,
    costPerRank: 3,
    requiredLevel: 9,
    requires: [],
    position: { x: 35, y: 76 },
    effects: [{ type: "defense_percent", value: -12 }],
  },
  {
    id: "feral-blood-debt",
    tree: "feral",
    branch: "bleed",
    shape: "square",
    name: "Blood Debt",
    description: "15% of bleed damage dealt is returned as self-heal.",
    tradeoff: null,
    maxRank: 1,
    costPerRank: 3,
    requiredLevel: 9,
    requires: [],
    position: { x: 65, y: 76 },
    effects: [{ type: "blood_debt_reflect", value: 15 }],
  },
  // -- CAPSTONE --
  {
    id: "feral-extinction",
    tree: "feral",
    branch: "capstone",
    shape: "triangle",
    name: "Extinction",
    description:
      "All damage +10%. Bleeding targets take 5% more from all sources. On kill, restore 5% max HP.",
    tradeoff: null,
    maxRank: 1,
    costPerRank: 4,
    requiredLevel: 10,
    requires: [],
    position: { x: 50, y: 87 },
    effects: [
      { type: "apex_scaling", value: 10 },
      { type: "bleed_bonus_damage", value: 5 },
      { type: "kill_reset", value: 5 },
    ],
  },
];
