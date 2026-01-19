import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit";
import { requireTurnstile } from "../middleware/turnstile";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const authRouter = Router();

/**
 * Placeholder route to prove Turnstile is enforced.
 */
authRouter.post(
  "/auth/protected",
  authLimiter,
  requireTurnstile({ action: "auth" }),
  (_req, res) => {
    res.json({ ok: true });
  },
);

/**
 * Resolve username -> email for "login with username or email".
 *
 * Security notes:
 * - Generic errors to avoid account enumeration
 * - Protected by rate limiting + Turnstile
 *
 * Requires profiles table:
 * - username (unique)
 * - email
 */
authRouter.post(
  "/auth/resolve-username",
  authLimiter,
  requireTurnstile({ action: "auth" }),
  async (req, res) => {
    const raw = req.body?.username;

    // Basic validation (no Zod)
    if (typeof raw !== "string") {
      return res.status(400).json({ error: "Invalid request" });
    }

    const username = raw.trim().toLowerCase();

    if (username.length === 0 || username.length > 32) {
      return res.status(400).json({ error: "Invalid request" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("username", username)
        .maybeSingle();

      // Always respond generically
      if (error || !data?.email) {
        return res.status(404).json({ error: "Invalid login credentials" });
      }

      return res.json({ email: data.email });
    } catch (err) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);
