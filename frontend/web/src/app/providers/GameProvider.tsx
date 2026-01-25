import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Minimal types that match your migration schema:
 * - profiles: primary key user_id
 * - pets: has user_id, hatch_ends_at, etc.
 */
export type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type PetRow = {
  id: string;
  user_id: string;

  name: string | null;
  line: string; // public.elemental_line
  stage: string; // public.pet_stage

  level: number;
  xp: number;

  hatched_at: string | null;
  hatch_ends_at: string | null;

  hunger: number;
  cleanliness: number;
  happiness: number;
  energy: number;

  atk: number;
  def: number;
  spd: number;
  hp_max: number;
  hp_cur: number;

  age: string; // public.age_stage
  personality: string; // public.personality_trait

  created_at: string;
};

export type GameContextValue = {
  user: User | null;

  profile: ProfileRow | null;
  pet: PetRow | null;

  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
};

const GameContext = createContext<GameContextValue | null>(null);

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, is_admin, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function fetchPet(userId: string): Promise<PetRow | null> {
  const { data, error } = await supabase
    .from("pets")
    .select(
      [
        "id",
        "user_id",
        "name",
        "line",
        "stage",
        "level",
        "xp",
        "hatched_at",
        "hatch_ends_at",
        "hunger",
        "cleanliness",
        "happiness",
        "energy",
        "atk",
        "def",
        "spd",
        "hp_max",
        "hp_cur",
        "age",
        "personality",
        "created_at",
      ].join(", "),
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [pet, setPet] = useState<PetRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPet(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [p, pt] = await Promise.all([
        fetchProfile(user.id),
        fetchPet(user.id),
      ]);
      setProfile(p);
      setPet(pt);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load game data");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Wait for auth to finish deciding who the user is
    if (authLoading) return;

    // When user changes (login/logout), re-load game data
    refresh();
  }, [authLoading, user?.id, refresh]);

  const value = useMemo<GameContextValue>(
    () => ({
      user,
      profile,
      pet,
      loading,
      error,
      refresh,
    }),
    [user, profile, pet, loading, error, refresh],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider />");
  return ctx;
}
