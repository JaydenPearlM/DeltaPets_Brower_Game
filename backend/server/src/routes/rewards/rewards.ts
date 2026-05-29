import { randomInt as cryptoRandomInt } from "crypto";
import { Router } from "express";
import type { Response } from "express";

import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const rewardsRouter = Router();

/* =============================================================================
   Rewards: Daily Login / Weekly Streak
   - Week 1 (streak 1..7): fixed rewards (includes ONE trough on Sunday)
   - After Week 1: randomized rewards (NO trough)
============================================================================= */

/** ---- Config ------------------------------------------------------------- */

const POST_WEEK1_EGG_CHANCE_PERMILLE = 10; // 10 / 1000 = 1%
const POST_WEEK1_DOTS_CHANCE_PERCENT = 75; // 75% dots, 25% crystals
const POST_WEEK1_DOTS_MIN = 100;
const POST_WEEK1_DOTS_MAX = 500;
const POST_WEEK1_CRYSTALS_MIN = 1;
const POST_WEEK1_CRYSTALS_MAX = 6;

const STARTER_TROUGH_CAPACITY = 50;
const EGG_HATCH_MINUTES = 2;

const ELEMENTS = [
  "neutral",
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
] as const;

type Element = (typeof ELEMENTS)[number];

type Reward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "crystals"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string }
  | { kind: "trough"; capacity: number; label: string }
  | { kind: "egg"; element: Element; label: string };

type Week1Reward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "crystals"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string }
  | { kind: "trough"; capacity: number; label: string };

/** Week 1 fixed rewards (Mon..Sun, mapped by streak dayIndex 0..6) */
const WEEK1: readonly Week1Reward[] = [
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
  // Sunday (ONLY Week 1): starter trough (50 cap), starts full.
  {
    kind: "trough",
    capacity: STARTER_TROUGH_CAPACITY,
    label: "Feeding Trough (50 cap)",
  }, // Sun
] as const;

/** ---- Date helpers ------------------------------------------------------- */
/**
 * Safer “days between” in UTC (avoids DST weirdness).
 * Returns whole-day difference between two instants using UTC calendar days.
 */
function daysBetweenUTC(a: Date, b: Date): number {
  const aDay = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bDay = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bDay - aDay) / 86_400_000);
}

/** ---- Random helpers ----------------------------------------------------- */

function pickRandomElement(): Element {
  return ELEMENTS[cryptoRandomInt(0, ELEMENTS.length)];
}

function rollPostWeek1(): Reward {
  // 1% egg chance (per-mille)
  const rollPermille = cryptoRandomInt(0, 1000); // 0..999
  if (rollPermille < POST_WEEK1_EGG_CHANCE_PERMILLE) {
    const element = pickRandomElement();
    return { kind: "egg", element, label: `Egg (${element})` };
  }

  // Otherwise currency: dots or crystals
  const rollPercent = cryptoRandomInt(0, 100); // 0..99
  if (rollPercent < POST_WEEK1_DOTS_CHANCE_PERCENT) {
    const amt =
      POST_WEEK1_DOTS_MIN +
      cryptoRandomInt(0, POST_WEEK1_DOTS_MAX - POST_WEEK1_DOTS_MIN + 1);
    return { kind: "dots", amount: amt, label: `${amt} Dots` };
  }

  const amt =
    POST_WEEK1_CRYSTALS_MIN +
    cryptoRandomInt(0, POST_WEEK1_CRYSTALS_MAX - POST_WEEK1_CRYSTALS_MIN + 1);
  return { kind: "crystals", amount: amt, label: `${amt} Crystals` };
}

/** ---- Supabase write helpers -------------------------------------------- */

async function ensureWalletRow(user_id: string) {
  const { error } = await supabaseAdmin
    .from("wallets")
    .upsert({ user_id }, { onConflict: "user_id" });
  if (error) throw error;
}

async function addWallet(
  user_id: string,
  currency: "dots" | "crystals",
  delta: number,
) {
  const { error } = await supabaseAdmin.rpc("increment_wallet", {
    p_user_id: user_id,
    p_dots: currency === "dots" ? delta : 0,
    p_crystals: currency === "crystals" ? delta : 0,
  });

  if (error) throw error;
}

