import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/baseClient";
import SkillsChamber, { type CombatCommands } from "@/components/skillChamber/skillChamber";
import { usePetStorage } from "@/components/Hatchery/pages/storage/usePetStorage";
import { useAuth } from "@/app/providers/useAuth";
import type { BattleMp } from "@shared/battle/mana";

const knownStages = new Set([
  "hatchling", "lowform", "highform", "legion",
  "mythic_legendary", "mythical_legendary",
]);

export default function WildwoodSkillsChamber({ petId, refreshSignal, battleMp, battleHp, combat }: {
  combat?: CombatCommands;
  battleMp?: BattleMp;
  battleHp?: { hpCur: number; hpMax: number };
  petId?: string;
  refreshSignal: number;
}) {
  const { user } = useAuth();
  const { allPets, loading, error, reload } = usePetStorage({
    userId: user?.id,
    refreshSignal,
  });
  const pet = allPets.find((entry) => entry.id === petId && entry.user_id === user?.id);
  const validStage = pet?.stage && knownStages.has(pet.stage);
  const [trait, setTrait] = useState<{ key: string; effects: Record<string, unknown> } | null>(null);
  const [traitError, setTraitError] = useState(false);
  const traitKey = `${user?.id}:${petId}:${refreshSignal}`;
  useEffect(() => {
    let cancelled = false;
    setTraitError(false);
    if (!user || !petId) return;
    void (async () => {
      // Reuse the same server-hydrated passive metadata as /pet, matched by ID.
      const response = await apiFetch<{
        pet?: { id: string; passive_trait_id?: string | null; passive_trait_key?: string | null;
          passive_trait_effects?: unknown } | null;
        team?: { id: string; passive_trait_id?: string | null; passive_trait_key?: string | null;
          passive_trait_effects?: unknown }[];
      }>("/api/care/current");
      const source = response.pet?.id === petId ? response.pet
        : response.team?.find(entry => entry.id === petId);
      if (!source) throw new Error("Selected Kith metadata unavailable");
      const raw = source.passive_trait_effects;
      let effects: Record<string, unknown> = {};
      if (raw !== undefined && raw !== null) {
        if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid passive effects");
        effects = Object.fromEntries(Object.entries(raw));
      } else if (source.passive_trait_id || source.passive_trait_key) {
        throw new Error("Assigned passive effects unavailable");
      }
      if (!cancelled) setTrait({ key: traitKey, effects });
    })().catch(() => { if (!cancelled) setTraitError(true); });
    return () => { cancelled = true; };
  }, [user?.id, petId, refreshSignal, traitKey]);


  if (!user || loading || error || !pet || !validStage) {
    return (
      <section className="ww-skills-notice" aria-label="Skills Chamber" aria-busy={loading}>
        <h2>Skills Chamber</h2>
        <p role={error ? "alert" : "status"}>
          {!petId ? "No active Kith available."
            : !user || loading ? "Loading Kith skills…"
              : error ? "Could not load this Kith's skill information."
                : "This Kith's evolution stage is unavailable. Skills Chamber cannot be displayed yet."}
        </p>
        {user && petId && !loading && (
          <button className="dp-btn dp-btn--blue" onClick={() => void reload()}>Retry</button>
        )}
      </section>
    );
  }

  const traitReady = trait?.key === traitKey && !traitError;
  return <SkillsChamber key={pet.id}
    combat={combat}
    battleHp={battleHp}
    battleMp={battleMp}
    pet={{ ...pet, passive_trait_effects: traitReady ? trait.effects : undefined }} stats={pet}
    manaStatus={traitReady ? "ready" : traitError ? "unavailable" : "loading"} />;
}
