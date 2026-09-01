import { useNavigate } from "react-router-dom";
import PoeTayToe from "../../../components/PoeTayToe/PoeTayToe";
import "./KithnaMap.css";

type KithnaTarget = {
  id: string;
  label: string;
  route: string;
  className: string;
  icon: string;
};

const KITHNA_TARGETS: KithnaTarget[] = [
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
              className={`kithnaMapTarget ${target.className}`}
              aria-label={target.label}
              title={target.label}
              onClick={() => navigate(target.route)}
            >
              <span className="kithnaBuildingIcon">{target.icon}</span>
              <span className="kithnaBuildingLabel">{target.label}</span>
            </button>
          ))}

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
