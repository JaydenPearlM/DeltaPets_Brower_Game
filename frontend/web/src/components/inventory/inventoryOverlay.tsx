// frontend/web/src/components/Inventory/InventoryOverlay.tsx
import { InventoryPanel } from "./inventory";
import { useUI } from "../../app/providers/UIProvider";
import "./inventoryOverlay.css";

export function InventoryOverlay() {
  const { inventoryOpen, closeInventory, inventoryLocked } = useUI();

  if (!inventoryOpen) return null;

  return (
    <div
      className="invOverlayRoot"
      aria-hidden={inventoryLocked ? "true" : "false"}
    >
      <div className="invOverlayBackdrop" onMouseDown={closeInventory} />

      <div className="invOverlayModal" role="dialog" aria-modal="true">
        <div className="invOverlayHeader">
          <div className="invOverlayHeaderTitle">Inventory</div>
          <button className="invOverlayCloseBtn" onClick={closeInventory}>
            ✕
          </button>
        </div>

        <div className="invOverlayBody">
          <InventoryPanel mode="overlay" onRequestClose={closeInventory} />
        </div>
      </div>
    </div>
  );
}
