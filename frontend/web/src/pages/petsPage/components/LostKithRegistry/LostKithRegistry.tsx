import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/baseClient";
import DpPopupWindow from "@/pages/petsPage/components/DpPopupWindow";
import "./LostKithRegistry.css";

type LostKithEntry = {
  pet_id: string;
  name: string | null;
  species: string | null;
  line: string | null;
  level: number | null;
  bond: number | null;
  stage: string | null;
  runaway_at: string;
  expires_at: string;
  hours_remaining: number;
  dots_cost: number;
  crystals_cost: number;
};

type LostKithRegistryProps = {
  open: boolean;
  onClose: () => void;
  onRecovered: () => void;
};

function getRemainingMs(expiresAt: string, now: number): number {
  const expiresMs = Date.parse(expiresAt);
  return Number.isFinite(expiresMs) ? Math.max(0, expiresMs - now) : 0;
}

function formatRemainingTime(remainingMs: number): string {
  if (remainingMs <= 0) return "Recovery expired";

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m left to recover`;
}

export default function LostKithRegistry({
  open,
  onClose,
  onRecovered,
}: LostKithRegistryProps) {
  const [entries, setEntries] = useState<LostKithEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ entries: LostKithEntry[] }>(
        "/api/kithna/lost-registry",
      );
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load the Lost Kith Registry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const [now, setNow] = useState(() => Date.now());
  const refreshedExpiredIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;

    refreshedExpiredIds.current.clear();
    setNow(Date.now());
    void loadEntries();

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [open, loadEntries]);

  useEffect(() => {
    if (!open || loading) return;

    const newlyExpired = entries.filter(
      (entry) =>
        getRemainingMs(entry.expires_at, now) === 0 &&
        !refreshedExpiredIds.current.has(entry.pet_id),
    );

    if (newlyExpired.length === 0) return;

    for (const entry of newlyExpired) {
      refreshedExpiredIds.current.add(entry.pet_id);
    }

    void loadEntries();
  }, [open, loading, entries, now, loadEntries]);

  async function recover(petId: string, currency: "dots" | "crystals") {
    setRecoveringId(petId);
    setError(null);

    try {
      await apiFetch("/api/kithna/lost-registry/recover", {
        method: "POST",
        json: { petId, currency },
      });

      setEntries((prev) => prev.filter((entry) => entry.pet_id !== petId));
      onRecovered();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not recover that Delta.",
      );
    } finally {
      setRecoveringId(null);
    }
  }

  return (
    <DpPopupWindow
      open={open}
      onClose={onClose}
      label="Lost Kith Registry"
      size="large"
      className="lostKithRegistryWindow"
    >
      <div className="lostKithRegistryHeader">
        <h2>Lost Kith Registry</h2>
        <p>
          Deltas that have run away stay recoverable here for 48 hours before
          they're gone for good.
        </p>
      </div>

      {error ? <p className="lostKithRegistryError">{error}</p> : null}

      {loading ? (
        <p className="lostKithRegistryEmpty">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="lostKithRegistryEmpty">
          No runaway Deltas waiting for recovery right now.
        </p>
      ) : (
        <ul className="lostKithRegistryList">
          {entries.map((entry) => {
            const remainingMs = getRemainingMs(entry.expires_at, now);
            const expired = remainingMs === 0;

            return (
              <li key={entry.pet_id} className="lostKithRegistryEntry">
                <div className="lostKithRegistryEntryInfo">
                  <strong>{entry.name || "Unnamed Delta"}</strong>
                  <span className="lostKithRegistryMeta">
                    Level {entry.level ?? 1} · Bond {entry.bond ?? 0}
                  </span>
                  <span className="lostKithRegistryMeta">
                    {formatRemainingTime(remainingMs)}
                  </span>
                </div>

                <div className="lostKithRegistryActions">
                  <button
                    type="button"
                    disabled={expired || recoveringId !== null}
                    onClick={() => recover(entry.pet_id, "dots")}
                  >
                    {recoveringId === entry.pet_id
                      ? "Recovering..."
                      : `${entry.dots_cost} Dots`}
                  </button>
                  <button
                    type="button"
                    className="lostKithRegistryCrystalButton"
                    disabled={expired || recoveringId !== null}
                    onClick={() => recover(entry.pet_id, "crystals")}
                  >
                    {recoveringId === entry.pet_id
                      ? "Recovering..."
                      : `${entry.crystals_cost} Crystals`}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DpPopupWindow>
  );
}
