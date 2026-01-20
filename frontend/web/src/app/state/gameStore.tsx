import { create } from "zustand";
import { supabase } from "../../lib/supabase/client";

// --- Types (adjust fields to match your schema) ---
export type Profile = {
  id: string;
  username: string | null;
};

export type Pet = {
  id: string;
  owner_id: string;
  egg_type: string | null;
  stage: string; // "egg" | "sprout" | ...
  hatch_ready_at: string | null; // ISO timestamp
  created_at: string;
};

type GameState = {
  // auth-ish
  userId: string | null;
  profile: Profile | null;

  // game data
  pet: Pet | null;

  // status
  booted: boolean;
  loading: boolean;
  error: string | null;

  // actions
  boot: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function fetchPet(userId: string): Promise<Pet | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, owner_id, egg_type, stage, hatch_ready_at, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export const useGameStore = create<GameState>((set, get) => ({
  userId: null,
  profile: null,
  pet: null,

  booted: false,
  loading: false,
  error: null,

  clear: () =>
    set({
      userId: null,
      profile: null,
      pet: null,
      booted: true,
      loading: false,
      error: null,
    }),

  boot: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const userId = data.session?.user?.id ?? null;
      if (!userId) {
        set({
          userId: null,
          profile: null,
          pet: null,
          booted: true,
          loading: false,
        });
        return;
      }

      const [profile, pet] = await Promise.all([
        fetchProfile(userId),
        fetchPet(userId),
      ]);
      set({ userId, profile, pet, booted: true, loading: false });
    } catch (e: any) {
      set({
        error: e?.message ?? "Failed to boot",
        booted: true,
        loading: false,
      });
    }
  },

  refresh: async () => {
    const { userId } = get();
    if (!userId) return;

    set({ loading: true, error: null });
    try {
      const [profile, pet] = await Promise.all([
        fetchProfile(userId),
        fetchPet(userId),
      ]);
      set({ profile, pet, loading: false });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to refresh", loading: false });
    }
  },
}));
