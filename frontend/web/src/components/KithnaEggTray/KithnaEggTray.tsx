import { useEffect, useState } from "react";
import type { StoragePet } from "@/components/Hatchery/pages/storage/usePetStorage";
import "./KithnaEggTray.css";

type KithnaEggTrayProps = {
  eggs: StoragePet[];
  loading: boolean;
  workingPetId: string | null;
  error?: string;
  onSendToStorage: (petId: string) => void;
  onStartIncubating: (petId: string) => void;
};

function formatLineLabel(line: string | null | undefined) {
  if (!line) return "Unknown element";
  const cleaned = line.replace(/_/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Deliberately NOT a popup/modal. This renders inline on the homepage,
// directly under the DeltaPets banner, and stays visible instead of
// auto-dismissing like RoamEncounterToast does. Eggs sit here in
// "inventory" until the player chooses Storage or the Hatchery.
export function KithnaEggTray({
  eggs,
  loading,
  workingPetId,
  error,
  onSendToStorage,
  onStartIncubating,
}: KithnaEggTrayProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (eggs.length > 0) setDismissed(false);
  }, [eggs.length]);

  if (loading || eggs.length === 0 || dismissed) {
    return null;
  }

  return (
    <section className="kithnaEggTray" aria-label="Kithna eggs">
      <div className="kithnaEggTrayHeader">
        <div>
          <h2>Kithna Eggs</h2>
          <p>
            Eggs found while roaming Kithna wait here. Send each one to
            Storage to hold for later, or start incubating it now.
          </p>
        </div>

        <button
          type="button"
          className="kithnaEggTrayDismiss"
          onClick={() => setDismissed(true)}
          aria-label="Hide Kithna eggs tray"
        >
          ×
        </button>
      </div>

      {error ? <p className="kithnaEggTrayError">{error}</p> : null}

      <div className="kithnaEggTrayGrid">
        {eggs.map((egg) => {
          const isWorking = workingPetId === egg.id;

          return (
            <article className="kithnaEggTrayCard" key={egg.id}>
              <p className="kithnaEggTrayName">{egg.name ?? "Kithna Egg"}</p>
              <p className="kithnaEggTrayLine">{formatLineLabel(egg.line)}</p>

              <div className="kithnaEggTrayActions">
                <button
                  type="button"
                  className="kithnaEggTrayBtn kithnaEggTrayBtn--storage"
                  disabled={isWorking}
                  onClick={() => onSendToStorage(egg.id)}
                >
                  Send to Storage
                </button>
                <button
                  type="button"
                  className="kithnaEggTrayBtn kithnaEggTrayBtn--hatch"
                  disabled={isWorking}
                  onClick={() => onStartIncubating(egg.id)}
                >
                  Start Incubating
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
