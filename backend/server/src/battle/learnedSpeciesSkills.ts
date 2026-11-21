import { supabaseAdmin } from "../lib/supabaseAdmin";
import { speciesSkill } from "./speciesSkills";
import type { BattleState } from "./battleTypes";

/** Read-only authorization, bound to the submitted actor and authenticated owner. */
export async function authorizeSpeciesSkill(userId: string, state: BattleState, input: unknown): Promise<string[]> {
  if (!input || typeof input !== "object") return [];
  const action = input as Record<string, unknown>;
  if (action.action !== "skill" || typeof action.skillId !== "string") return [];
  const entry = speciesSkill(action.skillId);
  if (!entry) return [];
  const actor = state.participants.find(p => p.id === action.actorId && p.side === "player");
  if (!actor) throw new Error("Invalid skill actor");
  const petId = actor.sourcePetId ?? actor.id;
  const owned = await supabaseAdmin.from("pets").select("id,species,line,level")
    .eq("id", petId).eq("user_id", userId).maybeSingle();
  if (owned.error) throw owned.error;
  if (!owned.data || owned.data.id !== petId || !entry.species_ids.includes(owned.data.species)
    || owned.data.line !== entry.definition.element || owned.data.level < 2) throw new Error("Skill owner or level is ineligible");
  const definition = await supabaseAdmin.from("skill_defs").select("id,required_level")
    .eq("slug", entry.skill_id).maybeSingle();
  if (definition.error) throw definition.error;
  if (!definition.data || definition.data.required_level !== 2) throw new Error("Skill definition unavailable");
  const learned = await supabaseAdmin.from("pet_skills").select("skill_id,equipped,equipped_slot")
    .eq("pet_id", petId).eq("skill_id", definition.data.id).maybeSingle();
  if (learned.error) throw learned.error;
  if (!learned.data || learned.data.skill_id !== definition.data.id) throw new Error("Skill has not been learned");
  if (learned.data.equipped !== true || !Number.isInteger(learned.data.equipped_slot)
    || learned.data.equipped_slot < 1 || learned.data.equipped_slot > 4) throw new Error("Skill is not equipped in a battle slot");
  return [entry.skill_id];
}
