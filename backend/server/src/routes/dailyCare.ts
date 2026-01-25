import { Router } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import {
  DEFAULT_TZ,
  getLocalResetBoundary,
  getNextResetAt,
  isCompletedThisCycle,
} from "../lib/dailyReset";

export const dailyCareRouter = Router();

/**
 * GET /api/daily/care/status
 * Uses profiles.daily_care_completed_at (no daily_care table needed)
 */
dailyCareRouter.get("/status", requireUser, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const nowMs = Date.now();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("timezone, daily_care_completed_at")
    .eq("user_id", userId)
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });

  const row = data?.[0];
  const tz = row?.timezone || DEFAULT_TZ;
  const lastCompleted = row?.daily_care_completed_at ?? null;

  const { boundaryIsoUtc } = getLocalResetBoundary(nowMs, tz, 9);
  const completed_today = isCompletedThisCycle(lastCompleted, boundaryIsoUtc);

  const next = getNextResetAt(nowMs, tz, 9);

  return res.json({
    available: !completed_today,
    completed_today,
    last_completed_at: lastCompleted,

    server_now: new Date(nowMs).toISOString(),
    next_reset_at: next.nextIsoUtc,
    remaining_ms: next.remainingMs,

    reset_rule: "09:00 local",
    timezone: next.zone,
  });
});

/**
 * POST /api/daily/care/complete
 * Blocks if already completed in the current 9AM-local cycle.
 * Writes profiles.daily_care_completed_at and awards alpha ribbon once.
 */
dailyCareRouter.post(
  "/complete",
  requireUser,
  async (req: AuthedRequest, res) => {
    const userId = req.user.id;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    // Pull current state
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("timezone, daily_care_completed_at, alpha_ribbon_awarded")
      .eq("user_id", userId)
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    const row = data?.[0];
    if (!row) return res.status(404).json({ error: "Profile not found" });

    const tz = row.timezone || DEFAULT_TZ;
    const lastCompleted = row.daily_care_completed_at ?? null;

    const { boundaryIsoUtc } = getLocalResetBoundary(nowMs, tz, 9);
    const completed = isCompletedThisCycle(lastCompleted, boundaryIsoUtc);

    if (completed) {
      const next = getNextResetAt(nowMs, tz, 9);
      return res.status(409).json({
        error: "Already completed for this cycle.",
        available: false,
        next_reset_at: next.nextIsoUtc,
        remaining_ms: next.remainingMs,
        timezone: next.zone,
      });
    }

    // Award ribbon once (optional)
    const awarded: string[] = [];
    const updatePatch: Record<string, any> = {
      daily_care_completed_at: nowIso,
    };

    if (!row.alpha_ribbon_awarded) {
      updatePatch.alpha_ribbon_awarded = true;
      awarded.push("RIBBON_ALPHA_1");
    }

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update(updatePatch)
      .eq("user_id", userId);

    if (upErr) return res.status(500).json({ error: upErr.message });

    const next = getNextResetAt(nowMs, tz, 9);

    return res.json({
      ok: true,
      awarded,
      available: false,
      last_completed_at: nowIso,
      next_reset_at: next.nextIsoUtc,
      remaining_ms: next.remainingMs,
      timezone: next.zone,
    });
  },
);
