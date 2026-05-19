import "./homepage.css";
import { useNavigate } from "react-router-dom";
import { AnnouncementPanel } from "@/components/Announcements/AnnouncementPanel";
import { AlphaSystemsPanel } from "@/components/AlphaSystems/AlphaSystemsPanel";
import { DevLogLauncher } from "../../components/Devlog/DevLogLauncher";
import { useHomepageBanner } from "./useHomepageBanner";
import { useHomepageSpotlightPet } from "./useHomepageSpotlightPet";

type HeroFeature = {
  label: string;
  title: string;
  text: string;
  icon: string;
};

const HERO_FEATURES: HeroFeature[] = [
  {
    label: "Features",
    title: "Eggs",
    icon: "",
    text: "Every egg holds the start of something bigger. Hatch, raise, and discover a companion that can grow far beyond first impressions.",
  },
  {
    label: "Features",
    title: "Raise Through Care",
    icon: "",
    text: "Bond is everything. Feeding, cleaning, and spending time together does more than keep your Delta happy. It shapes growth.",
  },
  {
    label: "Features",
    title: "Element Training",
    icon: "",
    text: "Train your element. Shape your skills. Learn new abilities, strengthen roles, and open new ways to fight and grow.",
  },
];

export default function Homepage() {
  const navigate = useNavigate();
  const { banner } = useHomepageBanner();
  const {
    pet: spotlightPet,
    displayName: spotlightDisplayName,
    loading: spotlightLoading,
  } = useHomepageSpotlightPet();

  const bannerItems =
    banner?.enabled && Array.isArray(banner.items)
      ? [...banner.items, ...banner.items]
      : [];

  const displayElement =
    spotlightPet.element === "null"
      ? "Voidborne"
      : spotlightPet.element.charAt(0).toUpperCase() +
        spotlightPet.element.slice(1);

  const displayStage = spotlightPet.stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

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
              Hatch, raise, and bond with elemental creatures in the growing
              world of <span>Aliune</span>.
            </p>

            <div className="hp-heroCtaRow">
              <button
                type="button"
                className="hp-primaryBtn hp-primaryBtn--journey"
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
              Everything you see here belongs to Jayden. All DeltaPets art, UI
              design, characters, and world-building are handcrafted and owned
              by Jayden. AI tools are used solely to assist development
              workflows and never to generate creative assets. © 2026 Jayden.
              All rights reserved.
            </p>
          </div>
        </section>
      </div>

      <section className="hp-lowerGrid" aria-label="Homepage content">
        <aside className="hp-newsColumn">
          <AnnouncementPanel />
        </aside>

        <div className="hp-spotlightColumn">
          <section
            className="hp-panel hp-panel--amber hp-spotlightPanel hp-spotlightPanel--featured"
            aria-label="Spotlight"
          >
            <div className="hp-panelHeader">
              <div>
                <h2 className="hp-panelTitle">Spotlight</h2>
              </div>
            </div>

            <div className="hp-panelBody hp-spotlightBody">
              {spotlightLoading ? (
                <p className="hp-loadingBlock">Loading spotlight pet...</p>
              ) : (
                <>
                  <div className="hp-spotlightTop">
                    <div className="hp-spotlightIdentity">
                      <h3
                        className={`hp-spotlightName hp-spotlightName--${spotlightPet.element}`}
                      >
                        {spotlightDisplayName}
                      </h3>

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
                      </div>
                    </div>
                  </div>

                  <div
                    className={`hp-spotlightVisual hp-spotlightVisual--${spotlightPet.element}`}
                  >
                    <div
                      className={`hp-spotlightOrb hp-spotlightOrb--${spotlightPet.element}`}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="hp-spotlightContent">
                    <p className="hp-spotlightText">
                      {spotlightPet.description?.trim() ||
                        "This Delta's description will appear here."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <AlphaSystemsPanel />
        </div>
      </section>
    </div>
  );
}
