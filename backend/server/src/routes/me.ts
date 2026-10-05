// backend/server/src/routes/me.ts

import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";
import { z } from "zod";
import { readAppearance, saveAppearanceSchema } from "../lib/profileAppearance";

export const meRouter = Router();

meRouter.get("/me/appearance", requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("avatar_customization, default_avatar_customization")
      .eq("user_id", req.user!.id)
      .maybeSingle();
    if (error) throw error;
    return res.json({
      appearance: readAppearance(data?.avatar_customization),
      defaultAppearance: readAppearance(data?.default_avatar_customization),
    });
  } catch (error) {
    logger.error("[GET /api/me/appearance] failed", error);
    return res.status(500).json({ error: "Could not load your saved appearance." });
  }
});

meRouter.put("/me/appearance", requireUser, async (req: AuthedRequest, res: Response) => {
  const parsed = saveAppearanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Choose valid appearance options." });
  }
  try {
    const column = parsed.data.target === "current"
      ? "avatar_customization"
      : "default_avatar_customization";
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: req.user!.id, [column]: parsed.data.appearance }, { onConflict: "user_id" })
      .select("avatar_customization, default_avatar_customization")
      .single();
    if (error) throw error;
    return res.json({
      appearance: readAppearance(data.avatar_customization),
      defaultAppearance: readAppearance(data.default_avatar_customization),
    });
  } catch (error) {
    logger.error("[PUT /api/me/appearance] failed", error);
    return res.status(500).json({ error: "Could not save your appearance. Please try again." });
  }
});

meRouter.get("/profiles/:playerId", requireUser, async (req: AuthedRequest, res: Response) => {
  const playerId = z.string().uuid().safeParse(req.params.playerId);
  if (!playerId.success) {
    return res.status(400).json({ error: "Invalid player profile link." });
  }
  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, display_name, created_at, active_title, avatar_customization")
      .eq("user_id", playerId.data)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return res.status(404).json({ error: "Player profile not found." });

    const [progression, pets] = await Promise.all([
      supabaseAdmin.from("trainer_progression").select("trainer_level")
        .eq("user_id", playerId.data).maybeSingle(),
      supabaseAdmin.from("pets").select("id", { count: "exact", head: true })
        .eq("user_id", playerId.data),
    ]);
    if (progression.error) throw progression.error;
    if (pets.error) throw pets.error;
    // Explicit public fields only; never return the complete profile row.
    return res.json({
      playerId: profile.user_id,
      displayName: profile.display_name || profile.username || "Traveler",
      username: profile.username,
      joinedAt: profile.created_at,
      title: profile.active_title,
      appearance: readAppearance(profile.avatar_customization),
      trainerLevel: progression.data?.trainer_level ?? 1,
      kithOwned: pets.count ?? 0,
    });
  } catch (error) {
    logger.error("[GET /api/profiles/:playerId] failed", error);
    return res.status(500).json({ error: "Could not load this player profile." });
  }
});

meRouter.get(
  "/me/trainer-progression",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { data, error } = await supabaseAdmin
        .from("trainer_progression")
        .select("trainer_level, trainer_xp")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return res.json({
        trainer_level: Number(data?.trainer_level ?? 1),
        trainer_xp: Number(data?.trainer_xp ?? 0),
      });
    } catch (error) {
      logger.error("[GET /api/me/trainer-progression] failed", error);
      return res.status(500).json({ error: "Failed to load Trainer Level" });
    }
  },
);

type WalletView = {
  dots: number;
};

function normalizeDots(value: unknown) {
  return Math.max(0, Math.floor(Number(value ?? 0)));
}

function normalizeWallet(row: { dots?: unknown } | null): WalletView {
  return {
    dots: normalizeDots(row?.dots),
  };
}

async function getOrCreateWallet(userId: string): Promise<WalletView> {
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("dots")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeWallet(data);
  }

  const { data: createdWallet, error: createError } = await supabaseAdmin
    .from("wallets")
    .insert({
      user_id: userId,
      dots: 5000,
      crystals: 0,
    })
    .select("dots")
    .maybeSingle();

  if (createError) {
    throw createError;
  }

  return normalizeWallet(createdWallet);
}

async function spendDotsFromWallet(userId: string, dots: number) {
  await getOrCreateWallet(userId);

  // Let the existing database function lock and debit the current balance.
  const { data, error } = await supabaseAdmin.rpc("spend_wallet", {
    p_user_id: userId,
    p_dots: dots,
    p_crystals: 0,
  });

  if (error) {
    throw error;
  }

  return {
    ok: data === true,
    wallet: await getOrCreateWallet(userId),
  };
}

/**
 * GET /api/me
 * Returns authed user + profile row + most recent pet (if any).
 */
meRouter.get("/me", requireUser, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      logger.error("[GET /api/me] missing req.user");
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
              "nickname",
              "species",
              "description",
              "line",
              "stage",
              "level",
              "xp",
              "hatched_at",
              "hatch_ends_at",
              "location",
              "is_active",
              "hunger",
              "clean",
              "happy",
              "comfort",
              "rest",
              "energy",
              "bond",
              "atk",
              "def",
              "spd",
              "magi",
              "mana",
              "hp_max",
              "hp_cur",
              "age",
              "personality_id",
              "personality_key",
              "passive_trait_id",
              "passive_trait_key",
              "cd_bond_ends_at",
              "neglect_hours",
              "ran_away",
              "runaway_at",
              "created_at",
            ].join(", "),
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (pErr) {
      logger.error("[GET /api/me] profile error:", pErr);
      return res.status(500).json({ error: pErr.message });
    }

    if (petErr) {
      logger.error("[GET /api/me] pet error:", petErr);
      return res.status(500).json({ error: petErr.message });
    }

    return res.json({
      user: req.user,
      profile: profile ?? null,
      pet: pet ?? null,
    });
  } catch (e: unknown) {
    logger.error("[GET /api/me] crash:", e);
    return res.status(500).json({
      error: "Server error",
    });
  }
});

