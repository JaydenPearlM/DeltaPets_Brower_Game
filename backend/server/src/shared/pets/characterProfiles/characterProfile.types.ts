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
    language_file: string;
    dialect_key: string;
    starts_translated: boolean;
    bond_affects_comprehension: boolean;
    runes_affect_comprehension: boolean;
  };
  [key: string]: unknown;
};
