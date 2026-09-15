# Phase 1 — exact battle engine changes
Line numbers refer to the final workspace files. old_code comes from the inspected pre-edit file. No Wildwood, frontend, CSS, database, XP, or quest integration is included.

### Filename:

backend/server/src/battle/battleTypes.ts

### LineNumber:

1–61 (new file)

### old_code:

```text
NEW FILE
```

### new_code:

```typescript
import type { SharedElementLine } from "../shared/pets/species/starter-species";

export type BattleElement = SharedElementLine;
export type BattleSide = "player" | "enemy";
export type BattleRow = "front" | "middle" | "back";
export type BattleStatus = "active" | "victory" | "defeat";
export type BattleSkillId = "basic-strike" | "mend";

// Existing PvE stat names; only the combat snapshot is copied into a battle.
export type BattleParticipantInput = {
  id: string;
  sourcePetId?: string;
  speciesId: string;
  name: string;
  side: BattleSide;
  row: BattleRow;
  element: BattleElement;
  level: number;
  hpMax: number;
  hpCur: number;
  atk: number;
  def: number;
  magi: number;
  spd: number;
};

export type BattleParticipant = BattleParticipantInput & {
  turnMeter: number;
  guarding: boolean;
  defeated: boolean;
};

export type BattleEvent = {
  turnNumber: number;
  type: "battle_started" | "attack" | "skill" | "damage" | "heal" | "guard"
    | "participant_defeated" | "victory" | "defeat";
  actorId?: string;
  targetId?: string;
  skillId?: BattleSkillId;
  amount?: number;
};

export type BattleState = {
  id: string;
  status: BattleStatus;
  participants: BattleParticipant[];
  activeParticipantId: string | null;
  turnNumber: number;
  mendMultiplier: number;
  log: BattleEvent[];
};

export type BattleAction = {
  actorId: string;
  // Required revision prevents replay when the same Kith acts again.
  turnNumber: number;
} & (
  | { action: "basic_attack"; targetId: string }
  | { action: "guard" }
  | { action: "skill"; skillId: BattleSkillId; targetId: string }
);
```

### Description:

Adds focused combat types using the shared element type and existing PvE stat names. Includes rows, battle-local HP, defeat flags, structured events and turn revisions. Backend battle domain only.


### Filename:

backend/server/src/battle/battleMath.ts

### LineNumber:

1–72 (new file)

### old_code:

```text
NEW FILE
```

### new_code:

```typescript
import type { BattleElement } from "./battleTypes";

// Extracted from the existing PvE route without changing its tuning.
type DamageUnit = {
  element: BattleElement;
  atk: number;
  def: number;
  magi: number;
  guarding: boolean;
  status?: { exposed?: number; weakened?: number };
};
export function getElementMultiplier(
  attacker: BattleElement,
  defender: BattleElement,
) {
  const strongAgainst: Partial<Record<BattleElement, BattleElement[]>> = {
    fire: ["earth", "ice"],
    water: ["fire"],
    earth: ["air", "storm"],
    air: ["water"],
    ice: ["air"],
    storm: ["water"],
    light: ["shadow"],
    shadow: ["light"],
  };

  const weakAgainst: Partial<Record<BattleElement, BattleElement[]>> = {
    fire: ["water"],
    water: ["air", "storm"],
    earth: ["fire", "ice"],
    air: ["earth", "ice"],
    ice: ["fire"],
    storm: ["earth"],
    light: ["shadow"],
    shadow: ["light"],
  };

  if (strongAgainst[attacker]?.includes(defender)) return 1.25;
  if (weakAgainst[attacker]?.includes(defender)) return 0.85;

  return 1;
}

export function calculateDamage(params: {
  attacker: DamageUnit;
  defender: DamageUnit;
  power: number;
  useMagi?: boolean;
  elemental?: boolean;
}) {
  const { attacker, defender, power, useMagi, elemental } = params;

  const offense = useMagi ? attacker.magi : attacker.atk;
  const defense = defender.guarding ? defender.def * 1.35 : defender.def;

  const exposedBonus = defender.status?.exposed ? 1.2 : 1;
  const weakenedPenalty = attacker.status?.weakened ? 0.8 : 1;
  const elementBonus = elemental
    ? getElementMultiplier(attacker.element, defender.element)
    : 1;

  const raw =
    offense * power * weakenedPenalty * exposedBonus * elementBonus -
    defense * 0.45;

  return Math.max(1, Math.round(raw));
}

export function calculateMend(magi: number, level: number, multiplier: number) {
  const baseHeal = Math.max(4, Math.round(magi * 1.25 + level * 2));
  return Math.round(baseHeal * multiplier);
}
```

