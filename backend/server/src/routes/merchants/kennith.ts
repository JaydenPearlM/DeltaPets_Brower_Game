import { Router } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getKennithDay } from "../../lib/kennithDay";
import { z } from "zod";
import { kennithDailyStock, kennithTradeCatalog } from "../../lib/kennithStock";
import { logger } from "../../lib/logger";

export const kennithRouter = Router();

kennithRouter.get("/rotation", requireUser, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.json(getKennithDay());
});

// Server-owned day; never accept a balance, day or merchant identity from clients.
kennithRouter.get("/wallet", requireUser, async (req: AuthedRequest, res) => {
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated." });
  res.setHeader("Cache-Control", "no-store");
  try {
    const { deltaDay, nextRotationAt } = getKennithDay();
    const { data, error } = await supabaseAdmin.rpc("get_kennith_wallet", { p_delta_day: deltaDay });
    if (error || data?.deltaDay !== deltaDay || !Number.isSafeInteger(data?.merchantDots) || data.merchantDots < 0) {
      logger.error("[kennith] wallet unavailable", { code: error?.code ?? "INVALID_RESPONSE" });
      return res.status(503).json({ error: "Kennith's balance is unavailable. Please try again later." });
    }
    return res.json({ deltaDay, merchantDots: data.merchantDots, nextRotationAt });
  } catch {
    return res.status(503).json({ error: "Kennith's balance is unavailable. Please try again later." });
  }
});

const purchaseSchema = z.object({
  deltaDay: z.number().int().nonnegative(),
  lines: z.array(z.object({
    slug: z.string().min(1).max(100),
    category: z.enum(["clothing", "accessories", "relics", "petCare"]),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(20),
}).strict();
const tradeSchema = z.object({
  deltaDay: z.number().int().nonnegative(),
  lines: z.array(z.object({
    slug: z.string().min(1).max(100),
    category: z.enum(["clothing", "accessories", "relics", "petCare"]),
    buy: z.number().int().min(0).max(20),
    sell: z.number().int().min(0).max(199),
  }).strict().refine(line => line.buy > 0 || line.sell > 0)).min(1).max(100),
}).strict();
const purchaseErrors = new Set([
  "The Aliune day changed. Refresh the shop.", "Not enough merchant stock.",
  "Not enough Dots.", "Item stack is full.", "Wallet capacity exceeded.",
  "That item is not available today.",
  "Merchant stock is full.", "Not enough owned items.", "Kennith does not have enough Dots.",
  "Unequip this item before using or selling its last available copy.",
]);

kennithRouter.get("/stock", requireUser, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const timing = getKennithDay();
    const seed = kennithDailyStock(timing.deltaDay);
    const catalog = kennithTradeCatalog();
    const { data, error } = await supabaseAdmin.rpc("get_kennith_stock", {
      p_delta_day: timing.deltaDay, p_seed: seed,
    });
    if (error || !Array.isArray(data) || data.length < 20 || data.length > catalog.length ||
        new Set(data.map((item: any) => item?.slug)).size !== data.length ||
        seed.some(expected => !data.some((item: any) => item?.slug === expected.slug)) ||
        data.some((item: any) => !item || !catalog.some(expected => expected.slug === item.slug &&
          expected.category === item.category && expected.price === item.price &&
          Number.isSafeInteger(item.stock) && item.stock >= 0 && item.stock <= 199))) {
      logger.error("[kennith] stock unavailable", { code: error?.code ?? "INVALID_RESPONSE" });
      return res.status(503).json({ error: "Kennith's stock is unavailable. Please try again later." });
    }
    return res.json({ ...timing, items: data });
  } catch {
    return res.status(503).json({ error: "Kennith's stock is unavailable. Please try again later." });
  }
});

kennithRouter.post("/trade", requireUser, async (req: AuthedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!req.user?.id) return res.status(401).json({ error: "Not authenticated." });
  const parsed = z.union([purchaseSchema, tradeSchema]).safeParse(req.body);
  if (!parsed.success || new Set(parsed.data.lines.map(line => line.slug)).size !== parsed.data.lines.length)
    return res.status(400).json({ error: "Invalid trade selection." });
  try {
    const { deltaDay } = getKennithDay();
    if (parsed.data.deltaDay !== deltaDay)
      return res.status(409).json({ error: "The Aliune day changed. Refresh the shop." });
    const seed = kennithDailyStock(deltaDay);
    const catalog = kennithTradeCatalog();
    const legacyPurchase = "quantity" in parsed.data.lines[0];
    if (parsed.data.lines.some(line => !(legacyPurchase ? seed : catalog).some(item => item.slug === line.slug && item.category === line.category)))
      return res.status(400).json({ error: "That item is not available today." });
    const { data, error } = await supabaseAdmin.rpc(legacyPurchase ? "purchase_kennith_basket" : "trade_kennith_basket", {
      p_user_id: req.user.id, p_delta_day: deltaDay, p_lines: parsed.data.lines, p_seed: seed,
      ...(!legacyPurchase ? { p_catalog: catalog } : {}),
    });
    if (error) {
      logger.error("[kennith] purchase rejected", { code: error.code });
      return res.status(error.code === "P0001" && purchaseErrors.has(error.message) ? 409 : 503)
        .json({ error: purchaseErrors.has(error.message) ? error.message : "Kennith trading is unavailable. Please try again later." });
    }
    if (data?.ok !== true) return res.status(503).json({ error: "Trade result could not be confirmed. Check your inventory before trying again." });
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Trade result could not be confirmed. Check your inventory before trying again." });
  }
});
