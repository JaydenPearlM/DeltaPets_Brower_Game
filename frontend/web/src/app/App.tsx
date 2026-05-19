import { useEffect, useMemo, useRef, useState } from "react";
import {
  Outlet,
  useNavigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { LogoutButton } from "../components/Authentication/LogoutButton";
import { LoginMenus } from "../components/Authentication/LoginMenus";
import { useAliuneSignal } from "../pages/Homepage/useAliuneSignal";
import { DeltaClock } from "../lib/timers/deltaClock";
import { useAuth } from "./providers/useAuth";
import "./App.css";

const APP_VERSION = __APP_VERSION__;

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

  function getCollapsedSections(): Record<MenuSectionKey, boolean> {
    return {
      pets: false,
      battle: false,
      cities: false,
    };
  }

  const exploreWrapperRef = useRef<HTMLDivElement | null>(null);

  const forcedAuthView = useMemo<"login" | "signup" | "none">(() => {
    if (location.pathname === "/signin") return "login";
    if (location.pathname === "/signup") return "signup";
    return "none";
  }, [location.pathname]);

  const conditionText = signal.conditionLabel;
  const regionText = signal.regionLabel;
  const corruptionText = signal.corruptionLabel;

  const signalTone = useMemo<"green" | "yellow" | "red">(() => {
    const condition = String(conditionText).toLowerCase();
    const corruption = String(corruptionText).toLowerCase();

    if (
      condition === "unstable" ||
      corruption === "high" ||
      corruption === "too high"
    ) {
      return "red";
    }

    if (
      condition === "unbalanced" ||
      corruption === "low" ||
      corruption === "rising"
    ) {
      return "yellow";
    }

    return "green";
  }, [conditionText, corruptionText]);

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
        setExpandedSections(getCollapsedSections());
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
    setExpandedSections(getCollapsedSections());
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
    setExpandedSections(getCollapsedSections());
    navigate(to);
  }

  function handleExploreClick() {
    if (loading) return;

    if (!user) {
      setMenuOpen(false);
      setExpandedSections(getCollapsedSections());
      setExploreHintOpen((prev) => !prev);
      return;
    }

    setExploreHintOpen(false);
    setExpandedSections(getCollapsedSections());
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
        <div
          className={`appShell appHeaderInner ${
            location.pathname.startsWith("/pet") ? "petPageLayout" : ""
          }`}
        >
          <button
            type="button"
            className="logoBlock"
            onClick={() => handleNavigate("/profile")}
            aria-label="Go to your DeltaPets profile"
          >
            <span className="logoTriangle">△</span>
            <span className="logoText">DeltaPets</span>
          </button>

          <div className="headerStack">
            <div className={`aliuneSignal aliuneSignal--${signalTone}`}>
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
                {!user && (
                  <button
                    type="button"
                    className="exploreButton dp-btn dp-btn-yellow"
                    onClick={() => navigate("/signup")}
                  >
                    SIGN UP
                  </button>
                )}

                <div className="exploreWrapper" ref={exploreWrapperRef}>
                  <button
                    type="button"
                    className="exploreButton dp-btn dp-btn-blue"
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
                          onClick={() => handleNavigate("/profile")}
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

                {!user && (
                  <button
                    type="button"
                    className="exploreButton dp-btn dp-btn-yellow"
                    onClick={() => navigate("/signin")}
                  >
                    SIGN IN
                  </button>
                )}
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
