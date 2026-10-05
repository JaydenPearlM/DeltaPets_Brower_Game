import { Router } from "express";
import type { Response } from "express";

import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { z } from "zod";
import { logger } from "../../lib/logger";

export const rewardsRouter = Router();

/* =============================================================================
   Rewards: Daily Login / 7-Day Streak
   - Repeating 7-day reward cycle
============================================================================= */

/** ---- Config ------------------------------------------------------------- */

type Reward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string }
  | { kind: "ribbon"; label: string };

type WeeklyReward =
  | { kind: "dots"; amount: number; label: string }
  | { kind: "item"; slug: string; qty: number; label: string }
  | { kind: "xp"; amount: number; label: string }
  | { kind: "ribbon"; label: string };

/** Daily rewards, mapped by streak dayIndex 0..6. */
const WEEKLY_REWARDS: readonly WeeklyReward[] = [
  { kind: "dots", amount: 300, label: "300 Dots" },
  { kind: "dots", amount: 200, label: "200 Dots" },
  {
    kind: "item",
    slug: "haiku_scroll_50",
    qty: 1,
    label: "Haiku Scroll #50",
  },
  { kind: "item", slug: "potion_small", qty: 3, label: "Potions x3" },
  {
    kind: "xp",
    amount: 100,
    label: "EXP +100",
  },
  { kind: "dots", amount: 500, label: "500 Dots" },
  {
    kind: "ribbon",
    label: "Alpha Tester Ribbon",
  },
] as const;

/** ---- Date helpers ------------------------------------------------------- */

function daysBetweenUTC(a: Date, b: Date): number {
  const aDay = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bDay = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bDay - aDay) / 86_400_000);
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

  if (reward.kind === "xp") {
    return {
      kind: "xp",
      amount: reward.amount,
      label: reward.label,
    };
  }

  return {
    kind: "ribbon",
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

    const preview = rewardForStreak(nextStreak);

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

const claimBodySchema = z.object({}).strict();
const claimResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(false), error: z.literal("Already claimed today.") }),
  z.object({
    ok: z.literal(true),
    reward: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("dots"), amount: z.number().int(), label: z.string() }),
      z.object({ kind: z.literal("item"), slug: z.string(), qty: z.number().int(), label: z.string() }),
      z.object({ kind: z.literal("xp"), amount: z.number().int(), label: z.string() }),
      z.object({ kind: z.literal("ribbon"), label: z.string() }),
    ]),
    streak: z.number().int().positive(),
    dayIndex: z.number().int().min(0).max(6),
    reset: z.boolean(),
  }),
]);

rewardsRouter.post(
  "/claim",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!claimBodySchema.safeParse(req.body ?? {}).success) {
      return res.status(400).json({ error: "Daily reward claims do not accept client reward data." });
    }

    try {
      // Eligibility, reward and claim marker commit together under a database lock.
      const { data, error } = await supabaseAdmin.rpc("claim_daily_login_reward", {
        p_user_id: userId,
      });
      if (error) throw error;
      const result = claimResultSchema.parse(data);
      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }
      return res.json(result);
    } catch (error) {
      logger.error("[rewards/claim] failed", error);
      return res.status(500).json({ error: "Failed to claim daily reward." });
    }
  },
);
