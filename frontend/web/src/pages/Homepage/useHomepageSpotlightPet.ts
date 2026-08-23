import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/baseClient";

export type HomepageSpotlightPet = {
  id: string;
  species: string;
  nickname: string | null;
  level: number;
  element: string;
  stage: string;
  personality: string;
  description: string | null;
  previewUrl: string | null;
};

type CareCurrentResponse = {
  team?: Array<{
    id: string;
    species?: string | null;
    nickname?: string | null;
    level?: number | null;
    elementKey?: string | null;
    stageKey?: string | null;
    personality?: string | null;
    description?: string | null;
    previewUrl?: string | null;
  }>;
};

function getDisplayName(species: string, nickname: string | null) {
  return nickname?.trim() || species;
}

function normalizeElement(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_element$/, "");

  return normalized || "null";
}

export function useHomepageSpotlightPet(enabled = true) {
  const [pet, setPet] = useState<HomepageSpotlightPet | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setPet(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);

    void apiFetch<CareCurrentResponse>("/api/care/current")
      .then((result) => {
        if (cancelled) return;

        const team = Array.isArray(result.team) ? result.team : [];
        const selected =
          team.length > 0
            ? team[Math.floor(Math.random() * team.length)]
            : null;

        if (!selected) {
          setPet(null);
          setLoading(false);
          return;
        }

        setPet({
          id: selected.id,
          species: selected.species?.trim() || "Unknown Delta",
          nickname: selected.nickname?.trim() || null,
          level: Number(selected.level ?? 1),
          element: normalizeElement(selected.elementKey),
          stage: selected.stageKey?.trim().toLowerCase() || "unknown",
          personality: selected.personality?.trim() || "Mysterious",
          description: selected.description?.trim() || null,
          previewUrl: selected.previewUrl?.trim() || null,
        });

        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setPet(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const displayName = useMemo(() => {
    if (!pet) return "";

    return getDisplayName(pet.species, pet.nickname);
  }, [pet]);

  return {
    pet,
    displayName,
    loading,
  };
}
