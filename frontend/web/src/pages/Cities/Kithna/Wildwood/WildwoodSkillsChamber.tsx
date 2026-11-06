import SkillsChamber from "@/components/skillChamber/skillChamber";
import { usePetStorage } from "@/components/Hatchery/pages/storage/usePetStorage";
import { useAuth } from "@/app/providers/useAuth";

const knownStages = new Set([
  "hatchling", "lowform", "highform", "legion",
  "mythic_legendary", "mythical_legendary",
]);

export default function WildwoodSkillsChamber({ petId, refreshSignal }: {
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

  return <SkillsChamber key={pet.id} pet={pet} stats={pet} />;
}
