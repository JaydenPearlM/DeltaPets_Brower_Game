import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export type AuthedRequest = Request & {
  user?: { id: string; email: string | null };
};

function getBearerToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;

  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;

  return token;
}

async function getUserFromBearer(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing Bearer token" });

  const user = await getUserFromBearer(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  req.user = { id: user.id, email: user.email ?? null };
  return next();
}
