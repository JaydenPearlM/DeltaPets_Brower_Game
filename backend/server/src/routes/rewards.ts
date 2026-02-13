import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { randomInt as cryptoRandomInt } from "crypto";

export const rewardsRouter = Router();

/** Week 1 fixed rewards */
const WEEK1 = [
  { kind: "dots", amount: 300, label: "300 Dots" }, // Mon
  { kind: "crystals", amount: 5, label: "5 Crystals" }, // Tue
  {
    kind: "item",
    slug: "starter_equipment",
    qty: 1,
    label: "Starter Equipment",
  }, // Wed
  { kind: "item", slug: "potion_small", qty: 3, label: "Potions x3" }, // Thu
  { kind: "xp", amount: 50, label: "Extra EXP +50" }, // Fri
  { kind: "dots", amount: 500, label: "500 Dots" }, // Sat

  // ✅ Sunday (ONLY Week 1): starter trough (50 cap), starts full.
  { kind: "trough", capacity: 50, label: "Feeding Trough (50 cap)" }, // Sun
] as const;

type Reward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "crystals"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string }
  | { kind: "trough"; capacity: number; label: string }
  | { kind: "egg"; element: string; label: string };

function daysBetweenUTC(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function pickRandomElement() {
  const elements = [
    "null_element",
    "water",
    "fire",
    "earth",
    "air",
    "ice",
    "storm",
    "light",
    "shadow",
  ];
  return elements[cryptoRandomInt(0, elements.length)];
}

function rollPostWeek1(): Reward {
  // 1% egg chance
  const roll = cryptoRandomInt(0, 1000); // 0..999
  if (roll < 10) {
    const element = pickRandomElement();
    return { kind: "egg", element, label: `Egg (${element})` };
  }

  // otherwise currency: dots or crystals
  const which = cryptoRandomInt(0, 100); // 0..99
  if (which < 75) {
    const amt = 100 + cryptoRandomInt(0, 401); // 100..500
    return { kind: "dots", amount: amt, label: `${amt} Dots` };
  } else {
    const amt = 1 + cryptoRandomInt(0, 6); // 1..6
    return { kind: "crystals", amount: amt, label: `${amt} Crystals` };
  }
}

async function addWallet(
  user_id: string,
  currency: "dots" | "crystals",
  delta: number,
) {
  const col = currency === "dots" ? "dots" : "crystals";

  // Ensure wallet row exists
  const { error: upsertErr } = await supabaseAdmin
    .from("wallets")
    .upsert({ user_id }, { onConflict: "user_id" });

  if (upsertErr) throw upsertErr;

  // Read current wallet
  const { data: w, error: readErr } = await supabaseAdmin
    .from("wallets")
    .select("dots, crystals")
    .eq("user_id", user_id)
    .single();

  if (readErr) throw readErr;

  const nextDots = (w?.dots ?? 0) + (currency === "dots" ? delta : 0);
  const nextCrystals =
    (w?.crystals ?? 0) + (currency === "crystals" ? delta : 0);

  const { error: writeErr } = await supabaseAdmin
    .from("wallets")
    .update({
      dots: nextDots,
      crystals: nextCrystals,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user_id);

  if (writeErr) throw writeErr;
}

async function giveItem(user_id: string, slug: string, qty: number) {
  const { data: item, error } = await supabaseAdmin
    .from("item_defs")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error || !item) {
    throw new Error(`Missing item_defs slug: ${slug}`);
  }

  const { data: inv, error: e1 } = await supabaseAdmin
    .from("inventory")
    .select("qty")
    .eq("user_id", user_id)
    .eq("item_id", item.id)
    .maybeSingle();

  if (e1) throw e1;

  const nextQty = (inv?.qty ?? 0) + qty;

  const { error: e2 } = await supabaseAdmin
    .from("inventory")
    .upsert(
      { user_id, item_id: item.id, qty: nextQty },
      { onConflict: "user_id,item_id" },
    );

  if (e2) throw e2;
}

async function giveXPToActivePet(user_id: string, amount: number) {
  const { data: pet, error } = await supabaseAdmin
    .from("pets")
    .select("id, level")
    .eq("user_id", user_id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!pet) return;

  const { data: row, error: e1 } = await supabaseAdmin
    .from("pet_stat_allocations")
    .select("id, xp")
    .eq("pet_id", pet.id)
    .eq("level", pet.level)
    .maybeSingle();

  if (e1) throw e1;

  if (!row) {
    const { error: e2 } = await supabaseAdmin
      .from("pet_stat_allocations")
      .insert({
        pet_id: pet.id,
        level: pet.level,
        xp: amount,
        hp: 0,
        atk: 0,
        magi: 0,
        def: 0,
        spd: 0,
        mana: 0,
      });

    if (e2) throw e2;
  } else {
    const { error: e3 } = await supabaseAdmin
      .from("pet_stat_allocations")
      .update({ xp: (row.xp ?? 0) + amount })
      .eq("id", row.id);

    if (e3) throw e3;
  }
}

/**
 * ✅ One trough only:
 * - Only grant if user has NO trough yet (capacity <= 0)
 * - Set capacity = 50 and fill = 50 when granted
 * - Never upgrade, never refill, never grant again
 */
async function giveTroughOnce(user_id: string, capacity: number) {
  const { data: resRow, error } = await supabaseAdmin
    .from("user_resources")
    .select("trough_capacity, trough_fill")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) throw error;

  const currentCap = resRow?.trough_capacity ?? 0;

  // Already owned → do nothing
  if (currentCap > 0) return;

  // Create or update row with starter trough filled
  const { error: e2 } = await supabaseAdmin.from("user_resources").upsert(
    {
      user_id,
      trough_capacity: capacity,
      trough_fill: capacity,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (e2) throw e2;
}

async function giveEgg(user_id: string, element: string) {
  const hatchMinutes = 2;
  const hatchReady = new Date(
    Date.now() + hatchMinutes * 60 * 1000,
  ).toISOString();

  const { error } = await supabaseAdmin.from("eggs").insert({
    user_id,
    starter_element: element,
    hatch_ready_at: hatchReady,
  });

  if (error) throw error;
}

/** Returns current UI status for the bar */
rewardsRouter.get(
  "/status",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user.id;
    const now = new Date();

    const { data: row, error } = await supabaseAdmin
      .from("daily_login_rewards")
      .select("id, streak, last_claimed_at")
      .eq("id", user_id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const streak = row?.streak ?? 0;
    const last = row?.last_claimed_at ? new Date(row.last_claimed_at) : null;

    const diffDays = last ? daysBetweenUTC(last, now) : 999;

    const claimedToday = diffDays === 0;
    const missedTooMuch = diffDays >= 4;
    const missesUsed = last ? Math.max(0, diffDays - 1) : 0;
    const missesRemaining = Math.max(0, 2 - missesUsed);

    // What day would be next claim?
    const baseStreak = missedTooMuch ? 0 : streak;
    const nextStreak = baseStreak + 1;
    const dayIndex = (nextStreak - 1) % 7;

    const canClaim = !claimedToday;

    return res.json({
      streak,
      claimedToday,
      canClaim,
      missesRemaining,
      nextDayIndex: dayIndex,
      week1: nextStreak <= 7,
      preview:
        nextStreak <= 7
          ? WEEK1[dayIndex]
          : { kind: "random", label: "Random Reward" },
    });
  },
);

/** Claims today's reward */
rewardsRouter.post(
  "/claim",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user.id;
    const now = new Date();

    const { data: row, error } = await supabaseAdmin
      .from("daily_login_rewards")
      .select("id, streak, last_claimed_at")
      .eq("id", user_id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const streak = row?.streak ?? 0;
    const last = row?.last_claimed_at ? new Date(row.last_claimed_at) : null;

    const diffDays = last ? daysBetweenUTC(last, now) : 999;

    if (diffDays === 0) {
      return res.status(400).json({ error: "Already claimed today." });
    }

    const reset = diffDays >= 4;
    const baseStreak = reset ? 0 : streak;
    const nextStreak = baseStreak + 1;
    const dayIndex = (nextStreak - 1) % 7;

    let reward: Reward;

    // ✅ Week 1 only uses WEEK1 list (includes the trough on Sunday)
    // ✅ After week 1, rewards are randomized and NEVER include trough.
    if (nextStreak <= 7) {
      const r = WEEK1[dayIndex];

      if (r.kind === "dots")
        reward = { kind: "dots", amount: r.amount, label: r.label };
      else if (r.kind === "crystals")
        reward = { kind: "crystals", amount: r.amount, label: r.label };
      else if (r.kind === "item")
        reward = { kind: "item", slug: r.slug, qty: r.qty, label: r.label };
      else if (r.kind === "xp")
        reward = { kind: "xp", amount: r.amount, label: r.label };
      else reward = { kind: "trough", capacity: r.capacity, label: r.label };
    } else {
      reward = rollPostWeek1();
    }

    // Apply reward
    try {
      if (reward.kind === "dots")
        await addWallet(user_id, "dots", reward.amount);
      if (reward.kind === "crystals")
        await addWallet(user_id, "crystals", reward.amount);
      if (reward.kind === "item")
        await giveItem(user_id, reward.slug, reward.qty);
      if (reward.kind === "xp") await giveXPToActivePet(user_id, reward.amount);

      // ✅ trough only: Week 1 Sunday reward will call this, and it will only grant once
      if (reward.kind === "trough")
        await giveTroughOnce(user_id, reward.capacity);

      if (reward.kind === "egg") await giveEgg(user_id, reward.element);
    } catch (e: any) {
      return res
        .status(500)
        .json({ error: e.message ?? "Failed to apply reward" });
    }

    // Persist streak + last_claimed_at
    const { error: e2 } = await supabaseAdmin
      .from("daily_login_rewards")
      .upsert(
        { id: user_id, streak: nextStreak, last_claimed_at: now.toISOString() },
        { onConflict: "id" },
      );

    if (e2) return res.status(500).json({ error: e2.message });

    return res.json({
      ok: true,
      reward,
      streak: nextStreak,
      dayIndex,
      reset,
    });
  },
);
