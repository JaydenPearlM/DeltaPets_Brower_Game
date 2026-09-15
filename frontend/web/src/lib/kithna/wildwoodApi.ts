import { apiFetch } from "../api/baseClient";
import type { BattleAction, WildwoodExploreRequest, WildwoodSession } from "@shared/battle/wildwoodTypes";

export type { BattleAction, BattleRow, BattleState, WildwoodSession } from "@shared/battle/wildwoodTypes";

export function fetchWildwoodSession() {
  return apiFetch<WildwoodSession>("/api/kithna/wildwood/session");
}

export function exploreWildwood(request: WildwoodExploreRequest) {
  return apiFetch<WildwoodSession>("/api/kithna/wildwood/explore", { method: "POST", json: request });
}

export function submitWildwoodAction(battleId: string, action: BattleAction) {
  return apiFetch<WildwoodSession>(`/api/kithna/wildwood/battle/${encodeURIComponent(battleId)}/action`, { method: "POST", json: action });
}

export type SomethingsAfootStatus =
  | "available"
  | "active"
  | "ready_to_turn_in"
  | "completed";

export type WildwoodStatus = {
  quest: {
    key: "somethings_afoot";
    status: SomethingsAfootStatus;
    progress: number;
    target: number;
  };
  wildwoodUnlocked: boolean;
  dailyFoodUnlocked: boolean;
  expedition: {
    id: string;
    status: "active";
    intro_step: number;
    depth: number;
    rooms_since_corrupted: number;
  } | null;
};

export function fetchWildwoodStatus() {
  return apiFetch<WildwoodStatus>("/api/kithna/wildwood/status");
}

export function acceptSomethingsAfoot() {
  return apiFetch<WildwoodStatus>("/api/kithna/wildwood/quest/accept", {
    method: "POST",
  });
}

export function turnInSomethingsAfoot() {
  return apiFetch<WildwoodStatus>("/api/kithna/wildwood/quest/turn-in", {
    method: "POST",
  });
}
