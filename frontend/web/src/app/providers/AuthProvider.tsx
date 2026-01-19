import React, { createContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/client";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;

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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
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

      signIn: async ({ identifier, password, captchaToken }) => {
        const email = identifier.trim().toLowerCase();

        if (!email.includes("@")) {
          return {
            error: { message: "Please log in using your email address." },
          };
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
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
