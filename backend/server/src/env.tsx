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
};
