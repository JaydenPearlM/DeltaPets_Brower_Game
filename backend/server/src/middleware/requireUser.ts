import type { Request, Response, NextFunction, RequestHandler } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

/**
 * Server-side auth middleware.
 * - Reads Bearer token
 * - Validates via Supabase Admin
 * - Attaches req.user = { id, email }
 */
export const requireUser: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.header("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Attach a stable payload (don't dump full supabase user object)
    req.user = { id: data.user.id, email: data.user.email ?? undefined };

    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

/**
 * Helper for routes: gets a non-optional user id after requireUser middleware.
 */
export function getUserId(req: Request): string {
  const id = req.user?.id;
  if (!id)
    throw new Error("Unauthorized: req.user missing (requireUser not run?)");
  return id;
}
