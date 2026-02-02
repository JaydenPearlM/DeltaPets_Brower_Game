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
  action: CooldownKey; // "feed" | "clean" | "play" | "bond"
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

petActionsRouter.post(
  "/do",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const { action } = (req.body ?? {}) as Body;

    // ✅ allow bond now
    if (
      action !== "feed" &&
      action !== "clean" &&
      action !== "play" &&
      action !== "bond"
    ) {
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

    // ✅ block actions if runaway
    if (pet.is_runaway) {
      return res.status(409).json({
        error: "Your pet ran away.",
        server_now: nowIso,
        pet,
      });
    }

    // Enforce cooldown
    try {
      assertCooldownReady(pet, action, nowMs);
    } catch (e: any) {
      const status = e?.status ?? 409;
      return res.status(status).json({
        error: e?.message ?? "Cooldown not ready",
        server_now: nowIso,
        cooldown_key: e?.cooldown_key ?? action,
        cooldown_ends_at: e?.cooldown_ends_at ?? null,
        cooldown_remaining_ms: e?.cooldown_remaining_ms ?? null,
      });
    }

    // --- Apply action effects + cooldown ---
    const hunger = Number(pet.hunger ?? 0);
    const cleanliness = Number(pet.cleanliness ?? 0);
    const happiness = Number(pet.happiness ?? 0);
    const bond = Number(pet.bond ?? 0);

    const patch: Record<string, any> = {};

    // Apply cooldown by writing ends_at column
    const col = colNameForKey(action);
    patch[col] = calcNewCooldownEndsAtIso(nowMs, action);

    if (action === "feed") {
      patch.hunger = clamp(hunger + 30, 0, 100);
      patch.happiness = clamp(happiness + 5, 0, 100);
      patch.last_fed_at = nowIso; // ✅ runaway timer anchor
    }

    if (action === "clean") {
      patch.cleanliness = clamp(cleanliness + 35, 0, 100);
      patch.happiness = clamp(happiness + 3, 0, 100);
    }

    if (action === "bond") {
      patch.bond = clamp(bond + 8, 0, 100);
      patch.happiness = clamp(happiness + 10, 0, 100);
    }

    if (action === "play") {
      patch.happiness = clamp(happiness + 15, 0, 100);
      // later: patch.energy = clamp(Number(pet.energy ?? 0) - 5, 0, 100);
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("pets")
      .update(patch)
      .eq("id", pet.id)
      .select("*")
      .single();

    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.json({
      server_now: nowIso,
      pet: updated,
      cooldowns: cooldownsFromPetRow(updated, nowMs),
    });
  },
);
