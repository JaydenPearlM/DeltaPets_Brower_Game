import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PoeTayToe from "../../../components/PoeTayToe/PoeTayToe";
import {
  fetchWildwoodStatus,
  type WildwoodStatus,
} from "../../../lib/kithna/wildwoodApi";
import "./KithnaMap.css";

type KithnaTarget = {
  id: string;
  label: string;
  route: string;
  className: string;
  icon: string;
  requiresWildwoodUnlock?: boolean;
};

const KITHNA_TARGETS: KithnaTarget[] = [
  {
    id: "wildwood",
    label: "Kithna Wildwood",
    route: "/kithna/wildwood",
    className: "kithnaTargetWildwood",
    icon: "♣",
    requiresWildwoodUnlock: true,
  },
  {
    id: "dungeon",
    label: "Dungeon",
    route: "/battle-dungeons",
    className: "kithnaTargetDungeon",
    icon: "☠",
  },
  {
    id: "health",
    label: "Health Merchant",
    route: "/kithna/health",
    className: "kithnaTargetHealth",
    icon: "+",
  },
  {
    id: "hatchery",
    label: "Hatchery",
    route: "/hatchery",
    className: "kithnaTargetHatchery",
    icon: "🥚",
  },
  {
    id: "relic-store",
    label: "Relic Store",
    route: "/kithna/relics",
    className: "kithnaTargetRelics",
    icon: "◆",
  },
  {
    id: "food-shop",
    label: "Food Shop",
    route: "/kithna/food",
    className: "kithnaTargetFoodShop",
    icon: "●",
  },
  {
    id: "pet-care",
    label: "Pet Care",
    route: "/pet",
    className: "kithnaTargetPetCare",
    icon: "♥",
  },
  {
    id: "gym",
    label: "Gym",
    route: "/gym",
    className: "kithnaTargetGym",
    icon: "▣",
  },
  {
    id: "farm",
    label: "Farm Merchant",
    route: "/farm",
    className: "kithnaTargetFarm",
    icon: "☘",
  },

  {
    id: "profile",
    label: "Profile Dashboard",
    route: "/profile",
    className: "kithnaTargetProfile",
    icon: "◉",
  },
];

const KITHNA_TOOLBAR = [
  { label: "Hatchery", route: "/hatchery" },
  { label: "Relic Store", route: "/kithna/relics" },
  { label: "Health", route: "/kithna/health" },
  { label: "Food", route: "/kithna/food" },
  { label: "Pet Care", route: "/pet" },
  { label: "Gym", route: "/gym" },
  { label: "Farm Merchant", route: "/farm" },
  { label: "Dungeon", route: "/battle-dungeons" },
  { label: "Profile", route: "/profile" },
];

export default function KithnaMap() {
  const navigate = useNavigate();
  const [wildwood, setWildwood] = useState<WildwoodStatus | null>(null);
  const [wildwoodMessageOpen, setWildwoodMessageOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchWildwoodStatus()
      .then((result) => {
        if (!cancelled) setWildwood(result);
      })
      .catch(() => {
        if (!cancelled) setWildwood(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function activateTarget(target: KithnaTarget) {
    if (target.requiresWildwoodUnlock && !wildwood?.wildwoodUnlocked) {
      setWildwoodMessageOpen(true);
      return;
    }

    navigate(target.route);
  }

  return (
    <main className="kithnaMapPage">
      <section className="kithnaMapFrame" aria-label="Kithna town map">
        <div className="kithnaIsland">
          <div className="kithnaWater" />

          <div className="kithnaPath kithnaPathMain" />
          <div className="kithnaPath kithnaPathLeft" />
          <div className="kithnaPath kithnaPathRight" />
          <div className="kithnaPath kithnaPathBottom" />

          {KITHNA_TARGETS.map((target) => (
            <button
              key={target.id}
              type="button"
              className={[
                "kithnaMapTarget",
                target.className,
                target.requiresWildwoodUnlock && !wildwood?.wildwoodUnlocked
                  ? "kithnaMapTarget--locked"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={
                target.requiresWildwoodUnlock && !wildwood?.wildwoodUnlocked
                  ? `${target.label} — path inaccessible`
                  : target.label
              }
              aria-disabled={
                target.requiresWildwoodUnlock && !wildwood?.wildwoodUnlocked
              }
              title={
                target.requiresWildwoodUnlock && !wildwood?.wildwoodUnlocked
                  ? "The path is currently inaccessible."
                  : target.label
              }
              onClick={() => activateTarget(target)}
            >
              <span className="kithnaBuildingIcon">{target.icon}</span>
              <span className="kithnaBuildingLabel">{target.label}</span>
            </button>
          ))}

          {wildwoodMessageOpen && !wildwood?.wildwoodUnlocked ? (
            <div className="kithnaWildwoodLockedNotice" role="status">
              <p>The Wildwood path is currently inaccessible.</p>
              <p>Someone in Kithna may know what is blocking the way.</p>
              <button
                type="button"
                className="kithnaToolbarButton"
                onClick={() => setWildwoodMessageOpen(false)}
              >
                Close
              </button>
            </div>
          ) : null}

          <div className="kithnaEggFountain" aria-hidden="true">
            <div className="kithnaFountainEgg" />
            <div className="kithnaFountainBowl" />
          </div>

          <PoeTayToe locationKey="hatchery-back" />
        </div>

        <nav className="kithnaToolbar" aria-label="Kithna facilities">
          {KITHNA_TOOLBAR.map((item) => (
            <button
              key={item.route}
              type="button"
              className="kithnaToolbarButton"
              onClick={() => navigate(item.route)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
