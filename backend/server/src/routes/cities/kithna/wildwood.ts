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
