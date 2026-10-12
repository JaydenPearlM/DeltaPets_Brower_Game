// backend/server/src/middleware/auth.ts

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { env } from "../env.server";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

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

export const publicAuthRouter = Router();
export const authRouter = Router();

authRouter.get("/ping", (_req, res: Response) => {
  return res.json({ ok: true });
});

authRouter.get("/me", requireUser, (req: AuthedRequest, res: Response) => {
  return res.json({ user: req.user ?? null });
});

const usernameLoginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
  captchaToken: z.string().optional(),
});

publicAuthRouter.post(
  "/login-username",
  async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    try {
      const parsed = usernameLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Missing or invalid login details." });
      }
      const { username, password, captchaToken } = parsed.data;
      // Reuse the existing local/server and Render public-key configuration.
      // Never fall back to the privileged key: that can bypass CAPTCHA.
      const publicKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!publicKey) {
        logger.error("[auth] username login public key is missing");
        return res.status(503).json({ error: "Could not sign in. Try again later." });
      }

      const { data, error } = await supabaseAdmin.rpc("get_email_by_username", {
        p_username: username,
      });

      if (error) {
        logger.error("[auth] username login lookup failed");
        return res.status(503).json({ error: "Could not sign in. Try again later." });
      }

      if (typeof data !== "string" || !data.trim()) {
        return res.status(401).json({ error: "Incorrect Username and/or password." });
      }

      // A request-local client keeps player sessions off the shared admin client.
      const loginClient = createClient(env.SUPABASE_URL, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: login, error: loginError } = await loginClient.auth.signInWithPassword({
        email: data.trim().toLowerCase(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (loginError || !login.session) {
        return res.status(401).json({ error: "Incorrect Username and/or password." });
      }

      return res.json({
        access_token: login.session.access_token,
        refresh_token: login.session.refresh_token,
      });
    } catch {
      logger.error("[auth] username login failed");
      return res.status(503).json({ error: "Could not sign in. Try again later." });
    }
  },
);
