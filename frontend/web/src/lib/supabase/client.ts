// src/lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Throwing early prevents "it kinda works" broken auth states.
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env.local file.",
  );
}

if (import.meta.env.DEV) {
  console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);
  console.log("VITE_SUPABASE_URL =", supabaseUrl);
  console.log("VITE_SUPABASE_ANON_KEY present =", !!supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
