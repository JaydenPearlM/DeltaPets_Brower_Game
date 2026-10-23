import { useEffect, useRef, useState, type ReactNode } from "react";

import { useNavigate } from "react-router-dom";
import DpPopupWindow from "@/pages/petsPage/components/DpPopupWindow";

import PoeTayToe from "../../../components/PoeTayToe/PoeTayToe";

import { useKithnaQuests } from "./KithnaQuest/useKithnaQuests";
import KithnaQuestMarker from "./KithnaQuest/KithnaQuestMarker";

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

const LOCATION_MESSAGES: Record<string, string> = {
  fishing: "You will be able to fish here after we clean it up a bit.",
  gym: "Someone left their mat and it made its own ecosystem. No one has been brave enough to touch it, let alone clean it.",
  park: "There's a huge tree blocking the entrance from the last storm. Looks like it would take some time to remove.",
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

// Desktop artwork markers only. Existing map targets and mobile layout remain unchanged.

const DESKTOP_BUILDING_MARKERS = [
  { id: "gym", label: "Gym", route: "/gym" },
  { id: "fishing", label: "Kithna Fishing Pier" },
  { id: "boat", label: "Island Travel" },
  {
    id: "farm",
    label: "Assanti's Mart",
    route: "/kithna/food",
  },
  {
    id: "wardrobe",
    label: "Wardrobe Merchant",
    route: "/kithna/thriftstore",
  },
  {
    id: "registry",
    label: "Kith Haven",
    route: "/kithna/registry",
  },
  {
    id: "pet-care",
    label: "Pet Care",
    route: "/pet",
  },
  {
    id: "hatchery",
    label: "Hatchery",
    route: "/hatchery",
  },
  { id: "park", label: "Park" },
  {
    id: "wildwood",
    label: "Kithna Wildwood",
    route: "/kithna/wildwood",
  },
  { id: "unknown", label: "Unknown Location" },
] as const;

type KithnaLocation = (typeof DESKTOP_BUILDING_MARKERS)[number];
type KithnaLocationId = KithnaLocation["id"];

const LOCATION_DESCRIPTIONS: Record<KithnaLocationId, string> = {
  registry: "View your Kith Registry and registered companions.",
  "pet-care": "Care for and spend time with your Kith.",
  hatchery: "Visit the Hatchery.",
  fishing: "The fishing pier is undergoing cleanup.",
  gym: "Temporarily closed for cleaning.",
  park: "The entrance is blocked by a fallen tree.",
  wildwood: "Explore the Wildwood once the path is unlocked.",
  farm: "Visit the local food merchant.",
  wardrobe: "Browse clothing and wardrobe options.",
  boat: "Travel services are temporarily delayed.",
  unknown: "???",
};

function KithnaMarkerIcon({
  id,
}: {
  id: (typeof DESKTOP_BUILDING_MARKERS)[number]["id"];
}) {
  if (id === "gym") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6.5 6.5 11 11" />
        <path d="m4 8 4-4M2 6l4-4M16 20l4-4M18 22l4-4" />
      </svg>
    );
  }
  const paths: Record<Exclude<typeof id, "gym">, ReactNode> = {
    fishing: (
      <>
        <path d="M12 3v12c0 7 9 7 9 0v-2" />
        <path d="m18 15 3-3 3 3" />
      </>
    ),
    boat: (
      <>
        <path d="M5 19 19 5" />
        <path d="M9 5h10v10" />
      </>
    ),
    farm: (
      <>
        <path d="M3 10 5 5h14l2 5M4 10v10h16V10M3 10h18" />
        <path d="M12 16c-3-3-5 1-2 3 1 1 3 1 4 0 3-2 1-6-2-3Z" />
      </>
    ),
    wardrobe: (
      <>
        <path d="m8 3-4 2-2 5 4 2 2-3v12h8V9l2 3 4-2-2-5-4-2M8 3c1 3 7 3 8 0" />
      </>
    ),
    registry: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    "pet-care": (
      <>
        <path d="M20.8 8.6c0 4.6-8.8 10.4-8.8 10.4S3.2 13.2 3.2 8.6a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z" />
      </>
    ),
    hatchery: (
      <>
        <path d="M12 3C7 3 5 11 5 15a7 7 0 0 0 14 0c0-4-2-12-7-12Z" />
      </>
    ),
    park: (
      <>
        <circle cx="8" cy="7" r="3" />
        <circle cx="17" cy="8" r="2.5" />
        <path d="M2 20v-2a6 6 0 0 1 12 0v2M15 14a5 5 0 0 1 7 5v1" />
      </>
    ),
    wildwood: (
      <>
        <path d="m8 3-5 8h3l-4 6h12l-4-6h3L8 3ZM8 17v4M17 6l-3 6h2l-2 4h8l-3-4h2l-4-6ZM18 16v5" />
      </>
    ),
    unknown: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.2 1-1.7 1.5-1.7 3.2" />
        <circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none" />
      </>
    ),
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[id]}
    </svg>
  );
}

