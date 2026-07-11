import React, { createContext, useEffect, useMemo, useState } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/client";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;

  // Username OR Email login
  signIn: (args: {
    identifier: string;
    password: string;
    captchaToken?: string;
  }) => Promise<{ error: AuthError | Error | null }>;

  signUp: (args: {
    email: string;
    password: string;
    captchaToken?: string;
  }) => Promise<{
    error: AuthError | Error | null;
    requiresConfirmation: boolean;
  }>;

  signOut: () => Promise<{ error: AuthError | null }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return String(error ?? "");
}

function isInvalidRefreshToken(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
}

function clearStoredSupabaseSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      window.localStorage.removeItem(key);
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async (): Promise<void> => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (isInvalidRefreshToken(error)) {
          console.warn("[auth] stale refresh token cleared");

          clearStoredSupabaseSession();

          setUser(null);
          setLoading(false);
          return;
        }

        console.error(
          "[auth] session initialization failed:",
          getErrorMessage(error),
        );

        setUser(null);
        setLoading(false);
      }
    };

    void initializeSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

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

      // Username OR Email sign in
      // Supabase password auth requires email, so we resolve username -> email
      // using the backend helper route.
      signIn: async ({ identifier, password, captchaToken }) => {
        const raw = identifier.trim();

        if (!raw || !password) {
          return {
            error: new Error("Missing username/email and password."),
          };
        }

        const normalized = raw.toLowerCase();
        let emailToUse = normalized;

        // If it does not look like an email, treat it as a username
        // and resolve it through the backend.
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
              error: new Error(
                "Could not look up that username right now. Try again in a sec.",
              ),
            };
          }

          const data = (await response.json()) as {
            email?: string | null;
          };

          if (!data.email) {
            return {
              error: new Error("Incorrect Username and/or password."),
            };
          }

          emailToUse = data.email.trim().toLowerCase();
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });

        return {
          error: error ?? null,
        };
      },

      signUp: async ({ email, password, captchaToken }) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });

        if (error) {
          return {
            error,
            requiresConfirmation: false,
          };
        }

        // If session is null, Supabase requires email confirmation.
        const requiresConfirmation = data.session === null;

        return {
          error: null,
          requiresConfirmation,
        };
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();

        return {
          error: error ?? null,
        };
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
