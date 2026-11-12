import type {
  BattleAction,
  BattleParticipantInput,
  BattleRow,
  BattleState,
} from "../../battle/battleTypes";

export type { BattleAction, BattleRow, BattleState };
export type WildwoodXpReward = {
  petId: string;
  amount: number;
  previousXp: number;
  xp: number;
  previousLevel: number;
  level: number;
  pointsEarned: number;
};
export type WildwoodTeamMember = BattleParticipantInput & {
  imageUrl: string | null;
  displayHp: number | null;
};
export type WildwoodRoomView = {
  pveEnabled?: boolean;
  id: string;
  sequence: number;
  message: string;
  eventKind: "flavor" | "quest_clue" | "corrupted_battle";
  battle: BattleState | null;
  turnOrder: string[];
  corrupted: boolean;
  images: Record<string, string | null>;
  questProgressTarget: number | null;
  itemClaimed: boolean;
  xpReward?: WildwoodXpReward | null;
};
export type WildwoodSession = {
  team: WildwoodTeamMember[];
  room: WildwoodRoomView | null;
};
export type WildwoodExploreRequest = {
  requestId: string;
  previousRoomId: string | null;
  formation: { petId: string; row: BattleRow }[];
};
