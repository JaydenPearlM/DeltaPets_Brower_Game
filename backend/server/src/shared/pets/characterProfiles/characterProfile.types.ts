export type CharacterProfile = {
  schema_version: number;
  profile_enabled: boolean;
  species_key: string;
  species_ids: string[];
  display_name: string;
  element: string;
  rarity: string;
  asset_key: string;
  communication: {
    language: string;
    /** English is understandable from hatching; delivery may reflect individual state. */
    understood_from_start: boolean;
    comprehension_requires_bond_or_runes: boolean;
    translation_system_enabled: boolean;
    comprehension_gated_by_personality_bond_trust_or_mood: boolean;
    spoken_language_available_at_hatching: boolean;
  };
  [key: string]: unknown;
};
