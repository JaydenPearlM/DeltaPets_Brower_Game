import { Router } from "express";
import { z } from "zod";

import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { validateBody } from "../../middleware/validateRequest";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const kithnaMerchantsRouter = Router();

kithnaMerchantsRouter.post("/food/daily", requireUser, async (req: AuthedRequest, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated." });
  if (!z.object({}).strict().safeParse(req.body ?? {}).success) {
    return res.status(400).json({ error: "Daily Food does not accept client rewards or claim times." });
  }
  try {
    const { data, error } = await supabaseAdmin.rpc("claim_assanti_daily_food", {
      p_user_id: req.user.id,
    });
    if (error) {
      const expected = [
        "Daily Food is still locked.", "Daily Food is already claimed.",
        "Not enough room for the full food reward.",
      ];
      if (error.code === "P0001" && expected.includes(error.message)) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to claim Daily Food." });
    }
    return res.json(data);
  } catch {
    return res.status(500).json({ error: "Failed to claim Daily Food." });
  }
});

const foodIntent = z.object({
  slug: z.enum(["alpha-meat", "alpha-vegetables"]),
  // Keep quantity * the 5-Dot price within PostgreSQL's integer range.
  quantity: z.number().int().min(1).max(429496729),
}).strict();
const purchaseIntent = foodIntent.extend({ quantity: z.number().int().min(1).max(50) });
const tradeErrors = new Set([
  "Not enough Dots.",
  "Not enough owned food.",
  "Food stack is full.",
]);

// Each RPC changes both inventory and wallet in one database transaction.
// Identity comes exclusively from requireUser; prices never come from the body.
for (const direction of ["purchase", "sell"] as const) {
  const schema = direction === "purchase" ? purchaseIntent : foodIntent;
  kithnaMerchantsRouter.post(
    `/food/${direction}`,
    requireUser,
    validateBody(schema),
    async (req: AuthedRequest, res) => {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated." });

      const { slug, quantity } = schema.parse(req.body);
      try {
        const { data, error } = await supabaseAdmin.rpc("trade_assanti_food", {
          p_user_id: userId,
          p_slug: slug,
          p_quantity: quantity,
          p_direction: direction,
        });
        if (error) {
          if (error.code === "P0001" && tradeErrors.has(error.message)) {
            return res.status(400).json({ error: error.message });
          }
          return res.status(500).json({ error: "Failed to process food trade." });
        }
        return res.json(data);
      } catch {
        return res.status(500).json({ error: "Failed to process food trade." });
      }
    },
  );
}
