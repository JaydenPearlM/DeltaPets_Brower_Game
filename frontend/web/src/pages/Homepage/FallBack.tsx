export type FallbackAnnouncementItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export type FallbackCreatedItem = {
  id: string;
  icon: string;
  name: string;
  badge:
    | "live"
    | "building"
    | "soon"
    | "alpha"
    | "new"
    | "event"
    | "fix"
    | "note"
    | "update";
  category: "complete" | "coming_next";
  sortOrder: number;
};

export type FallbackPatchEntry = {
  type: "added" | "fixed" | "changed";
  text: string;
};

export type FallbackPatchBlock = {
  id: string;
  version: string;
  date: string;
  description?: string | null;
  entries: FallbackPatchEntry[];
};

export type FallbackBannerContent = {
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
};

export type FallbackActivePetModel = {
  id: string;
  name: string;
  nickname: string | null;
  line:
    | "null_element"
    | "water"
    | "fire"
    | "earth"
    | "air"
    | "ice"
    | "storm"
    | "light"
    | "shadow";
  stage:
    | "egg"
    | "hatchling"
    | "Lowform"
    | "Highform"
    | "legion"
    | "mythical_legendary";
  level: number;
  xp: number;
  hunger: number;
  clean: number;
  happy: number;
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
  gender: string;
};

export const FALLBACK_ANNOUNCEMENTS: FallbackAnnouncementItem[] = [
  {
    id: "a1",
    title: "Homepage glow-up is underway",
    body: "The DeltaPets homepage is being reshaped to feel more like a living browser game world, with stronger visual hierarchy, lore panels, and clearer alpha systems.",
    createdAt: "2026-03-27T12:00:00.000Z",
  },
  {
    id: "a2",
    title: "Secret Haven preview is live",
    body: "The Secret Haven is part of the early direction for Delta bonding and room-based growth, and it will continue expanding after the homepage pass.",
    createdAt: "2026-03-26T12:00:00.000Z",
  },
  {
    id: "a3",
    title: "Corruption readings increased in the north",
    body: "Aliune is not stable. Strange hatch behavior and darker elemental interference are beginning to show up across early narrative hooks.",
    createdAt: "2026-03-25T12:00:00.000Z",
  },
];

export const FALLBACK_CREATED: FallbackCreatedItem[] = [
  {
    id: "c1",
    icon: "🥚",
    name: "Hatchery + Starter Eggs",
    badge: "live",
    category: "complete",
    sortOrder: 1,
  },
  {
    id: "c2",
    icon: "📊",
    name: "Base Stat Framework",
    badge: "live",
    category: "complete",
    sortOrder: 2,
  },
  {
    id: "c3",
    icon: "💛",
    name: "Delta Hearth Preview",
    badge: "live",
    category: "complete",
    sortOrder: 3,
  },
  {
    id: "c4",
    icon: "🏠",
    name: "Secret Haven Preview",
    badge: "building",
    category: "coming_next",
    sortOrder: 4,
  },
  {
    id: "c5",
    icon: "🌿",
    name: "Daily Care System",
    badge: "building",
    category: "coming_next",
    sortOrder: 5,
  },
  {
    id: "c6",
    icon: "⚔️",
    name: "Battle Arena",
    badge: "soon",
    category: "coming_next",
    sortOrder: 6,
  },
];

export const FALLBACK_PATCHES: FallbackPatchBlock[] = [
  {
    id: "p1",
    version: "v0.0.1-alpha.1",
    date: "March 27, 2026",
    description:
      "Homepage systems are being reorganized to support a stronger world-facing alpha presentation.",
    entries: [
      { type: "added", text: "Hero section rewrite" },
      { type: "added", text: "World Signal and Narrative Signal panels" },
      {
        type: "changed",
        text: "Homepage layout now mirrors browser-game style structure",
      },
    ],
  },
];

export const FALLBACK_BANNER: FallbackBannerContent = {
  enabled: false,
  messages: [],
  alertColor: "green",
  alertType: "news",
  ctaLabel: null,
  ctaHref: null,
};

export const DEMO_PET: FallbackActivePetModel = {
  id: "demo",
  name: "Solite",
  nickname: null,
  line: "light",
  stage: "hatchling",
  level: 1,
  xp: 0,
  hunger: 72,
  cleanliness: 88,
  happiness: 90,
  energy: 95,
  bond: 14,
  atk: 3,
  def: 2,
  spd: 2,
  magi: 2,
  mana: 0,
  hp_max: 4,
  hp_cur: 4,
  personality_key: "gentle",
  personality_name: "Gentle",
  personality_definition: "Soft-hearted and protective.",
  gender: "Genderless",
};
