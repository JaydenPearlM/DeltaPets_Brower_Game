import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

export type StorageStageFilter =
  | "all"
  | "egg"
  | "baby"
  | "child"
  | "adult"
  | "legion"
  | "mythical";

export type StoragePet = {
  id: string;
  user_id: string;
  name: string | null;
  stage: string | null;
  line: string | null;
  level: number | null;
  location: string | null;
  is_active: boolean | null;
  created_at: string | null;
  hatched_at: string | null;
};

type UsePetStorageOptions = {
  userId?: string;
};

function normalizeStage(stage?: string | null): StorageStageFilter {
  const raw = String(stage ?? "")
    .trim()
    .toLowerCase();

  if (raw === "egg") return "egg";
  if (raw === "baby") return "baby";
  if (raw === "toddler" || raw === "child") return "child";
  if (raw === "teen" || raw === "adult") return "adult";
  if (raw === "legion") return "legion";
  if (
    raw === "mythical" ||
    raw === "mythic_legendary" ||
    raw === "mythic" ||
    raw === "legendary"
  ) {
    return "mythical";
  }

  return "adult";
}

export function formatStageLabel(stage?: string | null) {
  const bucket = normalizeStage(stage);

  switch (bucket) {
    case "egg":
      return "Egg";
    case "baby":
      return "Baby";
    case "child":
      return "Child";
    case "adult":
      return "Adult";
    case "legion":
      return "Legion";
    case "mythical":
      return "Mythical";
    default:
      return "Unknown";
  }
}

export function formatLineLabel(line?: string | null) {
  if (!line) return "Unknown";

  const cleaned = line.replace(/_/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function usePetStorage(options: UsePetStorageOptions) {
  const { userId } = options;

  const [pets, setPets] = useState<StoragePet[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingPetId, setWorkingPetId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const loadPets = useCallback(async () => {
    if (!userId) {
      setPets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("pets")
      .select(
        "id, user_id, name, stage, line, level, location, is_active, created_at, hatched_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setPets((data ?? []) as StoragePet[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  const visiblePets = useMemo(() => {
    return pets
      .filter((pet) => pet.location === "storage" || pet.location === "active")
      .sort((a, b) => {
        const aActive = a.is_active ? 1 : 0;
        const bActive = b.is_active ? 1 : 0;

        if (aActive !== bActive) return bActive - aActive;

        const aTime = Date.parse(a.hatched_at ?? a.created_at ?? "");
        const bTime = Date.parse(b.hatched_at ?? b.created_at ?? "");

        if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
          return bTime - aTime;
        }

        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
  }, [pets]);

  const counts = useMemo(() => {
    const base = {
      all: 0,
      egg: 0,
      baby: 0,
      child: 0,
      adult: 0,
      legion: 0,
      mythical: 0,
    } satisfies Record<StorageStageFilter, number>;

    for (const pet of visiblePets) {
      base.all += 1;
      const bucket = normalizeStage(pet.stage);
      base[bucket] += 1;
    }

    return base;
  }, [visiblePets]);

  async function runPetMutation(
    petId: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    setWorkingPetId(petId);
    setError("");

    try {
      await fn();
      await loadPets();
    } catch (err: any) {
      setError(err?.message ?? "Pet storage update failed.");
    } finally {
      setWorkingPetId(null);
    }
  }

  const storePet = useCallback(
    async (petId: string) => {
      await runPetMutation(petId, async () => {
        const { error } = await supabase
          .from("pets")
          .update({
            location: "storage",
            is_active: false,
          })
          .eq("id", petId)
          .eq("user_id", userId);

        if (error) throw error;
      });
    },
    [userId],
  );

  const bringOutPet = useCallback(
    async (petId: string) => {
      await runPetMutation(petId, async () => {
        const { error } = await supabase
          .from("pets")
          .update({
            location: "active",
            is_active: false,
          })
          .eq("id", petId)
          .eq("user_id", userId);

        if (error) throw error;
      });
    },
    [userId],
  );

  const setActivePet = useCallback(
    async (petId: string) => {
      await runPetMutation(petId, async () => {
        const { error: clearError } = await supabase
          .from("pets")
          .update({ is_active: false })
          .eq("user_id", userId)
          .eq("is_active", true);

        if (clearError) throw clearError;

        const { error: activeError } = await supabase
          .from("pets")
          .update({
            location: "active",
            is_active: true,
          })
          .eq("id", petId)
          .eq("user_id", userId);

        if (activeError) throw activeError;
      });
    },
    [userId],
  );

  return {
    pets: visiblePets,
    counts,
    loading,
    error,
    workingPetId,
    reload: loadPets,
    storePet,
    bringOutPet,
    setActivePet,
    normalizeStage,
  };
}
