import type { NextFunction, Request, Response } from "express";
import { getUserFromBearer } from "../lib/auth/getUserFromBearer";

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

export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing Bearer token" });

  const user = await getUserFromBearer(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  req.user = user;
  return next();
}
