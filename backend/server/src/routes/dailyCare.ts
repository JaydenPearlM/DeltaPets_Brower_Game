import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import type { AuthedRequest } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";

// Simple alias so older routes can keep importing requireAuth

export const dailyCareRouter = Router();

/**
 * Helper: define "daily reset" boundary.
 * For Alpha, simplest is "once per UTC day".
 * Later you can switch to user-local midnight.
 */
function utcDayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function isSameUtcDay(aIso: string | null | undefined, nowMs: number) {
  if (!aIso) return false;
  const aMs = Date.parse(aIso);
  if (Number.isNaN(aMs)) return false;
  return utcDayKey(aMs) === utcDayKey(nowMs);
}

/**
 * 🔑 IMPORTANT: adapt this to however your requireAuth attaches user id.
 * I’ve seen your project use userId variables before, so we try a few common spots.
 */
function getUserId(req: any): string | null {
  return (
    req.user?.id || req.auth?.userId || req.auth?.sub || req.userId || null
  );
}

/**
 * GET /api/daily/care/status
 * Returns whether the daily care can be done today + whether Alpha ribbon already awarded.
 */
dailyCareRouter.get("/care/status", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const serverNowMs = Date.now();
  const serverNowIso = new Date(serverNowMs).toISOString();

  // profile read
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("daily_care_completed_at, alpha_ribbon_awarded")
    .eq("id", userId) // if your profiles key is user_id instead, change this line
    .maybeSingle();

  if (profErr) return res.status(500).json({ error: profErr.message });

  // If profile row doesn’t exist yet, treat as not completed + no ribbon.
  const completedToday = isSameUtcDay(
    profile?.daily_care_completed_at ?? null,
    serverNowMs,
  );

  return res.json({
    server_now: serverNowIso,
    completed_today: completedToday,
    claimable: !completedToday,
    alpha_ribbon_awarded: profile?.alpha_ribbon_awarded ?? false,
    reset_basis: "UTC",
  });
});

/**
 * POST /api/daily/care/complete
 * Marks today’s care as done:
 * - increments bond on the user’s pet (if exists)
 * - stamps pets.last_cared_at
 * - stamps profiles.daily_care_completed_at
 * - awards Alpha ribbon ONE TIME EVER
 *
 * Not wired to UI yet—this is just logic.
 */
dailyCareRouter.post("/care/complete", requireAuth, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const serverNowMs = Date.now();
  const nowIso = new Date(serverNowMs).toISOString();

  // read profile state
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("daily_care_completed_at, alpha_ribbon_awarded")
    .eq("id", userId) // change to .eq("user_id", userId) if that’s your schema
    .maybeSingle();

  if (profErr) return res.status(500).json({ error: profErr.message });

  if (isSameUtcDay(profile?.daily_care_completed_at ?? null, serverNowMs)) {
    return res
      .status(400)
      .json({ error: "Daily care already completed today" });
  }

  // You said you don’t have hatch/pets yet.
  // We keep logic: if no pet row, we still mark daily complete (optional).
  // If you want to REQUIRE a pet, switch this to 400.
  const { data: pet, error: petErr } = await supabaseAdmin
    .from("pets")
    .select("id, bond")
    .eq("user_id", userId)
    .maybeSingle();

  if (petErr) return res.status(500).json({ error: petErr.message });

  // Tunables
  const BOND_GAIN = 1;

  // Apply pet updates only if pet exists
  let updatedPet: any = null;
  if (pet) {
    const { data: petUpdated, error: petUpErr } = await supabaseAdmin
      .from("pets")
      .update({
        bond: (pet.bond ?? 0) + BOND_GAIN,
        last_cared_at: nowIso,
      })
      .eq("id", pet.id)
      .eq("user_id", userId)
      .select("id, bond, last_cared_at")
      .single();

    if (petUpErr) return res.status(500).json({ error: petUpErr.message });
    updatedPet = petUpdated;
  }

  // Award Alpha ribbon only once, ever
  const ribbonAwardedNow = !(profile?.alpha_ribbon_awarded ?? false);

  const { data: profileUpdated, error: profUpErr } = await supabaseAdmin
    .from("profiles")
    .update({
      daily_care_completed_at: nowIso,
      ...(ribbonAwardedNow ? { alpha_ribbon_awarded: true } : {}),
    })
    .eq("id", userId) // change if needed
    .select("daily_care_completed_at, alpha_ribbon_awarded")
    .single();

  if (profUpErr) return res.status(500).json({ error: profUpErr.message });

  return res.json({
    server_now: nowIso,
    completed_today: true,
    bond_gain: pet ? BOND_GAIN : 0,
    pet: updatedPet,
    alpha_ribbon_awarded: profileUpdated.alpha_ribbon_awarded,
    alpha_ribbon_awarded_now: ribbonAwardedNow,
    note: pet
      ? null
      : "No pet yet: daily marked complete, but bond not applied",
  });
});
