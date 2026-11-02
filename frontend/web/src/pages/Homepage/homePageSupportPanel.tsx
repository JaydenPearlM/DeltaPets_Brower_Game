import "./homePageSupportPanel.css";

export function HomepageSupportPanel() {
  return (
    <section
      className="hp-supportPanel dp-standard-panel-purple"
      aria-labelledby="hp-support-panel-title"
    >
      <div className="hp-supportPanelInner">
        <h2
          id="hp-support-panel-title"
          className="hp-supportPanelTitle dp-standard-panel-title"
        >
          Support the World of Aliune
        </h2>

        <p className="hp-supportPanelIntro">
          DeltaPets is being built as an evolving browser pet game where players
          can raise, train, discover, and battle alongside their Kith.
        </p>

        <div className="hp-supportPanelSections">
          <article className="hp-supportPanelSection hp-heroFeature">
            <div className="hp-heroFeatureCopy">
              <span className="hp-heroFeatureLabel">FEATURES</span>

              <h3 className="hp-heroFeatureTitle">Free to Play</h3>

              <p className="hp-heroFeatureText">
                Core gameplay is planned to be free, with optional supporter
                purchases later.
              </p>
            </div>
          </article>

          <article className="hp-supportPanelSection hp-heroFeature">
            <div className="hp-heroFeatureCopy">
              <span className="hp-heroFeatureLabel">FEATURES</span>

              <h3 className="hp-heroFeatureTitle">Open Alpha</h3>

              <p className="hp-heroFeatureText">
                Public testing is coming. Expect bugs and updates as your
                feedback shapes Aliune.
              </p>
            </div>
          </article>

          <article className="hp-supportPanelSection hp-heroFeature">
            <div className="hp-heroFeatureCopy">
              <span className="hp-heroFeatureLabel">FEATURES</span>

              <h3 className="hp-heroFeatureTitle">Built by One Developer</h3>

              <p className="hp-heroFeatureText">
                Made by one developer, with your feedback and support helping
                Aliune grow.
              </p>
            </div>
          </article>
        </div>

        <p className="hp-supportPanelFooter">
          Support helps cover hosting, deployment, and continued development.
        </p>

        <a
          className="hp-supportPanelButton dp-btn dp-btn-yellow"
          href="https://ko-fi.com/deltapets/tiers"
          target="_blank"
          rel="noreferrer"
        >
          Support DeltaPets
        </a>
      </div>
    </section>
  );
}
