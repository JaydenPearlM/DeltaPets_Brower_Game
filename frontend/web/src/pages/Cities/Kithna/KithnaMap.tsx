import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../../app/providers/GameProvider";
import PoeTayToe from "../../../components/PoeTayToe/PoeTayToe";
import {
  acceptAssantiFoodQuest,
  acceptSomethingsAfoot,
  fetchWildwoodStatus,
  turnInAssantiFoodQuest,
  turnInSomethingsAfoot,
  type WildwoodStatus,
} from "../../../lib/kithna/wildwoodApi";
import QuestDialogue from "../../../components/Quests/QuestDialogue";
import kithnaMapImage from "../../../kith/assets/cities/Kithna.png";
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
    label: "Expeditions",
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

export default function KithnaMap() {
  const navigate = useNavigate();
  const { bumpRefreshKey } = useGame();

  const [wildwood, setWildwood] = useState<WildwoodStatus | null>(null);
  const [wildwoodMessageOpen, setWildwoodMessageOpen] = useState(false);
  const [questDialogue, setQuestDialogue] = useState<"food" | "main" | null>(
    null,
  );
  const [questBusy, setQuestBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [questError, setQuestError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatusError("");

    void fetchWildwoodStatus()
      .then((result) => {
        if (!cancelled) {
          setWildwood(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatusError(
            error instanceof Error
              ? error.message
              : "Quest status could not be loaded.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [statusAttempt]);

  function activateTarget(target: KithnaTarget) {
    if (target.requiresWildwoodUnlock && !wildwood?.wildwoodUnlocked) {
      setWildwoodMessageOpen(true);
      return;
    }

    navigate(target.route);
  }

  return (
    <main className="kithnaMapPage">
      {statusError ? (
        <div role="alert">
          <p>{statusError}</p>
          <button
            type="button"
            className="kithnaToolbarButton"
            onClick={() => setStatusAttempt((attempt) => attempt + 1)}
          >
            Retry quest status
          </button>
        </div>
      ) : null}
      <section className="kithnaMapFrame" aria-label="Kithna town map">
        <div
          className="kithnaIsland"
          style={{ backgroundImage: `url("${kithnaMapImage}")` }}
        >
          <div className="kithnaWater" />

          <div className="kithnaPath kithnaPathMain" />
          <div className="kithnaPath kithnaPathLeft" />
          <div className="kithnaPath kithnaPathRight" />
          <div className="kithnaPath kithnaPathBottom" />
          <svg
            className="kithnaMapDistanceOverlay"
            viewBox="0 0 1440 2559"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="kithnaDistanceTopFade"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="0"
                y2="760"
              >
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="48%" stopColor="white" stopOpacity="0.92" />
                <stop offset="78%" stopColor="white" stopOpacity="0.42" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>

              <radialGradient
                id="kithnaDistanceVolcanoFade"
                gradientUnits="userSpaceOnUse"
                cx="165"
                cy="245"
                r="360"
              >
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="62%" stopColor="white" stopOpacity="0.85" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>

              <radialGradient
                id="kithnaDistanceCenterFade"
                gradientUnits="userSpaceOnUse"
                cx="740"
                cy="315"
                r="500"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0.92" />
                <stop offset="66%" stopColor="white" stopOpacity="0.62" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>

              <radialGradient
                id="kithnaDistanceRuinsFade"
                gradientUnits="userSpaceOnUse"
                cx="1165"
                cy="265"
                r="390"
              >
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="62%" stopColor="white" stopOpacity="0.84" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>

              <mask
                id="kithnaDistanceMask"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="1440"
                height="2559"
              >
                <rect x="0" y="0" width="1440" height="2559" fill="black" />

                <path
                  d="
                    M 0 0
                    H 1440
                    V 405
                    C 1240 455, 1070 470, 900 452
                    C 760 438, 630 430, 490 444
                    C 315 462, 155 470, 0 440
                    Z
                  "
                  fill="url(#kithnaDistanceTopFade)"
                />

                <ellipse
                  cx="170"
                  cy="255"
                  rx="300"
                  ry="340"
                  fill="url(#kithnaDistanceVolcanoFade)"
                />

                <path
                  d="
                    M 330 150
                    C 470 125, 610 118, 760 128
                    C 930 140, 1080 175, 1215 235
                    L 1180 510
                    C 1035 468, 900 450, 760 448
                    C 620 446, 495 455, 355 490
                    Z
                  "
                  fill="url(#kithnaDistanceCenterFade)"
                />

                <ellipse
                  cx="1170"
                  cy="275"
                  rx="315"
                  ry="325"
                  fill="url(#kithnaDistanceRuinsFade)"
                />
              </mask>
            </defs>

            <image
              href={kithnaMapImage}
              width="1440"
              height="2559"
              preserveAspectRatio="none"
              mask="url(#kithnaDistanceMask)"
              className="kithnaDistanceImage"
            />
          </svg>

          <div className="kithnaMapFocusOverlay" aria-hidden="true" />
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

          {wildwood?.foodQuest?.status === "available" ||
          wildwood?.foodQuest?.status === "ready_to_turn_in" ? (
            <button
              type="button"
              className={[
                "kithnaQuestMarker",
                "kithnaQuestMarker--food",
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "kithnaQuestMarker--turn-in"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "Quest ready to turn in at Food Shop"
                  : "Quest available at Food Shop"
              }
              onClick={() => {
                setQuestError("");
                setQuestDialogue("food");
              }}
            >
              {wildwood.foodQuest.status === "ready_to_turn_in" ? "?" : "!"}
            </button>
          ) : null}

          {wildwood?.quest?.status === "available" ||
          wildwood?.quest?.status === "ready_to_turn_in" ? (
            <button
              type="button"
              className={[
                "kithnaQuestMarker",
                "kithnaQuestMarker--wildwood",
                "kithnaQuestMarker--main",
                wildwood.quest.status === "ready_to_turn_in"
                  ? "kithnaQuestMarker--turn-in"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={
                wildwood.quest.status === "ready_to_turn_in"
                  ? "Main quest ready to turn in"
                  : "Main quest available at Kithna Wildwood"
              }
              onClick={() => {
                setQuestError("");
                setQuestDialogue("main");
              }}
            >
              {wildwood.quest.status === "ready_to_turn_in" ? "?" : "!"}

              <span className="kithnaQuestMarkerStar" aria-hidden="true">
                ★
              </span>
            </button>
          ) : null}

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

          {questDialogue === "food" && wildwood ? (
            <QuestDialogue
              giverName="Assanti"
              title="A Merchant’s Trouble"
              dialogue={
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "You actually did it! My plants are safe, the meat tree is still standing, and those Kith finally stopped tearing through my food supply. You helped me out, so I'll help you out too."
                  : "Some strange Kith have been getting into my meat and vegetable farm lately. I don't know what's got them so riled up, but they're tearing through my food supply! If you can drive all three of them off, I'll make sure you stay fed. You've got my word!"
              }
              objective={
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "Daily Food is now available from Assanti."
                  : "Defeat 3 hostile Kith in the Wildwood."
              }
              mode={
                wildwood.foodQuest.status === "ready_to_turn_in"
                  ? "turn-in"
                  : "offer"
              }
              busy={questBusy}
              error={questError}
              onClose={() => setQuestDialogue(null)}
              onAccept={() => {
                if (questBusy) return;
                setQuestBusy(true);
                setQuestError("");

                const request =
                  wildwood.foodQuest.status === "ready_to_turn_in"
                    ? turnInAssantiFoodQuest()
                    : acceptAssantiFoodQuest();

                void request
                  .then((next) => {
                    setWildwood(next);
                    setQuestDialogue(null);
                    bumpRefreshKey();
                  })
                  .catch((error: unknown) => {
                    setQuestError(
                      error instanceof Error
                        ? error.message
                        : "Quest could not be updated. Try again.",
                    );
                  })
                  .finally(() => setQuestBusy(false));
              }}
            />
          ) : null}

          {questDialogue === "main" && wildwood ? (
            <QuestDialogue
              giverName="Kithna Researcher"
              title="Something’s Afoot"
              dialogue={
                wildwood.quest.status === "ready_to_turn_in"
                  ? "That's exactly what I needed. Whatever is happening to those Kith, the readings aren't random. The Aliune Signal is picking up something real. Take this one with you. If the signal changes, we'll know there's more going on out there."
                  : "I've been working on this weird thing I call an Aliune Signal. It's supposed to help me understand what's happening around Kithna, but I need more information. Defeat five of those strange Kith in the Wildwood and bring me what you learn. Also... I may have accidentally made two of these."
              }
              objective={
                wildwood.quest.status === "ready_to_turn_in"
                  ? "Receive the Aliune Signal."
                  : "Defeat 5 strange Kith and return with information for the Aliune Signal."
              }
              mode={
                wildwood.quest.status === "ready_to_turn_in"
                  ? "turn-in"
                  : "offer"
              }
              busy={questBusy}
              error={questError}
              onClose={() => setQuestDialogue(null)}
              onAccept={() => {
                if (questBusy) return;
                setQuestBusy(true);
                setQuestError("");

                const request =
                  wildwood.quest.status === "ready_to_turn_in"
                    ? turnInSomethingsAfoot()
                    : acceptSomethingsAfoot();

                void request
                  .then((next) => {
                    setWildwood(next);
                    setQuestDialogue(null);
                    bumpRefreshKey();
                  })
                  .catch((error: unknown) => {
                    setQuestError(
                      error instanceof Error
                        ? error.message
                        : "Quest could not be updated. Try again.",
                    );
                  })
                  .finally(() => setQuestBusy(false));
              }}
            />
          ) : null}

          <div className="kithnaEggFountain" aria-hidden="true">
            <div className="kithnaFountainEgg" />
            <div className="kithnaFountainBowl" />
          </div>

          <PoeTayToe locationKey="hatchery-back" />
        </div>
      </section>
    </main>
  );
}
