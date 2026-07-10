// backend/server/src/routes/inventory/inventory.ts
//
// Real backend inventory read route. The `inventory` table already existed
// and was already being written to by rewards.ts giveItem(), but nothing
// ever read it back out for the frontend. This is the missing GET.
//
// This is intentionally separate from the localStorage-based care-item
// system in frontend/web/src/components/inventory/inventory.tsx (food/soap/
// toy/bed used by feed/clean/play). That system stays as-is for now. This
// route surfaces what the player has actually been granted server-side,
// e.g. weekly reward items like Starter Equipment / Potions.

import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";

export const inventoryRouter = Router();

// ============================================================
// GET /api/inventory
//
// Returns the current user's backend-tracked inventory: every
// item_defs row they hold a qty > 0 of.
// ============================================================
inventoryRouter.get(
  "/",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from("inventory")
        .select(
          `
          qty,
          updated_at,
          item_defs (
            id,
            slug,
            name,
            type,
            description,
            rarity,
            stack_limit,
            effects
          )
        `,
        )
        .eq("user_id", userId)
        .gt("qty", 0);

      if (error) throw error;

      const items = (data ?? [])
        .filter((row: any) => row.item_defs)
        .map((row: any) => ({
          slug: row.item_defs.slug,
          name: row.item_defs.name,
          type: row.item_defs.type,
          description: row.item_defs.description,
          rarity: row.item_defs.rarity,
          stackLimit: row.item_defs.stack_limit,
          effects: row.item_defs.effects,
          qty: row.qty,
          updatedAt: row.updated_at,
        }));

      return res.json({ items });
    } catch (err: any) {
      logger.error("[inventory] failed to load inventory", err);
      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to load inventory." });
    }
  },
);
