// frontend/web/src/app/App.tsx
import { Outlet } from "react-router-dom";
import { UIProvider } from "./providers/UIProvider";
import { useAuth } from "./providers/useAuth";
import { InventoryOverlay } from "../components/inventory/inventoryOverlay";

import { LoginMenus } from "../components/Authentication/LoginMenus";
import { LogoutButton } from "../components/Authentication/LogoutButton";

import "./App.css";

export default function App() {
  const auth = useAuth();
  const isLoggedIn = Boolean(auth.user);

  return (
    <UIProvider>
      <div className="dp-viewport">
        <div className="dp-stage">
          <header className="dp-stageHeader dp-stageHeader--appFix">
            {/* LEFT */}
            <div className="dp-headerLeft">
              <div className="dp-alphaBadge" title={__APP_VERSION__}>
                <span className="dp-alphaBadgeLabel">ALPHA</span>
                <span className="dp-alphaBadgeVer">v{__APP_VERSION__}</span>
              </div>
            </div>

            {/* CENTER (force true center via App.css) */}
            <div
              className="dp-headerCenterTagline dp-headerCenterTagline--appFix"
              aria-hidden
            >
              <div className="dp-headerTaglineTitle">Bond begins here.</div>
              <div className="dp-headerTaglineSub">
                Hatch eggs. Raise Deltas. Build Haven. Fight against evil.
              </div>
            </div>

            {/* RIGHT */}
            <div className="dp-headerRight dp-headerRight--auth">
              {isLoggedIn ? <LogoutButton /> : <LoginMenus />}
            </div>
          </header>

          <main className="dp-stageScroll">
            <Outlet />
          </main>
        </div>
      </div>

      <InventoryOverlay />
    </UIProvider>
  );
}
