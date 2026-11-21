import catalog from "../shared/pets/characterProfiles/skillCatalog.json";

export const speciesSkillIds = [
  "solen-angelic-ward", "solen-gleam-jab", "solen-mending-light", "solen-radiant-bolt",
  "clodion-stormfeather-guard", "clodion-thunder-talon", "clodion-gentle-updraft", "clodion-static-gust",
] as const;
export type SpeciesSkillId = typeof speciesSkillIds[number];
export function speciesSkill(id: string) {
  return catalog.skills.find(entry => entry.skill_id === id
    && (speciesSkillIds as readonly string[]).includes(id)
    && entry.approval_status === "approved_initial_testing");
}
