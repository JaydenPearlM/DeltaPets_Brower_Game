import React from "react";
import { EggBaseStatsCard } from "./eggBaseStatsCard";
import type { PetStatsRow } from "../petTypes";

export function EggSection({
  pet,
  isReady,
  prettyLeft,
  busy,
  onHatch,
}: {
  pet: any | null;
  isReady: boolean;
  prettyLeft: string;
  busy: boolean;
  onHatch: () => void;
}) {
  if (!pet) return null;

  if (pet.stage !== "egg") {
    return <p style={{ marginTop: 14, opacity: 0.85 }}>Baby is alive.</p>;
  }

  const stats = (pet?.stats ?? null) as PetStatsRow | null;

  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
      }}
    >
      <p style={{ margin: 0 }}>
        <strong>Hatch timer:</strong> {isReady ? "Ready to hatch!" : prettyLeft}
      </p>

      <div style={{ marginTop: 10 }}>
        <button type="button" disabled={!isReady || busy} onClick={onHatch}>
          {busy ? "Hatching…" : "Hatch Egg"}
        </button>
      </div>

      <EggBaseStatsCard stats={stats} />
    </div>
  );
}
