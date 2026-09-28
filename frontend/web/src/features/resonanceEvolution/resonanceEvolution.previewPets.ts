import { ALL_PET_SPECIES } from "@shared/pets/species/all-species";
import { getStarterPortrait } from "@/kith/registry/starterPortraits";
import { getKithnaPortrait } from "@/kith/registry/kithnaPortraits";
import { normalizeResonanceElement } from "./resonanceElements";
import type { ResonanceElement, ResonanceEvolutionRequest } from "./resonanceEvolution.types";

export type EvolutionPreviewPet = {
  speciesId: string;
  name: string;
  lowformName: string;
  image: string;
  element: ResonanceElement;
};

/** Use only registered pets with real artwork, never another species' fallback. */
export const EVOLUTION_PREVIEW_PETS: readonly EvolutionPreviewPet[] =
  ALL_PET_SPECIES.flatMap((species): EvolutionPreviewPet[] => {
    if (!("evolution" in species)) return [];
    const image = getStarterPortrait(species.id) ?? getKithnaPortrait(species.id);
    if (!image) return [];
    return [{
      speciesId: species.id,
      name: species.evolution.hatchling,
      lowformName: species.evolution.lowform,
      image,
      element: normalizeResonanceElement(species.line),
    }];
  });

/** Simulation only. Closed Alpha's database and battle level caps remain 10. */
export const SIMULATED_EVOLUTION_LEVEL = 15;

export function canSimulateEvolution(level: number, stage: "hatchling" | "lowform"): boolean {
  return Number.isInteger(level) && level >= SIMULATED_EVOLUTION_LEVEL && stage === "hatchling";
}

export function createPreviewEvolution(pet: EvolutionPreviewPet, nickname: string): ResonanceEvolutionRequest {
  return {
    petId: `preview:${pet.speciesId}`,
    kithName: nickname.trim() || pet.name,
    evolvedName: nickname.trim() || pet.lowformName,
    fromStage: "hatchling",
    toStage: "lowform",
    element: pet.element,
    fromImage: pet.image,
    toImage: pet.image,
    currentHp: 100,
    maxHp: 100,
    persist: false,
  };
}
