import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import {
  DEMO_PET,
  FALLBACK_ANNOUNCEMENTS,
  FALLBACK_BANNER,
  FALLBACK_CREATED,
  FALLBACK_PATCHES,
} from "./Fallback";
import "./homepage.css";

export type ElementalLine =
  | "null_element"
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

export type PetStage =
  | "egg"
  | "baby"
  | "child"
  | "adult"
  | "legion"
  | "mythical";

export type PetGender = "male" | "female" | "Genderless" | string;

type BadgeVariant =
  | "live"
  | "building"
  | "soon"
  | "alpha"
  | "new"
  | "event"
  | "fix"
  | "note"
  | "update";

type PatchEntryType = "added" | "fixed" | "changed";

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface CreatedItem {
  id: string;
  icon: string;
  name: string;
  badge: BadgeVariant;
  category: "complete" | "coming_next";
  sortOrder: number;
}

interface PatchEntry {
  type: PatchEntryType;
  text: string;
}

interface PatchBlock {
  id: string;
  version: string;
  date: string;
  description?: string | null;
  entries: PatchEntry[];
}

interface PersonalityRecord {
  key: string;
  name: string;
  definition: string;
  modifiers?: string | null;
}

interface BannerContent {
  enabled: boolean;
  messages: string[];
  alertColor: "red" | "yellow" | "blue" | "pink" | "green";
  alertType:
    | "weather"
    | "anomalies"
    | "funny"
    | "market"
    | "event"
    | "news"
    | "other";
  ctaLabel?: string | null;
  ctaHref?: string | null;
}

type BannerRow = {
  id?: string | number | null;
  is_active?: boolean | null;
  message?: string | null;
  alert_color?: string | null;
  alert_type?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  updated_at?: string | null;
};

interface ActivePetModel {
  id: string;
  name: string;
  nickname: string | null;
  line: ElementalLine;
  stage: PetStage;
  level: number;
  xp: number;
  hunger: number;
  cleanliness: number;
  happiness: number;
  energy: number;
  bond: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  mana: number;
  hp_max: number;
  hp_cur: number;
  personality_key: string | null;
  personality_name: string | null;
  personality_definition: string | null;
  gender: PetGender;
}

interface HomeState {
  loading: boolean;
  loadError: string | null;
  announcements: AnnouncementItem[];
  createdItems: CreatedItem[];
  patchNotes: PatchBlock[];
  banner: BannerContent;
  activePet: ActivePetModel | null;
}

interface ElementMeta {
  label: string;
  icon: string;
  orbClass: string;
  badgeClass: string;
}

const ELEMENT_META: Record<string, ElementMeta> = {
  water: {
    label: "Water",
    icon: "💧",
    orbClass: "water",
    badgeClass: "water",
  },
  fire: {
    label: "Fire",
    icon: "🔥",
    orbClass: "fire",
    badgeClass: "fire",
  },
  earth: {
    label: "Earth",
    icon: "🌿",
    orbClass: "earth",
    badgeClass: "earth",
  },
  air: {
    label: "Air",
    icon: "🌬️",
    orbClass: "air",
    badgeClass: "air",
  },
  ice: {
    label: "Ice",
    icon: "❄️",
    orbClass: "ice",
    badgeClass: "ice",
  },
  storm: {
    label: "Storm",
    icon: "⚡",
    orbClass: "storm",
    badgeClass: "storm",
  },
  light: {
    label: "Light",
    icon: "✨",
    orbClass: "light",
    badgeClass: "light",
  },
  shadow: {
    label: "Shadow",
    icon: "🌑",
    orbClass: "shadow",
    badgeClass: "shadow",
  },
  null_element: {
    label: "Unknown",
    icon: "❓",
    orbClass: "null",
    badgeClass: "null",
  },
};

const HERO_FEATURES = [
  {
    title: "Eggs",
    text: "Just another egg game… or is it? Every egg holds the start of something bigger. Hatch, raise, and discover a companion that can grow far beyond first impressions.",
  },
  {
    title: "Raise Through Care",
    text: "Bond is everything. Feeding, cleaning, and spending time together does more than keep your Delta happy. Bond is the heart of growth, and the key to evolution.",
  },
  {
    title: "Element Training",
    text: "Train your element. Shape your skills.Elemental training helps your Delta learn different abilities, strengthen its role, and open up new ways to fight and grow.",
  },
];

