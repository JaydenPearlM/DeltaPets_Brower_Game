import type { BattleAction, BattleParticipantInput, BattleRow, BattleState } from "../../battle/battleTypes";

export type { BattleAction, BattleRow, BattleState };
export type WildwoodTeamMember = BattleParticipantInput & { imageUrl: string | null };
export type WildwoodRoomView = {
  id: string;
  sequence: number;
  message: string;
  battle: BattleState | null;
  turnOrder: string[];
  corrupted: boolean;
  images: Record<string, string | null>;
  questProgressTarget: number | null;
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
