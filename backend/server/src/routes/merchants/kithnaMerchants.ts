import { Router } from "express";
import { z } from "zod";

import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { validateBody } from "../../middleware/validateRequest";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";
import { getDeltaTime, getDeltaPhaseSchedule } from "../../lib/deltaTime";

export const kithnaMerchantsRouter = Router();

kithnaMerchantsRouter.get(
  "/food",
  requireUser,
  async (req: AuthedRequest, res) => {
    if (!req.user?.id)
      return res.status(401).json({ error: "Not authenticated." });
    try {
      const deltaDay = getDeltaTime().deltaDay;
      const { data, error } = await supabaseAdmin.rpc("get_assanti_food_shop", {
        p_user_id: req.user.id,
        p_delta_day: deltaDay,
      });
      if (error) {
        logger.error("[assanti] stock RPC failed", {
          rpc: "get_assanti_food_shop",
          code: error.code,
        });
        return res.status(503).json({
          error: "Assanti's shop is temporarily unavailable. Please try again.",
        });
      }
      const cycleMs =
        getDeltaPhaseSchedule().reduce(
          (sum, phase) => sum + phase.durationMinutes,
          0,
        ) * 60_000;
      // Preserve the original food catalog and merchant Dots.
      // Potion definitions are loaded separately by the frontend.
      // Read today's actual food stock from Supabase.
      const { data: stockRows, error: stockError } = await supabaseAdmin
        .from("assanti_daily_stock")
        .select("slug, remaining_stock")
        .eq("delta_day", deltaDay)
        .eq("category", "food");

      if (stockError) {
        logger.error("[assanti] failed to load daily stock", {
          code: stockError.code,
          message: stockError.message,
        });

        return res.status(503).json({
          error: "Assanti's stock is temporarily unavailable.",
        });
      }

      // Match stock quantities to their corresponding food items.
      const stockBySlug = new Map(
        (stockRows ?? []).map((row) => [row.slug, row.remaining_stock]),
      );

      const catalogWithStock = (
        Array.isArray(data?.catalog) ? data.catalog : []
      ).map((item: { slug: string; [key: string]: unknown }) => ({
        ...item,
        stock: stockBySlug.get(item.slug) ?? 0,
      }));

      res.setHeader("Cache-Control", "no-store");

      return res.json({
        ...data,
        catalog: catalogWithStock,
        potionTrading: "disabled",
        nextRotationAt: new Date((deltaDay + 1) * cycleMs).toISOString(),
        rotationInMs: Math.max(0, (deltaDay + 1) * cycleMs - Date.now()),
      });
    } catch {
      return res.status(503).json({
        error: "Assanti's shop is temporarily unavailable. Please try again.",
      });
    }
  },
);

kithnaMerchantsRouter.post(
  "/food/daily",
  requireUser,
  async (req: AuthedRequest, res) => {
    if (!req.user?.id)
      return res.status(401).json({ error: "Not authenticated." });
    if (
      !z
        .object({})
        .strict()
        .safeParse(req.body ?? {}).success
    ) {
      return res.status(400).json({
        error: "Daily Food does not accept client rewards or claim times.",
      });
    }
    try {
      const { data, error } = await supabaseAdmin.rpc(
        "claim_assanti_daily_food",
        {
          p_user_id: req.user.id,
        },
      );
      if (error) {
        const expected = [
          "Daily Food is still locked.",
          "Daily Food is already claimed.",
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
  },
);

const foodIntent = z
  .object({
    slug: z.enum([
      "alpha-meat",
      "alpha-vegetables",
      "carrot",
      "potato",
      "tomato",
      "corn",
      "lettuce",
      "broccoli",
      "green-peas",
      "green-beans",
      "pumpkin",
      "mushroom",
      "cucumber",
      "bell-pepper",
      "sweet-potato",
      "raw-beef",
      "raw-chicken",
      "raw-fish",
      "turkey",
      "pork",
      "egg",
      "apple",
      "wild-berries",
      "rice",
      "bread",
    ]),
    // PostgreSQL uses bigint totals and checks wallet capacity before updating.
    quantity: z.number().int().min(1).max(429496729),
  })
  .strict();
const purchaseIntent = foodIntent.extend({
  quantity: z.number().int().min(1).max(50),
});
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
        const { data, error } = await supabaseAdmin.rpc(
          "trade_assanti_food_on_day",
          {
            p_user_id: userId,
            p_slug: slug,
            p_quantity: quantity,
            p_direction: direction,
            p_delta_day: getDeltaTime().deltaDay,
          },
        );
        if (error) {
          if (error.code === "P0001" && tradeErrors.has(error.message)) {
            return res.status(400).json({ error: error.message });
          }
          return res
            .status(500)
            .json({ error: "Failed to process food trade." });
        }
        return res.json(data);
      } catch {
        return res.status(500).json({ error: "Failed to process food trade." });
      }
    },
  );
}

