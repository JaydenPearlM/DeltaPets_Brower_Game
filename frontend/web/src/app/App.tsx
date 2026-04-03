import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { UIProvider } from "./providers/UIProvider";
import { useAuth } from "./providers/useAuth";
import { InventoryOverlay } from "../components/inventory/inventoryOverlay";
import { LoginMenus } from "../components/Authentication/LoginMenus";
import { LogoutButton } from "../components/Authentication/LogoutButton";
import { useAliuneSignal } from "../pages/Homepage/useAliuneSignal";

import "./App.css";

export default function App() {
  const auth = useAuth();
  const isLoggedIn = Boolean(auth.user);
  const { signal } = useAliuneSignal();

  const location = useLocation();
  const navigate = useNavigate();

  const forcedAuthView =
    location.pathname === "/signup"
      ? "signup"
      : location.pathname === "/signin"
        ? "login"
        : "none";

  const sectionTitle = null;

  return (
    <UIProvider>
      <div className="dp-viewport">
        <div className="dp-stage">
          <header className="dp-stageHeader dp-stageHeader--appFix">
            {/* LEFT */}
            <div className="dp-headerLeft dp-headerLeft--withTitle">
              {sectionTitle ? (
                <div className="dp-sectionTitle">{sectionTitle}</div>
              ) : null}
            </div>

            {/* CENTER (ALIUNE SIGNAL) */}
            <div className="dp-headerCenterTagline dp-headerCenterTagline--appFix">
              <section className="hp-signalBanner">
                <div className="hp-signalBannerInner">
                  <div className="hp-signalBannerHead">
                    <span className="hp-signalBannerKicker">Aliune Signal</span>
                  </div>

                  <div className="hp-signalBannerStats">
                    <div className="hp-signalBannerStat">
                      <span>Condition</span>
                      <strong>{signal.conditionLabel}</strong>
                    </div>

                    <div className="hp-signalBannerStat">
                      <span>Region</span>
                      <strong>{signal.regionLabel}</strong>
                    </div>

                    <div className="hp-signalBannerStat">
                      <span>Corruption</span>
                      <strong>{signal.corruptionLabel}</strong>
                    </div>

                    <div className="hp-signalBannerStat">
                      <span>Report Age</span>
                      <strong>
                        {signal.showReportAge ? signal.reportAgeLabel : "—"}
                      </strong>
                    </div>
                  </div>

                  <p className="hp-signalBannerReport">{signal.reportText}</p>
                </div>
              </section>
            </div>

            {/* RIGHT */}
            <div className="dp-headerRight dp-headerRight--auth">
              <div className="dp-headerRightStack">
                {/* ✅ ALPHA MOVED HERE */}
                <div className="dp-alphaBadge">ALPHA v{__APP_VERSION__}</div>

                {/* BUTTONS */}
                <div className="dp-headerAuthRow">
                  {isLoggedIn ? (
                    <>
                      <button
                        className="btn btn-gold"
                        onClick={() => navigate("/pet")}
                      >
                        Pets
                      </button>

                      <button
                        className="btn btn-cool"
                        onClick={() => navigate("/hatchery")}
                      >
                        Hatchery
                      </button>

                      <button
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
              </div>
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
            </div>
          </footer>
        </div>
      </div>

      <InventoryOverlay />
    </UIProvider>
  );
}
