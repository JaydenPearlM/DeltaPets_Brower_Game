import { randomInt } from "node:crypto";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const SOMETHINGS_AFOOT_KEY = "somethings_afoot";
export const SOMETHINGS_AFOOT_TARGET = 5;

export const ASSANTI_FOOD_QUEST_KEY = "assanti_food_trouble";
export const ASSANTI_FOOD_QUEST_TARGET = 3;

// Provisional per-Explore chance for the first playable Wildwood slice.
export const WILDWOOD_CORRUPTED_CHANCE_PERCENT = 25;

export type WildwoodQuestStatus =
  | "available"
  | "active"
  | "ready_to_turn_in"
  | "completed";

export type WildwoodEventKind = "flavor" | "quest_clue" | "corrupted_battle";

export async function getWildwoodState(userId: string) {
  const [
    { data: quest, error: questError },
    { data: foodQuest, error: foodQuestError },
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
      .from("player_quests")
      .select(
        "quest_key, status, progress, target, accepted_at, completed_at, reward_claimed_at",
      )
      .eq("user_id", userId)
      .eq("quest_key", ASSANTI_FOOD_QUEST_KEY)
      .maybeSingle(),

    supabaseAdmin
      .from("wildwood_expeditions")
      .select("id, status, intro_step, depth, rooms_since_corrupted")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (questError) throw questError;
  if (foodQuestError) throw foodQuestError;
  if (runError) throw runError;

  const status: WildwoodQuestStatus =
    (quest?.status as WildwoodQuestStatus | undefined) ?? "available";

  const foodQuestStatus: WildwoodQuestStatus =
    (foodQuest?.status as WildwoodQuestStatus | undefined) ?? "available";

  return {
    quest: {
      key: SOMETHINGS_AFOOT_KEY,
      status,
      progress: Number(quest?.progress ?? 0),
      target: Number(quest?.target ?? SOMETHINGS_AFOOT_TARGET),
    },

    foodQuest: {
      key: ASSANTI_FOOD_QUEST_KEY,
      status: foodQuestStatus,
      progress: Number(foodQuest?.progress ?? 0),
      target: Number(foodQuest?.target ?? ASSANTI_FOOD_QUEST_TARGET),
    },

    wildwoodUnlocked: status !== "available",

    dailyFoodUnlocked: foodQuestStatus === "completed",

    aliuneSignalUnlocked: status === "completed",

    expedition: expedition ?? null,
  };
}

export function selectInitialEvent(introStep: number): WildwoodEventKind {
  if (introStep < 2) return "quest_clue";
  if (introStep === 2) return "corrupted_battle";
  return "flavor";
}

export function selectProceduralEvent(
  _roomsSinceCorrupted: number,
  questActive: boolean,
): WildwoodEventKind {
  if (!questActive) {
    return "flavor";
  }

  if (randomInt(100) < WILDWOOD_CORRUPTED_CHANCE_PERCENT) {
    return "corrupted_battle";
  }

  return "flavor";
}
