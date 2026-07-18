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
      className="roamEncounterToast"
      role="region"
      aria-label="Kithna egg encounter"
    >
      <div className="roamEncounterToast__inner">
        <div className="roamEncounterToast__header">
          <span className="roamEncounterToast__title">You Found an Egg!</span>
        </div>

        <div className="roamEncounterToast__eggName">{result.egg_name}</div>

        <div className="roamEncounterToast__copy">
          An egg is resting nearby. Take it or leave it?
        </div>

        {error && (
          <div className="roamEncounterToast__error" role="alert">
            {error}
          </div>
        )}

        <div className="roamEncounterToast__actions">
          <button
            type="button"
            className="roamEncounterToast__btnLeave"
            onClick={() => void handleDecision("leave")}
            disabled={workingAction !== null}
          >
            {workingAction === "leave" ? "Leaving..." : "Leave It"}
          </button>

          <button
            type="button"
            className="roamEncounterToast__btnTake"
            onClick={() => void handleDecision("take")}
            disabled={workingAction !== null}
          >
            {workingAction === "take" ? "Taking..." : "Take It"}
          </button>
        </div>
      </div>
    </section>
  );
}
