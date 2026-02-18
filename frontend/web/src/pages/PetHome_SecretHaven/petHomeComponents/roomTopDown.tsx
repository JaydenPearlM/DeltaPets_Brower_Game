import type React from "react";
import { FURNITURE, TILE } from "../secretHaven.data";
import { getItemSizeTiles } from "../secretHaven.utils";
import type { FurnitureKind, RoomKey, RoomLayout } from "../secretHaven.types";

type Props = {
  layout: RoomLayout;
  roomKey: RoomKey;
  editMode: boolean;

  roomRef: React.RefObject<HTMLDivElement | null>;

  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;

  hoverTile: { x: number; y: number } | null;

  selectedKind: FurnitureKind;
  rot: 0 | 90;
  selectedSize: { w: number; h: number };
  selectedDef: { label: string };

  canPlaceAt: (
    x: number,
    y: number,
    kind: FurnitureKind,
    rotVal: 0 | 90,
  ) => boolean;

  pet: any | null;
};

export function RoomTopDown({
  layout,
  roomKey,
  editMode,
  roomRef,
  onMouseMove,
  onMouseLeave,
  onClick,
  onContextMenu,
  hoverTile,
  selectedKind,
  rot,
  selectedSize,
  selectedDef,
  canPlaceAt,
  pet,
}: Props) {
  return (
    <div
      ref={roomRef}
      className={`roomTop ${roomKey === "care" ? "roomTop--care" : "roomTop--bond"}`}
      style={{ width: layout.width * TILE, height: layout.height * TILE }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* grid overlay */}
      {editMode ? (
        <div
          className="gridOverlay"
          style={{ backgroundSize: `${TILE}px ${TILE}px` }}
          aria-hidden="true"
        />
      ) : null}

      {/* placed furniture */}
      {layout.items.map((it) => {
        const def = FURNITURE[it.kind];
        const s = getItemSizeTiles(it);
        return (
          <div
            key={it.id}
            className={`furn furn--${it.kind}`}
            style={{
              left: it.x * TILE,
              top: it.y * TILE,
              width: s.w * TILE,
              height: s.h * TILE,
              position: "absolute",
            }}
            title={`${def.label} — ${def.description}`}
          >
            <div className="furn__label">{def.label}</div>
          </div>
        );
      })}

      {/* ghost placement */}
      {editMode && hoverTile ? (
        <div
          className={`ghost ${
            canPlaceAt(hoverTile.x, hoverTile.y, selectedKind, rot)
              ? "ghost--ok"
              : "ghost--bad"
          }`}
          style={{
            left: hoverTile.x * TILE,
            top: hoverTile.y * TILE,
            width: selectedSize.w * TILE,
            height: selectedSize.h * TILE,
            position: "absolute",
          }}
        >
          <div className="ghost__label">{selectedDef.label}</div>
        </div>
      ) : null}

      {/* pet (hidden during edit) */}
      {!editMode ? (
        <div
          className="petSprite"
          style={{ left: 6 * TILE, top: 4 * TILE, position: "absolute" }}
        >
          <div className="petSprite__blob" />
          <div className="petSprite__name">
            {pet?.is_runaway ? "Gone..." : (pet?.name ?? "Your Pet")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
