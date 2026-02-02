// frontend/web/src/components/Hatchery/element.ts
// Single source of truth for Hatchery + shared pet/egg row shapes.
// Safe replacement for your old root /src/types.ts

export type ElementalLine =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

// ✅ This was in your old types.ts — keep it so old imports don’t explode
export type ElementalLineDisplay = ElementalLine | "null";

// ✅ IMPORTANT: if your backend/DB returns "baby", using "baby" will cause TS/runtime mismatches.
// Keep "baby" as canonical. If you want to *display* "baby", map it in UI.
export type PetStage =
  | "egg"
  | "baby"
  | "toddler"
  | "child"
  | "teen"
  | "adult"
  | "mystic legendary";

export type PetGender = "male" | "female" | "null";

/**
 * Mirrors your pets table (fields Hatchery UI might touch)
 * Note: lots of these can be null early on depending on your DB defaults.
 */
export type PetRow = {
  id: string;
  user_id: string;

  name: string | null;
  line: ElementalLine | null; // some rows may be null before finalized
  stage: PetStage;

  level: number;
  xp: number;

  hatched_at: string | null;

  hunger: number | null;
  cleanliness: number | null;
  happiness: number | null;
  energy: number | null;

  atk: number | null;
  def: number | null;
  spd: number | null;

  hp_max: number | null;
  hp_cur: number | null;

  age: number | null;

  personality: string | null;
  gender: PetGender;

  bond: number | null;
  last_cared_at: string | null;

  hatch_ends_at: string | null;

  cd_feed_ends_at: string | null;
  cd_clean_ends_at: string | null;
  cd_play_ends_at: string | null;
};

/**
 * Mirrors your eggs table
 */
export type EggRow = {
  id: string;
  user_id: string;
  starter_element: ElementalLine;
  hatch_ready_at: string | null;
  hatched_at: string | null;
  pet_id: string | null;
};

/**
 * Mirrors your pet_stats table (base stats)
 */
export type PetStatsRow = {
  pet_id: string;
  base_hp: number;
  base_atk: number;
  base_magi: number;
  base_def: number;
  base_spd: number;
  base_mana: number;
  base_total: number;
};

/**
 * Mirrors your pet_stat_allocations table.
 * We'll use level=0 as "IVs" for Alpha (clean convention).
 */
export type PetStatAllocRow = {
  id: string;
  pet_id: string;
  level: number; // level 0 = IVs (Alpha convention)
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
};

/**
 * View-model the Hatchery UI consumes.
 * This is what your UI components should use.
 *
 * ✅ Updated to match your old /src/types.ts:
 * base + iv include hp/atk/magi/def/spd/mana so nothing breaks later.
 */
export type HatcheryEggVM = {
  slotIndex: number;

  egg: EggRow | null;
  pet: PetRow | null;

  locked: boolean;

  // UI display fields (derived)
  shellElement: ElementalLineDisplay;
  gender: PetGender;

  hatchEndsAtIso: string | null;

  // Base stats + IVs (level 0 allocations)
  base: {
    hp: number;
    atk: number;
    magi: number;
    def: number;
    spd: number;
    mana: number;
  };

  iv: {
    hp: number;
    atk: number;
    magi: number;
    def: number;
    spd: number;
    mana: number;
  };

  ivTotal: number;

  // includes null rule
  elementsForDisplay: ElementalLineDisplay[];
};