const GAMEPLAY_CARDS = [
  {
    title: "Hatchery + Mystery Egg",
    text: "Start with your first egg and move into the early hatch flow already built for Alpha.",
  },
  {
    icon: "🫶",
    title: "Raise Through Care",
    text: "Early care systems shape the feeling of the bond and prepare your Delta for the world ahead.",
  },
  {
    icon: "🎒",
    title: "Team + Storage",
    text: "Manage your growing collection, protect your favorites, and prepare for bigger systems later.",
  },
];

const WORLD_SIGNAL = {
  condition: "Unstable",
  region: "Northern Haven",
  corruption: "Low, rising",
  latestReport: "Multiple eggs are showing abnormal hatch signatures.",
};

const EVENT_TEASER = {
  title: "Current Event Watch",
  body: "Corruption Watch is active in the north. Rumors suggest unstable egg readings may appear before the next major system update.",
  tag: "Alpha Event",
};

const CREATED_PANEL_PAGES = [
  {
    key: "created",
    title: "What's Created",
    description:
      "The current Alpha systems you can already see or use right now.",
  },
  {
    key: "building",
    title: "What's Being Built",
    description:
      "The next systems actively being worked into the DeltaPets experience.",
  },
  {
    key: "patches",
    title: "Patch Files",
    description:
      "Deployment notes, changes, and version markers for the current Alpha build.",
  },
] as const;

