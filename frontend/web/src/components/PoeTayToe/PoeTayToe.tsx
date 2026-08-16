import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api/baseClient";
import potatoImage from "@/kith/assets/potato/potato.png";
import "./PoeTayToe.css";

type PoeTayToeStatus = {
  locationKey: string;
  available: boolean;
  canFind: boolean;
  awaitingHide: boolean;
  cooldownEndsAt: string | null;
  findCount: number;
};

type PoeTayToeReward = {
  dots: number;
  itemSlug: string;
  itemName: string;
  itemQty: number;
};

type FindResponse = {
  found: true;
  reward: PoeTayToeReward;
};

type HideResponse = {
  hidden: true;
  locationKey: string;
};

type PoeTayToeProps = {
  locationKey: string;
};

const HIDING_SPOTS = [
  { key: "hatchery-back", label: "Behind the Hatchery" },
  { key: "profile", label: "Somewhere on the Profile" },
  { key: "pet", label: "Somewhere with your Kith" },
  { key: "food-merchant", label: "Inside the Food Merchant" },
] as const;

export default function PoeTayToe({ locationKey }: PoeTayToeProps) {
  const [status, setStatus] = useState<PoeTayToeStatus | null>(null);
  const [reward, setReward] = useState<PoeTayToeReward | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    try {
      const nextStatus = await apiFetch<PoeTayToeStatus>("/api/poe-tay-toe");
      setStatus(nextStatus);
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleFind() {
    if (!status || busy) return;

    setBusy(true);
    setError("");

    try {
      const result = await apiFetch<FindResponse>("/api/poe-tay-toe/find", {
        method: "POST",
        json: {
          locationKey: status.locationKey,
        },
      });

      setReward(result.reward);

      setStatus({
        ...status,
        available: false,
        canFind: false,
        awaitingHide: true,
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Poe Tay Toe escaped somehow.",
      );

      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleHide() {
    if (!selectedLocation || busy) return;

    setBusy(true);
    setError("");

    try {
      await apiFetch<HideResponse>("/api/poe-tay-toe/hide", {
        method: "POST",
        json: {
          locationKey: selectedLocation,
        },
      });

      setReward(null);
      setSelectedLocation("");

      await loadStatus();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Poe Tay Toe refused to move.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const showPotato =
    status.locationKey === locationKey &&
    status.available &&
    status.canFind &&
    !reward;

  const showHidePopup = status.awaitingHide || reward;

  return (
    <>
      {showPotato ? (
        <button
          type="button"
          className={`poeTayToe poeTayToe--${locationKey}`}
          aria-label="Poe Tay Toe"
          title="...is that a potato?"
          onClick={handleFind}
          disabled={busy}
        >
          <img src={potatoImage} alt="" aria-hidden="true" />
        </button>
      ) : null}

      {showHidePopup ? (
        <div className="poeTayToeBackdrop dpPopupWindowBackdrop">
          <section
            className="poeTayToePopup dpPopupWindow dp-blue-grid-panel"
            role="dialog"
            aria-modal="true"
          >
            <h2>POE TAY TOE FOUND!</h2>

            <div className="poeTayToeFoundIcon" aria-hidden="true">
              🥔
            </div>

            <p>You found Poe Tay Toe.</p>

            <p className="poeTayToeFlavor">He appears mildly inconvenienced.</p>

            {reward ? (
              <div className="poeTayToeReward">
                <strong>+ {reward.dots} Dots</strong>

                <strong>
                  + {reward.itemQty} {reward.itemName}
                </strong>
              </div>
            ) : null}

            <h3>Choose his next questionable hiding place.</h3>

            <div className="poeTayToeChoices">
              {HIDING_SPOTS.filter(
                (spot) => spot.key !== status.locationKey,
              ).map((spot) => (
                <label key={spot.key}>
                  <input
                    type="radio"
                    name="poe-tay-toe-location"
                    value={spot.key}
                    checked={selectedLocation === spot.key}
                    onChange={() => setSelectedLocation(spot.key)}
                  />

                  <span>{spot.label}</span>
                </label>
              ))}
            </div>

            {error ? <p className="poeTayToeError">{error}</p> : null}

            <button
              type="button"
              className="poeTayToeHideButton btn btn-gold"
              onClick={handleHide}
              disabled={!selectedLocation || busy}
            >
              {busy ? "Relocating..." : "Hide Poe Tay Toe"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
