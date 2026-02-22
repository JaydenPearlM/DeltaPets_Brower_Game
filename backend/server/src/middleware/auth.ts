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
  const h = req.headers.authorization;
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

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
    if (!token) return res.status(401).json({ error: "Missing bearer token" });

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
 * Alias for requireUser so routes can import requireAuth if they prefer.
 * Keeps naming consistent across the project.
 */
export const requireAuth = requireUser;