### Description:

Extracts existing PvE damage, Guard defense scaling, elemental matchups and Mend math. Both old PvE and the new engine reuse these functions. Unlisted element matchups, including null_element, remain neutral. Existing battle balance values are preserved.


### Filename:

backend/server/src/battle/battleEngine.ts

### LineNumber:

1–194 (new file)

### old_code:

```text
NEW FILE
```

### new_code:

```typescript
import { z } from "zod";
import { calculateDamage, calculateMend } from "./battleMath";
import type {
  BattleAction, BattleEvent, BattleParticipant, BattleParticipantInput, BattleState,
} from "./battleTypes";

// Existing threshold and log limit. SPD is used directly, without a stat floor.
const TURN_THRESHOLD = 100;
const MAX_LOG_EVENTS = 50;
const MAX_AUTOMATIC_TURNS = 200;
const idSchema = z.string().trim().min(1);
const statSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const participantSchema = z.object({
  id: idSchema,
  sourcePetId: idSchema.optional(),
  speciesId: idSchema,
  name: idSchema,
  side: z.enum(["player", "enemy"]),
  row: z.enum(["front", "middle", "back"]),
  element: z.enum([
    "null_element", "fire", "water", "earth", "air", "ice", "storm", "light", "shadow",
  ]),
  level: z.number().int().min(1).max(10),
  hpMax: statSchema.positive(),
  hpCur: statSchema,
  atk: statSchema,
  def: statSchema,
  magi: statSchema,
  spd: statSchema.positive(),
}).strict().refine((pet) => pet.hpCur <= pet.hpMax, "HP exceeds maximum");

const actorFields = { actorId: idSchema, turnNumber: statSchema.positive() };
const actionSchema = z.discriminatedUnion("action", [
  z.object({ ...actorFields, action: z.literal("basic_attack"), targetId: idSchema }).strict(),
  z.object({ ...actorFields, action: z.literal("guard") }).strict(),
  z.object({
    ...actorFields, action: z.literal("skill"),
    skillId: z.enum(["basic-strike", "mend"]), targetId: idSchema,
  }).strict(),
]);

export class BattleRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BattleRuleError";
  }
}

function requireRule(condition: boolean, message: string): asserts condition {
  if (!condition) throw new BattleRuleError(message);
}

function record(state: BattleState, event: Omit<BattleEvent, "turnNumber">) {
  state.log.push({ ...event, turnNumber: state.turnNumber });
  if (state.log.length > MAX_LOG_EVENTS) state.log.shift();
}

function checkEnd(state: BattleState): boolean {
  const playersAlive = state.participants.some((pet) => pet.side === "player" && !pet.defeated);
  const enemiesAlive = state.participants.some((pet) => pet.side === "enemy" && !pet.defeated);
  if (playersAlive && enemiesAlive) return false;
  state.status = playersAlive ? "victory" : "defeat";
  state.activeParticipantId = null;
  record(state, { type: state.status });
  return true;
}

function chooseNext(state: BattleState): BattleParticipant {
  const living = state.participants.filter((pet) => !pet.defeated);
  // Jump directly to the next ready tick rather than looping once per tick.
  const ticks = Math.max(0, Math.min(...living.map((pet) =>
    Math.ceil((TURN_THRESHOLD - pet.turnMeter) / pet.spd),
  )));
  for (const pet of living) pet.turnMeter += ticks * pet.spd;
  // Stable input order breaks exact ties; pending ready units keep their meter.
  living.sort((a, b) => b.turnMeter - a.turnMeter || b.spd - a.spd);
  const actor = living[0];
  requireRule(actor !== undefined, "No living participant");
  actor.turnMeter -= TURN_THRESHOLD;
  actor.guarding = false;
  state.activeParticipantId = actor.id;
  state.turnNumber += 1;
  return actor;
}

function performAction(state: BattleState, action: BattleAction) {
  requireRule(state.status === "active", "Battle is already finished");
  requireRule(action.turnNumber === state.turnNumber, "Stale battle turn");
  const actor = state.participants.find((pet) => pet.id === action.actorId);
  requireRule(actor !== undefined, "Actor does not exist");
  requireRule(actor.hpCur > 0 && !actor.defeated, "Actor is defeated");
  requireRule(actor.id === state.activeParticipantId, "It is not this participant's turn");

  if (action.action === "guard") {
    actor.guarding = true;
    record(state, { type: "guard", actorId: actor.id });
    return;
  }

  const target = state.participants.find((pet) => pet.id === action.targetId);
  requireRule(target !== undefined, "Target does not exist");
  requireRule(target.hpCur > 0 && !target.defeated, "Target is defeated");
  const healing = action.action === "skill" && action.skillId === "mend";
  requireRule(
    healing ? actor.side === target.side : actor.side !== target.side,
    healing ? "Mend requires a living ally" : "Hostile actions require an enemy",
  );

  if (healing) {
    const amount = Math.min(target.hpMax - target.hpCur, calculateMend(
      actor.magi, actor.level, actor.side === "player" ? state.mendMultiplier : 1,
    ));
    target.hpCur += amount;
    record(state, { type: "heal", actorId: actor.id, targetId: target.id, skillId: "mend", amount });
    return;
  }

  const skill = action.action === "skill";
  const amount = Math.min(target.hpCur, calculateDamage({
    attacker: actor, defender: target, power: skill ? 1.25 : 1,
    useMagi: skill, elemental: skill,
  }));
  target.hpCur -= amount;
  target.defeated = target.hpCur === 0;
  record(state, {
    type: skill ? "skill" : "attack", actorId: actor.id, targetId: target.id,
    ...(skill ? { skillId: "basic-strike" as const } : {}),
  });
  record(state, { type: "damage", actorId: actor.id, targetId: target.id, amount });
  if (target.defeated) record(state, { type: "participant_defeated", targetId: target.id });
}

function advanceToPlayer(state: BattleState) {
  state.activeParticipantId = null;
  let automaticTurns = 0;
  while (!checkEnd(state)) {
    const actor = chooseNext(state);
    if (actor.side === "player") return;
    requireRule(automaticTurns < MAX_AUTOMATIC_TURNS, "Automatic turn safety limit exceeded");
    automaticTurns += 1;
    // Same lowest-current-HP target preference as the existing PvE prototype.
    const target = state.participants.filter((pet) => pet.side === "player" && !pet.defeated)
      .sort((a, b) => a.hpCur - b.hpCur)[0];
    requireRule(target !== undefined, "No living player target");
    performAction(state, {
      action: "basic_attack", actorId: actor.id, targetId: target.id,
      turnNumber: state.turnNumber,
    });
    state.activeParticipantId = null;
  }
}

/** Inputs must come from trusted server pet/team data, never a request's stats. */
export function createBattle(
  id: string,
  participants: readonly BattleParticipantInput[],
  mendMultiplier = 1,
): BattleState {
  const parsed = z.array(participantSchema).min(2).max(8).safeParse(participants);
  requireRule(idSchema.safeParse(id).success, "Invalid battle ID");
  requireRule(parsed.success, "Invalid participants: require bounded HP, level 1–10 and positive SPD");
  requireRule(Number.isFinite(mendMultiplier) && mendMultiplier > 0, "Invalid Mend multiplier");
  const pets = parsed.data;
  requireRule(new Set(pets.map((pet) => pet.id)).size === pets.length, "Duplicate participant ID");
  const petIds = pets.flatMap((pet) => pet.sourcePetId ? [pet.sourcePetId] : []);
  requireRule(new Set(petIds).size === petIds.length, "Duplicate pet ID");
  for (const side of ["player", "enemy"] as const) {
    const count = pets.filter((pet) => pet.side === side).length;
    requireRule(count >= 1 && count <= 4, "Each side requires 1–4 participants");
  }
  requireRule(pets.some((pet) => pet.hpCur > 0), "Battle requires a living participant");
  const state: BattleState = {
    id, status: "active", activeParticipantId: null, turnNumber: 0, mendMultiplier,
    participants: pets.map((pet) => ({
      ...pet, turnMeter: 0, guarding: false, defeated: pet.hpCur === 0,
    })),
    log: [],
  };
  record(state, { type: "battle_started" });
  advanceToPlayer(state);
  return state;
}

/** Returns a new server snapshot; validation failures leave the input untouched. */
export function resolveBattleAction(state: BattleState, input: unknown): BattleState {
  const parsed = actionSchema.safeParse(input);
  requireRule(parsed.success, "Invalid battle action");
  const actor = state.participants.find((pet) => pet.id === parsed.data.actorId);
  requireRule(actor?.side === "player", "Only player decisions may be submitted");
  const next = structuredClone(state);
  performAction(next, parsed.data);
  advanceToPlayer(next);
  return next;
}
```

