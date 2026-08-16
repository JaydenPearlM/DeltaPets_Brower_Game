import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../../middleware/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { logger } from "../../../lib/logger";

export const poeTayToeRouter = Router();

const POE_TAY_TOE_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const POE_TAY_TOE_PENDING_MS = 10 * 60 * 1000;

const ITEM_NAMES: Record<string, string> = {
  "kithna-food-pack": "Kithna Food Pack",
  "soft-cleaning-brush": "Soft Cleaning Brush",
  "spark-jingle-toy": "Spark Jingle Toy",
  "moon-nap-pillow": "Moon Nap Pillow",
};

poeTayToeRouter.get(
  "/",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const now = Date.now();

      const { data: state, error: stateError } = await supabaseAdmin
        .from("poe_tay_toe_state")
        .select(
          "current_location_key, claimed_by_user_id, claimed_at, find_count",
        )
        .eq("id", 1)
        .single();

      if (stateError) throw stateError;

      let claimedByUserId = state.claimed_by_user_id as string | null;
      let claimedAt = state.claimed_at as string | null;

      if (
        claimedByUserId &&
        claimedAt &&
        now - new Date(claimedAt).getTime() >= POE_TAY_TOE_PENDING_MS
      ) {
        const { error: releaseError } = await supabaseAdmin
          .from("poe_tay_toe_state")
          .update({
            claimed_by_user_id: null,
            claimed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1)
          .eq("claimed_by_user_id", claimedByUserId);

        if (releaseError) throw releaseError;

        claimedByUserId = null;
        claimedAt = null;
      }

      const { data: lastFind, error: findError } = await supabaseAdmin
        .from("poe_tay_toe_finds")
        .select("found_at")
        .eq("user_id", userId)
        .order("found_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;

      const lastFoundAt = lastFind?.found_at
        ? new Date(lastFind.found_at).getTime()
        : null;

      const cooldownEndsAt = lastFoundAt
        ? lastFoundAt + POE_TAY_TOE_COOLDOWN_MS
        : null;

      const onCooldown = cooldownEndsAt !== null && cooldownEndsAt > now;
      const awaitingHide = claimedByUserId === userId;

      return res.json({
        locationKey: state.current_location_key,
        available: claimedByUserId === null,
        canFind: claimedByUserId === null && !onCooldown,
        awaitingHide,
        cooldownEndsAt: onCooldown
          ? new Date(cooldownEndsAt).toISOString()
          : null,
        findCount: state.find_count ?? 0,
      });
    } catch (err: any) {
      logger.error("[poe-tay-toe] failed to load state", err);

      return res.status(500).json({
        error: err?.message ?? "Failed to load Poe Tay Toe.",
      });
    }
  },
);

poeTayToeRouter.post(
  "/find",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const locationKey = String(req.body?.locationKey ?? "");

      if (!locationKey) {
        return res.status(400).json({
          error: "Missing Poe Tay Toe location.",
        });
      }

      const { data, error } = await supabaseAdmin.rpc("claim_poe_tay_toe", {
        p_user_id: userId,
        p_location_key: locationKey,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.claimed) {
        if (result?.reason === "cooldown") {
          return res.status(409).json({
            error: "You already found Poe Tay Toe recently.",
            reason: result.reason,
            cooldownEndsAt: result.cooldown_ends_at,
          });
        }

        return res.status(409).json({
          error: "Poe Tay Toe is not there anymore.",
          reason: result?.reason ?? "moved",
        });
      }

      return res.json({
        found: true,
        reward: {
          dots: result.dots_awarded,
          itemSlug: result.item_slug,
          itemName: ITEM_NAMES[result.item_slug] ?? result.item_slug,
          itemQty: result.item_qty,
        },
      });
    } catch (err: any) {
      logger.error("[poe-tay-toe] find failed", err);

      return res.status(500).json({
        error: err?.message ?? "Failed to find Poe Tay Toe.",
      });
    }
  },
);

poeTayToeRouter.post(
  "/hide",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const locationKey = String(req.body?.locationKey ?? "");

      if (!locationKey) {
        return res.status(400).json({
          error: "Choose a hiding place.",
        });
      }

      const { data, error } = await supabaseAdmin.rpc("hide_poe_tay_toe", {
        p_user_id: userId,
        p_location_key: locationKey,
      });

      if (error) throw error;

      if (!data) {
        return res.status(409).json({
          error: "You are not the trainer currently hiding Poe Tay Toe.",
        });
      }

      return res.json({
        hidden: true,
        locationKey,
      });
    } catch (err: any) {
      logger.error("[poe-tay-toe] hide failed", err);

      return res.status(500).json({
        error: err?.message ?? "Failed to hide Poe Tay Toe.",
      });
    }
  },
);
