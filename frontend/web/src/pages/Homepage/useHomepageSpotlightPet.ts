import { useEffect, useMemo, useState } from "react";

export type HomepageSpotlightPet = {
  id: string;
  username: string;
  species: string;
  nickname: string | null;
  level: number;
  element: string;
  stage: string;
  personality: string;
  passiveTrait: string | null;
  mutation: string | null;
  description: string | null;
  growthStrongStats: Array<"hp" | "atk" | "def" | "spd" | "magi" | "mana">;
  growthWeakStat: "hp" | "atk" | "def" | "spd" | "magi" | "mana" | null;
  previewUrl: string | null;
  stats: {
    hpCur: number;
    hpMax: number;
    atk: number;
    def: number;
    spd: number;
    magi: number;
    mana: number;
  };
};

type SpotlightResponse = {
  pet?: HomepageSpotlightPet | null;
};

function getDisplayName(species: string, nickname: string | null) {
  return nickname?.trim() || species;
}

export function useHomepageSpotlightPet() {
  const [pet, setPet] = useState<HomepageSpotlightPet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    void fetch("/api/care/spotlight")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load spotlight pet.");
        }

        return (await response.json()) as SpotlightResponse;
      })
      .then((result) => {
        if (cancelled) return;

        setPet(result.pet ?? null);
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
  }, []);

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
