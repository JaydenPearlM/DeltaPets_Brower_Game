// ========================================
// Retired/species.ts
// Closed Alpha species that are no longer obtainable.
// ========================================

import type { KithnaPetTemplate } from "../shared/pets/species/kithna-species";

export const RETIRED_KITHNA_TEMPLATES: KithnaPetTemplate[] = [
  {
    id: "kithna_day_pet_01",
    line: "water",
    availability: "legacy",

    hatchling: "Ripplin",
    lowform: "Ripplume",
    highform: "Tidelume",
    legion: "Tidalyn",
    mythical_legendary: null,
  },

  {
    id: "kithna_day_pet_02",
    line: "earth",
    availability: "legacy",

    hatchling: "Peblin",
    lowform: "Peblorn",
    highform: "Boulderin",
    legion: "Terralith",
    mythical_legendary: null,
  },

  {
    id: "kithna_day_pet_03",
    line: "light",
    availability: "legacy",

    hatchling: "Glimmet",
    lowform: "Glimmeryn",
    highform: "Lumeryn",
    legion: "Lumaris",
    mythical_legendary: null,
  },

  {
    id: "kithna_night_pet_01",
    line: "ice",
    availability: "legacy",

    hatchling: "Frilo",
    lowform: "Frilyn",
    highform: "Glacilyn",
    legion: "Glaciaris",
    mythical_legendary: null,
  },

  {
    id: "kithna_night_pet_03",
    line: "shadow",
    availability: "legacy",

    hatchling: "Murklin",
    lowform: "Murkrin",
    highform: "Duskarin",
    legion: "Duskavus",
    mythical_legendary: null,
  },
];