### Description:

Adds a framework-independent PvE engine. Validates participant limits and player decisions, uses actual positive SPD with deterministic carried initiative, resolves enemy basic attacks through the same action resolver, and returns new battle snapshots. Level-one basic-strike and Mend use existing server combat calculations; advanced Element Strike status effects are not introduced. Invalid decisions cannot mutate the supplied state. No Express or database dependencies.


### Filename:

tools/check-battle-engine.cjs

### LineNumber:

1–168 (new file)

### old_code:

```text
NEW FILE
```

### new_code:

```typescript
// Run after the backend build: pnpm exec node tools/check-battle-engine.cjs
const assert = require("node:assert/strict");
const { createBattle, resolveBattleAction, BattleRuleError } = require("../backend/server/dist/battle/battleEngine.js");
const { calculateDamage, calculateMend, getElementMultiplier } = require("../backend/server/dist/battle/battleMath.js");

let checks = 0;
function check(name, run) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}
function pet(id, side, overrides = {}) {
  return {
    id, speciesId: side === "player" ? "fire_starter" : "kithna_pebelin",
    name: id, side, row: "middle", element: "fire", level: 1,
    hpMax: 40, hpCur: 40, atk: 8, def: 4, magi: 8, spd: 4,
    ...overrides,
  };
}
function act(state, action, targetId, skillId) {
  return resolveBattleAction(state, {
    actorId: state.activeParticipantId, turnNumber: state.turnNumber, action,
    ...(targetId ? { targetId } : {}), ...(skillId ? { skillId } : {}),
  });
}
function pair(overrides = {}, enemyOverrides = {}) {
  return createBattle("pair", [pet("p", "player", overrides), pet("e", "enemy", enemyOverrides)]);
}

check("4 versus 2: Attack, Guard, Mend, skill, enemy turns, defeat and victory", () => {
  const input = [
    pet("p1", "player", { row: "front" }), pet("p2", "player"),
    pet("p3", "player", { row: "back" }), pet("p4", "player", { hpCur: 20 }),
    pet("e1", "enemy", { spd: 3 }), pet("e2", "enemy", { spd: 3 }),
  ];
  const before = structuredClone(input);
  let state = createBattle("slice", input);
  assert.equal(state.activeParticipantId, "p1");
  state = act(state, "basic_attack", "e1");
  assert.equal(state.participants[4].hpCur, 34);
  state = act(state, "guard");
  assert.equal(state.participants[1].guarding, true);
  state = act(state, "skill", "p4", "mend");
  assert.equal(state.participants[3].hpCur, 32);
  state = act(state, "skill", "e1", "basic-strike");
  assert.ok(state.log.some((event) => event.type === "attack" && event.actorId === "e1"));
  assert.ok(state.log.some((event) => event.type === "attack" && event.actorId === "e2"));
  let turns = 0;
  while (state.status === "active" && turns++ < 100) {
    const target = state.participants.find((unit) => unit.side === "enemy" && !unit.defeated);
    state = act(state, "basic_attack", target.id);
  }
  assert.equal(state.status, "victory");
  assert.equal(state.activeParticipantId, null);
  assert.ok(state.participants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated && unit.hpCur === 0));
  assert.ok(state.log.some((event) => event.type === "participant_defeated"));
  assert.deepEqual(input, before);
});

check("existing damage, Guard, elemental and Mend calculations", () => {
  const attacker = pet("p", "player", { atk: 20 });
  const defender = { ...pet("e", "enemy", { def: 20 }), guarding: false };
  assert.equal(calculateDamage({ attacker, defender, power: 1 }), 11);
  assert.equal(calculateDamage({ attacker, defender: { ...defender, guarding: true }, power: 1 }), 8);
  assert.equal(calculateMend(8, 1, 1), 12);
  assert.equal(getElementMultiplier("fire", "earth"), 1.25);
  assert.equal(getElementMultiplier("fire", "water"), 0.85);
  assert.equal(getElementMultiplier("null_element", "fire"), 1);
});

check("small SPD values remain distinct and faster Kith act more often", () => {
  let state = createBattle("speed", [
    pet("slow", "player", { spd: 1 }), pet("fast", "player", { spd: 4 }),
    pet("e", "enemy", { spd: 1, atk: 0 }),
  ]);
  const order = [];
  for (let i = 0; i < 5; i++) {
    order.push(state.activeParticipantId);
    state = act(state, "guard");
  }
  assert.deepEqual(order, ["fast", "fast", "fast", "fast", "slow"]);
});

check("Guard survives enemy attacks and clears at the next actor turn", () => {
  const state = pair({ def: 20 }, { atk: 20 });
  const result = act(state, "guard");
  assert.equal(result.participants[0].hpCur, 32);
  assert.equal(result.activeParticipantId, "p");
  assert.equal(result.participants[0].guarding, false);
});

check("Mend clamps to max HP and logs actual restored HP", () => {
  const state = createBattle("heal", [
    pet("p", "player"), pet("ally", "player", { hpCur: 39 }), pet("e", "enemy"),
  ]);
  const result = act(state, "skill", "ally", "mend");
  assert.equal(result.participants[1].hpCur, 40);
  assert.equal(result.log.find((event) => event.type === "heal").amount, 1);
});

check("invalid actions reject without changing the input snapshot", () => {
  const state = createBattle("invalid", [
    pet("p", "player"), pet("ally", "player"), pet("dead", "player", { hpCur: 0 }),
    pet("e", "enemy"), pet("dead-e", "enemy", { hpCur: 0 }),
  ]);
  const base = { actorId: "p", turnNumber: state.turnNumber, action: "basic_attack", targetId: "e" };
  const actions = [
    { ...base, actorId: "missing" }, { ...base, actorId: "ally" },
    { ...base, actorId: "dead" }, { ...base, actorId: "e" },
    { ...base, targetId: "missing" }, { ...base, targetId: "dead-e" },
    { ...base, targetId: "ally" }, { ...base, damage: 999 },
    { ...base, turnNumber: 0 }, { ...base, action: "invalid" },
    { ...base, action: "skill", skillId: "unknown" },
    { ...base, action: "skill", skillId: "mend" },
    { ...base, action: "skill", skillId: "mend", targetId: "dead" },
    { ...base, action: "skill", skillId: "basic-strike", targetId: "ally" },
    null, {},
  ];
  const before = structuredClone(state);
  for (const action of actions) {
    assert.throws(() => resolveBattleAction(state, action), BattleRuleError);
    assert.deepEqual(state, before);
  }
});

check("duplicate action fails even when the same player becomes active again", () => {
  const state = pair();
  const action = { actorId: "p", turnNumber: state.turnNumber, action: "basic_attack", targetId: "e" };
  const result = resolveBattleAction(state, action);
  assert.equal(result.activeParticipantId, "p");
  assert.throws(() => resolveBattleAction(result, action), /Stale battle turn/);
  assert.equal(state.participants[1].hpCur, 40);
});

check("victory and defeat reject further actions; defeat does not mutate pet inputs", () => {
  const victory = act(pair({ atk: 100 }), "basic_attack", "e");
  assert.equal(victory.status, "victory");
  assert.throws(() => resolveBattleAction(victory, { actorId: "p", turnNumber: victory.turnNumber, action: "guard" }), /finished/);
  const input = [pet("p", "player", { hpCur: 1 }), pet("e", "enemy", { spd: 8 })];
  const defeat = createBattle("loss", input);
  assert.equal(defeat.status, "defeat");
  assert.equal(defeat.participants[0].hpCur, 0);
  assert.equal(input[0].hpCur, 1);
  assert.throws(() => resolveBattleAction(defeat, { actorId: "p", turnNumber: defeat.turnNumber, action: "guard" }), /finished/);
});

check("participant limits, rows, IDs, levels, HP and Speed validation", () => {
  const p = pet("p", "player");
  const e = pet("e", "enemy");
  const invalid = [
    [], [p], [p, { ...e, id: "p" }],
    [p, { ...e, spd: 0 }], [p, { ...e, spd: NaN }],
    [p, { ...e, hpCur: -1 }], [p, { ...e, hpCur: 41 }],
    [p, { ...e, row: "sky" }], [p, { ...e, level: 11 }],
    [p, { ...e, element: "voidborne" }],
    [...Array.from({ length: 5 }, (_, i) => pet(`p${i}`, "player")), e],
    [p, ...Array.from({ length: 5 }, (_, i) => pet(`e${i}`, "enemy"))],
    [{ ...p, sourcePetId: "same" }, { ...e, sourcePetId: "same" }],
  ];
  for (const participants of invalid) assert.throws(() => createBattle("invalid", participants), BattleRuleError);
  const full = createBattle("full", [
    ...Array.from({ length: 4 }, (_, i) => pet(`p${i}`, "player")),
    ...Array.from({ length: 4 }, (_, i) => pet(`e${i}`, "enemy")),
  ]);
  assert.equal(full.participants.length, 8);
});

console.log(`${checks} battle engine checks passed.`);
```

