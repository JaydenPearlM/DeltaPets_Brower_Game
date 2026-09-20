import { useEffect, useRef, useState } from "react";
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
import type { BackendInventoryItem } from "@/components/inventory/inventory";
import { AvatarPreview } from "@/components/Profile/Customization/AvatarPreview";
import { createRandomAvatar } from "@/components/Profile/Customization/createRandomAvatar";
import {
  BODY_FRAMES,
  HAIR_STYLES,
  HAIR_COLORS,
  SKIN_TONES,
  EYE_STYLES,
  EYE_COLORS,
  MOUTH_STYLES,
} from "@/components/Profile/Customization/avatarCatalog";
import { getStarterPortrait } from "@/kith/registry/starterPortraits";
import { getKithnaPortrait } from "@/kith/registry/kithnaPortraits";
import ClosedAlphaRibbon from "./ClosedAlphaRibbon";

type ProfilePageProps = {
  pageName?: string;
};

const CLOSED_ALPHA_TITLE = "Closed Alpha Title";
const CLOSED_ALPHA_TITLE_DESCRIPTION =
  "Available for participating in the DeltaPets Closed Alpha.";
const ALPHA_PRO_EFFECT = "Mend Healing +5%";
type SelectableTitle = typeof CLOSED_ALPHA_TITLE | "Alpha Pro";

const AVATAR_CONTROLS = [
  { key: "bodyFrame", label: "Body", options: BODY_FRAMES },
  { key: "hairStyle", label: "Hair", options: HAIR_STYLES },
  { key: "hairColor", label: "Hair Color", options: HAIR_COLORS },
  { key: "skinTone", label: "Skin", options: SKIN_TONES },
  { key: "eyeStyle", label: "Eyes", options: EYE_STYLES },
  { key: "eyeColor", label: "Eye Color", options: EYE_COLORS },
  { key: "mouthStyle", label: "Mouth", options: MOUTH_STYLES },
] as const;

const CLOSED_ALPHA_TESTER_EMAILS = new Set([
  "jaydentestemail6790@gmail.com",
  "estes_c@hotmail.com",
  "wildssam8@gmail.com",
  "p.kurzawski@yahoo.com",
  "cindy_sanner@yahoo.com",
  "holyfoleyproductions@gmail.com",
  "saitinsangel@hotmail.com",
  "cjtonry1@gmail.com",
]);

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
] as const;

const TRAINER_RIBBONS = [
  "First Bond",
  "Kith Keeper",
  "Explorer",
  "Team Builder",
  "Element Student",
  "Wildwood Pathfinder",
  "Experienced Trainer",
  "Registry Scholar",
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

type ActiveKithStats = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
};

