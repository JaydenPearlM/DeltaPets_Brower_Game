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

  const isPetRoute =
    location.pathname === "/pet" || location.pathname.startsWith("/pet/");

  const isGymRoute =
    location.pathname === "/gym" || location.pathname.startsWith("/gym/");

  const isAuthShellRoute =
    location.pathname === "/" ||
    location.pathname === "/home" ||
    location.pathname === "/signup" ||
    location.pathname === "/signin";

  const forcedAuthView =
    location.pathname === "/signup"
      ? "signup"
      : location.pathname === "/signin"
        ? "login"
        : "none";

  const sectionTitle = isHatcheryRoute
    ? "Hatchery"
    : isPetRoute
      ? "Pets"
      : isGymRoute
        ? "Gym"
        : null;

  const petButtonLabel = isHatcheryRoute ? "Back to Pets" : "Pets";

  return (
    <UIProvider>
      <div className="dp-viewport">
        <div className="dp-stage">
          <header className="dp-stageHeader dp-stageHeader--appFix">
            <div className="dp-headerLeft dp-headerLeft--withTitle">
              <div className="dp-alphaBadge" title={__APP_VERSION__}>
                <span className="dp-alphaBadgeLabel">ALPHA</span>
                <span className="dp-alphaBadgeVer">v{__APP_VERSION__}</span>
              </div>

              {sectionTitle ? (
                <div
                  className="dp-sectionTitle"
                  aria-label={`Current section: ${sectionTitle}`}
                >
                  {sectionTitle}
                </div>
              ) : null}
            </div>

            <div
              className="dp-headerCenterTagline dp-headerCenterTagline--appFix"
              aria-hidden
            >
              <div className="dp-headerTaglineTitle">Bond begins here.</div>
              <div className="dp-headerTaglineSub">
                Hatch eggs. Raise Deltas. Build Haven. Fight against evil.
              </div>
            </div>

            <div className="dp-headerRight dp-headerRight--auth">
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={() => navigate("/pet")}
                  >
                    {petButtonLabel}
                  </button>

                  <button
                    type="button"
                    className="btn btn-cool"
                    onClick={() => navigate("/hatchery")}
                  >
                    Hatchery
                  </button>

                  <button
                    type="button"
                    className="btn btn-cool"
                    onClick={() => navigate("/gym")}
                  >
                    Gym
                  </button>

                  <LogoutButton />
                </>
              ) : (
                <LoginMenus forcedView={forcedAuthView} />
              )}
            </div>
          </header>

          <main className="dp-stageScroll">
            <Outlet />
          </main>

          <footer className="dp-stageFooter">
            <div className="dp-stageFooterInner">
              <div className="dp-footerBrand">
                <span className="dp-footerBrandTitle">DeltaPets</span>
                <span className="dp-footerBrandText">
                  Raise. Train. Evolve. Bond.
                </span>
              </div>

              <div className="dp-footerStatus">
                <span className="dp-footerDot" aria-hidden />
                <span className="dp-footerStatusText">
                  {isAuthShellRoute
                    ? "Pre-login preview active"
                    : "Alpha systems active"}
                </span>
              </div>

              <div className="dp-footerLinks">
                <button
                  type="button"
                  className="dp-footerLink"
                  onClick={() => navigate("/")}
                >
                  Home
                </button>

                {isLoggedIn ? (
                  <>
                    <button
                      type="button"
                      className="dp-footerLink"
                      onClick={() => navigate("/pet")}
                    >
                      Pets
                    </button>
                    <button
                      type="button"
                      className="dp-footerLink"
                      onClick={() => navigate("/hatchery")}
                    >
                      Hatchery
                    </button>
                    <button
                      type="button"
                      className="dp-footerLink"
                      onClick={() => navigate("/gym")}
                    >
                      Gym
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </footer>
        </div>
      </div>

      <InventoryOverlay />
    </UIProvider>
  );
}
