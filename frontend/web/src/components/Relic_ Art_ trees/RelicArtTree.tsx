import { createPortal } from "react-dom";
import { type RelicArtElement } from "./relicArtTrees";
import "./RelicArtTree.css";

export type RelicRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type RelicEtching = {
  id: string;
  name: string;
  rarity: RelicRarity;
  imageUrl?: string | null;
};

type RelicArtTreeProps = {
  open: boolean;
  onClose: () => void;
  relicName: string;
  relicRarity: RelicRarity;
  relicElement: RelicArtElement;
  relicImageUrl?: string | null;
  awakenedEffect?: string | null;
  etchings?: Partial<Record<string, RelicEtching>>;
  onSelectSlot?: (slotId: string) => void;
};

type TreePoint = {
  x: number;
  y: number;
};

const ETCHING_SLOT_COUNT: Record<RelicRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 6,
  legendary: 8,
};

const TREE_LAYOUTS: Record<number, TreePoint[]> = {
  1: [{ x: 50, y: 18 }],
  2: [
    { x: 50, y: 17 },
    { x: 50, y: 83 },
  ],
  4: [
    { x: 50, y: 14 },
    { x: 86, y: 50 },
    { x: 50, y: 86 },
    { x: 14, y: 50 },
  ],
  6: [
    { x: 50, y: 12 },
    { x: 82, y: 30 },
    { x: 82, y: 70 },
    { x: 50, y: 88 },
    { x: 18, y: 70 },
    { x: 18, y: 30 },
  ],
  8: [
    { x: 50, y: 10 },
    { x: 78, y: 22 },
    { x: 90, y: 50 },
    { x: 78, y: 78 },
    { x: 50, y: 90 },
    { x: 22, y: 78 },
    { x: 10, y: 50 },
    { x: 22, y: 22 },
  ],
};

function titleCaseRarity(rarity: RelicRarity) {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export default function RelicArtTree({
  open,
  onClose,
  relicName,
  relicRarity,
  relicImageUrl,
  awakenedEffect,
  etchings = {},
  onSelectSlot,
}: RelicArtTreeProps) {
  if (!open || typeof document === "undefined") return null;

  const slotCount = ETCHING_SLOT_COUNT[relicRarity];
  const points = TREE_LAYOUTS[slotCount];
  const filledSlots = points.filter((_, index) =>
    Boolean(etchings[`slot-${index + 1}`]),
  ).length;
  const resonance = Math.round((filledSlots / slotCount) * 100);
  const awakened = filledSlots === slotCount;

  return createPortal(
    <div
      className="relicArtTreeBackdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="relicArtTreeModal dpPopupWindow dp-blue-grid-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="relic-art-tree-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relicArtTreeHeader">
          <div>
            <span className="relicArtTreeEyebrow">Relic Skill Tree</span>
            <h2 id="relic-art-tree-title">{relicName}</h2>
          </div>

          <button type="button" className="dp-close-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="relicArtTreeMeta">
          <span
            className={`relicArtTreeRarity relicArtTreeRarity--${relicRarity}`}
          >
            {titleCaseRarity(relicRarity)}
          </span>

          <span>
            Etching Slots{" "}
            <strong>
              {filledSlots} / {slotCount}
            </strong>
          </span>

          <span>
            Resonance <strong>{resonance}%</strong>
          </span>
        </div>

        <div
          className="relicArtTreeStage"
          aria-label={`${slotCount} etching slot relic tree`}
        >
          <svg
            className="relicArtTreeWeb"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            {points.map((point, index) => {
              const slotId = `slot-${index + 1}`;
              const filled = Boolean(etchings[slotId]);

              return (
                <line
                  key={slotId}
                  className={
                    filled
                      ? "relicArtTreeLine relicArtTreeLine--filled"
                      : "relicArtTreeLine"
                  }
                  x1="50"
                  y1="50"
                  x2={point.x}
                  y2={point.y}
                />
              );
            })}
          </svg>

          <div
            className={`relicArtTreeRelic relicArtTreeRarity--${relicRarity}`}
          >
            {relicImageUrl ? (
              <img src={relicImageUrl} alt="" />
            ) : (
              <span aria-hidden="true">◇</span>
            )}
          </div>

          <svg className="relicArtTreeNodes" viewBox="0 0 100 100">
            {points.map((point, index) => {
              const slotId = `slot-${index + 1}`;
              const etching = etchings[slotId];

              return (
                <g
                  key={slotId}
                  className={
                    etching
                      ? "relicArtTreeNode relicArtTreeNode--filled"
                      : "relicArtTreeNode"
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={
                    etching
                      ? `${etching.name}, ${titleCaseRarity(etching.rarity)}`
                      : `Empty etching slot ${index + 1}`
                  }
                  onClick={() => !etching && onSelectSlot?.(slotId)}
                  onKeyDown={(event) => {
                    if (
                      !etching &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      onSelectSlot?.(slotId);
                    }
                  }}
                >
                  <circle cx={point.x} cy={point.y} r="6.5" />

                  {etching?.imageUrl ? (
                    <image
                      href={etching.imageUrl}
                      x={point.x - 4.5}
                      y={point.y - 4.5}
                      width="9"
                      height="9"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : (
                    <text x={point.x} y={point.y + 1.6} textAnchor="middle">
                      {etching ? "◆" : "+"}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="relicArtTreeStatusGrid">
          <div>
            <span>Etching Slots</span>
            <strong>
              {filledSlots} / {slotCount}
            </strong>
          </div>

          <div>
            <span>Resonance</span>
            <strong>{resonance}%</strong>
          </div>

          <div>
            <span>Awakened Effect</span>
            <strong>
              {awakened ? awakenedEffect || "Awakened" : "Locked"}
            </strong>
          </div>
        </div>

        <div
          className="relicArtTreeResonance"
          aria-label={`Resonance ${resonance}%`}
        >
          <div
            className="relicArtTreeResonanceFill"
            data-resonance={resonance}
          />
        </div>

        <p className="relicArtTreeNotice">
          Etchings are permanent once applied. Removal requires a Blacksmith.
        </p>
      </section>
    </div>,
    document.body,
  );
}
