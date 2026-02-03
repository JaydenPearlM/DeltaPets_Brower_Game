import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "./useAuth";
import { api } from "../../lib/api";

export type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  is_admin: boolean;
  intro_seen?: boolean;
  created_at: string;
  updated_at: string;
};

export type PetRow = {
  id: string;
  user_id: string;

  name: string | null;
  line: string;
  stage: string;

  level: number;
  xp: number;

  hatched_at: string | null;
  hatch_ends_at: string | null;

  hunger: number;
  cleanliness: number;
  happiness: number;
  energy: number;

  atk: number;
  magi?: number;
  def: number;
  spd: number;
  hp_max: number;
  hp_cur: number;

  age: string;
  personality: string;

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
      const data = await api<{
        user: User;
        profile: ProfileRow | null;
        pet: PetRow | null;
      }>("/me");

      setProfile(data.profile ?? null);
      setPet(data.pet ?? null);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load game data");
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
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
