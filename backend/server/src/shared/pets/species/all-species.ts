import { SHARED_SPECIES, type SharedSpecies } from "./starter-species";

import {
  KITHNA_NON_STARTER_SPECIES,
  type KithnaNonStarterSpecies,
} from "./kithna-species";

export type RegisteredPetSpecies = SharedSpecies | KithnaNonStarterSpecies;

export const STARTER_SPECIES_REGISTRY: SharedSpecies[] = SHARED_SPECIES;

export const NON_STARTER_SPECIES_REGISTRY: KithnaNonStarterSpecies[] = [
  ...KITHNA_NON_STARTER_SPECIES,
];

export const ALL_PET_SPECIES: RegisteredPetSpecies[] = [
  ...STARTER_SPECIES_REGISTRY,
  ...NON_STARTER_SPECIES_REGISTRY,
];

export function findStarterSpeciesById(
  speciesId: string | null | undefined,
): SharedSpecies | null {
  const normalized = String(speciesId ?? "").trim();

  if (!normalized) {
    return null;
  }

  return (
    STARTER_SPECIES_REGISTRY.find((species) => species.id === normalized) ??
    null
  );
}

export function findNonStarterSpeciesById(
  speciesId: string | null | undefined,
): KithnaNonStarterSpecies | null {
  const normalized = String(speciesId ?? "").trim();

  if (!normalized) {
    return null;
  }

  return (
    NON_STARTER_SPECIES_REGISTRY.find((species) => species.id === normalized) ??
    null
  );
}

export function findNonStarterSpeciesByEggName(
  eggName: string | null | undefined,
): KithnaNonStarterSpecies | null {
  const normalized = String(eggName ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    NON_STARTER_SPECIES_REGISTRY.find(
      (species) => species.evolution.egg.trim().toLowerCase() === normalized,
    ) ?? null
  );
}

export function findPetSpeciesById(
  speciesId: string | null | undefined,
): RegisteredPetSpecies | null {
  return (
    findNonStarterSpeciesById(speciesId) ?? findStarterSpeciesById(speciesId)
  );
}
