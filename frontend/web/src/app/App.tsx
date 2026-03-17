// frontend/web/src/app/App.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { UIProvider } from "./providers/UIProvider";
import { useAuth } from "./providers/useAuth";
import { InventoryOverlay } from "../components/inventory/inventoryOverlay";

import { LoginMenus } from "../components/Authentication/LoginMenus";
import { LogoutButton } from "../components/Authentication/LogoutButton";

import "./App.css";

export default function App() {
  const auth = useAuth();
  const isLoggedIn = Boolean(auth.user);

  const location = useLocation();
  const navigate = useNavigate();

  const isHatcheryRoute =
    location.pathname === "/hatchery" ||
    location.pathname.startsWith("/hatchery/");

  const showBackToPets = isLoggedIn && isHatcheryRoute;

  return (
    <UIProvider>
      <div className="dp-viewport">
        <div className="dp-stage">
          <header className="dp-stageHeader dp-stageHeader--appFix">
            {/* LEFT */}
            <div className="dp-headerLeft dp-headerLeft--withTitle">
              <div className="dp-alphaBadge" title={__APP_VERSION__}>
                <span className="dp-alphaBadgeLabel">ALPHA</span>
                <span className="dp-alphaBadgeVer">v{__APP_VERSION__}</span>
              </div>

              {isHatcheryRoute ? (
                <div
                  className="dp-sectionTitle"
                  aria-label="Current section: Hatchery"
                >
                  Hatchery
                </div>
              ) : null}
            </div>

            {/* CENTER */}
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
              {isLoggedIn ? (
                <>
                  {showBackToPets ? (
                    <button
                      type="button"
                      className="btn btn-yellow"
                      onClick={() => navigate("/pet")}
                    >
                      Back to Pets
                    </button>
                  ) : null}

                  <LogoutButton />
                </>
              ) : (
                <LoginMenus />
              )}
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
