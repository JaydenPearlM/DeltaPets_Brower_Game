import { Router } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { requireAuth, type AuthedRequest } from "../../middleware/auth";

export const careRouter = Router();

/**
 * GET /api/care/current
 * Returns the currently placed (is_active) pet for the user, or null.
 */
careRouter.get("/current", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ pet: data ?? null });
});

/**
 * POST /api/care/place
 * Body: { petId }
 * Sets that pet as is_active and unsets any other active pet for the user.
 */
careRouter.post("/place", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const { petId } = req.body as { petId?: string };

  if (!petId) return res.status(400).json({ error: "Missing petId" });

  const clear = await supabaseAdmin
    .from("pets")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (clear.error) return res.status(500).json({ error: clear.error.message });

  const set = await supabaseAdmin
    .from("pets")
    .update({ is_active: true })
    .eq("id", petId)
    .eq("user_id", userId);

  if (set.error) return res.status(500).json({ error: set.error.message });

  return res.json({ success: true });
});

/**
 * POST /api/care/feed
 * Consumes 1 trough and increases hunger.
 */
careRouter.post("/feed", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const petRes = await supabaseAdmin
    .from("pets")
    .select("id,hunger,cleanliness,happiness")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (petRes.error || !petRes.data) {
    return res.status(400).json({ error: "No active pet" });
  }

  const pet = petRes.data;

  if ((pet.hunger ?? 0) >= 100) {
    return res.status(400).json({ error: "Pet is full" });
  }

  const walletRes = await supabaseAdmin
    .from("wallets")
    .select("trough")
    .eq("user_id", userId)
    .single();

  if (walletRes.error || !walletRes.data) {
    return res.status(400).json({ error: "No wallet row" });
  }

  const trough = walletRes.data.trough ?? 0;
  if (trough <= 0) return res.status(400).json({ error: "No food available" });

  const newHunger = Math.min(100, (pet.hunger ?? 0) + 20);
  const newHappiness =
    newHunger > 70 && (pet.cleanliness ?? 0) > 70
      ? Math.min(100, (pet.happiness ?? 0) + 2)
      : (pet.happiness ?? 0);

  const wUp = await supabaseAdmin
    .from("wallets")
    .update({ trough: trough - 1 })
    .eq("user_id", userId);

  if (wUp.error) return res.status(500).json({ error: wUp.error.message });

  const pUp = await supabaseAdmin
    .from("pets")
    .update({ hunger: newHunger, happiness: newHappiness })
    .eq("id", pet.id);

  if (pUp.error) return res.status(500).json({ error: pUp.error.message });

  return res.json({ success: true });
});

/**
 * POST /api/care/clean
 * Increases cleanliness.
 */
careRouter.post("/clean", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const petRes = await supabaseAdmin
    .from("pets")
    .select("id,hunger,cleanliness,happiness")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (petRes.error || !petRes.data) {
    return res.status(400).json({ error: "No active pet" });
  }

  const pet = petRes.data;

  if ((pet.cleanliness ?? 0) >= 100) {
    return res.status(400).json({ error: "Already clean" });
  }

  const newClean = Math.min(100, (pet.cleanliness ?? 0) + 25);
  const newHappiness =
    newClean > 70 && (pet.hunger ?? 0) > 70
      ? Math.min(100, (pet.happiness ?? 0) + 2)
      : (pet.happiness ?? 0);

  const pUp = await supabaseAdmin
    .from("pets")
    .update({ cleanliness: newClean, happiness: newHappiness })
    .eq("id", pet.id);

  if (pUp.error) return res.status(500).json({ error: pUp.error.message });

  return res.json({ success: true });
});
