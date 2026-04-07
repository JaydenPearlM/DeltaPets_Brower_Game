import React from "react";
import { useNavigate } from "react-router-dom";

export function PetTempNavButtons({
  onOpenStats,
  onOpenAwards,
}: {
  onOpenStats: () => void;
  onOpenAwards: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/secretHaven")}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          fontWeight: 700,
          border: "2px dashed #4caf50",
          background: "rgba(0,0,0,0.75)",
          color: "white",
          cursor: "pointer",
        }}
        aria-label="Go to Pet Secret Haven (TEMP)"
      >
        🏠 Pet Secret Haven (TEMP)
      </button>

      <button
        type="button"
        onClick={() => navigate("/gym")}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          fontWeight: 700,
          border: "2px dashed #ff9800",
          background: "rgba(0,0,0,0.75)",
          color: "white",
          cursor: "pointer",
        }}
        aria-label="Go to Gym (TEMP)"
      >
        🏋️ Gym (TEMP)
      </button>

      <button
        type="button"
        onClick={onOpenAwards}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          fontWeight: 700,
          border: "2px dashed #7c4dff",
          background: "rgba(0,0,0,0.75)",
          color: "white",
          cursor: "pointer",
        }}
        aria-label="Open Ribbons & Trophies (TEMP)"
      >
        🏅 Ribbons (TEMP)
      </button>

      <button
        type="button"
        className="openStatsBtn"
        onClick={onOpenStats}
        aria-label="Open Pet Stats (TEMP)"
      >
        📊 Open Stats (TEMP)
      </button>

      <button
        type="button"
        onClick={() => navigate("/create")}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          fontWeight: 700,
          border: "2px solid #ff3b3b",
          background: "rgba(0,0,0,0.75)",
          color: "white",
          cursor: "pointer",
        }}
        aria-label="Replay Cutscene (TEMP)"
      >
        ▶ Replay Cutscene (TEMP)
      </button>
    </div>
  );
}
