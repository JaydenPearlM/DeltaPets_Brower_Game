import { Router } from "express";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { requireAuth, type AuthedRequest } from "../../middleware/auth";
import { fetchTotalPoints } from "../routePets/petsStats";

export const careRouter = Router();

/**
 * GET /api/care/current
 * Returns:
 * - active pet (or null)
 * - computed stats totals from pet_stats (+ allocations)
 * - total_points
 * - hp_display (derived)  <-- added
 * - pet_elements buckets (normalized keys) <-- normalize null_element -> null
 */
careRouter.get("/current", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const { data: pet, error } = await supabaseAdmin
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  if (!pet) {
    return res.json({
      pet: null,
      stats: null,
      total_points: null,
      hp_display: null,
      elements: null,
    });
  }

  // stats totals (base stats + allocations>1)
  let stats: any = null;
  let total_points: number | null = null;
  let hp_display: number | null = null;

  try {
    const points = await fetchTotalPoints((pet as any).id);
    stats = points?.total ?? null;
    total_points = points?.total_points ?? null;

    // Derived HP for display. If your UI expects something else,
    // tweak here (this is the smallest safe fix).
    const hpBase = Number(points?.total?.hp ?? NaN);
    hp_display = Number.isFinite(hpBase) ? hpBase * 2 : null;
  } catch {
    // if stats tables are missing, don't brick care room UI
    stats = null;
    total_points = null;
    hp_display = null;
  }

  // element buckets
  const { data: elementsRow, error: elErr } = await supabaseAdmin
    .from("pet_elements")
    .select("*")
    .eq("pet_id", (pet as any).id)
    .maybeSingle();

  if (elErr) {
    return res.json({ pet, stats, total_points, hp_display, elements: null });
  }

  // Normalize Supabase column `null_element` -> frontend expects `null`
  const elements =
    elementsRow && typeof elementsRow === "object"
      ? {
          null: (elementsRow as any).null_element ?? 0,
          water: (elementsRow as any).water ?? 0,
          fire: (elementsRow as any).fire ?? 0,
          earth: (elementsRow as any).earth ?? 0,
          air: (elementsRow as any).air ?? 0,
          ice: (elementsRow as any).ice ?? 0,
          storm: (elementsRow as any).storm ?? 0,
          light: (elementsRow as any).light ?? 0,
          shadow: (elementsRow as any).shadow ?? 0,
        }
      : null;

  return res.json({ pet, stats, total_points, hp_display, elements });
});

/**
 * POST /api/care/place
 * Body: { petId }
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

/** Helper: safe number */
function num(x: unknown, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Helper: pick a food item from inventory.
 * Food is item_defs.type in ('care','battle_food').
 * Uses the cheapest rarity first.
 */
async function pickFood(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("qty, item:item_defs(id, slug, name, type, rarity, effects)")
    .eq("user_id", userId)
    .gt("qty", 0)
    .in("item.type", ["care", "battle_food"])
    .order("item.rarity", { ascending: true })
    .limit(1);

  if (error) throw error;

  const row = (data ?? [])[0] as any;
  if (!row?.item) return null;

  return {
    item_id: row.item.id as string,
    slug: row.item.slug as string,
    name: row.item.name as string,
    qty: row.qty as number,
    effects: (row.item.effects ?? {}) as Record<string, unknown>,
  };
}

/**
 * POST /api/care/feed
 * Eats 1 food item from inventory and increases hunger (and optionally happiness).
 * If no food -> error "No food available"
 */
careRouter.post("/feed", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const petRes = await supabaseAdmin
    .from("pets")
    .select("id,hunger,cleanliness,happiness")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (petRes.error || !petRes.data)
    return res.status(400).json({ error: "No active pet" });

  const pet = petRes.data as any;

  if ((pet.hunger ?? 0) >= 100)
    return res.status(400).json({ error: "Pet is full" });

  let food;
  try {
    food = await pickFood(userId);
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e?.message ?? "Inventory lookup failed" });
  }

  if (!food) return res.status(400).json({ error: "No food available" });

  // effects json supports { hunger: 20 } or { hunger_delta: 20 }
  const hungerDelta =
    num((food.effects as any).hunger_delta, NaN) ||
    num((food.effects as any).hunger, 20);
  const happyDelta =
    num((food.effects as any).happiness_delta, NaN) ||
    num((food.effects as any).happiness, 0);

  const newHunger = Math.min(100, (pet.hunger ?? 0) + hungerDelta);

  // tiny bonus happiness if the pet is comfy
  const bonusHappy = newHunger > 70 && (pet.cleanliness ?? 0) > 70 ? 2 : 0;
  const newHappiness = Math.min(
    100,
    (pet.happiness ?? 0) + happyDelta + bonusHappy,
  );

  // consume 1 item
  const nextQty = Math.max(0, (food.qty ?? 0) - 1);
  const invUp = await supabaseAdmin
    .from("inventory")
    .update({ qty: nextQty })
    .eq("user_id", userId)
    .eq("item_id", food.item_id);

  if (invUp.error) return res.status(500).json({ error: invUp.error.message });

  // update pet meters
  const pUp = await supabaseAdmin
    .from("pets")
    .update({ hunger: newHunger, happiness: newHappiness })
    .eq("id", pet.id);

  if (pUp.error) return res.status(500).json({ error: pUp.error.message });

  return res.json({ success: true, ate: food.slug });
});

