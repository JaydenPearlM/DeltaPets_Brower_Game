import { useState } from "react";
import type { RoamEncounterResult } from "../../lib/kithna/useRoamEncounter";
import { apiFetch } from "../../lib/api/baseClient";
import tideEggImage from "../../Pets_Creation/assets/eggs/tide_egg.png";
import emberEggImage from "../../Pets_Creation/assets/eggs/ember_egg.png";
import groveEggImage from "../../Pets_Creation/assets/eggs/grove_egg.png";
import zephyrEggImage from "../../Pets_Creation/assets/eggs/zephr_egg.png";
import frostveilEggImage from "../../Pets_Creation/assets/eggs/frostviel_egg.png";
import stormEggImage from "../../Pets_Creation/assets/eggs/storm.png";
import dawnshardEggImage from "../../Pets_Creation/assets/eggs/light.png";
import eclipseEggImage from "../../Pets_Creation/assets/eggs/eclipse_egg.png";
import voidborneEggImage from "../../Pets_Creation/assets/eggs/Voidborne_egg.png";
import "./RoamEncounterToast.css";

type RoamEncounterToastProps = {
  result: RoamEncounterResult | null;
  onDismiss: () => void;
};

function getEggElementClass(eggName?: string): string {
  switch (eggName) {
    case "Tide Egg":
      return "roamEncounterToast__name--water";
    case "Ember Egg":
      return "roamEncounterToast__name--fire";
    case "Grove Egg":
      return "roamEncounterToast__name--earth";
    case "Zephyr Egg":
      return "roamEncounterToast__name--air";
    case "Frostveil Egg":
      return "roamEncounterToast__name--ice";
    case "Storm Egg":
      return "roamEncounterToast__name--storm";
    case "Dawnshard Egg":
      return "roamEncounterToast__name--light";
    case "Eclipse Egg":
      return "roamEncounterToast__name--shadow";
    default:
      return "roamEncounterToast__name--voidborne";
  }
}

function getEggImage(eggName?: string): string {
  switch (eggName) {
    case "Tide Egg":
      return tideEggImage;
    case "Ember Egg":
      return emberEggImage;
    case "Grove Egg":
      return groveEggImage;
    case "Zephyr Egg":
      return zephyrEggImage;
    case "Frostveil Egg":
      return frostveilEggImage;
    case "Storm Egg":
      return stormEggImage;
    case "Dawnshard Egg":
      return dawnshardEggImage;
    case "Eclipse Egg":
      return eclipseEggImage;
    default:
      return voidborneEggImage;
  }
}

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
      role="dialog"
      aria-modal="true"
      aria-label="Kithna egg encounter"
    >
      <div className="roamEncounterToast__inset">
        <div className="roamEncounterToast__body dp-blue-grid-panel">
          <div className="roamEncounterToast__title">You found an egg!</div>

          <img
            className="roamEncounterToast__eggImage"
            src={getEggImage(result.egg_name)}
            alt=""
            aria-hidden="true"
          />

          <div
            className={`roamEncounterToast__name ${getEggElementClass(
              result.egg_name,
            )}`}
          >
            {result.egg_name}
          </div>

          {error && (
            <div className="roamEncounterToast__error" role="alert">
              {error}
            </div>
          )}

          <div className="roamEncounterToast__actions">
            <button
              type="button"
              className="roamEncounterToast__leave dp-btn--pearl"
              onClick={() => void handleDecision("leave")}
              disabled={workingAction !== null}
            >
              {workingAction === "leave" ? "Leaving..." : "Leave It"}
            </button>

            <button
              type="button"
              className="roamEncounterToast__take dp-btn dp-btn-yellow"
              onClick={() => void handleDecision("take")}
              disabled={workingAction !== null}
            >
              {workingAction === "take" ? "Taking..." : "Take It"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
