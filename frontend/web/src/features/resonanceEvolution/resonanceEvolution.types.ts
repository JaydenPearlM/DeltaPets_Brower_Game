import type { PetStage } from "@/kith/registry/Stats/petStage";

export type ResonanceElement =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow"
  | "voidborne";

export type ResonanceEvolutionPhase =
  | "idle"
  | "warningTransparent"
  | "warningRed"
  | "elementReveal"
  | "fadeGameplay"
  | "environment"
  | "summon"
  | "elementalBuild"
  | "strain"
  | "hpDrain"
  | "transformation"
  | "reveal"
  | "celebration"
  | "complete";

export type ResonanceEvolutionRequest = {
  petId: string;
  kithName: string;
  evolvedName?: string;
  fromStage: PetStage;
  toStage: PetStage;
  element: ResonanceElement;
  elements?: ResonanceElement[];
  fromImage: string;
  strainImage?: string | null;
  toImage: string;
  /** Optional original symbol; omit until the element artwork is approved. */
  elementSymbol?: string;
  currentHp?: number;
  maxHp?: number;
  persist?: boolean;
};

export type ResonanceEvolutionCommitResponse = {
  pet: {
    id: string;
    name: string | null;
    species: string | null;
    line: string;
    stage: PetStage;
    hp_cur: number;
    hp_max: number;
    xp: number;
  };
  previous_hp: number;
  previous_hp_max: number;
  consumed_deltas: number;
  delta_slug: string;
};

export type ResonanceEvolutionPending = {
  petId: string;
  kithName: string;
  evolvedName: string;
  speciesId: string | null;
  fromStage: PetStage;
  toStage: PetStage;
  element: ResonanceElement;
  currentHp: number;
  maxHp: number;
  level: number;
  requiredLevel: number;
  requiredDeltas: number;
};

export type ResonanceElementConfig = {
  color: string;
  accent: string;
  rune: string;
  iconPath: string;
  effect:
    | "fire"
    | "water"
    | "earth"
    | "air"
    | "ice"
    | "storm"
    | "light"
    | "shadow"
    | "voidborne";
};
