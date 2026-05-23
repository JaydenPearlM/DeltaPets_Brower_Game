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
  }) => Promise<{ error: any | null; requiresConfirmation: boolean }>;

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
      // using the backend helper route.
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

          const response = await fetch("/api/auth/resolve-username", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username }),
          });

          if (!response.ok) {
            return {
              error: {
                message:
                  "Could not look up that username right now. Try again in a sec.",
              },
            };
          }

          const data = (await response.json()) as { email?: string | null };

          if (!data.email) {
            return {
              error: { message: "Incorrect Username and/or password." },
            };
          }

          emailToUse = data.email.trim().toLowerCase();
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });

        return { error: error ?? null };
      },

      signUp: async ({ email, password, captchaToken }) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });

        if (error) {
          return { error, requiresConfirmation: false };
        }

        // If session is null, Supabase requires email confirmation
        const requiresConfirmation = data.session === null;

        return { error: null, requiresConfirmation };
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
