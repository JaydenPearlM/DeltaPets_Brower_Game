import path from "node:path";
import dotenv from "dotenv";

/**
 * CommonJS gives us __dirname for free
 * This always resolves to backend/server/.env
 */
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[env] Missing required variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

export const env = {
  NODE_ENV: optional("NODE_ENV", "development")!,
  PORT: Number(optional("PORT", "4000")),

  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),

  // ---------------------------------------------------------------------------
  // Rate limiting / request shaping
  // ---------------------------------------------------------------------------
  RATE_LIMIT_WINDOW_MS: Number(optional("RATE_LIMIT_WINDOW_MS", "60000")),
  RATE_LIMIT_MAX: Number(optional("RATE_LIMIT_MAX", "120")),

  // "Soft" throttling (adds delay instead of hard-blocking)
  SLOW_DOWN_WINDOW_MS: Number(optional("SLOW_DOWN_WINDOW_MS", "60000")),
  SLOW_DOWN_AFTER: Number(optional("SLOW_DOWN_AFTER", "60")),
  // express-slow-down uses *milliseconds* per request after delayAfter
  SLOW_DOWN_DELAY_MS: Number(optional("SLOW_DOWN_DELAY_MS", "250")),

  // Extra strict for bot-magnet endpoints
  AUTH_RATE_LIMIT_WINDOW_MS: Number(
    optional("AUTH_RATE_LIMIT_WINDOW_MS", "60000")
  ),
  AUTH_RATE_LIMIT_MAX: Number(optional("AUTH_RATE_LIMIT_MAX", "20")),

  // ---------------------------------------------------------------------------
  // Bot protection (Cloudflare Turnstile)
  // ---------------------------------------------------------------------------
  TURNSTILE_SECRET_KEY: optional("TURNSTILE_SECRET_KEY"),
};
