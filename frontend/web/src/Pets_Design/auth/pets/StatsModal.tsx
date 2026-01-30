// frontend/web/src/Pets_Design/auth/pets/StatsModal.tsx
import { useEffect, useMemo, useState } from "react";
import "./Designs/stats.css";

export type ElementalLine =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

export type PetStats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  magi?: number; // optional so older pets don't crash
};

type FullStats = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
};

const STAT_KEYS: Array<keyof FullStats> = ["hp", "atk", "magi", "def", "spd"];

function prettyStatKey(k: keyof FullStats) {
  if (k === "hp") return "HP";
  if (k === "atk") return "ATK";
  if (k === "magi") return "MAGI";
  if (k === "def") return "DEF";
  return "SPD";
}

function titleCase(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function normalizeStats(stats: PetStats | null | undefined): FullStats {
  // ✅ No pet? No problem. Everything becomes 0.
  return {
    hp: Number(stats?.hp ?? 0),
    atk: Number(stats?.atk ?? 0),
    magi: Number(stats?.magi ?? 0),
    def: Number(stats?.def ?? 0),
    spd: Number(stats?.spd ?? 0),
  };
}

export function StatsModal(props: {
  open: boolean;
  onClose: () => void;

  /** Shows in title */
  petName?: string | null;

  /** Current stats; if missing (no pet yet), UI renders zeros */
  stats?: PetStats | null;

  /** Pet level (enables level 1 allocator UI when paired with level1) */
  level?: number;

  /** Element affinity values; missing keys render as 0 */
  elements?: Partial<Record<ElementalLine, number>> | null;

  /**
   * Level 1 allocation rules.
   * If level === 1 and level1 is provided, the modal becomes an editor.
   */
  level1?: {
    totalPoints: number; // e.g. 7
    capPerStat: number; // e.g. 10
    unspentPoints: number; // server truth
    onSave: (next: { stats: FullStats; spentPoints: number }) => void;
  };
}) {
  const { open, onClose, petName, stats, level, elements, level1 } = props;

  // Escape closes modal
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const nameForTitle = (petName?.trim() || "Your Pet").trim();

  const base = useMemo(() => normalizeStats(stats), [stats]);

  const isLevel1Editor = !!(open && level === 1 && level1);

  const [draft, setDraft] = useState<FullStats>(base);
  const [spentHere, setSpentHere] = useState(0);

  // Reset draft whenever modal opens or stats change.
  useEffect(() => {
    if (!open) return;
    setDraft(base);
    setSpentHere(0);
  }, [open, base]);

  const remaining = useMemo(() => {
    if (!isLevel1Editor || !level1) return 0;
    return Math.max(0, level1.unspentPoints - spentHere);
  }, [isLevel1Editor, level1, spentHere]);

  const elementsOrdered: Array<ElementalLine> = [
    "water",
    "fire",
    "earth",
    "air",
    "ice",
    "storm",
    "light",
    "shadow",
  ];

  if (!open) return null;

  function bumpStat(key: keyof FullStats, delta: 1 | -1) {
    if (!isLevel1Editor || !level1) return;

    setDraft((prev) => {
      const next = { ...prev };
      const cur = next[key];

      if (delta === 1) {
        if (remaining <= 0) return prev;
        if (cur >= level1.capPerStat) return prev;
        next[key] = cur + 1;
        setSpentHere((s) => s + 1);
        return next;
      }

      // delta === -1
      // Only allow undoing what was spent in THIS modal session.
      if (spentHere <= 0) return prev;
      if (cur <= 0) return prev;
      next[key] = cur - 1;
      setSpentHere((s) => s - 1);
      return next;
    });
  }

  function onSave() {
    if (!isLevel1Editor || !level1) return;
    level1.onSave({ stats: draft, spentPoints: spentHere });
  }

  return (
    <div className="statsModal__backdrop" onClick={onClose} role="presentation">
      <div
        className="statsModal__panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pet stats"
      >
        <div className="statsModal__header">
          <div className="statsModal__headerLeft">
            <h2 className="statsModal__title">{nameForTitle} — Stats</h2>
            {typeof level === "number" ? (
              <div className="statsModal__subtitle">Level {level}</div>
            ) : null}
          </div>

          <button
            type="button"
            className="statsModal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLevel1Editor && level1 ? (
          <div className="statsModal__notice">
            <div>
              <strong>Unspent Points:</strong> {remaining} /{" "}
              {level1.totalPoints}
            </div>
            <div className="statsModal__muted">
              Level 1 caps: max {level1.capPerStat} per stat
            </div>
          </div>
        ) : null}

        <div className="statsModal__body">
          <div className="statsModal__grid">
            {STAT_KEYS.map((k) => (
              <Stat
                key={k}
                label={prettyStatKey(k)}
                value={draft[k]}
                editable={isLevel1Editor}
                onDec={() => bumpStat(k, -1)}
                onInc={() => bumpStat(k, 1)}
                incDisabled={
                  !isLevel1Editor ||
                  !level1 ||
                  remaining <= 0 ||
                  draft[k] >= level1.capPerStat
                }
                decDisabled={!isLevel1Editor || spentHere <= 0 || draft[k] <= 0}
              />
            ))}
          </div>

          <div className="statsModal__section">
            <div className="statsModal__sectionTitle">Elements</div>
            <div className="statsModal__elements">
              {elementsOrdered.map((el) => (
                <div key={el} className="elementCell">
                  <div className="elementCell__label">{titleCase(el)}</div>
                  <div className="elementCell__value">
                    {elements?.[el] ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isLevel1Editor && level1 ? (
          <div className="statsModal__footer">
            <button
              type="button"
              className="statsModal__btn"
              onClick={onSave}
              disabled={spentHere <= 0}
              title={spentHere <= 0 ? "Spend points first" : "Save changes"}
            >
              Save
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat(props: {
  label: string;
  value: number;
  editable: boolean;
  onInc: () => void;
  onDec: () => void;
  incDisabled: boolean;
  decDisabled: boolean;
}) {
  return (
    <div className="statCell">
      <div className="statCell__top">
        <div className="statCell__label">{props.label}</div>

        {props.editable ? (
          <div className="statCell__controls">
            <button
              type="button"
              className="statBtn"
              onClick={props.onDec}
              disabled={props.decDisabled}
              aria-label={`Decrease ${props.label}`}
            >
              −
            </button>
            <button
              type="button"
              className="statBtn"
              onClick={props.onInc}
              disabled={props.incDisabled}
              aria-label={`Increase ${props.label}`}
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      <div className="statCell__value">{props.value}</div>
    </div>
  );
}
