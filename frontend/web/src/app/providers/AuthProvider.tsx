import React, { createContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/client";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;

  // Username OR Email login
  signIn: (args: {
    identifier: string;
    password: string;
    captchaToken?: string;
  }) => Promise<{ error: any | null }>;

  signUp: (args: {
    email: string;
    password: string;
    captchaToken?: string;
  }) => Promise<{ error: any | null }>;

  signOut: () => Promise<{ error: any | null }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("[auth] getSession failed:", error.message ?? error);
      }

      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,

      // 🔐 Username OR Email sign in
      // Supabase password auth requires email, so we resolve username -> email
      // using the `profiles` table.
      signIn: async ({ identifier, password, captchaToken }) => {
        const raw = identifier.trim();
        if (!raw || !password) {
          return { error: { message: "Missing username/email and password." } };
        }

        const normalized = raw.toLowerCase();
        let emailToUse = normalized;

        // If it doesn't look like an email, treat it as a username and resolve it.
        if (!normalized.includes("@")) {
          const username = normalized;

          const { data, error: lookupErr } = await supabase
            .from("profiles")
            .select("email")
            .eq("username", username)
            .maybeSingle();

          if (lookupErr) {
            console.error("[auth] username lookup failed", {
              error: lookupErr,
            });

            return {
              error: {
                message:
                  "Could not look up that username right now. Try again in a sec.",
              },
            };
          }

          if (!data?.email) {
            return {
              error: { message: "Incorrect Username and/or password." },
            };
          }

          emailToUse = String(data.email).trim().toLowerCase();
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });

        return { error: error ?? null };
      },

      signUp: async ({ email, password, captchaToken }) => {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });

        return { error: error ?? null };
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return { error: error ?? null };
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
