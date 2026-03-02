import { useEffect } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { StageLogo } from "@/components/stage_Logo";
import { CareRoom } from "@/pages/petsPage/components/petHomeComponents/careRoom";
import { AnnouncementsPanel } from "@/components/Announcements/AnnouncementPanel";
import { WhatsNextPanel } from "@/components/NextLogs/nextLogsPanel";
import "./homepage.css";

export default function Homepage() {
  const auth = useAuth();
  const isLoggedIn = Boolean(auth.user);

  useEffect(() => {
    document.body.classList.add("dp-homepage");
    return () => document.body.classList.remove("dp-homepage");
  }, []);

  return (
    <section className="homeWrap">
      <section className="homeGrid">
        {/* LEFT TOP: Haven Preview (STAYS) */}
        <section className="homeHaven surface">
          <div className="homePanelHeader">
            <div className="homePanelTitle">Haven Preview</div>
            <div className="homePanelHint">
              {isLoggedIn ? "Live" : "Guest (limited)"}
            </div>
          </div>

          <div className="homePanelBody">
            <CareRoom mode={isLoggedIn ? "auth" : "preview"} />
          </div>
        </section>

        {/* RIGHT: DeltaPets Block */}
        <section className="dpBlock surface">
          <div className="dpBlockGrid">
            {/* INFO (left column) */}
            <aside className="dpInfo" aria-label="Info about DeltaPets">
              <div className="dpInfoKicker">ALPHA</div>

              <h2 className="dpInfoTitle">Info about game</h2>

              <p className="dpInfoText">
                DeltaPets is a creature-raising world built around fondness for
                your pets. You can hatch eggs, do daily care, and complete daily
                quests (and non-daily quests). Watch your Delta grow through
                consistent routines : like going to the gym and leveling up
                normal stats or elemental stats.
              </p>

              <p className="dpInfoText">
                Secret Haven is your home base where you can track your Delta’s
                needs, progress, and future upgrades. Systems are being built in
                layers so the foundation stays stable.
              </p>

              {/* “In the box” */}
              <div className="dpInfoBox" aria-label="Current Alpha features">
                <div className="dpInfoBoxItem">Hatchery + Stat Framework</div>
                <div className="dpInfoBoxItem">Daily Care</div>
                <div className="dpInfoBoxItem">Secret Haven</div>
                <div className="dpInfoBoxItem">Events on the horizon</div>
              </div>

              {/* outside of square */}
              <p className="dpInfoNote">
                This is a solo dev project, the timelines may be longer than a
                full team, but the vision stays consistent.
              </p>
            </aside>

            {/* BRAND (top-right) */}
            <header className="dpBrand" aria-label="DeltaPets brand">
              <StageLogo size="lg" align="right" />
            </header>

            {/* ANNOUNCEMENTS */}
            <section className="dpAnn" aria-label="Announcements">
              <AnnouncementsPanel
                className="dp-announcements--steel"
                minHeight={0}
              />
            </section>

            {/* PREVIEWS (still inside the DeltaPets block) */}
            <section className="dpPreviews" aria-label="Preview blocks">
              <div className="dpPreviewsGrid">
                <div className="dpPreviewCard">
                  <div className="dpPreviewPill">Preview</div>
                  <div className="dpPreviewHint">Feature screenshot slot.</div>
                </div>

                <div className="dpPreviewCard">
                  <div className="dpPreviewPill">Preview</div>
                  <div className="dpPreviewHint">Roadmap teaser slot.</div>
                </div>

                <div className="dpPreviewCard">
                  <div className="dpPreviewPill">Preview</div>
                  <div className="dpPreviewHint">World / lore art slot.</div>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* LEFT BOTTOM: Whats Next (reusable component) */}
        <section className="homeNext">
          <WhatsNextPanel
            direction="right"
            items={[
              { label: "Now: core loop polish + stability", tone: "normal" },
              {
                label: "Next: progression + inventory foundations",
                tone: "new",
              },
              { label: "Patch notes + changes live here", tone: "hot" },
            ]}
          />
        </section>
      </section>
    </section>
  );
}
