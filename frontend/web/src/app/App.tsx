// frontend/web/src/app/App.tsx
import { Link, Outlet } from "react-router-dom";
import { UIProvider } from "./providers/UIProvider";
import { InventoryOverlay } from "../components/inventory/inventoryOverlay";
import LogoDeltapets from "../components/Logo/Logo_Deltapets";

export default function App() {
  return (
    <UIProvider>
      {/* ✅ Global Stage Wrapper: ALL pages render inside this */}
      <div className="dp-viewport">
        <div className="dp-stage">
          <header className="dp-stageHeader">
            <div className="dp-headerLeft">
              <Link className="dp-logoLink" to="/">
                <LogoDeltapets variant="header" className="dp-headerLogo" />
              </Link>

              {/* Shows even when the homepage hides the big logo */}
              <div className="dp-alphaBadge" title={__APP_VERSION__}>
                <span className="dp-alphaBadgeLabel">ALPHA</span>
                <span className="dp-alphaBadgeVer">v{__APP_VERSION__}</span>
              </div>
            </div>

            {/* Right side reserved for later (profile, settings, etc.) */}
            <div style={{ marginLeft: "auto" }} />
          </header>

          <main className="dp-stageScroll">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ✅ Keep overlay outside stage so it can float above everything */}
      <InventoryOverlay />
    </UIProvider>
  );
}
