export type PetStatsRow = {
  pet_id: string;
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
  base_total: number;
};

export type PetElementsRow = {
  pet_id: string;
  null_element: number;
  water: number;
  fire: number;
  earth: number;
  air: number;
  ice: number;
  storm: number;
  light: number;
  shadow: number;
};

export type PetPointsAlloc = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
};

export type PetPointsTotal = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
  mana: number;
};

export type PetPointsBundle = {
  base: PetStatsRow;
  alloc: PetPointsAlloc;
  total: PetPointsTotal;
  total_points: number;
} | null;

export type HatchInfo = {
  ready: boolean;
  hatch_ends_at: string | null;
  hatch_remaining_ms: number;
} | null;

/**
 * This is intentionally "loose but not sloppy":
 * - We strongly type the parts you actually use (stats/elements/points/hatch).
 * - We allow backend to evolve without breaking the frontend by keeping pet/cooldowns flexible.
 */
export type ActivePetResponse = {
  server_now: string;

  /**
   * Backend pet payload can be large and may vary by endpoint.
   * Keep as unknown-ish so we don't type ourselves into a corner.
   * (You can tighten later once your pet shape is stable.)
   */
  pet: Record<string, any> | null;

  hatch?: HatchInfo;

  stats: PetStatsRow | null;
  points?: PetPointsBundle;

  elements: PetElementsRow | null;

  /**
   * Cooldowns payload varies depending on what systems are enabled.
   * Keep flexible for now.
   */
  cooldowns?: Record<string, any> | null;
};
