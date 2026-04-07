import "./homepage.css";
import { AnnouncementPanel } from "@/components/Announcements/AnnouncementPanel";
import { AlphaSystemsPanel } from "@/components/AlphaSystems/AlphaSystemsPanel";
import { useHomepageBanner } from "./useHomepageBanner";

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

const DELTA_SPOTLIGHT = {
  name: "Solite",
  meta: "Light • Hatchling • Level 1",
  text: "Gentle, bright-eyed, and protective. Solite looks harmless right up until it shields its trainer without hesitation.",
  tags: ["Light", "Bond 14", "Defender"],
};

export default function Homepage() {
  const { banner } = useHomepageBanner();

  return (
    <div className="hp-root">
      {banner?.enabled && banner.items.length > 0 ? (
        <section
          className={`hp-banner hp-banner--${banner.theme}`}
          aria-label="Site banner"
        >
          <div className="hp-bannerContent">
            <div className="hp-bannerTickerViewport">
              <div className="hp-bannerTickerTrack">
                {[...banner.items, ...banner.items].map((item, itemIndex) => (
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
              <a
                className="hp-primaryBtn hp-primaryBtn--journey"
                href="/signup"
              >
                Start Your Journey Today!
              </a>
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
          </div>
        </section>

        <section className="hp-lowerGrid" aria-label="Homepage content">
          <aside className="hp-newsColumn">
            <AnnouncementPanel />
          </aside>

          <div className="hp-spotlightColumn">
            <section
              className="hp-panel hp-panel--amber hp-spotlightPanel hp-spotlightPanel--featured"
              aria-label="Delta Spotlight"
            >
              <div className="hp-panelHeader">
                <div>
                  <h2 className="hp-panelTitle">Delta Spotlight</h2>
                  <p className="hp-panelDeck">Featured companion</p>
                </div>
              </div>

              <div className="hp-panelBody hp-spotlightBody">
                <div className="hp-spotlightVisual">
                  <div
                    className="hp-spotlightOrb hp-spotlightOrb--light"
                    aria-hidden="true"
                  />
                </div>

                <div className="hp-spotlightContent">
                  <div className="hp-spotlightTopline">
                    <h3 className="hp-spotlightName">{DELTA_SPOTLIGHT.name}</h3>
                    <p className="hp-spotlightMeta">{DELTA_SPOTLIGHT.meta}</p>
                  </div>

                  <p className="hp-spotlightText">{DELTA_SPOTLIGHT.text}</p>

                  <div className="hp-spotlightTags">
                    {DELTA_SPOTLIGHT.tags.map((tag) => (
                      <span key={tag} className="hp-elBadge">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <AlphaSystemsPanel className="hp-panel hp-panel--blue hp-createdPanel" />
          </div>
        </section>
      </div>
    </div>
  );
}