async function giveItem(user_id: string, slug: string, qty: number) {
  const { data: item, error } = await supabaseAdmin
    .from("item_defs")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error || !item) throw new Error(`Missing item_defs slug: ${slug}`);

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
    return;
  }

  const { error: e3 } = await supabaseAdmin
    .from("pet_stat_allocations")
    .update({ xp: (row.xp ?? 0) + amount })
    .eq("id", row.id);
  if (e3) throw e3;
}

/**
 * One trough only:
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
  if (currentCap > 0) return; // already owned

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

async function giveEgg(user_id: string, element: Element) {
  const hatchEndsAt = new Date(
    Date.now() + EGG_HATCH_MINUTES * 60 * 1000,
  ).toISOString();

  const { error } = await supabaseAdmin.from("pets").insert({
    user_id,
    name: `${element} reward egg`,
    species: "reward_egg",
    line: element,
    stage: "egg",
    energy: 100,
    hatch_ends_at: hatchEndsAt,
    is_active: false,
    location: "hatchery",
  });

  if (error) throw error;
}

async function applyReward(user_id: string, reward: Reward) {
  switch (reward.kind) {
    case "dots":
      return addWallet(user_id, "dots", reward.amount);
    case "crystals":
      return addWallet(user_id, "crystals", reward.amount);
    case "item":
      return giveItem(user_id, reward.slug, reward.qty);
    case "xp":
      return giveXPToActivePet(user_id, reward.amount);
    case "trough":
      return giveTroughOnce(user_id, reward.capacity);
    case "egg":
      return giveEgg(user_id, reward.element);
    default: {
      // Exhaustive safety (should never happen)
      const _never: never = reward;
      return _never;
    }
  }
}

/** ---- Reward selection --------------------------------------------------- */

function rewardForStreak(nextStreak: number): Reward {
  const dayIndex = (nextStreak - 1) % 7;

  // Week 1: fixed list (includes trough on dayIndex 6)
  if (nextStreak <= 7) {
    const r = WEEK1[dayIndex];
    // Normalize to Reward union (same fields, just typed)
    if (r.kind === "dots")
      return { kind: "dots", amount: r.amount, label: r.label };
    if (r.kind === "crystals")
      return { kind: "crystals", amount: r.amount, label: r.label };
    if (r.kind === "item")
      return { kind: "item", slug: r.slug, qty: r.qty, label: r.label };
    if (r.kind === "xp")
      return { kind: "xp", amount: r.amount, label: r.label };
    return { kind: "trough", capacity: r.capacity, label: r.label };
  }

  // After Week 1: randomized (NO trough)
  return rollPostWeek1();
}

/** ---- Routes ------------------------------------------------------------- */

/** Returns current UI status for the bar */
rewardsRouter.get(
  "/status",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user!.id;
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

    // If they disappear 4+ days, reset (matches existing behavior)
    const resetIfClaiming = diffDays >= 4;

    // Miss rules: you “have” 2 misses; after diffDays 2 => used 1, diffDays 3 => used 2, diffDays 4+ => reset anyway.
    const missesUsed = last ? Math.max(0, diffDays - 1) : 0;
    const missesRemaining = Math.max(0, 2 - missesUsed);

    const baseStreak = resetIfClaiming ? 0 : streak;
    const nextStreak = baseStreak + 1;
    const nextDayIndex = (nextStreak - 1) % 7;

    return res.json({
      streak,
      claimedToday,
      canClaim: !claimedToday,
      missesRemaining,
      nextDayIndex,
      week1: nextStreak <= 7,
      preview:
        nextStreak <= 7
          ? WEEK1[nextDayIndex]
          : { kind: "random", label: "Random Reward" },
    });
  },
);

/** Claims today's reward */
rewardsRouter.post(
  "/claim",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user!.id;
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
    if (diffDays === 0)
      return res.status(400).json({ error: "Already claimed today." });

    const reset = diffDays >= 4;
    const baseStreak = reset ? 0 : streak;
    const nextStreak = baseStreak + 1;
    const dayIndex = (nextStreak - 1) % 7;

    const reward = rewardForStreak(nextStreak);

    try {
      await applyReward(user_id, reward);
    } catch (e: any) {
      return res
        .status(500)
        .json({ error: e?.message ?? "Failed to apply reward" });
    }

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
