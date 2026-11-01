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
import { type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { z } from "zod";
import { requireUser } from "../../middleware/auth";
import { getEquipmentState } from "../../lib/equipment";
import { getBasicRelics } from "../../lib/ownedItemCatalogs";
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

    const equipment = await getEquipmentState(userId);
    const reserved = [...equipment.wardrobe, ...equipment.relics.map(item => item.slug)];
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
        availableQty: Math.max(0, row.qty - reserved.filter(slug => slug === row.item_defs.slug).length),
        equippedQty: reserved.filter(slug => slug === row.item_defs.slug).length,
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
      equipment,
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

// Existing inventory remains the ownership source; one equipped relic per Kith.
inventoryRouter.put("/relic", requireUser, async (req: AuthedRequest, res: Response) => {
  const parsed = z.object({ petId: z.string().uuid(), slug: z.string().nullable() }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a Kith and a valid relic." });
  try {
    if (parsed.data.slug !== null && !getBasicRelics().some(item => item.slug === parsed.data.slug))
      return res.status(400).json({ error: "That item is not a basic relic." });
    const { data, error } = await supabaseAdmin.rpc("equip_owned_relic", {
      p_user_id: req.user!.id, p_pet_id: parsed.data.petId, p_slug: parsed.data.slug,
    });
    if (error) {
      const expected = new Set(["You do not own that Kith.", "No unequipped copy of that relic is available."]);
      return res.status(expected.has(error.message) ? 409 : 503).json({
        error: expected.has(error.message) ? error.message : "Relic equipment is unavailable until the equipment update is enabled.",
      });
    }
    if (data?.ok !== true) throw new Error("Invalid equipment result");
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Could not confirm relic equipment. Refresh your inventory before retrying." });
  }
});
