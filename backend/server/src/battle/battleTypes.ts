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
