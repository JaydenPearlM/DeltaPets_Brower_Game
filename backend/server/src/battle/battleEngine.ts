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

/** Initiative preview only; later knockouts can change the actual order. */
export function previewBattleOrder(state: BattleState, count = 6): string[] {
  if (state.status !== "active") return [];
  const copy = structuredClone(state);
  const order = copy.activeParticipantId ? [copy.activeParticipantId] : [];
  while (order.length < Math.max(0, Math.min(12, count))) order.push(chooseNext(copy).id);
  return order;
}
