import { Router, Response } from "express";
import { requireUser, AuthedRequest } from "../middleware/requireUser";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const dailyCareRouter = Router();

// Reset boundary: UTC midnight (simple + consistent for Alpha)
function nextUtcMidnightMs(nowMs: number) {
  const d = new Date(nowMs);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
}

function nextUtcMidnightIso(nowMs: number) {
  return new Date(nextUtcMidnightMs(nowMs)).toISOString();
}

function isSameUtcDay(aIso: string, nowMs: number) {
  const a = new Date(aIso);
  const n = new Date(nowMs);
  return (
    a.getUTCFullYear() === n.getUTCFullYear() &&
    a.getUTCMonth() === n.getUTCMonth() &&
    a.getUTCDate() === n.getUTCDate()
  );
}

dailyCareRouter.get(
  "/status",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const nowMs = Date.now();

    const { data, error } = await supabaseAdmin
      .from("daily_care")
      .select("last_completed_at, streak, alpha_ribbon_awarded")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const last = data?.last_completed_at ?? null;
    const completed_today = !!last && isSameUtcDay(last, nowMs);
    const available = !completed_today;

    const resetMs = nextUtcMidnightMs(nowMs);

    // ✅ key fix: ALWAYS return time until reset so UI can countdown
    const remaining_ms = Math.max(0, resetMs - nowMs);

    return res.json({
      server_now: new Date(nowMs).toISOString(),
      available,
      completed_today,
      next_reset_at: new Date(resetMs).toISOString(),
      remaining_ms,
      last_completed_at: last,
      streak: data?.streak ?? 0,
      alpha_ribbon_awarded: data?.alpha_ribbon_awarded ?? false,
    });
  },
);

dailyCareRouter.post(
  "/complete",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const resetMs = nextUtcMidnightMs(nowMs);

    // Read existing
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("daily_care")
      .select("last_completed_at, streak, alpha_ribbon_awarded")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) return res.status(500).json({ error: readErr.message });

    const alreadyDoneToday = existing?.last_completed_at
      ? isSameUtcDay(existing.last_completed_at, nowMs)
      : false;

    if (alreadyDoneToday) {
      // ✅ include countdown info here too
      return res.status(409).json({
        error: "Daily care already completed today.",
        server_now: nowIso,
        completed_today: true,
        next_reset_at: new Date(resetMs).toISOString(),
        remaining_ms: Math.max(0, resetMs - nowMs),
      });
    }

    const alreadyAwarded = existing?.alpha_ribbon_awarded ?? false;
    const shouldAward = !alreadyAwarded; // first completion ever
    const nextStreak = (existing?.streak ?? 0) + 1;

    const { data: saved, error: upErr } = await supabaseAdmin
      .from("daily_care")
      .upsert(
        {
          user_id: userId,
          last_completed_at: nowIso,
          streak: nextStreak,
          alpha_ribbon_awarded: alreadyAwarded || shouldAward,
        },
        { onConflict: "user_id" },
      )
      .select("last_completed_at, streak, alpha_ribbon_awarded")
      .single();

    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.json({
      server_now: nowIso,
      available: false,
      completed_today: true,
      next_reset_at: new Date(resetMs).toISOString(),
      remaining_ms: Math.max(0, resetMs - nowMs),
      last_completed_at: saved.last_completed_at,
      streak: saved.streak,
      alpha_ribbon_awarded: saved.alpha_ribbon_awarded,
      ribbon_awarded_now: shouldAward,
    });
  },
);
