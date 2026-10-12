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

  for (const key of Object.keys(window.sessionStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      window.sessionStorage.removeItem(key);
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
      // Username authentication keeps the email lookup on the server.
      signIn: async ({ identifier, password, captchaToken }) => {
        const raw = identifier.trim();

        if (!raw || !password) {
          return {
            error: new Error("Missing username/email and password."),
          };
        }

        const normalized = raw.toLowerCase();

        // If it does not look like an email, treat it as a username
        // and authenticate it through the backend.
        if (!normalized.includes("@")) {
          try {
            const response = await fetch("/api/auth/login-username", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ username: normalized, password, captchaToken }),
              cache: "no-store",
            });

            if (!response.ok) {
              return {
                error: new Error(
                  response.status === 401
                    ? "Incorrect Username and/or password."
                    : "Could not sign in. Try again later.",
                ),
              };
            }

            const data: unknown = await response.json();
            if (
              typeof data !== "object" || data === null ||
              !("access_token" in data) || typeof data.access_token !== "string" || !data.access_token ||
              !("refresh_token" in data) || typeof data.refresh_token !== "string" || !data.refresh_token
            ) {
              return {
                error: new Error("Could not sign in. Try again later."),
              };
            }

            const { error } = await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });
            return { error: error ?? null };
          } catch {
            return { error: new Error("Could not sign in. Try again later.") };
          }
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: normalized,
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
          options: {
            emailRedirectTo: `${window.location.origin}/authcallback`,
            ...(captchaToken ? { captchaToken } : {}),
          },
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
