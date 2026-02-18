// backend/server/src/env.server.ts

import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// Prefer .env in the current working directory (workspace-safe),
// fallback to backend/server/.env relative to this file.
const envByCwd = path.resolve(process.cwd(), ".env");
const envByServerRoot = path.resolve(__dirname, "../.env"); // backend/server/.env

const envPath = fs.existsSync(envByCwd) ? envByCwd : envByServerRoot;

dotenv.config({ path: envPath });

// Helpful dev log (safe: prints path, not secrets)
if (process.env.NODE_ENV !== "production") {
  console.log("[env] loaded from:", envPath);
  console.log("[env] SUPABASE_URL present =", !!process.env.SUPABASE_URL);
  console.log(
    "[env] SUPABASE_SECRET_KEY present =",
    !!process.env.SUPABASE_SECRET_KEY,
  );
}

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

  // ---------------------------------------------------------------------------
  // Supabase
  // ---------------------------------------------------------------------------
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SECRET_KEY: required("SUPABASE_SECRET_KEY"),

  // ---------------------------------------------------------------------------
  // Rate limiting / request shaping
  // ---------------------------------------------------------------------------
  RATE_LIMIT_WINDOW_MS: Number(optional("RATE_LIMIT_WINDOW_MS", "60000")),
  RATE_LIMIT_MAX: Number(optional("RATE_LIMIT_MAX", "120")),

  SLOW_DOWN_WINDOW_MS: Number(optional("SLOW_DOWN_WINDOW_MS", "60000")),
  SLOW_DOWN_AFTER: Number(optional("SLOW_DOWN_AFTER", "60")),
  SLOW_DOWN_DELAY_MS: Number(optional("SLOW_DOWN_DELAY_MS", "250")),

  AUTH_RATE_LIMIT_WINDOW_MS: Number(
    optional("AUTH_RATE_LIMIT_WINDOW_MS", "60000"),
  ),
  AUTH_RATE_LIMIT_MAX: Number(optional("AUTH_RATE_LIMIT_MAX", "20")),
};