type CreatedPanelPageKey = (typeof CREATED_PANEL_PAGES)[number]["key"];

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function capFirst(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatLongDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAnnouncementDate(value: string | null | undefined): string {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildAnnouncementPreview(text: string, maxLength = 140): string {
  const clean = String(text ?? "").trim();
  if (!clean) return "";

  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

function safeBadge(
  value: string | null | undefined,
  fallback: BadgeVariant = "update",
): BadgeVariant {
  const normalized = String(value ?? "").toLowerCase();

  switch (normalized) {
    case "live":
    case "building":
    case "soon":
    case "alpha":
    case "new":
    case "event":
    case "fix":
    case "note":
    case "update":
      return normalized;
    default:
      return fallback;
  }
}

function getCategoryBadge(category: string): BadgeVariant {
  if (category === "complete") return "live";
  if (category === "coming_next") return "building";
  return "update";
}

function parsePatchEntries(raw: string | null | undefined): PatchEntry[] {
  const text = String(raw ?? "").trim();
  if (!text) return [{ type: "added", text: "Patch notes updated." }];

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): PatchEntry => {
      const cleaned = line.replace(/^[-*•]\s*/, "");
      const lower = cleaned.toLowerCase();

      if (lower.startsWith("fix:") || lower.startsWith("fixed:")) {
        return { type: "fixed", text: cleaned.replace(/^[^:]+:\s*/i, "") };
      }

      if (lower.startsWith("change:") || lower.startsWith("changed:")) {
        return { type: "changed", text: cleaned.replace(/^[^:]+:\s*/i, "") };
      }

      if (lower.startsWith("add:") || lower.startsWith("added:")) {
        return { type: "added", text: cleaned.replace(/^[^:]+:\s*/i, "") };
      }

      return { type: "added", text: cleaned };
    });
}

function normalizeBannerColor(
  value: string | null | undefined,
): BannerContent["alertColor"] {
  switch (String(value ?? "").toLowerCase()) {
    case "red":
    case "yellow":
    case "blue":
    case "pink":
    case "green":
      return String(value ?? "").toLowerCase() as BannerContent["alertColor"];
    default:
      return "yellow";
  }
}

function normalizeBannerType(
  value: string | null | undefined,
): BannerContent["alertType"] {
  switch (String(value ?? "").toLowerCase()) {
    case "weather":
    case "anomalies":
    case "funny":
    case "market":
    case "event":
    case "news":
    case "other":
      return String(value ?? "").toLowerCase() as BannerContent["alertType"];
    default:
      return "news";
  }
}

function isBannerCurrentlyActive(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): boolean {
  const now = Date.now();

  const startMs = startsAt ? new Date(startsAt).getTime() : null;
  const endMs = endsAt ? new Date(endsAt).getTime() : null;

  const passesStart =
    startMs == null || Number.isNaN(startMs) || now >= startMs;
  const passesEnd = endMs == null || Number.isNaN(endMs) || now <= endMs;

  return passesStart && passesEnd;
}

function withElizaSignature(message: string | null | undefined): string {
  const clean = String(message ?? "").trim();
  if (!clean) return "";

  if (/\s*-\s*eliza\s*$/i.test(clean)) {
    return clean;
  }

  return `${clean} - Eliza`;
}

function mapBannerRowsToContent(
  rows: BannerRow[] | null | undefined,
): BannerContent {
  const list = Array.isArray(rows) ? rows : [];

  const activeRows = list.filter((row) => {
    const message = String(row.message ?? "").trim();

    return (
      Boolean(row.is_active) &&
      message.length > 0 &&
      isBannerCurrentlyActive(row.starts_at, row.ends_at)
    );
  });

  if (!activeRows.length) {
    return FALLBACK_BANNER;
  }

  const newestRow = activeRows[0];

  const messages = activeRows
    .slice(0, 3)
    .map((row) => withElizaSignature(row.message))
    .filter(Boolean);

  return {
    enabled: messages.length > 0,
    messages,
    alertColor: normalizeBannerColor(newestRow.alert_color),
    alertType: normalizeBannerType(newestRow.alert_type),
    ctaLabel: newestRow.cta_label ?? null,
    ctaHref: newestRow.cta_href ?? null,
  };
}

async function fetchHomepageBanner(): Promise<BannerContent> {
  const { data, error } = await supabase
    .from("homepage_alerts")
    .select(
      "id, is_active, message, alert_color, alert_type, starts_at, ends_at, cta_label, cta_href, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(3);

  if (error) {
    console.warn("[Homepage] homepage_alerts fetch failed:", error.message);
    return FALLBACK_BANNER;
  }

  return mapBannerRowsToContent((data ?? []) as BannerRow[]);
}

function getElMeta(line: string | null | undefined): ElementMeta {
  return ELEMENT_META[line ?? "null_element"] ?? ELEMENT_META.null_element;
}

function getPersonalityBlurb(pet: ActivePetModel): React.ReactNode {
  const meta = getElMeta(pet.line);

  if (pet.personality_definition) {
    return (
      <>
        <span className="hp-spotlightAccent">
          {pet.personality_name ?? capFirst(pet.personality_key)}
        </span>
        {" — "}
        {pet.personality_definition}
      </>
    );
  }

  return (
    <>
      {pet.name} is a curious{" "}
      <span className="hp-spotlightAccent">{meta.label}</span> Delta still
      discovering who it will become.
    </>
  );
}

function StatusBadge({
  variant,
  children,
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span className={`hp-statusBadge hp-statusBadge--${variant}`}>
      {children}
    </span>
  );
}

export default function Homepage() {
  const [home, setHome] = useState<HomeState>({
    loading: true,
    loadError: null,
    announcements: FALLBACK_ANNOUNCEMENTS,
    createdItems: FALLBACK_CREATED,
    patchNotes: FALLBACK_PATCHES,
    banner: FALLBACK_BANNER,
    activePet: null,
  });

  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<
    string | null
  >(FALLBACK_ANNOUNCEMENTS[0]?.id ?? null);

  const [createdPanelPage, setCreatedPanelPage] =
    useState<CreatedPanelPageKey>("created");

  const currentCreatedPanelMeta = useMemo(() => {
    return (
      CREATED_PANEL_PAGES.find((page) => page.key === createdPanelPage) ??
      CREATED_PANEL_PAGES[0]
    );
  }, [createdPanelPage]);

  const createdCompleteItems = useMemo(() => {
    return home.createdItems
      .filter((item) => item.category === "complete")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [home.createdItems]);

  const createdBuildingItems = useMemo(() => {
    return home.createdItems
      .filter((item) => item.category === "coming_next")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [home.createdItems]);

  function advanceCreatedPanel() {
    setCreatedPanelPage((prev) => {
      const idx = CREATED_PANEL_PAGES.findIndex((page) => page.key === prev);
      const nextIdx = idx >= 0 ? (idx + 1) % CREATED_PANEL_PAGES.length : 0;
      return CREATED_PANEL_PAGES[nextIdx].key;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadHomepage() {
      try {
        const bannerPromise = fetchHomepageBanner();

        const announcementsPromise = supabase
          .from("announcements")
          .select("id, title, body, created_at")
          .order("created_at", { ascending: false })
          .limit(8);

        const logsPromise = supabase.from("homepage_logs").select("*");

        const petPromise = supabase
          .from("pets")
          .select(
            "id, name, nickname, line, stage, level, xp, hunger, cleanliness, happiness, energy, bond, atk, def, spd, magi, mana, hp_max, hp_cur, personality_key, gender, personalities(key, name, definition)",
          )
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const [banner, announcementsRes, logsRes, petRes] = await Promise.all([
          bannerPromise,
          announcementsPromise,
          logsPromise,
          petPromise,
        ]);

        const announcementRows = Array.isArray(announcementsRes.data)
          ? announcementsRes.data
          : [];
        const homepageLogRows = Array.isArray(logsRes.data) ? logsRes.data : [];
        const petRow = petRes.data;

        const announcements: AnnouncementItem[] = announcementRows.length
          ? announcementRows.map((row: any) => ({
              id: String(row.id),
              title: String(row.title ?? "Untitled update"),
              body: String(row.body ?? ""),
              createdAt: String(row.created_at ?? ""),
            }))
          : FALLBACK_ANNOUNCEMENTS;

        const createdItems: CreatedItem[] = homepageLogRows.length
          ? homepageLogRows
              .filter((row: any) => {
                const category = String(row.category ?? "").toLowerCase();
                return category === "complete" || category === "coming_next";
              })
              .map((row: any, index: number) => ({
                id: String(row.id ?? `log-${index}`),
                icon: String(row.icon ?? "✨"),
                name: String(row.title ?? row.name ?? "Untitled item"),
                badge: safeBadge(
                  row.badge,
                  getCategoryBadge(String(row.category ?? "")),
                ),
                category:
                  String(row.category ?? "").toLowerCase() === "complete"
                    ? "complete"
                    : "coming_next",
                sortOrder: toNumber(
                  row.sort_order ?? row.sortorder ?? row.order_index,
                  index + 1,
                ),
              }))
              .sort((a, b) => a.sortOrder - b.sortOrder)
          : FALLBACK_CREATED;

        const patchNotes: PatchBlock[] = homepageLogRows.length
          ? homepageLogRows
              .filter((row: any) => row.version || row.patch_html || row.body)
              .map((row: any, index: number) => ({
                id: String(row.id ?? `patch-${index}`),
                version: String(row.version ?? row.title ?? "Unknown"),
                date: formatLongDate(
                  row.published_at ?? row.created_at ?? row.updated_at ?? null,
                ),
                description: row.body ?? null,
                entries: parsePatchEntries(row.patch_html ?? row.body),
              }))
          : FALLBACK_PATCHES;

        const activePet: ActivePetModel | null = petRow
          ? {
              id: String(petRow.id),
              name: String(petRow.name ?? "Delta"),
              nickname: petRow.nickname ?? null,
              line: (petRow.line ?? "null_element") as ElementalLine,
              stage: (petRow.stage ?? "egg") as PetStage,
              level: toNumber(petRow.level, 1),
              xp: toNumber(petRow.xp, 0),
              hunger: toNumber(petRow.hunger, 0),
              cleanliness: toNumber(petRow.cleanliness, 0),
              happiness: toNumber(petRow.happiness, 0),
              energy: toNumber(petRow.energy, 0),
              bond: toNumber(petRow.bond, 0),
              atk: toNumber(petRow.atk, 0),
              def: toNumber(petRow.def, 0),
              spd: toNumber(petRow.spd, 0),
              magi: toNumber(petRow.magi, 0),
              mana: toNumber(petRow.mana, 0),
              hp_max: toNumber(petRow.hp_max, 0),
              hp_cur: toNumber(petRow.hp_cur, 0),
              personality_key: petRow.personality_key ?? null,
              personality_name:
                (petRow.personalities as PersonalityRecord | null)?.name ??
                null,
              personality_definition:
                (petRow.personalities as PersonalityRecord | null)
                  ?.definition ?? null,
              gender: petRow.gender ?? "Genderless",
            }
          : null;

        if (cancelled) return;

        setHome({
          loading: false,
          loadError: null,
          announcements,
          createdItems,
          patchNotes: patchNotes.length ? patchNotes : FALLBACK_PATCHES,
          banner,
          activePet,
        });

        setExpandedAnnouncementId(announcements[0]?.id ?? null);
      } catch (error) {
        console.error("[Homepage] failed to load:", error);

        if (!cancelled) {
          setHome({
            loading: false,
            loadError:
              "Homepage data could not be loaded. Fallback content is being used.",
            announcements: FALLBACK_ANNOUNCEMENTS,
            createdItems: FALLBACK_CREATED,
            patchNotes: FALLBACK_PATCHES,
            banner: FALLBACK_BANNER,
            activePet: null,
          });

          setExpandedAnnouncementId(FALLBACK_ANNOUNCEMENTS[0]?.id ?? null);
        }
      }
    }

    loadHomepage();

    return () => {
      cancelled = true;
    };
  }, []);

  const pet = home.activePet ?? DEMO_PET;
  const elMeta = getElMeta(pet.line);

  function toggleAnnouncement(id: string, isNewest: boolean) {
    if (isNewest) return;
    setExpandedAnnouncementId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="hp-root">
      {home.banner.enabled && (home.banner.messages?.length ?? 0) > 0 ? (
        <div
          className={`hp-banner hp-banner--${home.banner.alertColor}`}
          role="alert"
          aria-label={`${home.banner.alertType} alert`}
        >
          <div className="hp-bannerContent">
            <div className="hp-bannerTickerViewport" aria-live="polite">
              <div className="hp-bannerTickerTrack">
                {[...home.banner.messages, ...home.banner.messages].map(
                  (message, index) => (
                    <span
                      className="hp-bannerTickerItem"
                      key={`${message}-${index}`}
                    >
                      {message}
                    </span>
                  ),
                )}
              </div>
            </div>

            {home.banner.ctaLabel && home.banner.ctaHref ? (
              <a className="hp-bannerLink" href={home.banner.ctaHref}>
                {home.banner.ctaLabel}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {home.loadError ? (
        <div className="hp-inlineNotice hp-inlineNotice--warn">
          {home.loadError}
        </div>
      ) : null}

      <section className="hp-heroCard" aria-labelledby="hero-heading">
        <div className="hp-heroInner">
          <section
            className="hp-heroWorldSignalTop hp-panel hp-panel--blue"
            aria-labelledby="hero-world-signal-heading"
          >
            <div className="hp-heroWorldSignalTopInner">
              <h2
                className="hp-heroWorldSignalTopTitle"
                id="hero-world-signal-heading"
              >
                World Signal
              </h2>

              <div className="hp-heroWorldSignalTopStats">
                <div className="hp-heroWorldSignalTopItem">
                  <span className="hp-heroWorldSignalTopKey">Condition</span>
                  <span className="hp-heroWorldSignalTopVal hp-heroWorldSignalTopVal--warn">
                    {WORLD_SIGNAL.condition}
                  </span>
                </div>

                <div className="hp-heroWorldSignalTopItem">
                  <span className="hp-heroWorldSignalTopKey">Region</span>
                  <span className="hp-heroWorldSignalTopVal">
                    {WORLD_SIGNAL.region}
                  </span>
                </div>

                <div className="hp-heroWorldSignalTopItem">
                  <span className="hp-heroWorldSignalTopKey">Corruption</span>
                  <span className="hp-heroWorldSignalTopVal">
                    {WORLD_SIGNAL.corruption}
                  </span>
                </div>

                <div className="hp-heroWorldSignalTopItem hp-heroWorldSignalTopItem--report">
                  <span className="hp-heroWorldSignalTopKey">
                    Latest Report
                  </span>
                  <span className="hp-heroWorldSignalTopVal">
                    {WORLD_SIGNAL.latestReport}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="hp-heroBrandRow">
            <div className="hp-heroTitleWrap">
              <h1 className="hp-heroTitle hp-heroTitle--logo" id="hero-heading">
                DeltaPets
              </h1>

              <p className="hp-heroTagline">
                Raise. Train. Evolve.{" "}
                <span className="hp-heroTaglineBond">Bond.</span>
              </p>
            </div>

            <div className="hp-heroCrest" aria-hidden>
              △
            </div>
          </div>

          <p className="hp-heroSubtitle">
            Hatch, raise, and bond with elemental creatures in the growing world
            of <span>Aliune</span>.
          </p>

          <div className="hp-heroCtaRow">
            <Link
              to="/signup"
              className="hp-primaryBtn"
              aria-label="Start Your Journey"
            >
              Start Your Journey Today!
            </Link>
          </div>

          <div className="hp-heroFeatureRow">
            {HERO_FEATURES.map((feature) => (
              <div className="hp-heroFeature" key={feature.title}>
                <span className="hp-heroFeatureIcon" aria-hidden>
                  {feature.icon}
                </span>
                <div className="hp-heroFeatureCopy">
                  <span className="hp-heroFeatureLabel">Features</span>
                  <p className="hp-heroFeatureTitle">{feature.title}</p>
                  <p className="hp-heroFeatureText">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="hp-layout">
        <aside className="hp-sidebar" aria-label="World information">
          <section
            className="hp-panel hp-panel--blue hp-worldPanel"
            aria-labelledby="world-heading"
          >
            <div className="hp-panelHeader hp-worldPanelHeader">
              <div>
                <h2
                  className="hp-panelTitle hp-worldHeadingGlow"
                  id="world-heading"
                >
                  About Aliune
                </h2>
              </div>
            </div>

            <div className="hp-panelBody hp-worldPanelBody">
              <p className="hp-worldText hp-worldText--impact">
                Aliune is a world built on hatching, raising, and bonding with
                elemental Kith.
              </p>

              <p className="hp-worldText hp-worldText--impact">
                Most beginnings are gentle. An egg. A bond. A small life taking
                shape beside yours.
              </p>

              <p className="hp-worldText hp-worldText--impact">
                But now some eggs are changing before they ever hatch, and
                something in Aliune is beginning to answer back.
              </p>
            </div>
          </section>
        </aside>

        <main className="hp-center">
          <section
            className="hp-panel hp-panel--amber"
            aria-labelledby="ann-heading"
          >
            <div className="hp-panelHeader">
              <h2 className="hp-panelTitle" id="ann-heading">
                Aliune News
              </h2>
            </div>

            <div className="hp-panelBody">
              {home.loading ? (
                <div className="hp-loadingBlock">Loading announcements...</div>
              ) : (
                <ul className="hp-annList" role="list">
                  {home.announcements.map((ann, index) => {
                    const isNewest = index === 0;
                    const isExpanded =
                      isNewest || expandedAnnouncementId === ann.id;

                    return (
                      <li
                        key={ann.id}
                        className={[
                          "hp-annCard",
                          isNewest ? "hp-annCard--newest" : "hp-annCard--old",
                          isExpanded ? "is-expanded" : "is-collapsed",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        role="listitem"
                      >
                        <button
                          type="button"
                          className="hp-annButton"
                          onClick={() => toggleAnnouncement(ann.id, isNewest)}
                          aria-expanded={isExpanded}
                          disabled={isNewest}
                        >
                          <div className="hp-annTopRow">
                            <h3 className="hp-annTitle">{ann.title}</h3>
                            <span className="hp-annDate">
                              {formatAnnouncementDate(ann.createdAt)}
                            </span>
                          </div>

                          <div className="hp-annBodyWrap">
                            <p className="hp-annBody">
                              {isExpanded
                                ? ann.body
                                : buildAnnouncementPreview(ann.body)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section
            className="hp-panel hp-panel--amber"
            aria-labelledby="happening-heading"
          >
            <div className="hp-panelHeader">
              <h2 className="hp-panelTitle" id="happening-heading">
                What&apos;s Happening in DeltaPets
              </h2>
            </div>

            <div className="hp-panelBody">
              <div className="hp-gameplayGrid">
                {GAMEPLAY_CARDS.map((card) => (
                  <article className="hp-gameplayCard" key={card.title}>
                    <div className="hp-gameplayIcon" aria-hidden>
                      {card.icon}
                    </div>
                    <h3 className="hp-gameplayTitle">{card.title}</h3>
                    <p className="hp-gameplayText">{card.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>

        <aside className="hp-rightSidebar" aria-label="Progress and spotlight">
          <section
            className="hp-panel hp-panel--blue"
            aria-labelledby="progress-heading"
          >
            <div className="hp-panelHeader hp-progressHeader">
              <div>
                <h2 className="hp-panelTitle" id="progress-heading">
                  {currentCreatedPanelMeta.title}
                </h2>
                <p className="hp-panelDeck">
                  {currentCreatedPanelMeta.description}
                </p>
              </div>

              <button
                type="button"
                className="hp-nextBtn"
                onClick={advanceCreatedPanel}
                aria-label={`Go to next development panel after ${currentCreatedPanelMeta.title}`}
              >
                Next →
              </button>
            </div>

            <div className="hp-panelBody">
              {home.loading && createdPanelPage !== "patches" ? (
                <div className="hp-loadingBlock">Loading progress...</div>
              ) : null}

              {!home.loading || createdPanelPage === "patches" ? (
                <>
                  {createdPanelPage === "created" ? (
                    <ul className="hp-createdList" role="list">
                      {createdCompleteItems.map((item) => (
                        <li className="hp-createdItem" key={item.id}>
                          <span className="hp-createdIcon" aria-hidden>
                            {item.icon}
                          </span>
                          <span className="hp-createdName">{item.name}</span>
                          <StatusBadge variant={item.badge}>
                            {item.badge.toUpperCase()}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {createdPanelPage === "building" ? (
                    <ul className="hp-createdList" role="list">
                      {createdBuildingItems.map((item) => (
                        <li className="hp-createdItem" key={item.id}>
                          <span className="hp-createdIcon" aria-hidden>
                            {item.icon}
                          </span>
                          <span className="hp-createdName">{item.name}</span>
                          <StatusBadge variant={item.badge}>
                            {item.badge.toUpperCase()}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {createdPanelPage === "patches" ? (
                    <div className="hp-patchWrap">
                      {home.patchNotes.map((block) => (
                        <div key={block.id} className="hp-patchBlock">
                          <p className="hp-patchVersion">{block.version}</p>
                          <p className="hp-patchDate">{block.date}</p>

                          {block.description ? (
                            <p className="hp-patchDescription">
                              {block.description}
                            </p>
                          ) : null}

                          <ul className="hp-patchList" role="list">
                            {block.entries.map((entry, index) => (
                              <li
                                key={`${block.id}-${index}`}
                                className="hp-patchEntry"
                              >
                                <span
                                  className={`hp-patchTag hp-patchTag--${entry.type}`}
                                >
                                  {entry.type.charAt(0).toUpperCase() +
                                    entry.type.slice(1)}
                                </span>
                                {entry.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>

          <section
            className="hp-panel hp-panel--amber"
            aria-labelledby="spotlight-heading"
          >
            <div className="hp-panelHeader">
              <h2 className="hp-panelTitle" id="spotlight-heading">
                Delta Spotlight
              </h2>
            </div>

            <div className="hp-panelBody">
              <div className="hp-spotlightTop">
                <div
                  className={`hp-spotlightOrb hp-spotlightOrb--${elMeta.orbClass}`}
                />
                <div>
                  <h3 className="hp-spotlightName">{pet.name}</h3>
                  <p className="hp-spotlightMeta">
                    {elMeta.icon} {elMeta.label} • {capFirst(pet.stage)} • Level{" "}
                    {pet.level}
                  </p>
                </div>
              </div>

              <p className="hp-spotlightText">{getPersonalityBlurb(pet)}</p>

              <div className="hp-spotlightTags">
                <span className={`hp-elBadge hp-elBadge--${elMeta.badgeClass}`}>
                  {elMeta.label}
                </span>
                <span className="hp-elBadge hp-elBadge--null">
                  Bond {pet.bond}
                </span>
                <span className="hp-elBadge hp-elBadge--null">
                  {capFirst(pet.gender)}
                </span>
              </div>
            </div>
          </section>

          <section
            className="hp-panel hp-panel--blue"
            aria-labelledby="event-heading"
          >
            <div className="hp-panelHeader">
              <h2 className="hp-panelTitle" id="event-heading">
                {EVENT_TEASER.title}
              </h2>
            </div>

            <div className="hp-panelBody">
              <p className="hp-worldText">{EVENT_TEASER.body}</p>
              <div className="hp-eventTag">{EVENT_TEASER.tag}</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
