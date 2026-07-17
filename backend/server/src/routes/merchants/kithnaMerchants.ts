import { Router } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const kithnaMerchantsRouter = Router();

type MerchantKey = "armor" | "health" | "weapons" | "food" | "farm";

const FOOD_PRICE_DOTS = 5;
const MAX_FOOD_PURCHASE_QTY = 50;

/**
 * POST /api/merchants/kithna/food/purchase
 * Spends dots atomically via the same spend_wallet RPC the runaway-pet
 * recovery flow uses. Food itself lives in the client's care-inventory
 * store (see inventory.tsx), not a backend table, so this endpoint only
 * charges the wallet, the frontend credits food locally once it succeeds.
 */
kithnaMerchantsRouter.post(
  "/food/purchase",
  requireUser,
  async (req: AuthedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated." });

    const rawQty = Number(req.body?.quantity);
    const quantity = Number.isFinite(rawQty) ? Math.floor(rawQty) : 0;

    if (quantity < 1 || quantity > MAX_FOOD_PURCHASE_QTY) {
      return res.status(400).json({
        error: `Quantity must be between 1 and ${MAX_FOOD_PURCHASE_QTY}.`,
      });
    }

    const cost = quantity * FOOD_PRICE_DOTS;

    const { data: spent, error: spendError } = await supabaseAdmin.rpc(
      "spend_wallet",
      {
        p_user_id: userId,
        p_dots: cost,
        p_crystals: 0,
      },
    );

    if (spendError) {
      return res.status(500).json({ error: "Failed to process purchase." });
    }

    if (!spent) {
      return res
        .status(400)
        .json({ error: "Not enough dots for that purchase." });
    }

    return res.json({ ok: true, quantity, cost });
  },
);
