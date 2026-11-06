import { useEffect, useState } from "react";
import type { WildwoodRoomView } from "@shared/battle/wildwoodTypes";
import { apiFetch } from "@/lib/api/baseClient";
import { KithPortrait } from "./WildwoodBattle";

import type { BackendInventoryItem } from "@/components/inventory/inventory";

export type WildwoodCollectedItem = Omit<BackendInventoryItem, "qty" | "updatedAt">;

type CollectItemResponse = {
  item: WildwoodCollectedItem;
  qty: number;
};

type ExploreResult =
  | { kind: "item" }
  | {
      kind: "encounter";
      battle: NonNullable<WildwoodRoomView["battle"]>;
    }
  | { kind: "event"; message: string };

function resultFor(room: WildwoodRoomView): ExploreResult {
  if (room.battle?.status === "active") {
    return {
      kind: "encounter",
      battle: room.battle,
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

  return {
    // Item discovery is paused until the Wildwood item lineup is ready.
    kind: "event",
    message: room.message || "The trees rustle softly around you.",
  };
}

export default function WildwoodExploreResult({
  room,
  busy,
  step,
  onBattle,
  onCollected,
  onCollectingChange,
}: {
  room: WildwoodRoomView;
  busy: boolean;
  step: number;
  onBattle: () => void;
  onCollected: (item: WildwoodCollectedItem) => void;
  onCollectingChange: (collecting: boolean) => void;
}) {
  const result = resultFor(room);

  const [collectedItem, setCollectedItem] =
    useState<WildwoodCollectedItem | null>(null);

  const [notice, setNotice] = useState("");
  const [collecting, setCollecting] = useState(false);
  const isCollected = room.itemClaimed || collectedItem !== null;

  useEffect(() => {
    onCollectingChange(collecting);

    return () => {
      onCollectingChange(false);
    };
  }, [collecting, onCollectingChange]);

  async function collect() {
    if (result.kind !== "item" || busy || collecting || isCollected) {
      return;
    }

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

      setCollectedItem(response.item);

      setNotice(`${response.item.name} was added to your inventory.`);

      if (response.qty > 0) onCollected(response.item);
    } catch (problem) {
      setNotice(
        problem instanceof Error
          ? problem.message
          : "Could not collect this Wildwood item.",
      );
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div className="ww-explore-result">
      <h2 className="ww-path-heading">Path {Math.min(100, Math.max(0, step))} / 100</h2>
      <p role="status">{result.kind === "event" ? result.message : room.message}</p>

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
                : "You can take the item or continue exploring.")}
          </p>

          <div className="ww-command-buttons">
            {!isCollected && (
              <button
                className="dp-btn dp-btn--yellow"
                disabled={busy || collecting}
                onClick={() => void collect()}
              >
                {collecting ? "Taking…" : "Take"}
              </button>
            )}
          </div>

          {!isCollected && <p>Exploring again leaves this discovery behind.</p>}
        </>
      ) : result.kind === "encounter" && !room.corrupted ? (
        <>
          <h2>
            {room.corrupted ? "Corrupted Kith encounter" : "Kith encounter"}
          </h2>

          <div className="ww-encounter-portraits">
            {result.battle.participants
              .filter((pet) => pet.side === "enemy")
              .map((pet) => (
                <div key={pet.id}>
                  <span
                    className={
                      room.corrupted ? "ww-corrupted-portrait" : undefined
                    }
                  >
                    <KithPortrait
                      name={pet.name}
                      speciesId={pet.speciesId}
                      imageUrl={room.images[pet.id]}
                      enemy={room.corrupted}
                    />
                  </span>

                  <h3>{pet.name}</h3>
                </div>
              ))}
          </div>

          {!room.corrupted && (
            <button
              className="dp-btn dp-btn--yellow"
              disabled={busy}
              onClick={onBattle}
            >
              Continue to battle
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
