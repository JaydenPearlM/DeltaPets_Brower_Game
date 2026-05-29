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
    const userId = req.user?.id;

    if (!userId) {
      console.error("[GET /api/me] missing req.user");
      return res.status(401).json({ error: "Unauthorized" });
    }

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
              "clean",
              "happy",
              "energy",
              "atk",
              "def",
              "spd",
              "hp_max",
              "hp_cur",
              "age",
              "personality_id",
              "personality_key",
              "created_at",
            ].join(", "),
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (pErr) {
      console.error("[GET /api/me] profile error:", pErr);
      return res.status(500).json({ error: pErr.message });
    }

    if (petErr) {
      console.error("[GET /api/me] pet error:", petErr);
      return res.status(500).json({ error: petErr.message });
    }

    return res.json({
      user: req.user,
      profile: profile ?? null,
      pet: pet ?? null,
    });
  } catch (e: unknown) {
    console.error("[GET /api/me] crash:", e);
    return res.status(500).json({
      error: "Server error",
    });
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
      const userId = req.user?.id;

      if (!userId) {
        console.error("[GET /api/me/intro] missing req.user");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [{ data: profile, error: pErr }, { data: eggs, error: eErr }] =
        await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("intro_seen")
            .eq("user_id", userId)
            .maybeSingle(),

          supabaseAdmin
            .from("pets")
            .select("id")
            .eq("user_id", userId)
            .eq("stage", "egg")
            .limit(1),
        ]);

      if (pErr) {
        console.error("[GET /api/me/intro] profile query failed:", pErr);
        return res.status(500).json({ error: pErr.message });
      }

      if (eErr) {
        console.error("[GET /api/me/intro] egg query failed:", eErr);
        return res.status(500).json({ error: eErr.message });
      }

      const intro_seen =
        (profile as { intro_seen?: boolean } | null)?.intro_seen ?? false;
      const has_hatchery_egg = Array.isArray(eggs) && eggs.length > 0;

      return res.json({
        intro_seen,
        has_hatchery_egg,
      });
    } catch (e: unknown) {
      console.error("[GET /api/me/intro] crash:", e);
      return res.status(500).json({
        error: "Server error",
      });
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
      const userId = req.user?.id;

      if (!userId) {
        console.error("[POST /api/me/intro/seen] missing req.user");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .upsert(
          { user_id: userId, intro_seen: true },
          { onConflict: "user_id" },
        )
        .select("intro_seen")
        .maybeSingle();

      if (error) {
        console.error("[POST /api/me/intro/seen] upsert failed:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({
        intro_seen:
          (data as { intro_seen?: boolean } | null)?.intro_seen ?? true,
      });
    } catch (e: unknown) {
      console.error("[POST /api/me/intro/seen] crash:", e);
      return res.status(500).json({
        error: "Server error",
      });
    }
  },
);
