// backend/server/src/middleware/auth.ts

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

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

export function getUserId(req: AuthedRequest): string {
  const id = req.user?.id;

  if (!id) {
    throw new Error("Unauthorized: req.user missing");
  }

  return id;
}

export const authRouter = Router();

authRouter.get("/ping", (_req, res: Response) => {
  return res.json({ ok: true });
});

authRouter.get("/me", requireUser, (req: AuthedRequest, res: Response) => {
  return res.json({ user: req.user ?? null });
});

authRouter.post("/resolve-username", async (req: Request, res: Response) => {
  try {
    const username = String(req.body?.username ?? "")
      .trim()
      .toLowerCase();

    if (!username) {
      return res.status(400).json({ error: "Missing username." });
    }

    const { data, error } = await supabaseAdmin.rpc("get_email_by_username", {
      p_username: username,
    });

    if (error) {
      console.error("[auth] resolve username failed", error);
      return res.status(500).json({ error: "Could not resolve username." });
    }

    return res.json({
      email: data ? String(data).trim().toLowerCase() : null,
    });
  } catch (err) {
    console.error("[auth] resolve username crashed", err);
    return res.status(500).json({ error: "Could not resolve username." });
  }
});
