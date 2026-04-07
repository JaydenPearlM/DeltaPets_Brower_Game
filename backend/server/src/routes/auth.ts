import { Router } from "express";
import type { Response } from "express";
import { requireUser, type AuthedRequest } from "../middleware/auth";

/**
 * Lightweight auth helper routes.
 *
 * Your main auth is Supabase (frontend gets session, backend verifies bearer token).
 * These endpoints are optional but handy for debugging + "who am I" checks.
 */
export const authRouter = Router();

/** Health-ish ping for the auth router */
authRouter.get("/auth/ping", (_req, res: Response) => {
  return res.json({ ok: true });
});

/** Validate bearer token and return the user id/email. */
authRouter.get("/auth/me", requireUser, (req: AuthedRequest, res: Response) => {
  return res.json({ user: req.user ?? null });
});
