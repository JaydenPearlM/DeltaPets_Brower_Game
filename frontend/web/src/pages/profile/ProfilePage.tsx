import { useState } from "react";
import "./ProfilePage.css";
import "../Homepage/homepage.css";
import { AnnouncementPanel } from "@/components/Announcements/AnnouncementPanel";
import { useAuth } from "@/app/providers/useAuth";
import { usePetStorage } from "@/components/Hatchery/pages/storage/usePetStorage";
import { useHomepageBanner } from "../Homepage/useHomepageBanner";
import MainTeam from "@/components/Main_Team/mainTeam";

type ProfilePageProps = {
  pageName?: string;
};

function formatJoinedDate(value?: string | null) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatElement(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "--";
  if (raw === "null" || raw === "null_element") return "Voidborne";

  const cleaned = raw.replace(/_/g, " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getElementClass(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_element$/, "");

  return `dp-profile-element-${normalized || "null"}`;
}

export default function ProfilePage({ pageName: _pageName }: ProfilePageProps) {
  const [selectedPartySlot, setSelectedPartySlot] = useState<number | null>(
    null,
  );
  const [talentTreesOpen, setTalentTreesOpen] = useState(false);

  const { user } = useAuth();
  const { banner } = useHomepageBanner();
  const { allPets, partySlots, loading } = usePetStorage({
    userId: user?.id,
  });

  const bannerItems =
    banner?.enabled && Array.isArray(banner.items)
      ? [...banner.items, ...banner.items]
      : [];

  const activePet = allPets.find((pet) => pet.is_active) ?? null;

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Trainer";

  const trainerLevel = user?.user_metadata?.trainer_level ?? 1;
  const starterElement = user?.user_metadata?.starter_element ?? null;
  const starterElementClass = getElementClass(starterElement);
  const activeElementClass = getElementClass(activePet?.line);

  return (
    <div className="dp-profile-page">
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

      <div className="dp-profile-layout">
        <section className="dp-profile-trainer-panel dp-profile-star-panel">
          <div className="dp-profile-viewport" aria-label="Trainer viewport">
            <span>Trainer Viewport</span>
            <small>Character customization coming later</small>
          </div>

          <div className="dp-profile-info">
            <h1 className={starterElementClass}>{displayName}</h1>

            <dl className="dp-profile-details">
              <div>
                <dt>Display Name</dt>
                <dd>{displayName}</dd>
              </div>

              <div>
                <dt>Trainer Level</dt>
                <dd>{trainerLevel}</dd>
              </div>

              <div>
                <dt>Joined</dt>
                <dd>{formatJoinedDate(user?.created_at)}</dd>
              </div>

              <div>
                <dt>Starter Element</dt>
                <dd>{formatElement(starterElement)}</dd>
              </div>

              <div>
                <dt>Title</dt>
                <dd>None Equipped</dd>
              </div>
            </dl>
          </div>

          <div
            className="dp-profile-alpha-ribbon"
            aria-label="Closed Alpha Tester ribbon"
          >
            <div className="dp-profile-alpha-medal">△</div>

            <div>
              <strong>Closed Alpha Tester</strong>
              <span>Thank you for helping shape Aliune.</span>
            </div>
          </div>
        </section>

        <section className="dp-profile-active-panel dp-profile-star-panel">
          <h2>Active Kith</h2>

          <div className="dp-profile-active-pet">
            {activePet?.portrait_url ? (
              <img
                src={activePet.portrait_url}
                alt={activePet.nickname || activePet.name || "Active Kith"}
              />
            ) : (
              <div className="dp-profile-pet-placeholder" aria-hidden="true">
                △
              </div>
            )}

            <h3 className={activeElementClass}>
              {activePet?.nickname || activePet?.name || "No Active Kith"}
            </h3>

            {activePet ? (
              <div className="dp-profile-active-stats">
                <div>
                  <span>HP</span>
                  <strong>{activePet.hp ?? "--"}</strong>
                </div>

                <div>
                  <span>ATK</span>
                  <strong>{activePet.atk ?? "--"}</strong>
                </div>

                <div>
                  <span>MAGI</span>
                  <strong>{activePet.magi ?? "--"}</strong>
                </div>

                <div>
                  <span>DEF</span>
                  <strong>{activePet.def ?? "--"}</strong>
                </div>

                <div>
                  <span>SPD</span>
                  <strong>{activePet.spd ?? "--"}</strong>
                </div>

                <div>
                  <span>Bond</span>
                  <strong>{activePet.bond ?? 0}%</strong>
                </div>
              </div>
            ) : (
              <p>Choose an active Kith to showcase it here.</p>
            )}
          </div>
        </section>

        <AnnouncementPanel
          className="dp-profile-announcements"
          pageScope="profile"
          title="Aliune Announcements"
        />

        <section className="dp-profile-panel dp-profile-talents-panel">
          <h2>Trainer Talent Trees</h2>

          <button
            type="button"
            className="btn btn-gold dp-profile-talents-button"
            onClick={() => setTalentTreesOpen(true)}
          >
            Trainer Talent Trees
          </button>
        </section>

        <section className="dp-profile-team-section">
          <div className="dp-profile-kith-owned">
            <span>Kith Owned</span>
            <strong>{loading ? "--" : allPets.length}</strong>
          </div>

          <MainTeam
            partySlots={partySlots}
            enableDragAndDrop={false}
            selectedPartySlot={selectedPartySlot}
            workingPetId={null}
            workingSlotIndex={null}
            dragOverSlotIndex={null}
            onSelectSlot={setSelectedPartySlot}
            onDragStartPet={() => undefined}
            onDragEndPet={() => undefined}
            onDragOverSlot={(event) => event.preventDefault()}
            onDragEnterSlot={() => undefined}
            onDragLeaveSlot={() => undefined}
            onDropOnSlot={(event) => event.preventDefault()}
            teamName="Kith Team"
          />
        </section>

        <section className="dp-profile-panel dp-profile-ribbons-panel">
          <h2>Trainer Ribbons</h2>

          <div className="dp-profile-ribbon-row">
            <div className="dp-profile-ribbon-small">△</div>

            <div>
              <strong>Closed Alpha Tester</strong>
              <p>Earned for participating in the DeltaPets Closed Alpha.</p>
            </div>
          </div>
        </section>

        <section className="dp-profile-panel dp-profile-achievements-panel">
          <h2>Achievements</h2>

          <div className="dp-profile-achievement-grid">
            <article>
              <strong>First Bond</strong>
              <span>Achievement locked</span>
            </article>

            <article>
              <strong>Growing Team</strong>
              <span>Achievement locked</span>
            </article>

            <article>
              <strong>Aliune Explorer</strong>
              <span>Achievement locked</span>
            </article>

            <article>
              <strong>Kith Keeper</strong>
              <span>Achievement locked</span>
            </article>
          </div>
        </section>
      </div>

      {talentTreesOpen ? (
        <div
          className="dp-profile-popup-backdrop"
          role="presentation"
          onMouseDown={() => setTalentTreesOpen(false)}
        >
          <section
            className="dp-profile-talent-popup dp-popup-grid-panel dp-blue-grid-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dp-profile-talent-popup-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dp-profile-popup-header">
              <h2 id="dp-profile-talent-popup-title">Trainer Talent Trees</h2>

              <button
                type="button"
                className="dp-close-button"
                onClick={() => setTalentTreesOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="dp-profile-talent-grid">
              <article>
                <h3>Genesis</h3>
                <p>Breeding, inherited traits, and egg development.</p>
                <span>Coming Soon</span>
              </article>

              <article>
                <h3>Bonding</h3>
                <p>Strengthen care, trust, and trainer-to-Kith bonuses.</p>
                <span>Coming Soon</span>
              </article>

              <article>
                <h3>Aggressive Fighter</h3>
                <p>Improve offensive support and battle-focused training.</p>
                <span>Coming Soon</span>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