export default function ProfilePage({ pageName: _pageName }: ProfilePageProps) {
  const [dots, setDots] = useState<number | null>(null);
  const [starterElement, setStarterElement] = useState<string | null>(null);
  const [corruptedEggsLost, setCorruptedEggsLost] = useState<number | null>(
    null,
  );
  const [kithOwned, setKithOwned] = useState<number | null>(null);
  const [haikuScrollsFound, setHaikuScrollsFound] = useState<number | null>(
    null,
  );
  const [activeKithStats, setActiveKithStats] =
    useState<ActiveKithStats | null>(null);
  const [weeklyRewardsOpen, setWeeklyRewardsOpen] = useState(false);
  const [rewardReady, setRewardReady] = useState(false);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [alphaProUnlocked, setAlphaProUnlocked] = useState(false);
  const [titleLoading, setTitleLoading] = useState(true);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [titlesOpen, setTitlesOpen] = useState(false);
  const [trainerLevel, setTrainerLevel] = useState(1);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // Temporary per-mount preview; saved account customization comes in a later phase.
  const [avatarCustomization, setAvatarCustomization] =
    useState(createRandomAvatar);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  const titleRequestVersion = useRef(0);
  const titleSelectorRef = useRef<HTMLButtonElement>(null);
  const titleDialogRef = useRef<HTMLElement>(null);

  const { user } = useAuth();
  const { banner } = useHomepageBanner();
  const { allPets } = usePetStorage({
    userId: user?.id,
  });

  const isClosedAlphaTester = CLOSED_ALPHA_TESTER_EMAILS.has(
    (user?.email ?? "").trim().toLowerCase(),
  );

  const equippedTitle =
    activeTitle === CLOSED_ALPHA_TITLE && !isClosedAlphaTester
      ? null
      : activeTitle;

  useEffect(() => {
    const requestVersion = ++titleRequestVersion.current;
    const userId = user?.id;

    setActiveTitle(null);
    setAlphaProUnlocked(false);
    setTitleError(null);
    setTitleSaving(false);
    setTitlesOpen(false);
    setTitleLoading(Boolean(userId));

    if (!userId) return;

    let cancelled = false;

    async function loadTitle() {
      try {
        // These are the same award sources used to grant Alpha Pro originally.
        const [profile, trainerAward, petAward] = await Promise.all([
          supabase
            .from("profiles")
            .select("active_title")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("trainer_awards")
            .select("id, awards!inner(key)")
            .eq("user_id", userId)
            .eq("awards.key", "alpha_tester")
            .limit(1),
          supabase
            .from("pet_awards")
            .select("id, awards!inner(key), pets!inner(user_id)")
            .eq("pets.user_id", userId)
            .eq("awards.key", "alpha_tester")
            .limit(1),
        ]);

        if (cancelled || requestVersion !== titleRequestVersion.current) {
          return;
        }

        if (profile.error) {
          setTitleError("Could not load your title. Please reload the page.");
          return;
        }

        setActiveTitle(profile.data?.active_title ?? null);
        setAlphaProUnlocked(
          profile.data?.active_title === "Alpha Pro" ||
            (!trainerAward.error && Boolean(trainerAward.data?.length)) ||
            (!petAward.error && Boolean(petAward.data?.length)),
        );
        if (trainerAward.error || petAward.error) {
          setTitleError(
            "Some unlocked titles could not be loaded. Please reload the page.",
          );
        }
      } catch {
        if (!cancelled && requestVersion === titleRequestVersion.current) {
          setTitleError("Could not load your title. Please reload the page.");
        }
      } finally {
        if (!cancelled && requestVersion === titleRequestVersion.current) {
          setTitleLoading(false);
        }
      }
    }

    void loadTitle();

    return () => {
      cancelled = true;
      titleRequestVersion.current += 1;
    };
  }, [user?.id]);

  async function equipTitle(nextTitle: SelectableTitle | null) {
    const userId = user?.id;

    if (!userId || titleLoading || titleSaving) return;
    if (nextTitle === CLOSED_ALPHA_TITLE && !isClosedAlphaTester) return;
    if (nextTitle === "Alpha Pro" && !alphaProUnlocked) return;

    const requestVersion = titleRequestVersion.current;

    setTitleSaving(true);
    setTitleError(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ active_title: nextTitle })
        .eq("user_id", userId)
        .select("active_title")
        .maybeSingle();

      if (requestVersion !== titleRequestVersion.current) return;

      if (error || !data) {
        setTitleError("Could not save your title. Please try again.");
        return;
      }

      setActiveTitle(data.active_title ?? null);
    } catch {
      if (requestVersion === titleRequestVersion.current) {
        setTitleError("Could not save your title. Please try again.");
      }
    } finally {
      if (requestVersion === titleRequestVersion.current) {
        setTitleSaving(false);
      }
    }
  }

  useEffect(() => {
    setActiveKithStats(null);

    if (!user?.id) return;

    let cancelled = false;

    void apiFetch<{
      stats: ActiveKithStats | null;
    }>("/api/care/current")
      .then((result) => {
        if (!cancelled) {
          setActiveKithStats(result.stats ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActiveKithStats(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    setKithOwned(null);

    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;

    async function loadKithOwned() {
      try {
        const { count, error } = await supabase
          .from("pets")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (cancelled) return;

        setKithOwned(error ? null : count);
      } catch {
        if (!cancelled) {
          setKithOwned(null);
        }
      }
    }

    void loadKithOwned();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    setDots(null);

    const userId = user?.id;
    if (!userId || weeklyRewardsOpen) return;

    let cancelled = false;

    async function loadDots() {
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select("dots")
          .eq("user_id", userId)
          .maybeSingle();

        if (cancelled) return;

        if (error || data?.dots == null) {
          setDots(null);
          return;
        }

        const balance = Number(data.dots);
        setDots(Number.isFinite(balance) ? balance : null);
      } catch {
        if (!cancelled) {
          setDots(null);
        }
      }
    }

    void loadDots();

    return () => {
      cancelled = true;
    };
  }, [user?.id, weeklyRewardsOpen]);

  useEffect(() => {
    setHaikuScrollsFound(null);
    if (!user?.id || weeklyRewardsOpen) return;

    let cancelled = false;

    void apiFetch<{ items: BackendInventoryItem[] }>("/api/inventory")
      .then(({ items }) => {
        if (cancelled) return;

        const collectedScrolls = new Set(
          items
            .filter(
              (item) => item.effects?.collection === "haiku" && item.qty > 0,
            )
            .map((item) => item.slug),
        );
        setHaikuScrollsFound(collectedScrolls.size);
      })
      .catch(() => {
        if (!cancelled) setHaikuScrollsFound(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, weeklyRewardsOpen]);

  const bannerItems =
    banner?.enabled && Array.isArray(banner.items)
      ? [...banner.items, ...banner.items]
      : [];

  const activePet = allPets.find((pet) => pet.is_active) ?? null;
  const activePetImage =
    getStarterPortrait(activePet?.species) ||
    getKithnaPortrait(activePet?.species) ||
    getKithnaPortrait(activePet?.name) ||
    getStarterPortrait(activePet?.name) ||
    activePet?.portrait_url ||
    "";

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Trainer";

  const titledTrainerName = equippedTitle
    ? `${equippedTitle} ${displayName}`
    : displayName;

  useEffect(() => {
    let cancelled = false;
    setStarterElement(null);
    setCorruptedEggsLost(null);
    const userId = user?.id;
    if (!userId) return;

    async function loadPermanentStats() {
      const results = await Promise.allSettled([
        supabase
          .from("eggs")
          .select("starter_element")
          .eq("user_id", userId)
          .eq("is_original_starter", true)
          .maybeSingle(),
        supabase
          .from("trainer_progression")
          .select("corrupted_eggs_lost")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const [starter, losses] = results;
      if (starter.status === "fulfilled" && !starter.value.error) {
        setStarterElement(starter.value.data?.starter_element ?? null);
      }
      if (losses.status === "fulfilled" && !losses.value.error) {
        setCorruptedEggsLost(losses.value.data?.corrupted_eggs_lost ?? 0);
      }
    }
    void loadPermanentStats();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
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
    if (!weeklyRewardsOpen && !titlesOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [weeklyRewardsOpen, titlesOpen]);

  useEffect(() => {
    if (!titlesOpen) return;

    const selector = titleSelectorRef.current;
    const dialog = titleDialogRef.current;
    dialog?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setTitlesOpen(false);
      }

      if (event.key !== "Tab" || !dialog) return;

      const buttons = Array.from(
        dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      );
      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      selector?.focus();
    };
  }, [titlesOpen]);

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
        <section className="dp-profile-trainer-panel dp-profile-star-panel">
          <div className="dp-profile-viewport" aria-label="Trainer viewport">
            <div className={`dp-profile-trainer-avatar ${starterElementClass}`}>
              <AvatarPreview customization={avatarCustomization} />
            </div>

            <button
              type="button"
              className="btn btn-gold dp-profile-customize-button"
              onClick={() => setCustomizeOpen((current) => !current)}
              aria-expanded={customizeOpen}
            >
              Customize
            </button>

            <div className="dp-profile-alpha-ribbon-stack">
              <ClosedAlphaRibbon />

              <span className="dp-profile-alpha-ribbon-message">
                Thank you for helping shape Aliune!
              </span>

              <button
                type="button"
                className={`btn btn-gold dp-profile-rewards-button${
                  rewardReady ? " is-ready" : ""
                }`}
                onClick={() => setWeeklyRewardsOpen(true)}
              >
                Weekly Rewards
              </button>
            </div>
          </div>

          {customizeOpen ? (
            <div className="dp-profile-customizer">
              {AVATAR_CONTROLS.map(({ key, label, options }) => (
                <button
                  key={key}
                  type="button"
                  className="dp-profile-customizer-card"
                  disabled={
                    key === "hairColor" &&
                    avatarCustomization.hairStyle === "hair-bald"
                  }
                  onClick={() =>
                    setAvatarCustomization((current) => {
                      const index = options.findIndex(
                        (option) => option.id === current[key],
                      );
                      const next = options[(index + 1) % options.length];
                      return next ? { ...current, [key]: next.id } : current;
                    })
                  }
                >
                  <strong>{label}</strong>
                  <span>
                    {
                      options.find(
                        (option) => option.id === avatarCustomization[key],
                      )?.label
                    }
                  </span>
                  <span>Click to change</span>
                </button>
              ))}
              <p>Preview only. Changes reset when you leave this page.</p>
            </div>
          ) : (
            <div className="dp-profile-info">
              <h1 className={starterElementClass}>{titledTrainerName}</h1>

              <dl className="dp-profile-details">
                <div>
                  <dt>Display Name</dt>
                  <dd>{titledTrainerName}</dd>
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
                  <dd>
                    <span className="dp-profile-title-value">
                      {titleLoading
                        ? "Loading title..."
                        : (equippedTitle ?? "No Title")}{" "}
                      <button
                        ref={titleSelectorRef}
                        type="button"
                        className="dp-profile-title-selector"
                        aria-label="Choose title"
                        aria-haspopup="dialog"
                        aria-expanded={titlesOpen}
                        aria-controls="dp-profile-title-list"
                        onClick={() => setTitlesOpen(true)}
                      >
                        <svg viewBox="0 0 20 16" aria-hidden="true">
                          <path
                            d="M2 2 H18 L10 14 Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </span>
                    {equippedTitle === CLOSED_ALPHA_TITLE ? (
                      <p className="dp-profile-title-description">
                        {CLOSED_ALPHA_TITLE_DESCRIPTION}
                      </p>
                    ) : null}
                    {!titlesOpen && titleError ? (
                      <p role="alert">{titleError}</p>
                    ) : null}
                  </dd>
                </div>

                {equippedTitle === "Alpha Pro" ? (
                  <div>
                    <dt>Title Bonus</dt>
                    <dd>{ALPHA_PRO_EFFECT}</dd>
                  </div>
                ) : null}

                <div>
                  <dt>Dots</dt>
                  <dd>{dots === null ? "--" : dots.toLocaleString()}</dd>
                </div>

                <div>
                  <dt>Kith Owned</dt>
                  <dd>
                    {kithOwned === null ? "--" : kithOwned.toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt>Haiku Scrolls Found</dt>
                  <dd>
                    {haikuScrollsFound === null
                      ? "--"
                      : haikuScrollsFound.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt>Corrupted Eggs Hatched</dt>
                  <dd>
                    {corruptedEggsLost === null
                      ? "--"
                      : corruptedEggsLost.toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          )}
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
                  <strong>{activeKithStats?.hp ?? "--"}</strong>
                </div>

                <div>
                  <span>ATK</span>
                  <strong>{activeKithStats?.atk ?? "--"}</strong>
                </div>

                <div>
                  <span>MAGI</span>
                  <strong>{activeKithStats?.magi ?? "--"}</strong>
                </div>

                <div>
                  <span>DEF</span>
                  <strong>{activeKithStats?.def ?? "--"}</strong>
                </div>

                <div>
                  <span>SPD</span>
                  <strong>{activeKithStats?.spd ?? "--"}</strong>
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

        <div className="dp-profile-lower-layout">
          <AnnouncementPanel className="dp-profile-aliune-channel" />

          <div className="dp-profile-panel dp-standard-panel dp-profile-progression-panel">
            <section className="dp-profile-ribbons-panel">
              <h2>Trainer Ribbons</h2>

              <div className="dp-profile-ribbon-grid">
                {TRAINER_RIBBONS.map((ribbon) => (
                  <article className="dp-profile-ribbon-row" key={ribbon}>
                    <strong>{ribbon}</strong>
                    <p>Locked</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="dp-profile-achievements-panel">
              <h2 id="dp-profile-achievements-title">Achievements</h2>

              <div
                className="dp-profile-achievement-grid"
                role="region"
                aria-labelledby="dp-profile-achievements-title"
                tabIndex={0}
              >
                {ALPHA_ACHIEVEMENTS.map((achievement) => (
                  <article key={achievement.title}>
                    <strong>{achievement.title}</strong>
                    <span>Achievement locked</span>
                    <span>{achievement.text}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {titlesOpen ? (
        <div
          className="dp-profile-popup-backdrop"
          role="presentation"
          onMouseDown={() => setTitlesOpen(false)}
        >
          <section
            ref={titleDialogRef}
            id="dp-profile-title-list"
            className="dp-profile-rewards-popup dp-profile-titles-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dp-profile-titles-heading"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dp-profile-popup-header">
              <h2 id="dp-profile-titles-heading">Titles</h2>
              <button
                type="button"
                className="dp-close-button"
                onClick={() => setTitlesOpen(false)}
              >
                Close
              </button>
            </div>
            <div
              className="dp-profile-talent-grid"
              aria-busy={titleLoading || titleSaving}
            >
              {titleLoading ? (
                <p role="status">Loading titles...</p>
              ) : (
                <>
                  <article>
                    <h3>No Title</h3>
                    <p>Show your trainer name without a title.</p>
                    <button
                      type="button"
                      className="btn btn-gold"
                      disabled={
                        !user?.id || titleSaving || activeTitle === null
                      }
                      onClick={() => void equipTitle(null)}
                    >
                      {activeTitle === null ? "Selected" : "Unequip"}
                    </button>
                  </article>
                  {isClosedAlphaTester ? (
                    <article>
                      <h3>{CLOSED_ALPHA_TITLE}</h3>
                      <p>{CLOSED_ALPHA_TITLE_DESCRIPTION}</p>
                      <button
                        type="button"
                        className="btn btn-gold"
                        disabled={
                          titleSaving || equippedTitle === CLOSED_ALPHA_TITLE
                        }
                        onClick={() => void equipTitle(CLOSED_ALPHA_TITLE)}
                      >
                        {equippedTitle === CLOSED_ALPHA_TITLE
                          ? "Equipped"
                          : "Equip"}
                      </button>
                    </article>
                  ) : null}
                  {alphaProUnlocked ? (
                    <article>
                      <h3>Alpha Pro</h3>
                      <p>{ALPHA_PRO_EFFECT}</p>
                      <button
                        type="button"
                        className="btn btn-gold"
                        disabled={titleSaving || equippedTitle === "Alpha Pro"}
                        onClick={() => void equipTitle("Alpha Pro")}
                      >
                        {equippedTitle === "Alpha Pro" ? "Equipped" : "Equip"}
                      </button>
                    </article>
                  ) : null}
                  {equippedTitle &&
                  equippedTitle !== CLOSED_ALPHA_TITLE &&
                  equippedTitle !== "Alpha Pro" ? (
                    <article>
                      <h3>{equippedTitle}</h3>
                      <p>Your existing equipped title.</p>
                      <button type="button" className="btn btn-gold" disabled>
                        Equipped
                      </button>
                    </article>
                  ) : null}
                </>
              )}
              {titleSaving ? <p role="status">Saving title...</p> : null}
              {titleError ? <p role="alert">{titleError}</p> : null}
            </div>
          </section>
        </div>
      ) : null}

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