export default function KithnaMap() {
  const navigate = useNavigate();
  const directoryRef = useRef<HTMLElement>(null);
  const lastDirectoryEntryRef = useRef<HTMLButtonElement>(null);
  const mapFrameRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const directory = directoryRef.current;
    const lastDirectoryEntry = lastDirectoryEntryRef.current;
    const mapFrame = mapFrameRef.current;
    if (!directory || !lastDirectoryEntry || !mapFrame) return;

    function sizeMap() {
      if (!directory || !lastDirectoryEntry || !mapFrame || !directory.offsetHeight) return;
      const height = lastDirectoryEntry.getBoundingClientRect().bottom -
        directory.getBoundingClientRect().top;
      const style = getComputedStyle(mapFrame);
      const horizontalFrame = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      const verticalFrame = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const width = (height - verticalFrame) * 1440 / 2559 + horizontalFrame;
      mapFrame.parentElement?.style.setProperty("--kithna-aligned-map-width", `${width}px`);
    }

    const observer = new ResizeObserver(sizeMap);
    observer.observe(directory);
    observer.observe(lastDirectoryEntry);
    sizeMap();
    return () => observer.disconnect();
  }, []);

  const [wildwoodMessageOpen, setWildwoodMessageOpen] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const { wildwood, statusError, loading, retry, visit, dialogue } =
    useKithnaQuests((route, status) => {
      if (route === "/kithna/wildwood" && !status?.wildwoodUnlocked) {
        setWildwoodMessageOpen(true);
        return;
      }
      navigate(route);
    });

  function activateLocation(marker: KithnaLocation) {
    if (marker.id === "unknown") return;

    const body = LOCATION_MESSAGES[marker.id];
    if (body) {
      setLocationMessage({ title: marker.label, body });
      return;
    }
    if (marker.id === "boat") {
      setLocationMessage({
        title: marker.label,
        body: "Travel Options are delayed due to a tropical storm.",
      });
      return;
    }
    if ("route" in marker) visit(marker.route);
  }

  function activateTarget(target: KithnaTarget) {
    const body = LOCATION_MESSAGES[target.id];
    if (body) {
      setLocationMessage({ title: target.label, body });
      return;
    }
    visit(target.route);
  }

  return (
    <main className="kithnaMapPage">
      <DpPopupWindow
        open={locationMessage !== null}
        onClose={() => setLocationMessage(null)}
        label={locationMessage?.title ?? "Kithna location"}
        size="compact"
        className="kithnaLocationPopup"
      >
        <h2>{locationMessage?.title}</h2>
        <p>{locationMessage?.body}</p>
        <button
          type="button"
          className="dp-btn"
          onClick={() => setLocationMessage(null)}
        >
          Close
        </button>
      </DpPopupWindow>
      {loading ? <p role="status">Loading quest status…</p> : null}
      {statusError ? (
        <div role="alert">
          <p>{statusError}</p>

          <button
            type="button"
            className="kithnaToolbarButton"
            onClick={() => retry()}
          >
            Retry quest status
          </button>
        </div>
      ) : null}

      <h1 className="kithnaDirectoryHeading dp-popup-grid-panel">
        <span>Welcome to Kithna</span>
      </h1>
      <nav ref={directoryRef} className="kithnaLocationDirectory" aria-label="Kithna location directory">
        {[
          ...DESKTOP_BUILDING_MARKERS.filter((marker) => marker.id === "hatchery"),
          ...DESKTOP_BUILDING_MARKERS.filter((marker) => marker.id === "pet-care"),
          ...DESKTOP_BUILDING_MARKERS.filter(
            (marker) => marker.id !== "hatchery" && marker.id !== "pet-care",
          ),
        ].map((marker) => (
          <button
            key={marker.id}
            ref={marker.id === "unknown" ? lastDirectoryEntryRef : undefined}
            type="button"
            className="kithnaDirectoryEntry dp-popup-grid-panel"
            aria-disabled={
              marker.id === "unknown" ||
              ((marker.id === "wildwood" || marker.id === "farm") && !wildwood)
            }
            onClick={() => activateLocation(marker)}
          >
            <KithnaMarkerIcon id={marker.id} />
            <span>
              <strong>{marker.label}</strong>
              <span className="kithnaDirectoryDescription">
                {LOCATION_DESCRIPTIONS[marker.id]}
              </span>
            </span>
          </button>
        ))}
      </nav>
      <section ref={mapFrameRef} className="kithnaMapFrame" aria-label="Kithna town map">
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

          <div className="kithnaDesktopCityHeading">
            <h2>Kithna</h2>

            <p>A peaceful city where every journey begins.</p>
          </div>

          <div
            className="kithnaDesktopBuildingMarkers"
            aria-label="Kithna buildings"
          >
            {DESKTOP_BUILDING_MARKERS.map((marker) => {
              const isWildwoodLocked =
                marker.id === "wildwood" && !wildwood?.wildwoodUnlocked;
              const isPreview = marker.id === "unknown";
              const isDisabled =
                isPreview ||
                ((marker.id === "wildwood" || marker.id === "farm") &&
                  !wildwood);
              const tooltip =
                marker.id === "boat"
                  ? "Travel Options are delayed due to a tropical storm."
                  : isPreview
                    ? "Coming Soon"
                    : isWildwoodLocked
                      ? "The path is currently inaccessible."
                      : marker.label;
              return (
                <span
                  key={marker.id}
                  className={`kithnaDesktopBuildingMarkerAnchor kithnaDesktopBuildingMarker--${marker.id}`}
                  title={tooltip}
                >
                  <button
                    type="button"
                    className="kithnaDesktopBuildingMarker"
                    aria-label={tooltip}
                    aria-disabled={isDisabled}
                    onClick={() => activateLocation(marker)}
                  >
                    <KithnaMarkerIcon id={marker.id} />
                  </button>
                  {marker.id === "wildwood" || marker.id === "farm" ? (
                    <KithnaQuestMarker
                      kind={marker.id === "wildwood" ? "main" : "food"}
                      status={
                        marker.id === "wildwood"
                          ? wildwood?.quest.status
                          : wildwood?.foodQuest.status
                      }
                      anchored
                    />
                  ) : null}
                </span>
              );
            })}
          </div>

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

          <div className="kithnaQuestMobileMarkers">
            <KithnaQuestMarker
              kind="food"
              status={wildwood?.foodQuest.status}
            />
            <KithnaQuestMarker kind="main" status={wildwood?.quest.status} />
          </div>

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

          {dialogue}

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
