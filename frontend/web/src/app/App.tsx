import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogoutButton } from "../components/Authentication/LogoutButton";
import { LoginMenus } from "../components/Authentication/LoginMenus";
import { useAliuneSignal } from "../pages/Homepage/useAliuneSignal";
import { DeltaClock } from "../lib/timers/deltaClock";
import { useAuth } from "./providers/useAuth";
import "./App.css";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "ALPHAv0.0.1-alpha.2";

type MenuSectionKey = "pets" | "battle" | "cities";

type MenuLink = {
  label: string;
  to: string;
};

const PET_LINKS: MenuLink[] = [
  { label: "Pets", to: "/pet" },
  { label: "Hatchery", to: "/hatchery" },
  { label: "Gym", to: "/gym" },
];

const BATTLE_LINKS: MenuLink[] = [
  { label: "Battle Arena", to: "/battle-arena" },
  { label: "Battle Dungeons", to: "/battle-dungeons" },
];

const CITY_LINKS: MenuLink[] = [
  { label: "Kithna", to: "/cities/kithna" },
  { label: "Kath", to: "/cities/kath" },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signal } = useAliuneSignal();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreHintOpen, setExploreHintOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<MenuSectionKey, boolean>
  >({
    pets: false,
    battle: false,
    cities: false,
  });

  const exploreWrapperRef = useRef<HTMLDivElement | null>(null);

  const forcedAuthView = useMemo<"login" | "signup" | "none">(() => {
    if (location.pathname === "/signin") return "login";
    if (location.pathname === "/signup") return "signup";
    return "none";
  }, [location.pathname]);

  const conditionText =
    (signal as any)?.conditionLabel ?? (signal as any)?.condition ?? "Stable";

  const regionText =
    (signal as any)?.regionLabel ??
    (signal as any)?.region ??
    "All Regions Stable";

  const corruptionText =
    (signal as any)?.corruptionLabel ?? (signal as any)?.corruption ?? "None";

  useEffect(() => {
    if (!menuOpen && !exploreHintOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (
        exploreWrapperRef.current &&
        target &&
        !exploreWrapperRef.current.contains(target)
      ) {
        setMenuOpen(false);
        setExploreHintOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setExploreHintOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen, exploreHintOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setExploreHintOpen(false);
  }, [location.pathname]);

  function toggleSection(section: MenuSectionKey) {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function handleNavigate(to: string) {
    setMenuOpen(false);
    setExploreHintOpen(false);
    navigate(to);
  }

  function handleExploreClick() {
    if (loading) return;

    if (!user) {
      setMenuOpen(false);
      setExploreHintOpen((prev) => !prev);
      return;
    }

    setExploreHintOpen(false);
    setMenuOpen((prev) => !prev);
  }

  function renderMenuLinks(links: MenuLink[]) {
    return (
      <div className="hamburgerMenuSectionBody">
        {links.map((link) => (
          <button
            key={link.to}
            type="button"
            className="hamburgerMenuItem"
            onClick={() => handleNavigate(link.to)}
          >
            {link.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="appRoot">
      <header className="appHeader">
        <div className="appShell appHeaderInner">
          <div className="logoBlock">
            <div className="logoText">DeltaPets</div>
            <div className="logoTriangle">△</div>
          </div>

          <div className="headerStack">
            <div className="aliuneSignal">
              <div className="signalTitle">ALIUNE SIGNAL</div>

              <div className="signalRow">
                Condition: <strong>{conditionText}</strong>
              </div>

              <div className="signalRow">
                Region: <strong>{regionText}</strong>
              </div>

              <div className="signalRow">
                Corruption: <strong>{corruptionText}</strong>
              </div>
            </div>

            <div className="headerCenter">
              <div className="versionText">{APP_VERSION}</div>

              <div className="headerCenterRow">
                <button
                  type="button"
                  className="exploreButton"
                  onClick={() => navigate("/signup")}
                >
                  SIGN UP
                </button>

                <div className="exploreWrapper" ref={exploreWrapperRef}>
                  <button
                    type="button"
                    className="exploreButton"
                    aria-expanded={menuOpen || exploreHintOpen}
                    aria-haspopup="dialog"
                    onClick={handleExploreClick}
                  >
                    EXPLORE ☰
                  </button>

                  {exploreHintOpen && !user && (
                    <div
                      className="exploreThoughtBubble"
                      role="dialog"
                      aria-modal="false"
                      aria-label="Explore sign-in notice"
                    >
                      <div
                        className="exploreThoughtBubbleTail"
                        aria-hidden="true"
                      />
                      <p className="exploreThoughtBubbleText">
                        The map is fogged out until you sign in. Make an account
                        and step into DeltaPets! Your future Delta is probably
                        already judging your lateness.
                      </p>
                    </div>
                  )}

                  {menuOpen && user && (
                    <div
                      className="hamburgerMenuModal"
                      role="dialog"
                      aria-modal="false"
                      aria-label="Explore menu"
                    >
                      <div className="hamburgerMenuGlow" aria-hidden="true" />

                      <div className="hamburgerMenuHeader">
                        <p className="hamburgerMenuIntro">
                          Explore the world of{" "}
                          <span className="hamburgerMenuAliune">Aliune</span>
                        </p>

                        <h3 className="hamburgerMenuTitle">
                          <span className="hamburgerMenuDeltaPets">
                            DeltaPets
                          </span>{" "}
                          Menu
                        </h3>
                      </div>

                      <div className="hamburgerMenuSection hamburgerMenuSection--profile">
                        <button
                          type="button"
                          className="hamburgerMenuSectionStatic"
                          onClick={() => handleNavigate("/secretHaven")}
                        >
                          <span>Profile</span>
                        </button>
                      </div>

                      <div className="hamburgerMenuSection">
                        <button
                          type="button"
                          className="hamburgerMenuSectionToggle"
                          onClick={() => toggleSection("pets")}
                          aria-expanded={expandedSections.pets}
                        >
                          <span>Pets</span>
                          <span className="hamburgerMenuCaret">
                            {expandedSections.pets ? "−" : "+"}
                          </span>
                        </button>

                        {expandedSections.pets
                          ? renderMenuLinks(PET_LINKS)
                          : null}
                      </div>

                      <div className="hamburgerMenuSection">
                        <button
                          type="button"
                          className="hamburgerMenuSectionToggle"
                          onClick={() => toggleSection("battle")}
                          aria-expanded={expandedSections.battle}
                        >
                          <span>Battle</span>
                          <span className="hamburgerMenuCaret">
                            {expandedSections.battle ? "−" : "+"}
                          </span>
                        </button>

                        {expandedSections.battle
                          ? renderMenuLinks(BATTLE_LINKS)
                          : null}
                      </div>

                      <div className="hamburgerMenuSection">
                        <button
                          type="button"
                          className="hamburgerMenuSectionToggle"
                          onClick={() => toggleSection("cities")}
                          aria-expanded={expandedSections.cities}
                        >
                          <span>Cities</span>
                          <span className="hamburgerMenuCaret">
                            {expandedSections.cities ? "−" : "+"}
                          </span>
                        </button>

                        {expandedSections.cities
                          ? renderMenuLinks(CITY_LINKS)
                          : null}
                      </div>

                      <div className="hamburgerMenuFooter">
                        <LogoutButton />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="exploreButton"
                  onClick={() => navigate("/signin")}
                >
                  SIGN IN
                </button>
              </div>
            </div>
          </div>

          <div className="headerRight">
            <div className="clockWrapper">
              <DeltaClock />
            </div>
          </div>
        </div>
      </header>

      <main className="appContent">
        <Outlet />
      </main>

      <LoginMenus forcedView={forcedAuthView} showLaunchers={false} />
    </div>
  );
}
