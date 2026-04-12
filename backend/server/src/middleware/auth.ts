// backend/server/src/middleware/auth.ts

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Request type with user attached by auth middleware.
 */
export type AuthedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Middleware: requires a valid Supabase bearer token.
 * Attaches req.user = { id, email } on success.
 */
export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Throws if req.user is missing. Use inside route handlers after requireUser.
 */
export function getUserId(req: AuthedRequest): string {
  const id = req.user?.id;

  if (!id) {
    throw new Error("Unauthorized: req.user missing");
  }

  return id;
}

// ---------------------------------------------------------------------------
// Auth routes
// (Previously in routes/auth.ts — consolidated here to keep auth in one place)
// ---------------------------------------------------------------------------

/**
 * Lightweight auth helper routes.
 *
 * Your main auth is Supabase (frontend gets session, backend verifies bearer token).
 * These endpoints are optional but handy for debugging + "who am I" checks.
 */
export const authRouter = Router();

/** Health-ish ping — confirms the API is reachable */
authRouter.get("/auth/ping", (_req, res: Response) => {
  return res.json({ ok: true });
});

/** Validate bearer token and return the user id/email. */
authRouter.get("/auth/me", requireUser, (req: AuthedRequest, res: Response) => {
  return res.json({ user: req.user ?? null });
});
