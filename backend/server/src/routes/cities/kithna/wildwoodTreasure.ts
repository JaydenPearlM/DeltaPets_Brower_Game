import { Router, type Response } from "express";
import { z } from "zod";

import { requireUser, type AuthedRequest } from "../../../middleware/auth";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { logger } from "../../../lib/logger";
import { getWildwoodState } from "./wildwoodState";
import { discardPendingWildwoodEgg } from "./kithnaEncounter";

export const wildwoodTreasureRouter = Router();

wildwoodTreasureRouter.use(requireUser);

const transferSchema = z
  .object({
    roomId: z.uuid(),
  })
  .strict();

type TreasureItem = {
  roomId: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  rarity: number;
  createdAt: string;
};

wildwoodTreasureRouter.get("/", async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const state = await getWildwoodState(userId);

    if (!state.expedition) {
      return res.json({ items: [], eggs: [] });
    }

    const rooms = await supabaseAdmin
      .from("wildwood_rooms")
      .select("id, event_payload")
      .eq("expedition_id", state.expedition.id);

    if (rooms.error) throw rooms.error;

    const roomIds = (rooms.data ?? []).map((room) => room.id);

    if (!roomIds.length) {
      return res.json({ items: [], eggs: [] });
    }

    const result = await supabaseAdmin
      .from("wildwood_treasure_items")
      .select(
        `
          room_id,
          created_at,
          item_defs (
            slug,
            name,
            description,
            type,
            rarity
          )
        `,
      )
      .eq("user_id", userId)
      .is("transferred_at", null)
      .is("discarded_at", null)
      .in("room_id", roomIds)
      .order("created_at", { ascending: true });

    if (result.error) throw result.error;

    const items: TreasureItem[] = [];

    for (const row of result.data ?? []) {
      // The untyped client infers embedded relations as arrays. Accept the
      // to-one PostgREST object and reject missing/ambiguous definitions.
      const related = row.item_defs;
      const definition = Array.isArray(related)
        ? related.length === 1 ? related[0] : null
        : related;

      if (!definition) {
        throw new Error("Treasure item definition missing.");
      }

      items.push({
        roomId: row.room_id,
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        type: definition.type,
        rarity: definition.rarity,
        createdAt: row.created_at,
      });
    }

    const eggs = (rooms.data ?? []).flatMap(room => {
      const receipt = room.event_payload?.eggTreasure;
      if (!receipt || receipt.status !== "pending") return [];
      const egg = z.object({ name: z.string().min(1), species: z.string().min(1), line: z.string().min(1) }).parse(receipt.egg);
      return [{ roomId: room.id, ...egg }];
    });
    return res.json({ items, eggs });
  } catch (error) {
    logger.error("[Wildwood Treasure] Load failed", error);

    return res.status(500).json({
      error: "Could not load Wildwood Treasure.",
    });
  }
});

wildwoodTreasureRouter.post(
  "/transfer",
  async (req: AuthedRequest, res: Response) => {
    const parsed = transferSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Choose a valid Treasure item.",
      });
    }

    try {
      const { data, error } = await supabaseAdmin.rpc(
        "transfer_wildwood_treasure_item",
        {
          p_user_id: req.user!.id,
          p_room_id: parsed.data.roomId,
        },
      );

      if (error) throw error;

      if (data?.success !== true) {
        return res.status(data?.status_code === 409 ? 409 : 500).json({
          error: data?.error ?? "Transfer failed.",
        });
      }

      return res.json(data);
    } catch (error) {
      logger.error("[Wildwood Treasure] Transfer failed", error);

      return res.status(500).json({
        error: "Transfer could not be confirmed. Reload Treasure.",
      });
    }
  },
);

wildwoodTreasureRouter.post(
  "/transfer-egg",
  async (req: AuthedRequest, res: Response) => {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Choose a valid Treasure egg." });
    try {
      const { data, error } = await supabaseAdmin.rpc("transfer_wildwood_egg", {
        p_user_id: req.user!.id, p_room_id: parsed.data.roomId,
      });
      if (error) {
        if (error.message === "Egg storage is full. Max 20 stored eggs." ||
            error.message === "Storage is full. Max 50 stored creatures.")
          return res.status(409).json({ error: error.message });
        throw error;
      }
      if (data?.success !== true) return res.status(409).json({ error: "Egg is unavailable or already transferred." });
      return res.json(data);
    } catch (error) {
      logger.error("[Wildwood Treasure] Egg transfer failed", error);
      return res.status(500).json({ error: "Egg transfer could not be confirmed. Reload Treasure." });
    }
  },
);

wildwoodTreasureRouter.post(
  "/discard",
  async (req: AuthedRequest, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin.rpc(
        "discard_wildwood_treasure",
        {
          p_user_id: req.user!.id,
        },
      );

      if (error) throw error;

      if (data?.success !== true) {
        throw new Error("Discard was not confirmed.");
      }

      discardPendingWildwoodEgg(req.user!.id);
      return res.json(data);
    } catch (error) {
      logger.error("[Wildwood Treasure] Discard failed", error);

      return res.status(500).json({
        error: "Could not finish discarding Treasure.",
      });
    }
  },
);
