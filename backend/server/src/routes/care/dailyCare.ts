import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "./../../lib/supabaseAdmin";
import { getDeltaTime } from "../../lib/deltaTime";

export const dailyCareRouter = Router();

/**
 * Award the Alpha Tester ribbon ONCE (idempotent).
 * - Requires tables: awards, pet_awards
 * - Requires daily_care column: alpha_ribbon_awarded (you already have it)
 *
 * This attaches the ribbon to the user's current pet.
 */
async function awardAlphaTesterRibbon(userId: string, earnedAtIso: string) {
  // Attach to the user's pet.
  // If later you support multiple pets, you can change this to "active pet" logic.
  const { data: pet, error: petErr } = await supabaseAdmin
    .from("pets")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (petErr) throw new Error(petErr.message);
  if (!pet?.id)
    throw new Error("No pet found for this account to award ribbon.");

  // Ensure award exists (safe even if you already seeded it).
  const { data: award, error: awardErr } = await supabaseAdmin
    .from("awards")
    .upsert(
      {
        key: "alpha_tester",
        name: "Alpha Tester",
        type: "ribbon",
        rarity: "special",
        description:
          "Awarded for participating in the Alpha deployment testing.",
      },
      { onConflict: "key" },
    )
    .select("id")
    .single();

  if (awardErr) throw new Error(awardErr.message);
  if (!award?.id) throw new Error("Failed to resolve award id.");

  // Log award to pet (idempotent: requires unique (pet_id, award_id)).
  const { error: paErr } = await supabaseAdmin.from("pet_awards").upsert(
    {
      pet_id: pet.id,
      award_id: award.id,
      earned_at: earnedAtIso,
      context: { source: "daily_care", deployment: "alpha" },
    },
    { onConflict: "pet_id,award_id" },
  );

  if (paErr) throw new Error(paErr.message);
}

const DELTA_DAY_REAL_MS = 360 * 60 * 1000;

function getNextDeltaResetMs(nowMs: number) {
  return (Math.floor(nowMs / DELTA_DAY_REAL_MS) + 1) * DELTA_DAY_REAL_MS;
}

function isSameDeltaDay(aIso: string, nowMs: number) {
  const completedMs = Date.parse(aIso);
  if (!Number.isFinite(completedMs)) return false;

  return (
    getDeltaTime(new Date(completedMs)).deltaDay ===
    getDeltaTime(new Date(nowMs)).deltaDay
  );
}

function getDeltaDateKey(nowMs: number): string {
  return String(getDeltaTime(new Date(nowMs)).deltaDay);
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

    const completed_today = !!last && isSameDeltaDay(last, nowMs);
    const available = !completed_today;

    const resetMs = getNextDeltaResetMs(nowMs);
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
    const deltaDateKey = getDeltaDateKey(nowMs);

    const resetMs = getNextDeltaResetMs(nowMs);

    // Read existing to determine streak and ribbon status
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("daily_care")
      .select("last_completed_at, streak, alpha_ribbon_awarded")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) {
      console.error("[dailyCare] failed to read existing:", readErr);
      return res
        .status(500)
        .json({ error: "Failed to check daily care status" });
    }

    // Quick check before attempting upsert (performance optimization)
    const alreadyDoneToday = existing?.last_completed_at
      ? isSameDeltaDay(existing.last_completed_at, nowMs)
      : false;

    if (alreadyDoneToday) {
      return res.status(409).json({
        error: "Daily care already completed today.",
        server_now: nowIso,
        completed_today: true,
        next_reset_at: new Date(resetMs).toISOString(),
        remaining_ms: Math.max(0, resetMs - nowMs),
      });
    }

    const alreadyAwarded = existing?.alpha_ribbon_awarded ?? false;
    const shouldAward = !alreadyAwarded;
    const nextStreak = (existing?.streak ?? 0) + 1;

    // The column name is legacy, but the value now tracks the Delta day key.
    const { data: saved, error: upErr } = await supabaseAdmin
      .from("daily_care")
      .upsert(
        {
          user_id: userId,
          last_completed_at: nowIso,
          streak: nextStreak,
          alpha_ribbon_awarded: alreadyAwarded || shouldAward,
          completed_delta_day: Number(deltaDateKey),
        },
        { onConflict: "user_id" },
      )
      .select("last_completed_at, streak, alpha_ribbon_awarded")
      .single();

    // Handle unique constraint violation (race condition caught by database)
    if (upErr) {
      // PostgreSQL unique violation error code is 23505
      if (
        upErr.code === "23505" ||
        upErr.message.includes("daily_care_user_date_unique")
      ) {
        return res.status(409).json({
          error: "Daily care already completed today.",
          server_now: nowIso,
          completed_today: true,
          next_reset_at: new Date(resetMs).toISOString(),
          remaining_ms: Math.max(0, resetMs - nowMs),
        });
      }

      // Other database errors
      console.error("[dailyCare] upsert failed:", upErr);
      return res.status(500).json({ error: "Failed to complete daily care" });
    }

    // Award ribbon only if this is the first completion ever
    // The ribbon award is idempotent, so even if this runs twice it's safe
    if (shouldAward) {
      try {
        await awardAlphaTesterRibbon(userId, nowIso);
      } catch (e) {
        const err = e as any;

        console.warn(
          "[dailyCare] Failed to award Alpha Tester ribbon:",
          err?.message ?? err,
        );
        // Don't fail the request if ribbon award fails
        // The daily care completion succeeded
      }
    }

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
