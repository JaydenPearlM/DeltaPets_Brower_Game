import "./homepage.css";
import { useNavigate } from "react-router-dom";
import { HomepageSupportPanel } from "./homePageSupportPanel";
import { AnnouncementPanel } from "@/components/Announcements/AnnouncementPanel";
import { KithnaEggTray } from "@/components/KithnaEggTray/KithnaEggTray";
import { useAuth } from "@/app/providers/useAuth";
import { usePetStorage } from "@/components/Hatchery/pages/storage/usePetStorage";
import { useHomepageBanner } from "./useHomepageBanner";
import { useHomepageSpotlightPet } from "./useHomepageSpotlightPet";
import EggHatchShowcase from "@/components/Video_hatch/EggHatchShowcase";

type HeroFeature = {
  label: string;
  title: string;
  text: string;
  icon: string;
};

const HERO_FEATURES: HeroFeature[] = [
  {
    label: "Features",
    title: "Hatch & Discover",
    icon: "",
    text: "Hatch elemental eggs, discover new Kith, and build a team full of different rarities, traits, mutations, and potential.",
  },
  {
    label: "Features",
    title: "Raise & Bond",
    icon: "",
    text: "Feed, clean, play with, and care for your Kith. Build trust over time as their personality, preferences, and bond begin to show.",
  },
  {
    label: "Features",
    title: "Train & Battle",
    icon: "",
    text: "Build your Kith for battle with stats, skills, elemental strengths, passive traits, mutations, and powerful Relics and Etchings.",
  },
];

