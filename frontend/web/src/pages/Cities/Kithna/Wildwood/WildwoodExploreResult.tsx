import { useEffect, useState } from "react";
import type { WildwoodRoomView } from "@shared/battle/wildwoodTypes";
import { apiFetch } from "@/lib/api/baseClient";
import { KithPortrait } from "./WildwoodBattle";

type WildwoodCollectedItem = {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  rarity: number;
  stackLimit: number;
  effects: Record<string, unknown>;
};

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
          ? ""
          : "Your encounter has ended. Your Kith collection is safe.",
    };
  }

  return {
    kind: "item",
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
  onCollected: (name: string) => void;
  onCollectingChange: (collecting: boolean) => void;
}) {
  const result = resultFor(room);

  const [collectedItem, setCollectedItem] =
    useState<WildwoodCollectedItem | null>(null);

  const [notice, setNotice] = useState("");
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    onCollectingChange(collecting);

    return () => {
      onCollectingChange(false);
    };
  }, [collecting, onCollectingChange]);

  async function collect() {
    if (result.kind !== "item" || busy || collecting || collectedItem) {
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

      onCollected(response.item.name);
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
      <p className="ww-eyebrow">Step {step}</p>

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
            <p>Something is hidden along the Wildwood path.</p>
          )}

          <p role="status">
            {notice ||
              (collectedItem
                ? "Collected."
                : "You can take the item or continue exploring.")}
          </p>

          <div className="ww-command-buttons">
            {!collectedItem && (
              <button
                className="dp-btn dp-btn--yellow"
                disabled={busy || collecting}
                onClick={() => void collect()}
              >
                {collecting ? "Taking…" : "Take"}
              </button>
            )}
          </div>

          {!collectedItem && (
            <p>Exploring again leaves this discovery behind.</p>
          )}
        </>
      ) : result.kind === "encounter" ? (
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

          <p>{room.message}</p>

          <button
            className="dp-btn dp-btn--yellow"
            disabled={busy}
            onClick={onBattle}
          >
            Continue to battle
          </button>
        </>
      ) : (
        <>{result.message && <p role="status">{result.message}</p>}</>
      )}
    </div>
  );
}
