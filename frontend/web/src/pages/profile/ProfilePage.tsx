import { useEffect, useState } from "react";
import "./ProfilePage.css";
import "../Homepage/homepage.css";
import "../../mobile.css";
import { useAuth } from "@/app/providers/useAuth";
import { usePetStorage } from "@/components/Hatchery/pages/storage/usePetStorage";
import { useHomepageBanner } from "../Homepage/useHomepageBanner";
import { AnnouncementPanel } from "@/components/Announcements/AnnouncementPanel";
import { supabase } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/baseClient";
import { WeeklyRewardsBar } from "@/components/rewards/weeklyRewardsBar";
import PoeTayToe from "@/components/PoeTayToe/PoeTayToe";
import { getRewardsStatus } from "@/components/rewards/claimRewards";
import templateSprite from "@/kith/assets/Sprite/Template_Sprite.png";
import cribiHatchling from "@/kith/assets/startepets/hatchling_cribi.png";
import espyrHatchling from "@/kith/assets/startepets/hatchling_Espyr.png";

type ProfilePageProps = {
  pageName?: string;
};

const ALPHA_ACHIEVEMENTS = [
  {
    title: "First Bond",
    text: "Reach your first meaningful bond milestone with a Kith.",
  },
  {
    title: "Growing Team",
    text: "Build out your Kith team during the Closed Alpha.",
  },
  {
    title: "Aliune Explorer",
    text: "Explore the world of Aliune during the Closed Alpha.",
  },
  {
    title: "Kith Keeper",
    text: "Care for your Kith and keep them happy and healthy.",
  },
  {
    title: "First Hatch",
    text: "Hatch your first Kith during the Closed Alpha.",
  },
  {
    title: "Elemental Start",
    text: "Begin your journey with your starter element.",
  },
  {
    title: "Roaming Trainer",
    text: "Find a Kith while roaming.",
  },
  {
    title: "Rare Encounter",
    text: "Encounter a Rare Kith.",
  },
  {
    title: "Epic Encounter",
    text: "Encounter an Epic Kith.",
  },
  {
    title: "Care Routine",
    text: "Use care actions to look after your Kith.",
  },
  {
    title: "Well Fed",
    text: "Feed your Kith during the Closed Alpha.",
  },
  {
    title: "Play Time",
    text: "Use a toy with one of your Kith.",
  },
  {
    title: "Rested Up",
    text: "Help one of your Kith recover through rest.",
  },
  {
    title: "Dot Collector",
    text: "Earn Dots during the Closed Alpha.",
  },
  {
    title: "Weekly Reward",
    text: "Claim a Weekly Reward.",
  },
  {
    title: "Merchant Visitor",
    text: "Visit a merchant during the Closed Alpha.",
  },
  {
    title: "Egg Collector",
    text: "Add an egg to your collection.",
  },
  {
    title: "Team Builder",
    text: "Place multiple Kith on your active team.",
  },
  {
    title: "Registry Scout",
    text: "Discover multiple Kith species for your registry.",
  },
  {
    title: "Closed Alpha Tester",
    text: "Participate in the DeltaPets Closed Alpha.",
  },
] as const;

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
  const [dots, setDots] = useState<number | null>(null);
  const [kithDiscovered, setKithDiscovered] = useState<number | null>(null);
  const [weeklyRewardsOpen, setWeeklyRewardsOpen] = useState(false);
  const [rewardReady, setRewardReady] = useState(false);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [trainerLevel, setTrainerLevel] = useState(1);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  const { user } = useAuth();
  const { banner } = useHomepageBanner();
  const { allPets, loading } = usePetStorage({
    userId: user?.id,
  });

  useEffect(() => {
    if (!user?.id) {
      setActiveTitle(null);
      return;
    }

    void supabase
      .from("profiles")
      .select("active_title")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setActiveTitle(null);
          return;
        }

        setActiveTitle(data?.active_title ?? null);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setDots(null);
      return;
    }

    let cancelled = false;

    void apiFetch<{
      wallet?: {
        dots?: number;
      };
    }>("/api/inventory")
      .then((result) => {
        if (!cancelled) {
          setDots(
            typeof result?.wallet?.dots === "number"
              ? result.wallet.dots
              : null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setDots(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setKithDiscovered(null);
      return;
    }

    let cancelled = false;

    void supabase
      .from("user_kith_discoveries")
      .select("species_key")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          setKithDiscovered(null);
          return;
        }

        setKithDiscovered(data?.length ?? 0);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const bannerItems =
    banner?.enabled && Array.isArray(banner.items)
      ? [...banner.items, ...banner.items]
      : [];

  const activePet = allPets.find((pet) => pet.is_active) ?? null;
  const activePetImage =
    activePet?.portrait_url ||
    (activePet?.species === "ice_starter"
      ? cribiHatchling
      : activePet?.species === "shadow_night_bad" ||
          activePet?.species === "shadow_day_good"
        ? espyrHatchling
        : "");

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Trainer";

  const starterElement = user?.user_metadata?.starter_element ?? null;
  const starterElementClass = getElementClass(starterElement);
  const activeElementClass = getElementClass(activePet?.line);

  useEffect(() => {
    if (!user) {
      setTrainerLevel(1);
      return;
    }

    void apiFetch<{ trainer_level: number }>("/api/me/trainer-progression")
      .then((progression) => setTrainerLevel(progression.trainer_level))
      .catch(() => setTrainerLevel(1));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRewardReady(false);
      return;
    }

    void getRewardsStatus()
      .then((status) => setRewardReady(status.canClaim))
      .catch(() => setRewardReady(false));
  }, [user]);

  useEffect(() => {
    if (!weeklyRewardsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [weeklyRewardsOpen]);

  return (
    <div className="dp-profile-page poeTayToeHost">
      <PoeTayToe locationKey="profile" />

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
        <AnnouncementPanel className="dp-profile-aliune-channel" />

        <section className="dp-profile-trainer-panel dp-profile-star-panel">
          <div className="dp-profile-viewport" aria-label="Trainer viewport">
            <div className={`dp-profile-trainer-avatar ${starterElementClass}`}>
              <img src={templateSprite} alt="Trainer" />
            </div>

            <button
              type="button"
              className="btn btn-gold dp-profile-customize-button"
              onClick={() => setCustomizeOpen((current) => !current)}
              aria-expanded={customizeOpen}
            >
              Customize
            </button>
          </div>

          {customizeOpen ? (
            <div className="dp-profile-customizer">
              <button type="button" className="dp-profile-customizer-card">
                <strong>Hair</strong>
                <span>Hairstyle</span>
                <span>Hair Color</span>
              </button>

              <button type="button" className="dp-profile-customizer-card">
                <strong>Skin</strong>
                <span>Skin Color</span>
              </button>

              <button type="button" className="dp-profile-customizer-card">
                <strong>Eyes</strong>
                <span>Eye Style</span>
                <span>Eye Color</span>
              </button>
            </div>
          ) : (
            <div className="dp-profile-info">
              <h1 className={starterElementClass}>
                {activeTitle ?? displayName}
              </h1>

              <button
                type="button"
                className={`btn btn-gold dp-profile-rewards-button${
                  rewardReady ? " is-ready" : ""
                }`}
                onClick={() => setWeeklyRewardsOpen(true)}
              >
                Weekly Rewards
              </button>

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
                  <dd>{activeTitle ?? "None Equipped"}</dd>
                </div>

                {activeTitle === "Alpha Pro" ? (
                  <div>
                    <dt>Title Bonus</dt>
                    <dd>Mend Healing +5%</dd>
                  </div>
                ) : null}

                <div>
                  <dt>Dots</dt>
                  <dd>{dots === null ? "--" : dots.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          )}

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
            {activePetImage ? (
              <img
                src={activePetImage}
                alt={activePet?.nickname || activePet?.name || "Active Kith"}
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

        <section className="dp-profile-team-section">
          <div className="dp-profile-kith-owned">
            <div>
              <span>Kith Owned</span>
              <strong>{loading ? "--" : allPets.length}</strong>
            </div>

            <div>
              <span>Kith Discovered</span>
              <strong>{kithDiscovered === null ? "--" : kithDiscovered}</strong>
            </div>
          </div>
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

      {weeklyRewardsOpen ? (
        <div
          className="dp-profile-popup-backdrop"
          role="presentation"
          onMouseDown={() => setWeeklyRewardsOpen(false)}
        >
          <section
            className="dp-profile-rewards-popup"
            role="dialog"
            aria-modal="true"
            aria-label="Weekly Rewards"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <WeeklyRewardsBar
              onClose={() => {
                setWeeklyRewardsOpen(false);

                void getRewardsStatus()
                  .then((status) => setRewardReady(status.canClaim))
                  .catch(() => setRewardReady(false));
              }}
            />
          </section>
        </div>
      ) : null}

      {achievementsOpen ? (
        <div
          className="dp-profile-popup-backdrop"
          role="presentation"
          onMouseDown={() => setAchievementsOpen(false)}
        >
          <section
            className="dp-profile-achievements-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dp-profile-achievements-popup-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dp-profile-popup-header">
              <h2 id="dp-profile-achievements-popup-title">
                Alpha Achievements
              </h2>

              <button
                type="button"
                className="dp-close-button"
                onClick={() => setAchievementsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="dp-profile-alpha-achievement-list">
              {ALPHA_ACHIEVEMENTS.map((achievement, index) => (
                <article key={achievement.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>

                  <div>
                    <strong>{achievement.title}</strong>
                    <p>{achievement.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
