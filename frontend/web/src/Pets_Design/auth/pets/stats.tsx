// stats.tsx
import { useEffect } from "react";
import "./Designs/stats.css";

export type PetStats = {
  hp: number;
  atk: number;
  def: number;
  magi: number;
  spd: number;
  // add more as you need (crit, stamina, etc.)
};

export function StatsModal(props: {
  open: boolean;
  onClose: () => void;
  petName?: string;
  stats: PetStats;
}) {
  const { open, onClose, petName = "Your Pet", stats } = props;

  // Escape closes modal
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="statsOverlay" onMouseDown={onClose}>
      <div
        className="statsPanel"
        onMouseDown={(e) => e.stopPropagation()} // prevent closing when clicking inside
        role="dialog"
        aria-modal="true"
        aria-label="Pet stats"
      >
        <div className="statsHeader">
          <div className="statsTitle">{petName} — Stats</div>
          <button className="statsCloseBtn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="statsGrid">
          <div className="statRow">
            <div className="statLabel">HP</div>
            <div className="statValue">{stats.hp}</div>
          </div>

          <div className="statRow">
            <div className="statLabel">ATK</div>
            <div className="statValue">{stats.atk}</div>
          </div>

          <div className="statRow">
            <div className="statLabel">DEF</div>
            <div className="statValue">{stats.def}</div>
          </div>

          <div className="statRow">
            <div className="statLabel">SPD</div>
            <div className="statValue">{stats.spd}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
