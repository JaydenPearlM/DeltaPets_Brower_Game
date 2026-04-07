import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { UIProvider } from "./providers/UIProvider";
import { useAuth } from "./providers/useAuth";
import { InventoryOverlay } from "../components/inventory/inventoryOverlay";
import { LoginMenus } from "../components/Authentication/LoginMenus";
import { LogoutButton } from "../components/Authentication/LogoutButton";
import { useAliuneSignal } from "../pages/Homepage/useAliuneSignal";

import "./App.css";

type FooterModalKey = "privacy" | "terms" | "safety" | "contact" | null;

const FOOTER_MODAL_CONTENT: Record<
  Exclude<FooterModalKey, null>,
  {
    title: string;
    body: string[];
  }
> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "DeltaPets is currently in a public alpha. We may collect basic account details, sign-in activity, gameplay progress, and technical information needed to keep the game stable and improve the experience.",
      "This information may be used for account access, save data, bug fixing, moderation, security, testing, and general service improvement. We do not sell your personal information.",
      "Because DeltaPets is still in active development, features, systems, and stored data may change over time as the game evolves.",
      "If you have questions about account or privacy matters, use the Contact section.",
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      "DeltaPets is a public alpha and is provided as-is while systems, balance, content, and online features are still being tested.",
      "By using DeltaPets, you agree not to exploit bugs, abuse services, impersonate others, interfere with the site, attempt unauthorized access, or harass other users.",
      "Game branding, artwork, writing, systems, and related DeltaPets content remain the property of DeltaPets and Jayden unless otherwise stated.",
      "Access may be limited, reset, suspended, or removed when necessary for moderation, safety, security, or service integrity.",
    ],
  },
  safety: {
    title: "Safety",
    body: [
      "DeltaPets is intended to be a safer community space. Harassment, threats, hate, stalking, doxxing, sexual exploitation, cheating, and targeted abuse are not allowed.",
      "Unsafe behavior or content may be removed, and accounts may be restricted or suspended to protect the community and the platform.",
      "If social or interactive features are present now or later, users are expected to behave respectfully and keep names, chat, and shared content appropriate for the game.",
      "If you see something unsafe, report it through Contact.",
    ],
  },
  contact: {
    title: "Contact",
    body: [
      "For support, bug reports, account questions, safety concerns, or business contact, email: maxwellpearl90@gmail.com",
      "When reporting a bug, include what page you were on, what happened, what you clicked, and roughly when it happened.",
      "For safety issues, include usernames, screenshots, and a short summary so the problem can be reviewed faster.",
    ],
  },
};