export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { banner } = useHomepageBanner();
  const {
    pet: spotlightPet,
    displayName: spotlightDisplayName,
    loading: spotlightLoading,
  } = useHomepageSpotlightPet();

  const {
    inventoryEggs,
    loading: petStorageLoading,
    workingPetId,
    error: petStorageError,
    moveEggFromInventoryToStorage,
    moveEggFromInventoryToHatchery,
  } = usePetStorage({ userId: user?.id });

  const bannerItems =
    banner?.enabled && Array.isArray(banner.items)
      ? [...banner.items, ...banner.items]
      : [];

  const displayElement = spotlightPet
    ? spotlightPet.element === "null"
      ? "Voidborne"
      : spotlightPet.element.charAt(0).toUpperCase() +
        spotlightPet.element.slice(1)
    : "";

  const displayStage = spotlightPet
    ? spotlightPet.stage
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

  return (
    <div className="hp-root">
      {banner?.enabled && bannerItems.length > 0 ? (
        <section
          className={`hp-banner hp-banner--${banner.theme}`}
          aria-label="Site banner"
        >
          <div className="hp-bannerContent">
            <div className="hp-bannerTickerViewport">
              <div className="hp-bannerTickerTrack">
                {bannerItems.map((item, itemIndex) => (
                  <span
                    key={`${item}-${itemIndex}`}
                    className="hp-bannerTickerItem"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {banner.ctaLabel ? (
              <a className="hp-bannerLink" href={banner.ctaHref || "#"}>
                {banner.ctaLabel}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="hp-mainShell">
        <section className="hp-heroCard" aria-label="Homepage hero">
          <div className="hp-heroInner">
            <div className="hp-heroVideo">
              <EggHatchShowcase variant="embed" />
            </div>

            <div className="hp-heroContent">
              <div className="hp-heroBrandRow">
                <div className="hp-heroTitleWrap">
                  <h1 className="hp-heroTitle--logo">DeltaPets</h1>
                  <p className="hp-heroTagline">Raise. Train. Evolve. Bond.</p>
                </div>

                <div className="hp-heroCrest" aria-hidden="true">
                  ∆
                </div>
              </div>

              <p className="hp-heroSubtitle">
                Hatch, raise, train, bond, and battle alongside mysterious
                creatures called Kith. Build a team that feels like yours and
                discover what is waiting across{" "}
                <strong>
                  <span>Aliune</span>
                </strong>
                .
              </p>

              <div className="hp-heroCtaRow">
                <button
                  type="button"
                  className="hp-primaryBtn dp-btn"
                  onClick={() => navigate("/signup")}
                >
                  Start Your Journey Today!
                </button>
              </div>

              <div className="hp-heroFeatureRow">
                {HERO_FEATURES.map((feature) => (
                  <article key={feature.title} className="hp-heroFeature">
                    <div className="hp-heroFeatureCopy">
                      <span className="hp-heroFeatureLabel">
                        <span aria-hidden="true">{feature.icon}</span>{" "}
                        {feature.label}
                      </span>
                      <h3 className="hp-heroFeatureTitle">{feature.title}</h3>
                      <p className="hp-heroFeatureText">{feature.text}</p>
                    </div>
                  </article>
                ))}
              </div>

              <p className="hp-heroDisclaimer">
                Everything you see here belongs to <strong>Jayden</strong>. All
                DeltaPets art, UI design, characters, and world-building are
                handcrafted and owned by <strong>Jayden</strong>. AI tools are
                used solely to assist development workflows and never to
                generate creative assets. © 2026 <strong>Jayden</strong>.{" "}
                <strong>All rights reserved.</strong>
              </p>
            </div>
          </div>
        </section>
      </div>

      {user ? (
        <KithnaEggTray
          eggs={inventoryEggs}
          loading={petStorageLoading}
          workingPetId={workingPetId}
          error={petStorageError}
          onSendToStorage={moveEggFromInventoryToStorage}
          onStartIncubating={moveEggFromInventoryToHatchery}
        />
      ) : null}

      <section className="hp-lowerGrid" aria-label="Homepage content">
        <div className="hp-newsColumn">
          <AnnouncementPanel />
        </div>
        <div className="hp-spotlightColumn">
          <section
            className="hp-spotlightPanel hp-spotlightPanel--featured dp-standard-panel-purple"
            aria-label="Spotlight"
          >
            <div className="hp-panelHeader">
              <span className="hp-spotlightHeaderUser">
                {spotlightPet?.username} ★
              </span>

              <div>
                <h2 className="hp-panelTitle">Spotlight</h2>
              </div>
            </div>

            <div className="hp-panelBody hp-spotlightBody">
              {spotlightLoading ? (
                <p className="hp-loadingBlock">Loading spotlight pet...</p>
              ) : !spotlightPet ? (
                <p className="hp-loadingBlock">
                  No featured Kith is available right now.
                </p>
              ) : (
                <>
                  <div
                    className={`hp-spotlightVisual hp-spotlightVisual--${spotlightPet.element}`}
                  >
                    <div className="hp-spotlightPetFrame">
                      {spotlightPet.previewUrl ? (
                        <img
                          className="hp-spotlightPetImage"
                          src={spotlightPet.previewUrl}
                          alt={`${spotlightDisplayName} spotlight pet`}
                        />
                      ) : (
                        <span
                          className={`hp-spotlightPetFallback hp-spotlightPetFallback--${spotlightPet.element}`}
                          aria-hidden="true"
                        >
                          △
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hp-spotlightTop">
                    <div className="hp-spotlightIdentity">
                      <div className="hp-spotlightMetaRow">
                        <span className="hp-spotlightMetaItem">
                          <span className="hp-spotlightAccent">Level:</span>{" "}
                          {spotlightPet.level}
                        </span>

                        <span className="hp-spotlightMetaItem">
                          <span className="hp-spotlightAccent">Element:</span>{" "}
                          {displayElement}
                        </span>

                        <span className="hp-spotlightMetaItem">
                          <span className="hp-spotlightAccent">Stage:</span>{" "}
                          {displayStage}
                        </span>

                        <span className="hp-spotlightMetaItem">
                          <span className="hp-spotlightAccent">
                            Personality:
                          </span>{" "}
                          {spotlightPet.personality}
                        </span>

                        <span className="hp-spotlightMetaItem">
                          <span className="hp-spotlightAccent">
                            Passive Trait:
                          </span>{" "}
                          {spotlightPet.passiveTrait || "None"}
                        </span>

                        <span className="hp-spotlightMetaItem">
                          <span className="hp-spotlightAccent">Mutation:</span>{" "}
                          {spotlightPet.mutation || "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hp-spotlightContent">
                    <p className="hp-spotlightText">
                      {spotlightPet.description?.trim() ||
                        "This Delta's description will appear here."}
                    </p>

                    <div
                      className="hp-spotlightStats"
                      aria-label="Spotlight stats"
                    >
                      <div
                        className={[
                          "hp-spotlightStat",
                          spotlightPet.growthStrongStats.includes("hp")
                            ? "hp-spotlightStat--strong"
                            : "",
                          spotlightPet.growthWeakStat === "hp"
                            ? "hp-spotlightStat--weak"
                            : "",
                        ].join(" ")}
                      >
                        <span>HP</span>
                        <strong>
                          {spotlightPet.stats.hpCur}/{spotlightPet.stats.hpMax}
                        </strong>
                      </div>

                      <div
                        className={[
                          "hp-spotlightStat",
                          spotlightPet.growthStrongStats.includes("atk")
                            ? "hp-spotlightStat--strong"
                            : "",
                          spotlightPet.growthWeakStat === "atk"
                            ? "hp-spotlightStat--weak"
                            : "",
                        ].join(" ")}
                      >
                        <span>ATK</span>
                        <strong>{spotlightPet.stats.atk}</strong>
                      </div>

                      <div
                        className={[
                          "hp-spotlightStat",
                          spotlightPet.growthStrongStats.includes("def")
                            ? "hp-spotlightStat--strong"
                            : "",
                          spotlightPet.growthWeakStat === "def"
                            ? "hp-spotlightStat--weak"
                            : "",
                        ].join(" ")}
                      >
                        <span>DEF</span>
                        <strong>{spotlightPet.stats.def}</strong>
                      </div>

                      <div
                        className={[
                          "hp-spotlightStat",
                          spotlightPet.growthStrongStats.includes("spd")
                            ? "hp-spotlightStat--strong"
                            : "",
                          spotlightPet.growthWeakStat === "spd"
                            ? "hp-spotlightStat--weak"
                            : "",
                        ].join(" ")}
                      >
                        <span>SPD</span>
                        <strong>{spotlightPet.stats.spd}</strong>
                      </div>

                      <div
                        className={[
                          "hp-spotlightStat",
                          spotlightPet.growthStrongStats.includes("magi")
                            ? "hp-spotlightStat--strong"
                            : "",
                          spotlightPet.growthWeakStat === "magi"
                            ? "hp-spotlightStat--weak"
                            : "",
                        ].join(" ")}
                      >
                        <span>MAGI</span>
                        <strong>{spotlightPet.stats.magi}</strong>
                      </div>

                      <div
                        className={[
                          "hp-spotlightStat",
                          spotlightPet.growthStrongStats.includes("mana")
                            ? "hp-spotlightStat--strong"
                            : "",
                          spotlightPet.growthWeakStat === "mana"
                            ? "hp-spotlightStat--weak"
                            : "",
                        ].join(" ")}
                      >
                        <span>MANA</span>
                        <strong>{spotlightPet.stats.mana}</strong>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <HomepageSupportPanel />
        </div>
      </section>
    </div>
  );
}