const basketIntent = z
  .object({
    deltaDay: z.number().int().nonnegative(),
    lines: z
      .array(
        z
          .object({
            slug: foodIntent.shape.slug,
            buy: z.number().int().min(0).max(50),
            sell: z.number().int().min(0).max(429496729),
          })
          .strict()
          .refine((line) => line.buy > 0 || line.sell > 0),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (basket) =>
      new Set(basket.lines.map((line) => line.slug)).size ===
      basket.lines.length,
  );

kithnaMerchantsRouter.post(
  "/food/trade",
  requireUser,
  validateBody(basketIntent),
  async (req: AuthedRequest, res) => {
    if (!req.user?.id)
      return res.status(401).json({ error: "Not authenticated." });
    const basket = basketIntent.parse(req.body);
    const day = getDeltaTime().deltaDay;
    if (basket.deltaDay !== day)
      return res
        .status(409)
        .json({ error: "Today's selection has changed. Refresh the shop." });
    try {
      const { data, error } = await supabaseAdmin.rpc("trade_assanti_basket", {
        p_user_id: req.user.id,
        p_delta_day: day,
        p_lines: basket.lines,
      });
      if (error) {
        logger.error("[assanti] basket RPC failed", {
          rpc: "trade_assanti_basket",
          code: error.code,
        });
        const expected = new Set([
          ...tradeErrors,
          "Not enough Dots.",
          "Assanti does not have enough Dots.",
          "Not enough merchant stock.",
          "Merchant stock is full.",
          "Not enough owned items.",
          "Item stack is full.",
          "That item is not available today.",
          "Item trading is not configured.",
          "Wallet capacity exceeded.",
        ]);
        if (error.code === "P0001" && expected.has(error.message))
          return res.status(409).json({ error: error.message });
        return res
          .status(503)
          .json({ error: "Trade unavailable. Refresh before trying again." });
      }
      return res.json(data);
    } catch {
      return res.status(503).json({
        error:
          "Trade result could not be confirmed. Refresh your inventory before trying again.",
      });
    }
  },
);

// Daily potion stock is independent of the Food shop.
kithnaMerchantsRouter.get(
  "/potions",
  requireUser,
  async (req: AuthedRequest, res) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    try {
      const deltaDay = getDeltaTime().deltaDay;

      const potionSlugs = potionIntent.shape.slug.options;

      // Stable daily selection: same five potions for every player.
      const selected = [...potionSlugs]
        .sort((a, b) => {
          const score = (slug: string) => {
            const input = `assanti:potion:${deltaDay}:${slug}`;
            let hash = 2166136261;

            for (let i = 0; i < input.length; i++) {
              hash ^= input.charCodeAt(i);
              hash = Math.imul(hash, 16777619);
            }

            return hash >>> 0;
          };

          return score(a) - score(b) || a.localeCompare(b);
        })
        .slice(0, 5);

      const startingRows = selected.map((slug) => {
        const input = `assanti:potion:stock:${deltaDay}:${slug}`;
        let hash = 2166136261;

        for (let i = 0; i < input.length; i++) {
          hash ^= input.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }

        const startingStock = 5 + ((hash >>> 0) % 16);

        return {
          delta_day: deltaDay,
          category: "potion",
          slug,
          starting_stock: startingStock,
          remaining_stock: startingStock,
        };
      });

      // Existing records are preserved, including reduced stock.
      const { error: insertError } = await supabaseAdmin
        .from("assanti_daily_stock")
        .upsert(startingRows, {
          onConflict: "delta_day,category,slug",
          ignoreDuplicates: true,
        });

      if (insertError) {
        logger.error("[assanti] potion stock initialization failed", {
          code: insertError.code,
          message: insertError.message,
        });

        return res.status(503).json({
          error: "Potion stock is temporarily unavailable.",
        });
      }

      const { data: stockRows, error: stockError } = await supabaseAdmin
        .from("assanti_daily_stock")
        .select("slug, remaining_stock")
        .eq("delta_day", deltaDay)
        .eq("category", "potion")
        .in("slug", selected);

      if (stockError) {
        logger.error("[assanti] potion stock lookup failed", {
          code: stockError.code,
          message: stockError.message,
        });

        return res.status(503).json({
          error: "Potion stock is temporarily unavailable.",
        });
      }

      const stockBySlug = new Map(
        (stockRows ?? []).map((row) => [row.slug, row.remaining_stock]),
      );

      if (selected.some((slug) => !stockBySlug.has(slug))) {
        return res.status(503).json({
          error: "Potion stock is incomplete.",
        });
      }

      res.setHeader("Cache-Control", "no-store");

      return res.json({
        deltaDay,
        potions: selected.map((slug) => ({
          slug,
          stock: stockBySlug.get(slug),
        })),
      });
    } catch (error) {
      logger.error("[assanti] potion stock failed", {
        message: error instanceof Error ? error.message : String(error),
      });

      return res.status(503).json({
        error: "Potion stock is temporarily unavailable.",
      });
    }
  },
);
// Potion transactions use the same wallet/day locks and inventory safety as food.
const potionIntent = z
  .object({
    slug: z.enum([
      "minor-healing-potion",
      "healing-potion",
      "greater-healing-potion",
      "major-healing-potion",
      "supreme-healing-potion",
      "redberry-tonic",
      "herbal-remedy",
      "warmroot-tonic",
      "honey-heal-draught",
      "greenleaf-tonic",
      "mosswater-elixir",
      "sunfruit-tonic",
      "moonberry-remedy",
      "silverleaf-elixir",
      "crystalwater-tonic",
      "ember-healing-tonic",
      "tide-healing-tonic",
      "stone-healing-tonic",
      "breeze-healing-tonic",
      "frost-healing-tonic",
      "storm-healing-tonic",
      "sun-healing-tonic",
      "shade-healing-tonic",
      "prismatic-healing-tonic",
      "wildwood-remedy",
      "kithna-restoration-draught",
      "deepwood-elixir",
      "mountain-spring-elixir",
      "golden-restoration-tonic",
      "violet-restoration-tonic",
      "ruby-elixir",
      "sapphire-elixir",
      "emerald-elixir",
      "amber-elixir",
      "amethyst-elixir",
      "royal-healing-draught",
      "ancient-restoration-elixir",
      "starlight-tonic",
      "moonlight-elixir",
      "sunlight-elixir",
      "prism-restoration-elixir",
      "grand-healing-elixir",
      "legendary-healing-draught",
      "mythic-restoration-elixir",
      "celestial-healing-tonic",
      "aurora-elixir",
      "relic-restoration-draught",
      "kithna-grand-remedy",
      "prismatic-grand-elixir",
      "master-healers-draught",
    ]),
    quantity: z.number().int().min(1).max(429496729),
  })
  .strict();
for (const direction of ["purchase", "sell"] as const) {
  const schema =
    direction === "purchase"
      ? potionIntent.extend({ quantity: z.number().int().min(1).max(50) })
      : potionIntent;
  kithnaMerchantsRouter.post(
    `/potions/${direction}`,
    requireUser,
    validateBody(schema),
    async (req: AuthedRequest, res) => {
      if (!req.user?.id)
        return res.status(401).json({ error: "Not authenticated." });
      const { slug, quantity } = schema.parse(req.body);
      try {
        const { data, error } = await supabaseAdmin.rpc(
          "trade_assanti_potion_on_day",
          {
            p_user_id: req.user.id,
            p_slug: slug,
            p_quantity: quantity,
            p_direction: direction,
            p_delta_day: getDeltaTime().deltaDay,
          },
        );
        if (error) {
          logger.error("[assanti] potion trade RPC failed", {
            code: error.code,
          });
          if (error.code === "P0001")
            return res.status(409).json({ error: error.message });
          return res.status(503).json({ error: "Potion trade unavailable." });
        }
        return res.json(data);
      } catch {
        return res.status(500).json({ error: "Potion trade failed." });
      }
    },
  );
}
