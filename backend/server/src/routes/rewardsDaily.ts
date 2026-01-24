import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin"; // service role client
import { requireUser, getUserId } from "../middleware/requireUser";
// correct middleware file

export const rewardsDaily = Router();

/** Reward pool (Alpha hardcode) */
const DAILY_REWARDS = [
  { type: "WARM_EGG" as const },
  { type: "BOND_BOOST" as const },
  { type: "CRYSTALS" as const, amount: 6 },
  { type: "DOTS" as const, amount: 500 },
];

const WEEKLY_BONUS = { type: "CRYSTALS" as const, amount: 20 };

function todayResetUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

rewardsDaily.get("/daily", requireUser, async (req, res) => {
  try {
    const userId = getUserId(req);

    const { data, error } = await supabaseAdmin
      .from("daily_rewards")
      .select("last_claimed_at, streak")
      .eq("user_id", userId)
      .single();

    // PGRST116 = "No rows found" (ok for first-time users)
    if (error && error.code !== "PGRST116") throw error;

    const lastClaimedAt = data?.last_claimed_at ?? null;
    const streak = data?.streak ?? 0;

    const reset = todayResetUtc();
    const canClaim = !lastClaimedAt || new Date(lastClaimedAt) < reset;

    res.json({ canClaim, streak, lastClaimedAt });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

rewardsDaily.post("/daily/claim", requireUser, async (req, res) => {
  try {
    const userId = getUserId(req);

    const { data, error } = await supabaseAdmin
      .from("daily_rewards")
      .select("last_claimed_at, streak")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    const now = new Date();
    const reset = todayResetUtc();

    const lastClaimedAt = data?.last_claimed_at
      ? new Date(data.last_claimed_at)
      : null;

    if (lastClaimedAt && lastClaimedAt >= reset) {
      return res.status(400).json({ error: "Already claimed today" });
    }

    // streak logic: continue if claimed “yesterday” (within previous reset window), else reset to 1
    const yesterdayReset = new Date(reset.getTime() - 86400000);
    const streak =
      lastClaimedAt && lastClaimedAt >= yesterdayReset
        ? (data?.streak ?? 0) + 1
        : 1;

    const granted = [...DAILY_REWARDS];
    if (streak % 7 === 0) granted.push(WEEKLY_BONUS);

    const { error: upsertError } = await supabaseAdmin
      .from("daily_rewards")
      .upsert({
        user_id: userId,
        last_claimed_at: now.toISOString(),
        streak,
      });

    if (upsertError) throw upsertError;

    res.json({
      streak,
      rewards: granted,
      claimedAt: now.toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Server error" });
  }
});
