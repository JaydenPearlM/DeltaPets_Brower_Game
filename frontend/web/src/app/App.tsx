// frontend/web/src/app/App.tsx
import { Outlet } from "react-router-dom";
import { GameShell } from "../components/layout/GameShell";
import { UIProvider } from "./providers/UIProvider";
import { InventoryOverlay } from "../components/inventory/inventoryOverlay";

export default function App() {
  return (
    <UIProvider>
      <GameShell>
        <Outlet />
        <InventoryOverlay />
      </GameShell>
    </UIProvider>
  );
}
