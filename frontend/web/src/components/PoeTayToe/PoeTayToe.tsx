import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api/baseClient";
import { useGame } from "../../app/providers/GameProvider";
import DpPopupWindow from "../../pages/petsPage/components/DpPopupWindow";
import potatoImage from "@/kith/assets/potato/potato.png";
import "./PoeTayToe.css";

// Exact routes only: never render over combat, forms, auth or cutscenes.
export const POTATO_ROUTES: Record<string, string> = {
  "/": "home", "/home": "home", "/profile": "profile", "/pet": "pet",
  "/hatchery": "hatchery", "/cities/kithna": "hatchery-back",
  "/kithna/food": "food-merchant", "/kithna/thriftstore": "thrift-merchant",
};
type Effect = { key: string; dots: number; expiresAt: string | null };
type Discovery = { discoveryId: string; effect: Effect };
type Status = {
  locationKey: string; version: string; available: boolean; canFind: boolean;
  awaitingHide: boolean; cooldownEndsAt: string | null; findCount: number;
  discoveryId: string | null; effect: Effect | null;
  locations: { key: string; label: string }[];
};
const PENDING_EFFECTS = new Set(["potato_power", "potato_brain", "rotten_luck"]);
const EFFECT_TEXT: Record<string, string> = {
  potato_power: "Potato Power: battle XP boost pending. No battle reward change is active.",
  warm_potato: "Warm Potato: +10% egg incubation speed for 30 minutes.",
  lucky_spud: "Lucky Spud: +100 Dots!",
  potato_brain: "Potato Brain: battle XP reduction pending. No battle reward change is active.",
  rotten_luck: "Rotten Luck: battle Dots reduction pending. No battle reward change is active.",
  absolutely_nothing: "Absolutely Nothing. He considers this a generous contribution.",
};

export default function PoeTayToe({ locationKey }: { locationKey: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seen = useRef<string | null>(null);
  const sequence = useRef(0);
  const inFlight = useRef(false);
  const { bumpRefreshKey } = useGame();

  const loadStatus = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const next = await apiFetch<Status>("/api/poe-tay-toe");
      if (request !== sequence.current) return;
      setStatus(next);
      // Recover a committed discovery even if its original response was lost.
      if (next.awaitingHide && next.discoveryId && next.effect && seen.current !== next.discoveryId) {
        seen.current = next.discoveryId;
        setDiscovery({ discoveryId: next.discoveryId, effect: next.effect });
        setOpen(true);
      }
    } catch {
      if (request === sequence.current) setStatus(null);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden && !inFlight.current) void loadStatus();
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      ++sequence.current;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [locationKey, loadStatus]);

  async function handleFind() {
    if (!status || inFlight.current) return;
    inFlight.current = true;
    ++sequence.current;
    setBusy(true);
    setError("");
    setSelectedLocation("");
    setDiscovery(null);
    try {
      const result = await apiFetch<Discovery>("/api/poe-tay-toe/find", {
        method: "POST", json: { locationKey, version: status.version },
      });
      seen.current = result.discoveryId;
      setDiscovery(result);
      setOpen(true);
      bumpRefreshKey();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to confirm your discovery. Please refresh.");
      setOpen(true);
    } finally {
      await loadStatus();
      setBusy(false);
      inFlight.current = false;
    }
  }

  async function handleHide() {
    if (!selectedLocation || !discovery || inFlight.current) return;
    inFlight.current = true;
    ++sequence.current;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/poe-tay-toe/hide", {
        method: "POST", json: { locationKey: selectedLocation, discoveryId: discovery.discoveryId },
      });
      setOpen(false);
      setDiscovery(null);
      setSelectedLocation("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to move Poe Tay Toe. Your reward is saved.");
    } finally {
      await loadStatus();
      setBusy(false);
      inFlight.current = false;
    }
  }

  const canMove = status?.awaitingHide && status.discoveryId === discovery?.discoveryId;
  const showPotato = status?.locationKey === locationKey && status.available && status.canFind;
  return <>
    {showPotato && <div className="poeTayToeSlot">
      <button type="button" className="poeTayToe" aria-label="Poe Tay Toe"
        title="...is that a potato?" onClick={handleFind} disabled={busy}>
        <img src={potatoImage} alt="" aria-hidden="true" />
      </button>
    </div>}
    <DpPopupWindow open={open} onClose={() => setOpen(false)} label="Poe Tay Toe" className="poeTayToePopup dp-blue-grid-panel">
      <h2>{discovery ? "POE TAY TOE FOUND!" : "POE TAY TOE"}</h2>
      <div className="poeTayToeFoundIcon" aria-hidden="true">🥔</div>
      {discovery && <>
        <p className="poeTayToeFlavor">He appears mildly inconvenienced.</p>
        <p className="poeTayToeReward">{EFFECT_TEXT[discovery.effect.key] ?? "Your discovery is saved."}</p>
        {discovery.effect.expiresAt && !PENDING_EFFECTS.has(discovery.effect.key) && <p>Effect ends: {new Date(discovery.effect.expiresAt).toLocaleTimeString()}.</p>}
        <p>Your next discovery is available after two hours.</p>
      </>}
      {canMove ? <>
        <h3>Choose his next questionable hiding place.</h3>
        <p>He has already moved somewhere safe. You can leave him there.</p>
        <div className="poeTayToeChoices">
          {status.locations.filter(spot => spot.key !== status.locationKey).map(spot => <label key={spot.key}>
            <input type="radio" name="poe-tay-toe-location" value={spot.key}
              checked={selectedLocation === spot.key} onChange={() => setSelectedLocation(spot.key)} disabled={busy} />
            <span>{spot.label}</span>
          </label>)}
        </div>
        <button type="button" className="poeTayToeHideButton btn btn-gold" onClick={handleHide}
          disabled={!selectedLocation || busy || selectedLocation === status.locationKey}>
          {busy ? "Relocating..." : "Hide Poe Tay Toe"}
        </button>
      </> : discovery && <p>Poe Tay Toe is on his way. Your discovery reward is saved.</p>}
      {error && <p className="poeTayToeError" role="alert">{error}</p>}
      <button type="button" className="poeTayToeHideButton btn" onClick={() => setOpen(false)}>Close</button>
    </DpPopupWindow>
  </>;
}
