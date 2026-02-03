// pet.ts — backend → frontend contract

export type ElementalLine =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

export type PetDTO = {
  id: string;
  owner_id: string;

  name: string | null;
  element: ElementalLine;

  level: number;

  stat_hp: number;
  stat_atk: number;
  stat_def: number;
  stat_spd: number;
  stat_magi?: number;

  created_at: string;

  // hatchery / lifecycle
  stage: "egg" | "baby" | "toddler" | "teen" | "adult";

  // cooldowns (nullable = ready)
  cd_feed_ends_at?: string | null;
  cd_clean_ends_at?: string | null;
  cd_play_ends_at?: string | null;
  cd_bond_ends_at?: string | null;
};
