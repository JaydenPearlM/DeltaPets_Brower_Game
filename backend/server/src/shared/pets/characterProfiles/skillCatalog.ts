import catalog from "./skillCatalog.json";
import type { CharacterProfile } from "./characterProfile.types";

const definitions = new Map(catalog.skills.map(entry => [entry.catalog_id, entry]));
if (definitions.size !== catalog.skills.length) throw new Error("Duplicate catalog skill reference");

/** Resolve static definitions only; this never grants or authorizes a battle skill. */
export function resolveProfileSkills(profile: CharacterProfile): CharacterProfile {
  function resolve(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(resolve);
    if (!value || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    if ("catalog_skill_id" in record) {
      const entry = definitions.get(String(record.catalog_skill_id));
      if (Object.keys(record).length !== 1 || !entry
        || !profile.species_ids.every(id => entry.species_ids.includes(id))
        || !entry.catalog_id.startsWith(`${profile.species_key}/`)) {
        throw new Error(`Invalid skill catalog reference for ${profile.species_key}`);
      }
      return resolve(entry.definition);
    }
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, resolve(item)]));
  }
  return resolve(profile) as CharacterProfile;
}
