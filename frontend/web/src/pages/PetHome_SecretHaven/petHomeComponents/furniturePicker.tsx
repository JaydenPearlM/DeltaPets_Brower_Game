import { FURNITURE } from "../secretHaven.data";
import type { FurnitureKind } from "../secretHaven.types";

type Props = {
  editMode: boolean;
  selectedKind: FurnitureKind;
  setSelectedKind: (k: FurnitureKind) => void;
  selectedDef: { label: string; description: string; tilesCost: number };
  selectedSize: { w: number; h: number };
};

export function FurniturePicker({
  editMode,
  selectedKind,
  setSelectedKind,
  selectedDef,
  selectedSize,
}: Props) {
  return (
    <div className="panelBlock">
      <div className="panelBlock__title">Room Edit</div>
      <div className="panelBlock__body">
        <div className="picker">
          <div className="picker__label">Furniture</div>

          <div className="picker__grid">
            {(Object.keys(FURNITURE) as FurnitureKind[]).map((k) => {
              const def = FURNITURE[k];
              const active = selectedKind === k;
              const disabled = !editMode;

              return (
                <button
                  key={k}
                  className={`pickBtn ${active ? "pickBtn--active" : ""}`}
                  disabled={disabled}
                  onClick={() => setSelectedKind(k)}
                  title={`${def.label} • costs ${def.tilesCost} tiles`}
                >
                  <div className="pickBtn__name">{def.label}</div>
                  <div className="pickBtn__meta">
                    {def.w}×{def.h} • {def.tilesCost} tiles
                  </div>
                </button>
              );
            })}
          </div>

          <div className="picker__info">
            <div className="picker__infoTitle">{selectedDef.label}</div>
            <div className="picker__infoDesc">{selectedDef.description}</div>
            <div className="picker__infoMeta">
              Size: {selectedSize.w}×{selectedSize.h} • Cost:{" "}
              {selectedDef.tilesCost}
            </div>

            {!editMode ? (
              <div className="picker__locked">
                Turn on <b>Edit Room</b> to place stuff.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
