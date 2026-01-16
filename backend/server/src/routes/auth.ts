import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit";
import { requireTurnstile } from "../middleware/turnstile";

export const authRouter = Router();

/**
 * Placeholder route to prove Turnstile is enforced.
 * Later, this becomes login/register, purchases, etc.
 */
authRouter.post(
  "/auth/protected",
  authLimiter,
  requireTurnstile({ action: "auth" }),
  (_req, res) => {
    res.json({ ok: true });
  }
);