export default function App() {
  const auth = useAuth();
  const isLoggedIn = Boolean(auth.user);
  const { signal } = useAliuneSignal();

  const location = useLocation();
  const navigate = useNavigate();

  const [activeFooterModal, setActiveFooterModal] =
    useState<FooterModalKey>(null);

  const forcedAuthView =
    location.pathname === "/signup"
      ? "signup"
      : location.pathname === "/signin"
        ? "login"
        : "none";

  const onlineNow = isLoggedIn ? 1 : 0;

  const handleBrandClick = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
      return;
    }

    navigate("/");
  };

  const activeFooterModalContent = useMemo(() => {
    if (!activeFooterModal) return null;
    return FOOTER_MODAL_CONTENT[activeFooterModal];
  }, [activeFooterModal]);

  const openFooterModal = (modal: Exclude<FooterModalKey, null>) => {
    setActiveFooterModal(modal);
  };

  const closeFooterModal = () => {
    setActiveFooterModal(null);
  };

  return (
    <UIProvider>
      <div className="dp-viewport">
        <div className="dp-stage">
          <header className="dp-stageHeader dp-stageHeader--appFix">
            <div className="dp-headerBrandFloating">
              <button
                type="button"
                className="dp-headerBrandButton"
                onClick={handleBrandClick}
                aria-label="Go to DeltaPets home"
              >
                <div className="dp-headerBrand">
                  <span className="dp-headerBrandStack">
                    <span className="dp-headerBrandTitle">DeltaPets</span>
                    <span className="dp-headerBrandTriangle">△</span>
                  </span>
                </div>
              </button>
            </div>

            <div className="dp-headerCenterTagline dp-headerCenterTagline--appFix">
              <div className="dp-signalShell" aria-label="Aliune Signal">
                <div className="dp-signalRow">
                  <div className="dp-signalHeaderBlock">
                    <div className="dp-signalBannerTitle">ALIUNE SIGNAL</div>

                    <div className="dp-signalOnlineNow">
                      Online Now:{" "}
                      <strong className="dp-signalOnlineNowValue">
                        {onlineNow}
                      </strong>
                    </div>
                  </div>

                  <section className="hp-signalBanner">
                    <div className="hp-signalBannerStats">
                      <div className="hp-signalBannerStat">
                        <span className="hp-signalBannerKey">Condition</span>
                        <strong className="hp-signalBannerValue">
                          {signal.conditionLabel}
                        </strong>
                      </div>

                      <div className="hp-signalBannerStat">
                        <span className="hp-signalBannerKey">Region</span>
                        <strong className="hp-signalBannerValue">
                          {signal.regionLabel}
                        </strong>
                      </div>

                      <div className="hp-signalBannerStat">
                        <span className="hp-signalBannerKey">Corruption</span>
                        <strong className="hp-signalBannerValue">
                          {signal.corruptionLabel}
                        </strong>
                      </div>
                    </div>

                    <p className="hp-signalBannerReport">{signal.reportText}</p>
                  </section>
                </div>
              </div>
            </div>

            <div className="dp-headerRight dp-headerRight--auth">
              <div className="dp-headerRightStack">
                <div className="dp-alphaBadge">ALPHA v{__APP_VERSION__}</div>

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
            <div className="dp-stageFooterInner dp-stageFooterInner--stacked">
              <div className="dp-footerMeta">
                <span className="dp-footerCopyright">DeltaPets · Jayden</span>

                <span
                  className="dp-footerStatus"
                  aria-label="Public alpha status"
                >
                  <span className="dp-footerDot" aria-hidden="true" />
                  <span className="dp-footerStatusText">Public Alpha</span>
                </span>
              </div>

              <div className="dp-footerLinksRow">
                <button
                  type="button"
                  className="dp-footerLink"
                  onClick={() => openFooterModal("privacy")}
                >
                  Privacy Policy
                </button>

                <button
                  type="button"
                  className="dp-footerLink"
                  onClick={() => openFooterModal("terms")}
                >
                  Terms of Service
                </button>

                <button
                  type="button"
                  className="dp-footerLink"
                  onClick={() => openFooterModal("safety")}
                >
                  Safety
                </button>

                <button
                  type="button"
                  className="dp-footerLink"
                  onClick={() => openFooterModal("contact")}
                >
                  Contact
                </button>
              </div>
            </div>
          </footer>

          {activeFooterModalContent ? (
            <div
              className="dp-footerModalOverlay"
              onClick={closeFooterModal}
              role="presentation"
            >
              <div
                className="dp-footerModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dp-footer-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="dp-footerModalHeader">
                  <h3
                    id="dp-footer-modal-title"
                    className="dp-footerModalTitle"
                  >
                    {activeFooterModalContent.title}
                  </h3>

                  <button
                    type="button"
                    className="dp-footerModalClose"
                    onClick={closeFooterModal}
                    aria-label={`Close ${activeFooterModalContent.title}`}
                  >
                    Close
                  </button>
                </div>

                <div className="dp-footerModalBody">
                  {activeFooterModalContent.body.map((paragraph) => (
                    <p key={paragraph} className="dp-footerModalText">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <InventoryOverlay />
    </UIProvider>
  );
}
