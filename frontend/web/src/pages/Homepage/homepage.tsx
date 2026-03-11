import { useEffect } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { StageLogo } from "@/components/stage_Logo";
import { CareRoom } from "@/pages/petsPage/components/petHomeComponents/careRoom";
import { AnnouncementsPanel } from "@/components/Announcements/AnnouncementPanel";
import { NextLogsPanel } from "@/components/NextLogs/nextLogsPanel";
import "./homepage.css";

export default function Homepage() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    document.body.classList.add("dp-homepage");
    return () => document.body.classList.remove("dp-homepage");
  }, []);

  return (
    <section className="homeWrap">
      <section className="homeGrid">
        {/* RIGHT TOP: Care preview */}
        <section className="homeHaven surface">
          <div className="homeHavenTop">
            <div className="homeHavenTitleRow">
              <div />

              <div className="deltaRepoRightColumn">
                <div className="deltaRepositoryHeader">
                  <h3 className="bondRepositoryTitle">Delta Repository</h3>
                </div>

                <div className="deltaRepositoryInfoCard">
                  {/* Pet Description / Stats content here */}
                </div>
              </div>

              {isLoggedIn ? <div className="homePanelHint">Live</div> : <div />}
            </div>
          </div>

          <div className="homePanelBody">
            <CareRoom mode="preview" />
          </div>
        </section>

        {/* LEFT: DeltaPets block */}
        <section className="dpBlock surface">
          <div className="dpBlockGrid">
            {/* INFO */}
            <aside className="dpInfo" aria-label="Info about DeltaPets">
              <div className="dpInfoKicker">ALPHA</div>
              <h2 className="dpInfoTitle">Info about game</h2>

              <div className="dpInfoSection">
                <h3 className="dpInfoSubTitle">What is DeltaPets?</h3>
                <p className="dpInfoText">
                  DeltaPets is a creature-raising game about caring for pets,
                  building bonds, and watching them go from egg to Mythincal.
                </p>
              </div>

              <div className="dpInfoBox" aria-label="Upcoming events">
                <div className="dpInfoBoxHeading dpInfoBoxHeading--blink">
                  Events on Horizon
                </div>
                <div className="dpInfoBoxItem">Create a Pet Event</div>
                <div className="dpInfoBoxItem">Sale on potions</div>
                <div className="dpInfoBoxItem">New Items in Stock</div>
              </div>

              <div className="dpInfoSection dpInfoSection--about">
                <h3 className="dpInfoSubTitle">About this project</h3>
                <p className="dpInfoNote">
                  Hello! My name is Jay_Admin! This is a new solo dev project I
                  am creating, timelines may move slower than a full team
                  project. I also work full time, I create websites and work in
                  retail. The upside is that my vision stays consistent, the
                  world stays cohesive, and every system is being built with
                  long-term structure in mind. I intend on haveing some cool
                  events as well!
                </p>
                <p>Discord invite will be put here</p>
              </div>
            </aside>

            {/* BRAND */}
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

            {/* PREVIEWS */}
            <section className="dpPreviews" aria-label="Preview blocks">
              <div className="dpPreviewsGrid">
                <div className="dpPreviewCard">
                  <div className="dpPreviewPill">Preview</div>
                  <div className="dpPreviewHint">
                    Creature art and in-game preview slot.
                  </div>
                </div>

                <div className="dpPreviewCard">
                  <div className="dpPreviewPill">Preview</div>
                  <div className="dpPreviewHint">
                    PetsPage and care feature showcase slot.
                  </div>
                </div>

                <div className="dpPreviewCard">
                  <div className="dpPreviewPill">Preview</div>
                  <div className="dpPreviewHint">
                    World, lore, or event teaser slot.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* RIGHT BOTTOM: logs panel */}
        <section className="homeNext">
          <NextLogsPanel />
        </section>
      </section>
    </section>
  );
}
