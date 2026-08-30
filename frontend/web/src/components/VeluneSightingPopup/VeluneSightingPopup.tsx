import type { VeluneEncounterResult } from "../../lib/kithna/useVeluneEncounter";
import "./VeluneSightingPopup.css";

type Props = {
  result: VeluneEncounterResult | null;
  onDismiss: () => void;
};

export function VeluneSightingPopup({ result, onDismiss }: Props) {
  if (!result?.sighted || !result.message) return null;

  return (
    <div
      className="dpPopupWindowBackdrop veluneSightingBackdrop"
      role="presentation"
      onMouseDown={onDismiss}
    >
      <section
        className="dpPopupWindow dpPopupWindow--compact veluneSightingWindow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="velune-sighting-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dpPopupWindowContent veluneSightingContent">
          <h2 id="velune-sighting-title">Something nearby...</h2>
          <p>{result.message}</p>

          {result.egg_awarded ? (
            <p className="veluneSightingReward">
              When you look down, a strange Legendary Egg rests where there
              was nothing moments ago.
            </p>
          ) : (
            <p className="veluneSightingAfterthought">
              ...Probably your imagination.
            </p>
          )}

          <button
            type="button"
            className="dp-btn dp-btn-blue veluneSightingContinue"
            onClick={onDismiss}
          >
            Continue
          </button>
        </div>
      </section>
    </div>
  );
}
