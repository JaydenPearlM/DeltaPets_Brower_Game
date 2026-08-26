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
                DeltaPets is planned as free to play. Optional supporter
                purchases may be added later, while core gameplay remains
                accessible without requiring payment.
              </p>
            </div>
          </article>

          <article className="hp-supportPanelSection hp-heroFeature">
            <div className="hp-heroFeatureCopy">
              <span className="hp-heroFeatureLabel">FEATURES</span>

              <h3 className="hp-heroFeatureTitle">Open Alpha</h3>

              <p className="hp-heroFeatureText">
                DeltaPets is entering active public testing. Expect bugs,
                balance changes, evolving systems, and updates as player
                feedback helps shape the game.
              </p>
            </div>
          </article>

          <article className="hp-supportPanelSection hp-heroFeature">
            <div className="hp-heroFeatureCopy">
              <span className="hp-heroFeatureLabel">FEATURES</span>

              <h3 className="hp-heroFeatureTitle">Built by One Developer</h3>

              <p className="hp-heroFeatureText">
                DeltaPets is currently designed, programmed, illustrated, and
                maintained by one developer. Testing, feedback, and support help
                keep development moving.
              </p>
            </div>
          </article>
        </div>

        <p className="hp-supportPanelFooter">
          Support helps cover hosting, deployment, and continued development.
        </p>

        <a
          className="hp-supportPanelButton dp-btn dp-btn-yellow"
          href="https://ko-fi.com/deltapets"
          target="_blank"
          rel="noreferrer"
        >
          Support DeltaPets
        </a>
      </div>
    </section>
  );
}