### Description:

Adds a dependency-free Node assertion check for the compiled backend. Nine checks cover the 4v2 slice, calculations, Speed, Guard, healing, invalid decisions, replays, outcomes and participant boundaries. Run pnpm exec node tools/check-battle-engine.cjs after a backend build. This file is JavaScript, not TypeScript.


### Filename:

backend/server/src/routes/battle/battlePve.ts

### LineNumber:

1–2 (imports)

### old_code:

```text
import { Router } from "express";
```

### new_code:

```typescript
import { calculateDamage, calculateMend } from "../../battle/battleMath";
import { Router } from "express";
```

### Description:

Imports the extracted calculations. Existing HTTP behavior and route registration are preserved.


### Filename:

backend/server/src/routes/battle/battlePve.ts

### LineNumber:

126 (getEnemySide; calculation functions removed immediately after it)

### old_code:

```text
function getEnemySide(side: BattleSide): BattleSide {
  return side === "player" ? "enemy" : "player";
}

function getElementMultiplier(
  attacker: BattleElement,
  defender: BattleElement,
) {
  const strongAgainst: Record<BattleElement, BattleElement[]> = {
    fire: ["earth", "ice"],
    water: ["fire"],
    earth: ["air", "storm"],
    air: ["water"],
    ice: ["air"],
    storm: ["water"],
    light: ["shadow"],
    shadow: ["light"],
  };

  const weakAgainst: Record<BattleElement, BattleElement[]> = {
    fire: ["water"],
    water: ["air", "storm"],
    earth: ["fire", "ice"],
    air: ["earth", "ice"],
    ice: ["fire"],
    storm: ["earth"],
    light: ["shadow"],
    shadow: ["light"],
  };

  if (strongAgainst[attacker]?.includes(defender)) return 1.25;
  if (weakAgainst[attacker]?.includes(defender)) return 0.85;

  return 1;
}

function calculateDamage(params: {
  attacker: BattleUnit;
  defender: BattleUnit;
  power: number;
  useMagi?: boolean;
  elemental?: boolean;
}) {
  const { attacker, defender, power, useMagi, elemental } = params;

  const offense = useMagi ? attacker.magi : attacker.atk;
  const defense = defender.guarding ? defender.def * 1.35 : defender.def;

  const exposedBonus = defender.status.exposed ? 1.2 : 1;
  const weakenedPenalty = attacker.status.weakened ? 0.8 : 1;
  const elementBonus = elemental
    ? getElementMultiplier(attacker.element, defender.element)
    : 1;

  const raw =
    offense * power * weakenedPenalty * exposedBonus * elementBonus -
    defense * 0.45;

  return Math.max(1, Math.round(raw));
}
```

