import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DpPopupWindow from "@/pages/petsPage/components/DpPopupWindow";
import { getInventoryChangeEventName } from "@/components/inventory/inventory";
import type { WildwoodRoomView } from "@shared/battle/wildwoodTypes";
import { apiFetch } from "@/lib/api/baseClient";

import type { BackendInventoryItem } from "@/components/inventory/inventory";

export type WildwoodCollectedItem = Omit<BackendInventoryItem, "qty" | "updatedAt"> & {
  category?: "relic" | "etching";
};

type CollectItemResponse = {
  item: WildwoodCollectedItem;
  qty: number;
};

type ExploreResult =
  | { kind: "item" }
  | { kind: "event"; message: string };

export function itemOpportunityRemaining(room: WildwoodRoomView, now = Date.now()): number {
  if (!room.itemOpportunity) return Infinity; // Legacy untimed discovery.
  const availableAt = Date.parse(room.itemOpportunity.availableAt);
  const expiresAt = Date.parse(room.itemOpportunity.expiresAt);
  if (!Number.isFinite(availableAt) || !Number.isFinite(expiresAt) ||
      expiresAt - availableAt !== 5_000 || now < availableAt) return 0;
  return Math.max(0, expiresAt - now);
}

function resultFor(room: WildwoodRoomView, enabled: boolean): ExploreResult {
  if (room.battle?.status === "active") {
    return {
      kind: "event",
      message: room.pveEnabled
        ? "Battle in progress. Choose a skill and confirm your action below the battlefield."
        : "An unfinished legacy battle is saved. Exploration awaits encounter recovery.",
    };
  }

  if (room.battle) {
    return {
      kind: "event",
      message:
        room.battle.status === "victory"
          ? "Kith retreats deeper into Wildwood. The path is clear again."
          : "Your encounter has ended. Your Kith collection is safe.",
    };
  }

  if (enabled && room.eventKind === "flavor") return { kind: "item" };

  return {
    kind: "event",
    message: room.message || "The trees rustle softly around you.",
  };
}

export default function WildwoodExploreResult({
  room,
  busy,
  step,
  onCollected,
  onCollectingChange,
  shinyTarget,
}: {
  room: WildwoodRoomView;
  busy: boolean;
  step: number;
  onCollected: (item: WildwoodCollectedItem) => void;
  onCollectingChange: (collecting: boolean) => void;
  shinyTarget: HTMLElement | null;
}) {
  const [enabled, setEnabled] = useState(false);
  const result = resultFor(room, enabled);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [popupOpen, setPopupOpen] = useState(false);

  const [collectedItem, setCollectedItem] =
    useState<WildwoodCollectedItem | null>(null);

  const [notice, setNotice] = useState("");
  const [collecting, setCollecting] = useState(false);
  const isCollected = room.itemClaimed || collectedItem !== null;
  const [, refreshClock] = useState(0);
  const remaining = itemOpportunityRemaining(room);
  const eligible = result.kind === "item" && step > 0 && !room.corrupted &&
    !room.battle && !busy && !collecting && !isCollected;
  const canCollect = eligible && remaining > 0;

  useEffect(() => {
    if (!eligible || !room.itemOpportunity) return;
    const delay = itemOpportunityRemaining(room);
    if (delay <= 0) return;
    const timer = window.setTimeout(() => refreshClock(value => value + 1), delay);
    return () => window.clearTimeout(timer);
  }, [room.id, room.itemOpportunity?.availableAt, room.itemOpportunity?.expiresAt, eligible, remaining]);

  useEffect(() => {
    mounted.current = true;
    let current = true;
    void apiFetch<{ enabled: boolean }>("/api/kithna/wildwood/discoveries/status")
      .then(data => { if (current) setEnabled(data.enabled === true); })
      .catch(() => { if (current) setNotice("Discoveries are temporarily unavailable."); });
    return () => { current = false; mounted.current = false; };
  }, []);

  useEffect(() => {
    onCollectingChange(collecting);

    return () => {
      onCollectingChange(false);
    };
  }, [collecting, onCollectingChange]);

  async function collect() {
    if (!canCollect || pending.current || itemOpportunityRemaining(room) <= 0) {
      return;
    }

    pending.current = true;
    onCollectingChange(true);
    setCollecting(true);
    setNotice("");

    try {
      const response = await apiFetch<CollectItemResponse>(
        "/api/kithna/wildwood/collect-item",
        {
          method: "POST",
          body: JSON.stringify({
            roomId: room.id,
          }),
        },
      );

      if (!response?.item?.slug || !response.item.name || typeof response.item.description !== "string" ||
          !Number.isInteger(response.qty) || response.qty < 1) {
        throw new Error("Could not confirm the reward. Reload before trying again.");
      }
      window.dispatchEvent(new Event(getInventoryChangeEventName()));
      if (!mounted.current) return;
      setCollectedItem(response.item);
      setPopupOpen(true);

      setNotice(`${response.item.name} was added to your inventory.`);

      onCollected(response.item);
    } catch (problem) {
      if (mounted.current) setNotice(
        problem instanceof Error
          ? problem.message
          : "Could not collect this Wildwood item.",
      );
    } finally {
      pending.current = false;
      if (mounted.current) setCollecting(false);
    }
  }

  return (
    <div className="ww-explore-result">
      <h2 className="ww-path-heading">Path {Math.min(100, Math.max(0, step))} / 100</h2>
      <p role="status">{result.kind === "event" ? result.message : room.message}</p>
      {result.kind === "event" && notice && <p role="status">{notice}</p>}

      {canCollect && room.itemOpportunity && shinyTarget && createPortal(
        <button type="button" className="ww-discovery-shiny" aria-label="Collect shiny discovery"
          disabled={busy || collecting} onClick={() => void collect()}>
          <span aria-hidden="true">✦</span>
        </button>, shinyTarget,
      )}

      <DpPopupWindow open={popupOpen && collectedItem !== null} onClose={() => setPopupOpen(false)}
        label="Wildwood discovery" size="compact">
        <h2>{collectedItem?.name}</h2>
        <p>{collectedItem?.description}</p>
        <p>Added to your inventory.</p>
      </DpPopupWindow>

      {result.kind === "item" ? (
        <>
          <h2>Something found</h2>

          {collectedItem ? (
            <>
              <h3>{collectedItem.name}</h3>

              <p>
                {collectedItem.description ??
                  "You found something along the Wildwood path."}
              </p>
            </>
          ) : (
            <p>Something lies tucked between the roots.</p>
          )}

          <p role="status">
            {notice ||
              (isCollected
                ? "Collected."
                : remaining <= 0
                  ? "This discovery has expired. Continue exploring."
                  : "You can take the item or continue exploring.")}
          </p>

          <div className="ww-command-buttons">
            {!isCollected && (
              <button
                className="dp-btn dp-btn--yellow"
                disabled={!canCollect}
                onClick={() => void collect()}
              >
                {collecting ? "Taking…" : "Take"}
              </button>
            )}
          </div>

          {!isCollected && <p>Exploring again leaves this discovery behind.</p>}
        </>
      ) : null}
    </div>
  );
}
