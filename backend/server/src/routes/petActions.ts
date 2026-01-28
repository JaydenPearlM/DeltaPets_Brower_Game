import { Router, Response } from "express";
import { requireUser, AuthedRequest } from "../middleware/requireUser";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import {
  CooldownKey,
  assertCooldownReady,
  calcNewCooldownEndsAtIso,
  colNameForKey,
  cooldownsFromPetRow,
} from "../lib/cooldowns";

export const petActionsRouter = Router();

type Body = {
  action: CooldownKey; // "feed" | "clean" | "play"
};

petActionsRouter.post(
  "/do",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const nowMs = Date.now();
    const { action } = (req.body ?? {}) as Body;

    if (action !== "feed" && action !== "clean" && action !== "play") {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Load current pet
    const { data: pet, error } = await supabaseAdmin
      .from("pets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!pet) return res.status(404).json({ error: "No pet found" });

    // Enforce cooldown
    try {
      assertCooldownReady(pet, action, nowMs);
    } catch (e: any) {
      const status = e?.status ?? 409;
      return res.status(status).json({
        error: e?.message ?? "Cooldown not ready",
        server_now: new Date(nowMs).toISOString(),
        cooldown_key: e?.cooldown_key ?? action,
        cooldown_ends_at: e?.cooldown_ends_at ?? null,
        cooldown_remaining_ms: e?.cooldown_remaining_ms ?? null,
      });
    }

    // Apply cooldown by writing ends_at column
    const col = colNameForKey(action);
    const newEndsIso = calcNewCooldownEndsAtIso(nowMs, action);

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("pets")
      .update({ [col]: newEndsIso })
      .eq("id", pet.id)
      .select("*")
      .single();

    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.json({
      server_now: new Date(nowMs).toISOString(),
      pet: updated,
      cooldowns: cooldownsFromPetRow(updated, nowMs),
    });
  },
);