### new_code:

```typescript
function getEnemySide(side: BattleSide): BattleSide {
  return side === "player" ? "enemy" : "player";
}
```

### Description:

Removes the route-local copies after extracting them into battleMath.ts. Keeps a single implementation of damage and matchup math.


### Filename:

backend/server/src/routes/battle/battlePve.ts

### LineNumber:

272–276 (performSkill)

### old_code:

```text
    const baseHeal = Math.max(
      4,
      Math.round(actor.magi * 1.25 + actor.level * 2),
    );
    const heal =
      actor.side === "player"
        ? Math.round(baseHeal * state.mendMultiplier)
        : baseHeal;
```

### new_code:

```typescript
    const heal = calculateMend(
      actor.magi,
      actor.level,
      actor.side === "player" ? state.mendMultiplier : 1,
    );
```

### Description:

Calls the shared Mend calculator with the existing player title multiplier or neutral enemy multiplier. Same healing amount and HP clamp as before.

## Verification

- Initial required backend build: pnpm dependency preflight aborted before TypeScript (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY).
- Set pnpm_config_verify_deps_before_run=warn in the command process only; no project configuration or dependencies changed.
- pnpm --dir backend/server build: PASS, exit 0, Build was a success.
- pnpm exec node tools/check-battle-engine.cjs: PASS, nine checks.
- git diff --check: PASS; Git reports normal LF-to-CRLF conversion warnings.

## Rules retained and Phase 1 choices

- Attack: max(1, round(ATK - DEF * 0.45)) before HP clamping.
- Guard: existing DEF * 1.35 during damage calculation; minimum-one damage is retained, so rounding can leave small hits unchanged.
- basic-strike: existing elemental strike damage math, MAGI * 1.25 with the existing matchup multiplier and defense deduction. No advanced status effects added.
- Mend: max(4, round(MAGI * 1.25 + level * 2)); existing optional player multiplier retained.
- Existing matchup values 1.25 / 0.85 / 1 retained. No invented Voidborne matchup.
- Initiative: threshold 100 retained; uses actual positive integer SPD, carries excess meter, breaks ties by Speed then input order. Rejects zero/invalid SPD rather than silently changing a pet stat.
- Operational limits: 50 log events, 200 automatic enemy turns per call. Hitting the safety limit throws without changing the input snapshot; it does not manufacture a defeat.
- The domain uses the existing level-one command availability and canonical basic-strike / mend IDs. Frontend display formulas remain untouched; current server formulas govern this engine.
- State must stay server-owned. Phase 2 must load owned party data and serialize/persist action updates. The revision check alone is not a cross-process concurrency mechanism.
- No new permanent balance values or schema changes.
