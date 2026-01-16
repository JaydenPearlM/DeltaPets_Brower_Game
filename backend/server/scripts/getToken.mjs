import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

console.log("[getToken] running file:", import.meta.url);

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[getToken] Missing env var: ${name}`);
  return v;
}

console.log("[getToken] starting...");

const SUPABASE_URL = must("SUPABASE_URL");
const SUPABASE_ANON_KEY = must("SUPABASE_ANON_KEY");
const TEST_EMAIL = must("TEST_EMAIL");
const TEST_PASSWORD = must("TEST_PASSWORD");

console.log("[getToken] env check:", {
  hasSUPABASE_URL: !!SUPABASE_URL,
  hasSUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY,
  hasTEST_EMAIL: !!TEST_EMAIL,
  hasTEST_PASSWORD: !!TEST_PASSWORD,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

(async () => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (error) {
      console.error("[getToken] Login failed:", error);
      const t = setTimeout(() => process.exit(1), 50);
      t.unref();
      return;
    }

    const token = data?.session?.access_token;
    if (!token) {
      console.error("[getToken] No access token returned");
      const t = setTimeout(() => process.exit(1), 50);
      t.unref();
      return;
    }

    console.log("[getToken] ACCESS TOKEN (redacted):");
    console.log(token.slice(0, 30) + "...");

    const t = setTimeout(() => process.exit(0), 50);
    t.unref();
  } catch (e) {
    console.error("[getToken] Unexpected error:", e);
    const t = setTimeout(() => process.exit(1), 50);
    t.unref();
  }
})();
