import { apiFetch } from "../lib/api/baseClient";

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
