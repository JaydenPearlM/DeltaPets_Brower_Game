import { useNavigate } from "react-router-dom";
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
    route: "/kithna/farm/dungeon",
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
    id: "armor",
    label: "Armor Merchant",
    route: "/kithna/armor",
    className: "kithnaTargetArmor",
    icon: "▰",
  },
  {
    id: "weapons",
    label: "Weapon Merchant",
    route: "/kithna/weapons",
    className: "kithnaTargetWeapons",
    icon: "⚔",
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
    route: "/kithna/farm",
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
  { label: "Health", route: "/kithna/health" },
  { label: "Armor", route: "/kithna/armor" },
  { label: "Weapon", route: "/kithna/weapons" },
  { label: "Gym", route: "/gym" },
  { label: "Pet Care", route: "/pet" },
  { label: "Food", route: "/kithna/food" },
  { label: "Farm", route: "/kithna/farm" },
  { label: "Dungeon", route: "/kithna/farm/dungeon" },
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

          <div className="kithnaNpc kithnaNpcOne" aria-hidden="true" />
          <div className="kithnaNpc kithnaNpcTwo" aria-hidden="true" />
          <div className="kithnaNpc kithnaNpcThree" aria-hidden="true" />
          <div className="kithnaNpc kithnaNpcFour" aria-hidden="true" />
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
