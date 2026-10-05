import { useEffect, useState } from "react";
import type { WildwoodRoomView } from "@shared/battle/wildwoodTypes";
import {
  addInventoryItem,
  getInventoryItems,
  type InventoryItemDefinition,
} from "@/components/inventory/inventory";
import potatoImage from "@/kith/assets/potato/potato.png";
import { KithPortrait } from "./WildwoodBattle";

// Temporary discovery fixture, matching the existing potato item_defs entry.
// Replace this adapter with server-awarded items when the item guide is ready.
const placeholderItem: InventoryItemDefinition = {
  slug: "potato",
  name: "Potato",
  type: "care",
  description: "Just a potato.",
  stackLimit: 1,
};

type ExploreResult =
  | { kind: "item"; item: InventoryItemDefinition; imageUrl?: string }
  | { kind: "encounter"; battle: NonNullable<WildwoodRoomView["battle"]> }
  | { kind: "event"; message: string };

function resultFor(room: WildwoodRoomView): ExploreResult {
  if (room.battle?.status === "active") {
    return { kind: "encounter", battle: room.battle };
  }
  if (room.battle) {
    return {
      kind: "event",
      message: room.battle.status === "victory"
        ? ""
        : "Your encounter has ended. Your Kith collection is safe.",
    };
  }
  // Placeholder only: each existing non-combat room offers one local item.
  // No encounter rolls, server rewards, or quest progression are changed.
  return { kind: "item", item: placeholderItem, imageUrl: potatoImage };
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
  const claimKey = `deltapets:wildwood-placeholder:${room.id}`;
  const [collected, setCollected] = useState(() => {
    try {
      return localStorage.getItem(claimKey) === "collected";
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState("");
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    onCollectingChange(collecting);
    return () => onCollectingChange(false);
  }, [collecting, onCollectingChange]);

  async function collect() {
    if (result.kind !== "item" || busy || collecting || collected) return;
    setCollecting(true);
    try {
      // Serialize this fixture across tabs using the same local inventory.
      await navigator.locks.request("deltapets:wildwood-placeholder", () => {
        if (localStorage.getItem(claimKey) === "collected") {
          setCollected(true);
          return;
        }
        const before = getInventoryItems().find((item) => item.slug === result.item.slug)?.qty ?? 0;
        addInventoryItem(result.item, 1);
        const after = getInventoryItems().find((item) => item.slug === result.item.slug)?.qty ?? 0;
        if (after <= before) {
          setNotice("Your inventory or this item’s stack is full. Make room and try Take again, or leave it behind.");
          return;
        }
        setCollected(true);
        setNotice("");
        localStorage.setItem(claimKey, "collected");
        onCollected(result.item.name);
      });
    } catch {
      setNotice("Could not finish saving this discovery in this browser. Check your inventory before retrying.");
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
          {result.imageUrl && <img className="ww-found-item" src={result.imageUrl} alt={result.item.name} />}
          <h3>{result.item.name}</h3>
          <p>{result.item.description}</p>
          <p className="ww-placeholder-note">Placeholder discovery · 1 item</p>
          <p role="status">{notice || (collected ? "Collected — added to your inventory." : "You found an item along the path.")}</p>
          <div className="ww-command-buttons">
            {!collected && <button className="dp-btn dp-btn--yellow" disabled={busy || collecting} onClick={() => void collect()}>Take</button>}
          </div>
          {!collected && <p className="ww-placeholder-note">Exploring again leaves this item behind.</p>}
        </>
      ) : result.kind === "encounter" ? (
        <>
          <h2>{room.corrupted ? "Corrupted Kith encounter" : "Kith encounter"}</h2>
          <div className="ww-encounter-portraits">
            {result.battle.participants.filter((pet) => pet.side === "enemy").map((pet) => (
              <div key={pet.id}>
                <span className={room.corrupted ? "ww-corrupted-portrait" : undefined}>
                  <KithPortrait name={pet.name} speciesId={pet.speciesId} imageUrl={room.images[pet.id]} enemy={room.corrupted} />
                </span>
                <h3>{pet.name}</h3>
              </div>
            ))}
          </div>
          <p>{room.message}</p>
          <button className="dp-btn dp-btn--yellow" disabled={busy} onClick={onBattle}>Continue to battle</button>
        </>
      ) : (
        <>
          {result.message && <p role="status">{result.message}</p>}
        </>
      )}
    </div>
  );
}
