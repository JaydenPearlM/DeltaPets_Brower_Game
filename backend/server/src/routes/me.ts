// backend/src/routes/me.ts
import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const meRouter = Router();

/**
 * GET /api/me
 * Returns authed user + profile row + most recent pet (if any).
 */
meRouter.get("/me", requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [{ data: profile, error: pErr }, { data: pet, error: petErr }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            [
              "user_id",
              "username",
              "display_name",
              "is_admin",
              "intro_seen",
              "created_at",
              "updated_at",
            ].join(", "),
          )
          .eq("user_id", userId)
          .maybeSingle(),

        supabaseAdmin
          .from("pets")
          .select(
            [
              "id",
              "user_id",
              "name",
              "line",
              "stage",
              "level",
              "xp",
              "hatched_at",
              "hatch_ends_at",
              "hunger",
              "cleanliness",
              "happiness",
              "energy",
              "atk",
              "def",
              "spd",
              "hp_max",
              "hp_cur",
              "age",
              "personality",
              "created_at",
            ].join(", "),
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    // If your profiles table doesn't have intro_seen yet, don't blow up /me.
    if (pErr && !String(pErr.message).includes("intro_seen")) {
      return res.status(500).json({ error: pErr.message });
    }
    if (petErr) return res.status(500).json({ error: petErr.message });

    return res.json({
      user: req.user,
      profile: profile ?? null,
      pet: pet ?? null,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

/**
 * GET /api/me/intro
 * Returns whether the user has already seen the intro cutscene
 * and whether they currently have a hatchery egg.
 */
meRouter.get(
  "/me/intro",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const [{ data: profile, error: pErr }, { data: eggs, error: eErr }] =
        await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("intro_seen")
            .eq("user_id", userId)
            .maybeSingle(),

          // "hatchery egg" = any pet row with stage = "egg"
          supabaseAdmin
            .from("pets")
            .select("id")
            .eq("user_id", userId)
            .eq("stage", "egg")
            .limit(1),
        ]);

      // If the column doesn't exist yet, treat as false (until migration is applied).
      const intro_seen = (profile as any)?.intro_seen ?? false;
      const has_hatchery_egg = Array.isArray(eggs) && eggs.length > 0;

      if (pErr && !String(pErr.message).includes("intro_seen")) {
        return res.status(500).json({ error: pErr.message });
      }
      if (eErr) return res.status(500).json({ error: eErr.message });

      return res.json({ intro_seen, has_hatchery_egg });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);

/**
 * POST /api/me/intro/seen
 * Marks intro cutscene as seen. Call this AFTER ensure-egg succeeds.
 */
meRouter.post(
  "/me/intro/seen",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // Upsert so brand new accounts (no profile row yet) still work.
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .upsert(
          { user_id: userId, intro_seen: true },
          { onConflict: "user_id" },
        )
        .select("intro_seen")
        .maybeSingle();

      // If the column doesn't exist yet, just return ok so the frontend can proceed.
      if (error && String(error.message).includes("intro_seen")) {
        return res.json({
          intro_seen: true,
          note: "intro_seen column missing",
        });
      }

      if (error) return res.status(500).json({ error: error.message });

      return res.json({ intro_seen: (data as any)?.intro_seen ?? true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  },
);
