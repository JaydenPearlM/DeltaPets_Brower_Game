import { useEffect } from "react";
import type { RoamEncounterResult } from "../../lib/kithna/useRoamEncounter";
import "./RoamEncounterToast.css";

type RoamEncounterToastProps = {
  result: RoamEncounterResult | null;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 5000;

export function RoamEncounterToast({
  result,
  onDismiss,
}: RoamEncounterToastProps) {
  useEffect(() => {
    if (!result?.found) return;

    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [result, onDismiss]);

  if (!result?.found) return null;

  return (
    <div className="roamEncounterToast" role="status">
      <div className="roamEncounterToast__glow" />
      <div className="roamEncounterToast__body">
        <div className="roamEncounterToast__title">You found an egg!</div>
        <div className="roamEncounterToast__name">{result.egg_name}</div>
        {typeof result.xp_awarded === "number" && (
          <div className="roamEncounterToast__xp">+{result.xp_awarded} XP</div>
        )}
      </div>
      <button
        type="button"
        className="roamEncounterToast__close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
