import { Router } from "express";
import { z } from "zod";

import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { validateBody } from "../../middleware/validateRequest";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getDeltaTime, getDeltaPhaseSchedule } from "../../lib/deltaTime";

export const kithnaMerchantsRouter = Router();

kithnaMerchantsRouter.get("/food", requireUser, async (req: AuthedRequest, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated." });
  try {
    const deltaDay = getDeltaTime().deltaDay;
    const { data, error } = await supabaseAdmin.rpc("get_assanti_food_shop", {
      p_user_id: req.user.id, p_delta_day: deltaDay,
    });
    if (error) return res.status(503).json({ error: "Assanti's shop is temporarily unavailable. Please try again." });
    const cycleMs = getDeltaPhaseSchedule().reduce((sum, phase) => sum + phase.durationMinutes, 0) * 60_000;
    res.setHeader("Cache-Control", "no-store");
    return res.json({ ...data, nextRotationAt: new Date((deltaDay + 1) * cycleMs).toISOString() });
  } catch {
    return res.status(503).json({ error: "Assanti's shop is temporarily unavailable. Please try again." });
  }
});

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
  slug: z.enum([
    "alpha-meat", "alpha-vegetables", "carrot", "potato", "tomato", "corn",
    "lettuce", "broccoli", "green-peas", "green-beans", "pumpkin", "mushroom",
    "cucumber", "bell-pepper", "sweet-potato", "raw-beef", "raw-chicken",
    "raw-fish", "turkey", "pork", "egg", "apple", "wild-berries", "rice", "bread",
  ]),
  // PostgreSQL uses bigint totals and checks wallet capacity before updating.
  quantity: z.number().int().min(1).max(429496729),
}).strict();
const purchaseIntent = foodIntent.extend({ quantity: z.number().int().min(1).max(50) });
const tradeErrors = new Set([
  "Not enough Dots.",
  "Not enough owned food.",
  "Food stack is full.",
  "That food is not available today.",
  "Assanti does not have enough Dots.",
  "Merchant wallet is full.",
  "Player wallet is full.",
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
        const { data, error } = await supabaseAdmin.rpc("trade_assanti_food_on_day", {
          p_user_id: userId,
          p_slug: slug,
          p_quantity: quantity,
          p_direction: direction,
          p_delta_day: getDeltaTime().deltaDay,
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
