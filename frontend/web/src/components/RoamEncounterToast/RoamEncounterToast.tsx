import { useState } from "react";
import type { RoamEncounterResult } from "../../lib/kithna/useRoamEncounter";
import { apiFetch } from "../../lib/api/baseClient";
import { ELEMENT_EGG_NAMES, VOIDBORNE_EGG_NAME } from "@shared/pets/species";
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
    case ELEMENT_EGG_NAMES.water:
      return "roamEncounterToast__name--water";
    case ELEMENT_EGG_NAMES.fire:
      return "roamEncounterToast__name--fire";
    case ELEMENT_EGG_NAMES.earth:
      return "roamEncounterToast__name--earth";
    case ELEMENT_EGG_NAMES.air:
      return "roamEncounterToast__name--air";
    case ELEMENT_EGG_NAMES.ice:
      return "roamEncounterToast__name--ice";
    case ELEMENT_EGG_NAMES.storm:
      return "roamEncounterToast__name--storm";
    case ELEMENT_EGG_NAMES.light:
      return "roamEncounterToast__name--light";
    case ELEMENT_EGG_NAMES.shadow:
      return "roamEncounterToast__name--shadow";
    case VOIDBORNE_EGG_NAME:
      return "roamEncounterToast__name--voidborne";
    default:
      return "";
  }
}

function getEggImage(eggName?: string): string | null {
  switch (eggName) {
    case ELEMENT_EGG_NAMES.water:
      return tideEggImage;
    case ELEMENT_EGG_NAMES.fire:
      return emberEggImage;
    case ELEMENT_EGG_NAMES.earth:
      return groveEggImage;
    case ELEMENT_EGG_NAMES.air:
      return zephyrEggImage;
    case ELEMENT_EGG_NAMES.ice:
      return frostveilEggImage;
    case ELEMENT_EGG_NAMES.storm:
      return stormEggImage;
    case ELEMENT_EGG_NAMES.light:
      return dawnshardEggImage;
    case ELEMENT_EGG_NAMES.shadow:
      return eclipseEggImage;
    case VOIDBORNE_EGG_NAME:
      return voidborneEggImage;
    default:
      return null;
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
  const eggImage = getEggImage(result?.egg_name);

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

          {eggImage ? (
            <img
              className="roamEncounterToast__eggImage"
              src={eggImage}
              alt=""
              aria-hidden="true"
            />
          ) : null}

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
