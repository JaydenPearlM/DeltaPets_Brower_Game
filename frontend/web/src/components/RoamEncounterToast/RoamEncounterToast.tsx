import { useState } from "react";
import type { RoamEncounterResult } from "../../lib/kithna/useRoamEncounter";
import { apiFetch } from "../../lib/api/baseClient";
import "./RoamEncounterToast.css";

type RoamEncounterToastProps = {
  result: RoamEncounterResult | null;
  onDismiss: () => void;
};

export function RoamEncounterToast({
  result,
  onDismiss,
}: RoamEncounterToastProps) {
  const [workingAction, setWorkingAction] = useState<"take" | "leave" | null>(
    null,
  );
  const [error, setError] = useState("");

  async function handleDecision(action: "take" | "leave") {
    setWorkingAction(action);
    setError("");

    try {
      await apiFetch<unknown>(`/api/kithna/roam/${action}`, {
        method: "POST",
      });

      onDismiss();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the egg encounter.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  if (!result?.found) return null;

  return (
    <section
      className="roamEncounterToast dp-standard-panel"
      role="region"
      aria-label="Kithna egg encounter"
    >
      <div className="roamEncounterToast__glow" />

      <div className="roamEncounterToast__body">
        <div className="roamEncounterToast__title">You found an egg!</div>
        <div className="roamEncounterToast__name">{result.egg_name}</div>

        <div className="roamEncounterToast__copy">
          A Kithna egg is resting nearby. Leave it where it is, or take it into
          your Inventory.
        </div>

        {error && (
          <div className="roamEncounterToast__error" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="roamEncounterToast__actions">
        <button
          type="button"
          className="roamEncounterToast__action dp-btn dp-btn-blue"
          onClick={() => void handleDecision("leave")}
          disabled={workingAction !== null}
        >
          {workingAction === "leave" ? "Leaving..." : "Leave It"}
        </button>

        <button
          type="button"
          className="roamEncounterToast__action dp-btn dp-btn-yellow"
          onClick={() => void handleDecision("take")}
          disabled={workingAction !== null}
        >
          {workingAction === "take" ? "Taking..." : "Take It"}
        </button>
      </div>
    </section>
  );
}
