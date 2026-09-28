import { Router, type Response } from "express";
import { requireUser, type AuthedRequest } from "../../../middleware/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { logger } from "../../../lib/logger";
import { BattleRuleError } from "../../../battle/battleEngine";
import { validateBody } from "../../../middleware/validateRequest";
import {
  actInWildwood,
  exploreSchema,
  exploreWildwood,
  getWildwoodSession,
  WildwoodError,
} from "./wildwoodBattleService";
import type { WildwoodExploreRequest } from "../../../shared/battle/wildwoodTypes";
import {
  ASSANTI_FOOD_QUEST_KEY,
  ASSANTI_FOOD_QUEST_TARGET,
  getWildwoodState,
  SOMETHINGS_AFOOT_KEY,
  SOMETHINGS_AFOOT_TARGET,
} from "./wildwoodState";

export const wildwoodRouter = Router();

function battleError(res: Response, error: unknown) {
  if (error instanceof WildwoodError) {
    return res.status(error.status).json({ error: error.message });
  }

  if (error instanceof BattleRuleError) {
    return res.status(409).json({ error: error.message });
  }

  logger.error("[wildwood/battle] failed", error);

  return res.status(500).json({
    error:
      "Wildwood could not save this step. Reload to recover your latest state.",
  });
}

wildwoodRouter.get(
  "/session",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      return res.json(await getWildwoodSession(req.user!.id));
    } catch (error) {
      return battleError(res, error);
    }
  },
);

wildwoodRouter.post(
  "/explore",
  requireUser,
  validateBody(exploreSchema),
  async (req: AuthedRequest, res: Response) => {
    try {
      return res.json(
        await exploreWildwood(req.user!.id, req.body as WildwoodExploreRequest),
      );
    } catch (error) {
      return battleError(res, error);
    }
  },
);

wildwoodRouter.post(
  "/battle/:battleId/action",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      return res.json(
        await actInWildwood(req.user!.id, req.params.battleId, req.body),
      );
    } catch (error) {
      return battleError(res, error);
    }
  },
);

wildwoodRouter.get(
  "/status",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const state = await getWildwoodState(req.user!.id);
      return res.json(state);
    } catch (error) {
      logger.error("[GET /api/kithna/wildwood/status] failed", error);

      return res.status(500).json({
        error: "Failed to load Wildwood status.",
      });
    }
  },
);

/*
 * Something's Afoot
 *
 * Main quest.
 * The researcher asks the player to investigate five strange Kith.
 * Completing this quest is used by Wildwood state to unlock
 * the Aliune Signal.
 */

wildwoodRouter.post(
  "/quest/accept",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from("player_quests")
        .upsert(
          {
            user_id: userId,
            quest_key: SOMETHINGS_AFOOT_KEY,
            status: "active",
            progress: 0,
            target: SOMETHINGS_AFOOT_TARGET,
            accepted_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,quest_key",
            ignoreDuplicates: true,
          },
        )
        .select("status, progress, target")
        .maybeSingle();

      if (error) {
        throw error;
      }

      const state = await getWildwoodState(userId);

      return res.status(data ? 201 : 200).json(state);
    } catch (error) {
      logger.error("[POST /api/kithna/wildwood/quest/accept] failed", error);

      return res.status(500).json({
        error: "Failed to accept Something’s Afoot.",
      });
    }
  },
);

wildwoodRouter.post(
  "/quest/turn-in",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data: quest, error: questError } = await supabaseAdmin
        .from("player_quests")
        .select("status, progress, target")
        .eq("user_id", userId)
        .eq("quest_key", SOMETHINGS_AFOOT_KEY)
        .maybeSingle();

      if (questError) {
        throw questError;
      }

      if (!quest) {
        return res.status(404).json({
          error: "Something’s Afoot has not been accepted.",
        });
      }

      if (quest.status === "completed") {
        const state = await getWildwoodState(userId);
        return res.json(state);
      }

      const progress = Number(quest.progress ?? 0);
      const target = Number(quest.target ?? SOMETHINGS_AFOOT_TARGET);

      if (progress < target) {
        return res.status(409).json({
          error: "Defeat five strange Kith before returning to the researcher.",
        });
      }

      const completedAt = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("player_quests")
        .update({
          status: "completed",
          progress: target,
          completed_at: completedAt,
          reward_claimed_at: completedAt,
        })
        .eq("user_id", userId)
        .eq("quest_key", SOMETHINGS_AFOOT_KEY);

      if (updateError) {
        throw updateError;
      }

      const state = await getWildwoodState(userId);

      return res.json(state);
    } catch (error) {
      logger.error("[POST /api/kithna/wildwood/quest/turn-in] failed", error);

      return res.status(500).json({
        error: "Failed to complete Something’s Afoot.",
      });
    }
  },
);

/*
 * Assanti's Food Shop quest
 *
 * Assanti asks the player to defeat three strange Kith that
 * have been attacking her plants and meat tree.
 *
 * Completing this quest is used by Wildwood state to unlock
 * the Daily Food giveaway.
 */

wildwoodRouter.post(
  "/food-quest/accept",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from("player_quests")
        .upsert(
          {
            user_id: userId,
            quest_key: ASSANTI_FOOD_QUEST_KEY,
            status: "active",
            progress: 0,
            target: ASSANTI_FOOD_QUEST_TARGET,
            accepted_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,quest_key",
            ignoreDuplicates: true,
          },
        )
        .select("status, progress, target")
        .maybeSingle();

      if (error) {
        throw error;
      }

      const state = await getWildwoodState(userId);

      return res.status(data ? 201 : 200).json(state);
    } catch (error) {
      logger.error(
        "[POST /api/kithna/wildwood/food-quest/accept] failed",
        error,
      );

      return res.status(500).json({
        error: "Failed to accept Assanti's quest.",
      });
    }
  },
);

wildwoodRouter.post(
  "/food-quest/turn-in",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data: quest, error: questError } = await supabaseAdmin
        .from("player_quests")
        .select("status, progress, target")
        .eq("user_id", userId)
        .eq("quest_key", ASSANTI_FOOD_QUEST_KEY)
        .maybeSingle();

      if (questError) {
        throw questError;
      }

      if (!quest) {
        return res.status(404).json({
          error: "Assanti's quest has not been accepted.",
        });
      }

      if (quest.status === "completed") {
        const state = await getWildwoodState(userId);
        return res.json(state);
      }

      const progress = Number(quest.progress ?? 0);
      const target = Number(quest.target ?? ASSANTI_FOOD_QUEST_TARGET);

      if (progress < target) {
        return res.status(409).json({
          error: "Defeat three strange Kith before returning to Assanti.",
        });
      }

      const completedAt = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("player_quests")
        .update({
          status: "completed",
          progress: target,
          completed_at: completedAt,
          reward_claimed_at: completedAt,
        })
        .eq("user_id", userId)
        .eq("quest_key", ASSANTI_FOOD_QUEST_KEY);

      if (updateError) {
        throw updateError;
      }

      const state = await getWildwoodState(userId);

      return res.json(state);
    } catch (error) {
      logger.error(
        "[POST /api/kithna/wildwood/food-quest/turn-in] failed",
        error,
      );

      return res.status(500).json({
        error: "Failed to complete Assanti's quest.",
      });
    }
  },
);
