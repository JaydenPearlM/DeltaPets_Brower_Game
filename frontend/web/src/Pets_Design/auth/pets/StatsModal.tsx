import "./Designs/stats.css";

export function StatsModal(props: {
  open: boolean;
  onClose: () => void;
  petName: string;
  stats: { hp: number; atk: number; magi: number; def: number; spd: number };
}) {
  const { open, onClose, petName, stats } = props;

  if (!open) return null;

  return (
    <div className="statsModal__backdrop" onClick={onClose} role="presentation">
      <div
        className="statsModal__panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="statsModal__header">
          <h2 className="statsModal__title">{petName} — Stats</h2>
          <button type="button" className="statsModal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="statsModal__body">
          <div className="statsModal__grid">
            <Stat label="HP" value={stats.hp} />
            <Stat label="ATK" value={stats.atk} />
            <Stat label="Magi" value={stats.magi} />
            <Stat label="DEF" value={stats.def} />
            <Stat label="SPD" value={stats.spd} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <div className="statCell">
      <div className="statCell__label">{props.label}</div>
      <div className="statCell__value">{props.value}</div>
    </div>
  );
}
