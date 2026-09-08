import { randomInt } from "node:crypto";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const SOMETHINGS_AFOOT_KEY = "somethings_afoot";
export const SOMETHINGS_AFOOT_TARGET = 5;

export type WildwoodQuestStatus =
  | "available"
  | "active"
  | "ready_to_turn_in"
  | "completed";

export type WildwoodEventKind = "flavor" | "quest_clue" | "corrupted_battle";

export async function getWildwoodState(userId: string) {
  const [
    { data: quest, error: questError },
    { data: expedition, error: runError },
  ] = await Promise.all([
    supabaseAdmin
      .from("player_quests")
      .select(
        "quest_key, status, progress, target, accepted_at, completed_at, reward_claimed_at",
      )
      .eq("user_id", userId)
      .eq("quest_key", SOMETHINGS_AFOOT_KEY)
      .maybeSingle(),
    supabaseAdmin
      .from("wildwood_expeditions")
      .select("id, status, intro_step, depth, rooms_since_corrupted")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (questError) throw questError;
  if (runError) throw runError;

  const status: WildwoodQuestStatus =
    (quest?.status as WildwoodQuestStatus | undefined) ?? "available";

  return {
    quest: {
      key: SOMETHINGS_AFOOT_KEY,
      status,
      progress: Number(quest?.progress ?? 0),
      target: Number(quest?.target ?? SOMETHINGS_AFOOT_TARGET),
    },
    wildwoodUnlocked: status !== "available",
    dailyFoodUnlocked: status === "completed",
    expedition: expedition ?? null,
  };
}

export function selectInitialEvent(introStep: number): WildwoodEventKind {
  if (introStep < 2) return "quest_clue";
  if (introStep === 2) return "corrupted_battle";
  return "flavor";
}

export function selectProceduralEvent(
  roomsSinceCorrupted: number,
  questActive: boolean,
): WildwoodEventKind {
  if (!questActive) {
    return "flavor";
  }

  // Placeholder structure only. Final chance and guarantee threshold
  // must be approved before implementation.
  const corruptedChance = 0;
  const guaranteeAfter = Number.POSITIVE_INFINITY;

  if (
    roomsSinceCorrupted >= guaranteeAfter ||
    randomInt(100) < corruptedChance
  ) {
    return "corrupted_battle";
  }

  return "flavor";
}
