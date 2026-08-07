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
import { requireUser, type AuthedRequest } from "../../pets/middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";

export const inventoryRouter = Router();

// ============================================================
// GET /api/inventory
//
// Returns the current user's backend-tracked inventory: every
// item_defs row they hold a qty > 0 of.
// ============================================================
inventoryRouter.get("/", async (req: AuthedRequest, res: Response) => {
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

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("dots, crystals")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError) throw walletError;

    return res.json({
      items,
      wallet: {
        dots: wallet?.dots ?? 0,
        crystals: wallet?.crystals ?? 0,
      },
    });
  } catch (err: any) {
    logger.error("[inventory] failed to load inventory", err);
    return res
      .status(500)
      .json({ error: err?.message ?? "Failed to load inventory." });
  }
});

inventoryRouter.post(
  "/open-closed-alpha-care-package",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin.rpc(
        "open_closed_alpha_care_package",
        { p_user_id: userId },
      );

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.opened) {
        return res.status(409).json({
          error: "This Closed Alpha Care Package has already been opened.",
        });
      }

      return res.json({
        opened: true,
        wallet: {
          dots: result.dots,
        },
        careItems: [
          {
            slug: "alpha-meat",
            name: "Meat",
            type: "food",
            description:
              "A hearty meal from the Tree of Life. Please do not ask which branch had meat on it.",
            rarity: "common",
            stackLimit: 50,
            careCategory: "food",
            qty: 50,
          },
          {
            slug: "alpha-vegetables",
            name: "Vegetables",
            type: "food",
            description:
              "Herbivores swear by them. Carnivores have filed several complaints.",
            rarity: "common",
            stackLimit: 50,
            careCategory: "food",
            qty: 50,
          },
          {
            slug: "soft-cleaning-brush",
            name: "Cloudsheen Brush",
            type: "care",
            description:
              "Soft enough for delicate fur, tough enough to defeat whatever your Kith rolled in.",
            rarity: "common",
            stackLimit: 50,
            careCategory: "soap",
            qty: 50,
          },
          {
            slug: "spark-jingle-toy",
            name: "Jinglebit",
            type: "care",
            description:
              "It jingles. It sparkles. Your Kith will inevitably throw it somewhere you cannot reach.",
            rarity: "common",
            stackLimit: 50,
            careCategory: "toy",
            qty: 50,
          },
          {
            slug: "moon-nap-pillow",
            name: "Dreamdrop Pillow",
            type: "care",
            description:
              "A tiny pillow engineered for heroic naps and absolutely no productive behavior.",
            rarity: "common",
            stackLimit: 50,
            careCategory: "bed",
            qty: 50,
          },
        ],
      });
    } catch (err: any) {
      logger.error("[inventory] failed to open Closed Alpha Care Package", err);

      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to open care package." });
    }
  },
);
