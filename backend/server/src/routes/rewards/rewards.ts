import { Router } from "express";
import type { Response } from "express";

import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const rewardsRouter = Router();

/* =============================================================================
   Rewards: Daily Login / Weekly Streak
   - Repeating 7-day reward cycle
   - Wednesday Potato is awarded only once per trainer
============================================================================= */

/** ---- Config ------------------------------------------------------------- */

type Reward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp_boost"; strength: number; label: string };

type WeeklyReward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp_boost"; strength: number; label: string };

/** Weekly rewards (Mon..Sun, mapped by streak dayIndex 0..6). */
const WEEKLY_REWARDS: readonly WeeklyReward[] = [
  { kind: "dots", amount: 300, label: "300 Dots" }, // Mon
  { kind: "dots", amount: 600, label: "600 Dots" }, // Tue
  { kind: "item", slug: "haiku_scroll_50", qty: 1, label: "Haiku Scroll #50" }, // Wed // Wed
  { kind: "item", slug: "potion_small", qty: 3, label: "Potions x3" }, // Thu
  {
    kind: "xp_boost",
    strength: 2,
    label: "Double XP for the Day",
  }, // Fri
  { kind: "dots", amount: 1000, label: "1,000 Dots" }, // Sat
  {
    kind: "item",
    slug: "weekly_mystery_box",
    qty: 1,
    label: "Mystery Box",
  }, // Sun
] as const;
/** ---- Date helpers ------------------------------------------------------- */
function daysBetweenUTC(a: Date, b: Date): number {
  const aDay = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bDay = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bDay - aDay) / 86_400_000);
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

async function giveDailyXPBoost(user_id: string, strength: number) {
  const expiresAt = new Date();
  expiresAt.setUTCHours(23, 59, 59, 999);

  const { error: deleteError } = await supabaseAdmin
    .from("pve_active_buffs")
    .delete()
    .eq("user_id", user_id)
    .eq("buff_type", "bonus_xp");

  if (deleteError) throw deleteError;

  const { error } = await supabaseAdmin.from("pve_active_buffs").insert({
    user_id,
    buff_type: "bonus_xp",
    strength,
    description: "Weekly Rewards: Double XP for the day.",
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;
}

async function applyReward(user_id: string, reward: Reward) {
  switch (reward.kind) {
    case "dots":
      return addWallet(user_id, "dots", reward.amount);
    case "item":
      return giveItem(user_id, reward.slug, reward.qty);
    case "xp_boost":
      return giveDailyXPBoost(user_id, reward.strength);
    default: {
      const _never: never = reward;
      return _never;
    }
  }
}

/** ---- Reward selection --------------------------------------------------- */

function rewardForStreak(nextStreak: number): Reward {
  const dayIndex = (nextStreak - 1) % 7;
  const reward = WEEKLY_REWARDS[dayIndex];

  if (reward.kind === "dots") {
    return {
      kind: "dots",
      amount: reward.amount,
      label: reward.label,
    };
  }

  if (reward.kind === "item") {
    return {
      kind: "item",
      slug: reward.slug,
      qty: reward.qty,
      label: reward.label,
    };
  }

  return {
    kind: "xp_boost",
    strength: reward.strength,
    label: reward.label,
  };
}

/** ---- Routes ------------------------------------------------------------- */

rewardsRouter.get(
  "/status",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user!.id;
    const now = new Date();

    const { data: row, error } = await supabaseAdmin
      .from("daily_login_rewards")
      .select("id, streak, last_claimed_at, potato_received")
      .eq("id", user_id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const streak = row?.streak ?? 0;
    const last = row?.last_claimed_at ? new Date(row.last_claimed_at) : null;

    const diffDays = last ? daysBetweenUTC(last, now) : 999;
    const claimedToday = diffDays === 0;

    const resetIfClaiming = diffDays >= 4;

    const missesUsed = last ? Math.max(0, diffDays - 1) : 0;
    const missesRemaining = Math.max(0, 2 - missesUsed);

    const baseStreak = resetIfClaiming ? 0 : streak;
    const nextStreak = baseStreak + 1;
    const nextDayIndex = (nextStreak - 1) % 7;

    let preview = rewardForStreak(nextStreak);

    if (
      nextDayIndex === 2 &&
      preview.kind === "item" &&
      preview.slug === "potato" &&
      row?.potato_received
    ) {
      preview = {
        kind: "dots",
        amount: 300,
        label: "300 Dots",
      };
    }

    return res.json({
      streak,
      claimedToday,
      canClaim: !claimedToday,
      missesRemaining,
      nextDayIndex,
      week1: true,
      preview,
    });
  },
);

rewardsRouter.post(
  "/claim",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const user_id = req.user!.id;
    const now = new Date();

    const { data: row, error } = await supabaseAdmin
      .from("daily_login_rewards")
      .select("id, streak, last_claimed_at, potato_received")
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

    let reward = rewardForStreak(nextStreak);

    if (
      dayIndex === 2 &&
      reward.kind === "item" &&
      reward.slug === "potato" &&
      row?.potato_received
    ) {
      reward = {
        kind: "dots",
        amount: 300,
        label: "300 Dots",
      };
    }

    try {
      await applyReward(user_id, reward);
    } catch (e) {
      const err = e as any;

      return res
        .status(500)
        .json({ error: err?.message ?? "Failed to apply reward" });
    }

    const { error: e2 } = await supabaseAdmin
      .from("daily_login_rewards")
      .upsert(
        {
          id: user_id,
          streak: nextStreak,
          last_claimed_at: now.toISOString(),
          potato_received:
            row?.potato_received ||
            (reward.kind === "item" && reward.slug === "potato"),
        },
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
