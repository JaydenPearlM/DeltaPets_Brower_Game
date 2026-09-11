import { Router, type Response } from "express";
import { requireUser, type AuthedRequest } from "../../../middleware/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { logger } from "../../../lib/logger";
import {
  getWildwoodState,
  SOMETHINGS_AFOOT_KEY,
  SOMETHINGS_AFOOT_TARGET,
} from "./wildwoodState";

export const wildwoodRouter = Router();

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

      if (error) throw error;

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

      if (questError) throw questError;

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
          error:
            "Defeat five corrupted Kith before returning to the researcher.",
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

      if (updateError) throw updateError;

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