/**
 * GET /api/me/intro
 * Returns whether the user has already seen the intro cutscene,
 * whether they currently have a hatchery egg, and whether they have hatched a pet.
 */
meRouter.get(
  "/me/intro",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.error("[GET /api/me/intro] missing req.user");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [
        { data: profile, error: pErr },
        { data: eggs, error: eErr },
        { data: hatchedPets, error: petErr },
      ] = await Promise.all([
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

        supabaseAdmin
          .from("pets")
          .select("id")
          .eq("user_id", userId)
          .neq("stage", "egg")
          .limit(1),
      ]);

      if (pErr) {
        logger.error("[GET /api/me/intro] profile query failed:", pErr);
        return res.status(500).json({ error: pErr.message });
      }

      if (eErr) {
        logger.error("[GET /api/me/intro] egg query failed:", eErr);
        return res.status(500).json({ error: eErr.message });
      }

      if (petErr) {
        logger.error("[GET /api/me/intro] hatched pet query failed:", petErr);
        return res.status(500).json({ error: petErr.message });
      }

      const intro_seen =
        (profile as { intro_seen?: boolean } | null)?.intro_seen ?? false;
      const has_hatchery_egg = Array.isArray(eggs) && eggs.length > 0;
      const has_hatched_pet =
        Array.isArray(hatchedPets) && hatchedPets.length > 0;

      return res.json({
        intro_seen,
        has_hatchery_egg,
        has_hatched_pet,
      });
    } catch (e: unknown) {
      logger.error("[GET /api/me/intro] crash:", e);
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
        logger.error("[POST /api/me/intro/seen] missing req.user");
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
        logger.error("[POST /api/me/intro/seen] upsert failed:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({
        intro_seen:
          (data as { intro_seen?: boolean } | null)?.intro_seen ?? true,
      });
    } catch (e: unknown) {
      logger.error("[POST /api/me/intro/seen] crash:", e);
      return res.status(500).json({
        error: "Server error",
      });
    }
  },
);

/**
/**
 * GET /api/me/starter-cleanup
 * Returns whether the user should see the one-time starter cleanup notice.
 */
meRouter.get(
  "/me/starter-cleanup",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.error("[GET /api/me/starter-cleanup] missing req.user");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("starter_cleanup_affected, starter_cleanup_notice_seen")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        logger.error(
          "[GET /api/me/starter-cleanup] profile query failed:",
          error,
        );
        return res.status(500).json({ error: error.message });
      }

      return res.json({
        affected:
          (data as { starter_cleanup_affected?: boolean } | null)
            ?.starter_cleanup_affected ?? false,
        seen:
          (data as { starter_cleanup_notice_seen?: boolean } | null)
            ?.starter_cleanup_notice_seen ?? false,
      });
    } catch (e: unknown) {
      logger.error("[GET /api/me/starter-cleanup] crash:", e);
      return res.status(500).json({
        error: "Server error",
      });
    }
  },
);

/**
 * POST /api/me/starter-cleanup/seen
 * Permanently acknowledges the one-time starter cleanup notice.
 */
meRouter.post(
  "/me/starter-cleanup/seen",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.error("[POST /api/me/starter-cleanup/seen] missing req.user");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          starter_cleanup_notice_seen: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("starter_cleanup_affected", true);

      if (error) {
        logger.error(
          "[POST /api/me/starter-cleanup/seen] profile update failed:",
          error,
        );
        return res.status(500).json({ error: error.message });
      }

      return res.json({
        seen: true,
      });
    } catch (e: unknown) {
      logger.error("[POST /api/me/starter-cleanup/seen] crash:", e);
      return res.status(500).json({
        error: "Server error",
      });
    }
  },
);

/**
 * GET /api/me/wallet
 * Returns the user's Dots wallet.
 */
meRouter.get(
  "/me/wallet",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.error("[GET /api/me/wallet] missing req.user");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const wallet = await getOrCreateWallet(userId);

      return res.json({
        wallet,
      });
    } catch (e: unknown) {
      logger.error("[GET /api/me/wallet] crash:", e);
      return res.status(500).json({
        error: "Failed to load wallet.",
      });
    }
  },
);

/**
 * POST /api/me/wallet/spend-dots
 * Spends Dots for merchant purchases.
 */
meRouter.post(
  "/me/wallet/spend-dots",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.error("[POST /api/me/wallet/spend-dots] missing req.user");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dots = z.number().int().positive().max(2147483647).safeParse(req.body?.dots);

      if (!dots.success) {
        return res.status(400).json({
          error: "Dots amount must be a positive integer within the supported range.",
        });
      }

      const result = await spendDotsFromWallet(userId, dots.data);

      if (!result.ok) {
        return res.status(400).json({
          error: "Not enough Dots.",
          wallet: result.wallet,
        });
      }

      return res.json({
        wallet: result.wallet,
      });
    } catch (e: unknown) {
      logger.error("[POST /api/me/wallet/spend-dots] crash:", e);
      return res.status(500).json({
        error: "Failed to spend Dots.",
      });
    }
  },
);
