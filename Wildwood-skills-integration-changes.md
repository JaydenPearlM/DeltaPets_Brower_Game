filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 18
old_code:
```
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import WildwoodScene from "./WildwoodScene";
import { WildwoodSkillsCatalog } from "@/components/skillChamber/skillChamber";
import "./wildwood.css";

```
new_code:
```
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import WildwoodScene from "./WildwoodScene";
import WildwoodSkillsChamber from "./WildwoodSkillsChamber";
import "./wildwood.css";

```
description: Wildwood-only original Chamber integration and responsive container sizing.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
linenumber: 447
old_code:
```

              <div className="ww-middle-column">
                <WildwoodSkillsCatalog
                  key={chamberPet?.id ?? "no-kith"}
                  pet={chamberPet ? {
                    id: chamberPet.id, name: chamberPet.name,
                    species: chamberPet.speciesId, level: chamberPet.level,
                    element: chamberPet.element,
                  } : null}
                />
                <section
```
new_code:
```

              <div className="ww-middle-column">
                <WildwoodSkillsChamber
                  key={chamberPet?.id ?? "no-kith"}
                  petId={chamberPet?.id}
                  refreshSignal={room?.sequence ?? 0}
                />
                <section
```
description: Wildwood-only original Chamber integration and responsive container sizing.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 38
old_code:
```
.ww-exploration-layout {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(210px, 1.3fr) minmax(0, 3fr);
  align-items: start;
  gap: 16px;
```
new_code:
```
.ww-exploration-layout {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(520px, 2.6fr) minmax(0, 1.6fr);
  align-items: start;
  gap: 16px;
```
description: Wildwood-only original Chamber integration and responsive container sizing.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
linenumber: 894
old_code:
```

.ww-middle-column { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ww-middle-column .skillsPanel--compact { padding: 16px; margin: 0; min-width: 0; border-radius: 8px; border-width: 1px; }
.ww-middle-column .skillsPanel--compact::before { inset: 4px; border-radius: 5px; }
.ww-middle-column .skillsTitle { transform: none; white-space: normal; font-size: 1rem; line-height: 1.3; }
```
new_code:
```

.ww-middle-column { display: flex; flex-direction: column; gap: 5px; min-width: 0; }

.ww-skills-notice {
  padding: 16px;
  border: 1px solid var(--dp-panel-border);
  border-radius: 8px;
  background: #031426;
  overflow-wrap: anywhere;
}
.ww-middle-column > .skillsPanel {
  margin: 0;
  flex: 0 0 auto;
}
```
description: Wildwood-only original Chamber integration and responsive container sizing.

filename: frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodSkillsChamber.tsx
linenumber: 1
old_code: (new file)
new_code:
```tsx
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

```
description: Reuse the existing owned-pet loader, validate actual stage, and mount the unchanged shared Chamber.