import { Router, Response } from "express";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "./../../lib/supabaseAdmin";

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

/**
 * Next reset boundary: 8:00 AM America/New_York (EST/EDT safe)
 * We compute the next 8am in Eastern time, then return it as a real UTC ms value.
 */
function nextEastern8amMs(nowMs: number) {
  const now = new Date(nowMs);

  // Get "now" as a Date in America/New_York *representation*
  const easternNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  // Build 8:00 AM Eastern for "today" in that same representation
  const next = new Date(easternNow);
  next.setHours(8, 0, 0, 0);

  // If we've already passed 8am Eastern, move to tomorrow
  if (easternNow >= next) {
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
  }

  // Convert the Eastern-represented Date back into a real UTC timestamp (ms)
  // by interpreting the "wall clock" value as Eastern and asking what UTC time that is.
  // The trick is to compute the offset between local "now" and "easternNow".
  const easternOffsetMs = now.getTime() - easternNow.getTime();
  return next.getTime() + easternOffsetMs;
}

function isSameEasternDay(aIso: string, nowMs: number) {
  const a = new Date(aIso);

  const easternA = new Date(
    a.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const easternNow = new Date(
    new Date(nowMs).toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  return (
    easternA.getFullYear() === easternNow.getFullYear() &&
    easternA.getMonth() === easternNow.getMonth() &&
    easternA.getDate() === easternNow.getDate()
  );
}

/**
 * Extract the Eastern date from a timestamp for database constraint
 */
function getEasternDate(nowMs: number): string {
  const easternNow = new Date(
    new Date(nowMs).toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  const year = easternNow.getFullYear();
  const month = String(easternNow.getMonth() + 1).padStart(2, "0");
  const day = String(easternNow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

    // "Today" is defined in Eastern time (for the 8am reset design)
    const completed_today = !!last && isSameEasternDay(last, nowMs);
    const available = !completed_today;

    const resetMs = nextEastern8amMs(nowMs);
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
    const easternDate = getEasternDate(nowMs);

    const resetMs = nextEastern8amMs(nowMs);

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
      ? isSameEasternDay(existing.last_completed_at, nowMs)
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

    // Upsert with the computed Eastern date
    // The unique constraint on (user_id, completed_date_eastern) will prevent duplicates
    const { data: saved, error: upErr } = await supabaseAdmin
      .from("daily_care")
      .upsert(
        {
          user_id: userId,
          last_completed_at: nowIso,
          streak: nextStreak,
          alpha_ribbon_awarded: alreadyAwarded || shouldAward,
          completed_date_eastern: easternDate,
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
      } catch (e: any) {
        console.warn(
          "[dailyCare] Failed to award Alpha Tester ribbon:",
          e?.message ?? e,
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
