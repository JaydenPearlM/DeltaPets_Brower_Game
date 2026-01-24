import type { RequestHandler } from "express";
import { env } from "../env.server";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

/**
 * Cloudflare Turnstile verification.
 *
 * This is meant for *bot-attractive* endpoints (login/register/password reset).
 * Your frontend should collect the Turnstile token, then send it here.
 */
export function requireTurnstile(opts?: {
  /** If provided, also verify the action claim. */
  action?: string;
  /** Where to read the token from. Defaults to body.turnstileToken then headers. */
  tokenField?: string;
}): RequestHandler {
  const tokenField = opts?.tokenField ?? "turnstileToken";

  return async (req, res, next) => {
    // If you didn't configure a secret, do NOT pretend you're protected.
    // - Dev: allow it (so you can keep moving)
    // - Prod: block it (because otherwise you have a false sense of security)
    if (!env.TURNSTILE_SECRET_KEY) {
      if (env.NODE_ENV !== "production") return next();
      return res.status(500).json({
        error: "Turnstile not configured",
      });
    }

    const tokenFromBody = (req.body?.[tokenField] ?? null) as string | null;
    const tokenFromHeader =
      (req.headers["x-turnstile-token"] as string | undefined) ??
      (req.headers["cf-turnstile-response"] as string | undefined) ??
      undefined;

    const token = tokenFromBody ?? tokenFromHeader ?? null;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Missing Turnstile token" });
    }

    try {
      const form = new URLSearchParams();
      form.set("secret", env.TURNSTILE_SECRET_KEY);
      form.set("response", token);
      // Optional: include the user's IP. Turnstile supports this.
      if (req.ip) form.set("remoteip", req.ip);

      const r = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        },
      );

      const data = (await r.json()) as TurnstileVerifyResponse;
      if (!data.success) {
        return res.status(403).json({
          error: "Turnstile verification failed",
          codes: data["error-codes"] ?? [],
        });
      }

      if (opts?.action && data.action && data.action !== opts.action) {
        return res.status(403).json({
          error: "Turnstile action mismatch",
          expected: opts.action,
          got: data.action,
        });
      }

      return next();
    } catch (e: any) {
      return res.status(500).json({
        error: "Turnstile verification error",
        message: e?.message ?? String(e),
      });
    }
  };
}
