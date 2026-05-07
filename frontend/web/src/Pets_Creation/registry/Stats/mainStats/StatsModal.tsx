// frontend/web/src/Pets_Creation/registry/Stats/mainStats/StatsModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { titleCase } from "@/lib/petUtils";
import "./stats.css";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Match your database columns (pet_elements has null_element)
 */
export type ElementalLine =
  | "null_element"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

/**
 * UI stats keys (what this modal displays/edits)
 */
export type PetStats = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
};

type FullStats = PetStats;

const STAT_KEYS: Array<keyof FullStats> = [
  "hp",
  "atk",
  "magi",
  "def",
  "spd",
  "mana",
];

/**
 * DB/API-friendly stat shape:
 * Your responses/rows might include extra keys (mana, base_total, pet_id, base_hp, etc.)
 * We only care about the 6 UI keys.
 */
type StatsLike =
  | Partial<PetStats>
  | {
      hp?: number;
      atk?: number;
      magi?: number;
      def?: number;
      spd?: number;
      mana?: number;
      [k: string]: unknown;
    }
  | null
  | undefined;

/**
 * DB row shape for pet_elements (from your schema)
 */
type ElementsRowLike =
  | Partial<Record<ElementalLine, number>>
  | {
      null_element?: number;
      water?: number;
      fire?: number;
      earth?: number;
      air?: number;
      ice?: number;
      storm?: number;
      light?: number;
      shadow?: number;
      [k: string]: unknown;
    }
  | null
  | undefined;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function prettyStatKey(k: keyof FullStats) {
  if (k === "hp") return "HP";
  if (k === "atk") return "ATK";
  if (k === "magi") return "MAGI";
  if (k === "def") return "DEF";
  if (k === "mana") return "MANA";
  return "SPD";
}

function normalizeStats(stats: StatsLike): FullStats {
  return {
    hp: Number((stats as any)?.hp ?? 0),
    atk: Number((stats as any)?.atk ?? 0),
    magi: Number((stats as any)?.magi ?? 0),
    def: Number((stats as any)?.def ?? 0),
    spd: Number((stats as any)?.spd ?? 0),
    mana: Number((stats as any)?.mana ?? 0),
  };
}

function getElementValue(elements: ElementsRowLike, el: ElementalLine) {
  const v = (elements as any)?.[el];
  return Number(v ?? 0);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StatsModal(props: {
  open: boolean;
  onClose: () => void;

  /** Shows in title */
  petName?: string | null;

  /**
   * Pass DB/API stats directly:
   * - ActivePetResponse.stats (if it has hp/atk/magi/def/spd)
   * - or your UI PetStats
   */
  stats?: StatsLike;

  /** Pet level (enables level 1 allocator UI when paired with level1) */
  level?: number;

  /**
   * Pass DB/API elements directly:
   * - ActivePetResponse.elements (pet_elements row)
   * - or Partial<Record<ElementalLine, number>>
   */
  elements?: ElementsRowLike;

  /**
   * Level 1 allocation rules.
   * If level === 1 and level1 is provided, the modal becomes an editor.
   */
  level1?: {
    totalPoints: number;
    capPerStat: number;
    unspentPoints: number;
    onSave: (next: { stats: FullStats; spentPoints: number }) => void;
  };
}) {
  const { open, onClose, petName, stats, level, elements, level1 } = props;

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

  const spentHereRef = useRef(0);
  useEffect(() => {
    spentHereRef.current = spentHere;
  }, [spentHere]);

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
    "null_element",
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
        const r = Math.max(0, level1.unspentPoints - spentHereRef.current);
        if (r <= 0) return prev;
        if (cur >= level1.capPerStat) return prev;

        next[key] = cur + 1;
        setSpentHere((s) => s + 1);
        return next;
      }

      if (spentHereRef.current <= 0) return prev;
      if (cur <= 0) return prev;

      next[key] = cur - 1;
      setSpentHere((s) => Math.max(0, s - 1));
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
            <h2 className="statsModal__title">{nameForTitle} Stats</h2>
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
                  {/* titleCase from petUtils correctly renders null_element → Null Element */}
                  <div className="elementCell__label">{titleCase(el)}</div>
                  <div className="elementCell__value">
                    {getElementValue(elements, el)}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

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
