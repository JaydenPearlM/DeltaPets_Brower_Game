// backend/server/src/middleware/auth.ts

import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

/**
 * Request type with user attached by auth middleware.
 */
export type AuthedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
};

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header) return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Throws if req.user is missing.
 */
export function getUserId(req: AuthedRequest): string {
  const id = req.user?.id;

  if (!id) {
    throw new Error("Unauthorized: req.user missing");
  }

  return id;
}
/**
 * Lightweight auth helper routes.
 */
export const authRouter = Router();

/** Health-ish ping for the auth router */
authRouter.get("/auth/ping", (_req, res: Response) => {
  return res.json({ ok: true });
});
/**
 * Middleware: requires a valid Supabase bearer token.
 * Attaches req.user = { id, email }.
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
