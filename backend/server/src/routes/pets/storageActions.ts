import { Router, type Response } from "express";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";

const petId = z.string().uuid();
const slotIndex = z.number().int().min(1).max(4);
export const storageActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign_party"), petId, slotIndex }).strict(),
  z.object({ action: z.literal("return_party"), slotIndex }).strict(),
  z.object({ action: z.literal("store_pet"), petId }).strict(),
  z.object({ action: z.literal("set_active"), petId }).strict(),
  z.object({ action: z.literal("incubate_storage"), petId }).strict(),
  z.object({ action: z.literal("incubate_inventory"), petId }).strict(),
  z.object({ action: z.literal("store_inventory_egg"), petId }).strict(),
  z.object({ action: z.literal("store_hatchery_egg"), petId }).strict(),
]);

export const storageActionsRouter = Router();

export async function handleStorageAction(req: AuthedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  const parsed = storageActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid storage action." });
  const action = parsed.data;
  try {
    const { error } = await supabaseAdmin.rpc("apply_pet_storage_action", {
      p_user_id: req.user.id,
      p_action: action.action,
      p_pet_id: "petId" in action ? action.petId : null,
      p_slot_index: "slotIndex" in action ? action.slotIndex : null,
    });
    if (error) {
      // Only deliberate rule failures carry player-facing messages. Unexpected
      // database errors stay in server logs rather than leaking schema details.
      if (error.code === "P0001") return res.status(400).json({ error: error.message });
      throw error;
    }
    return res.json({ success: true });
  } catch (error: unknown) {
    logger.error("[storage] action failed", error);
    return res.status(500).json({ error: "Storage update failed." });
  }
}

storageActionsRouter.post("/storage/action", requireUser, handleStorageAction);
