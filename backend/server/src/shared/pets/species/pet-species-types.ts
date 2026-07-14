import type {
  SharedBaseStats,
  SharedElementLine,
  SpeciesEvolution,
} from "./starter-species";

export type PetSpeciesRules = {
  canBreed: boolean;
  breedingPartnerLine: SharedElementLine | "any";
  hasGender: boolean;
  maxStage: "highform" | "mythical_legendary";
  xpMultiplier: number;
  encounterWeight: number;
  catchFailureChancePercent: number;
  hatchMinutes: {
    min: number;
    max: number;
  } | null;
};

export type PetSpeciesIdentity = {
  id: string;
  line: SharedElementLine;
  evolution: SpeciesEvolution;
  eggBaseStats: SharedBaseStats;
  rules: PetSpeciesRules;
};