/**
 * POST /api/care/clean
 * Simple clean for now (+25).
 */
careRouter.post("/clean", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const petRes = await supabaseAdmin
    .from("pets")
    .select("id,hunger,cleanliness,happiness")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (petRes.error || !petRes.data)
    return res.status(400).json({ error: "No active pet" });

  const pet = petRes.data as any;
  if ((pet.cleanliness ?? 0) >= 100)
    return res.status(400).json({ error: "Already clean" });

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

/**
 * POST /api/care/play
 * Uses toy items from inventory:
 * - item_defs.type = 'toy'
 * - consumes 1 qty
 * - +happiness
 * - +small bond
 */
careRouter.post("/play", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const petRes = await supabaseAdmin
    .from("pets")
    .select("id,happiness,bond")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (petRes.error || !petRes.data)
    return res.status(400).json({ error: "No active pet" });

  const pet = petRes.data as any;

  // find toy
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("qty, item:item_defs(id, slug, type, effects)")
    .eq("user_id", userId)
    .gt("qty", 0)
    .eq("item.type", "toy")
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });

  const row = (data ?? [])[0] as any;
  if (!row?.item) return res.status(400).json({ error: "No toy available" });

  const toy = row.item;
  const nextQty = Math.max(0, (row.qty ?? 0) - 1);

  // toy effects
  const happyDelta = Number(toy.effects?.happiness ?? 10);
  const bondDelta = Number(toy.effects?.bond ?? 1);

  const newHappy = Math.min(100, (pet.happiness ?? 0) + happyDelta);
  const newBond = Math.min(100, (pet.bond ?? 0) + bondDelta);

  // consume toy
  const invUp = await supabaseAdmin
    .from("inventory")
    .update({ qty: nextQty })
    .eq("user_id", userId)
    .eq("item_id", toy.id);

  if (invUp.error) return res.status(500).json({ error: invUp.error.message });

  // update pet
  const petUp = await supabaseAdmin
    .from("pets")
    .update({
      happiness: newHappy,
      bond: newBond,
    })
    .eq("id", pet.id);

  if (petUp.error) return res.status(500).json({ error: petUp.error.message });

  return res.json({ success: true });
});

/**
 * POST /api/care/pet
 * Simple "pet" action:
 * - +bond
 * - +happiness
 * (No item consumption)
 */
careRouter.post("/pet", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const petRes = await supabaseAdmin
    .from("pets")
    .select("id,happiness,bond")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (petRes.error || !petRes.data)
    return res.status(400).json({ error: "No active pet" });

  const pet = petRes.data as any;

  const newBond = Math.min(100, (pet.bond ?? 0) + 8);
  const newHappy = Math.min(100, (pet.happiness ?? 0) + 6);

  const petUp = await supabaseAdmin
    .from("pets")
    .update({ bond: newBond, happiness: newHappy })
    .eq("id", pet.id);

  if (petUp.error) return res.status(500).json({ error: petUp.error.message });

  return res.json({ success: true });
});

/**
 /**
 * POST /api/care/nickname
 * Body: { nickname: string }
 *
 * Rules:
 * - Nickname is optional (can be null) but:
 * - You can only SET it once ever.
 * - After it's been set (non-empty), further changes are blocked.
 */
careRouter.post("/nickname", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const nicknameRaw = String((req.body as any)?.nickname ?? "").trim();

  if (nicknameRaw.length > 24) {
    return res.status(400).json({ error: "Nickname too long (max 24)" });
  }

  // Load active pet AND its current nickname
  const petRes = await supabaseAdmin
    .from("pets")
    .select("id,nickname")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (petRes.error || !petRes.data) {
    return res.status(400).json({ error: "No active pet" });
  }

  const pet = petRes.data as any;
  const existing = String(pet.nickname ?? "").trim();

  // If it's already set, block edits forever
  if (existing) {
    return res.status(403).json({
      error: "Nickname already set. You can only change your name once.",
    });
  }

  // If they try to set empty, just no-op
  if (!nicknameRaw) {
    return res.json({ success: true, nickname: null });
  }

  const petUp = await supabaseAdmin
    .from("pets")
    .update({ nickname: nicknameRaw })
    .eq("id", pet.id);

  if (petUp.error) return res.status(500).json({ error: petUp.error.message });

  return res.json({ success: true, nickname: nicknameRaw });
});
