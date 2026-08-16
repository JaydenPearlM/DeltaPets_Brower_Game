// ========================================
// Pets_Creation/registry/starterDisplayNames.ts
// Single source of truth for speciesId -> display name.
//
// This map was previously duplicated verbatim in both
// components/Main_Team/mainTeam.tsx and
// pages/petsPage/components/selfAware/selfAware.tsx.
// Both now import from here instead.
//
// Keys match the speciesId values defined in
// backend/server/src/shared/pets/species.ts (SHARED_SPECIES).
// ========================================

export const STARTER_DISPLAY_NAMES: Record<string, string> = {
  water_starter: "Mizu",
  fire_starter: "Kindlekin",
  earth_starter: "Twiglet",
  air_starter: "Wistpip",
  ice_starter: "Cribi",
  storm_starter: "Volb",
  light_starter: "Solen",
  shadow_night_bad: "Esperon",
  shadow_day_good: "Esperon",
};
