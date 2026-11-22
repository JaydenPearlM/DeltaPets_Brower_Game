import { z } from "zod";
import catalog from "../../shared/pets/characterProfiles/skillCatalog.json";
import { findCharacterProfileBySpeciesId } from "../../shared/pets/characterProfiles/characterRegistry";
import { speciesSkill } from "../../battle/speciesSkills";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { AppError } from "../../lib/AppError";

export const skillMilestones = [2, 5, 8, 11, 14, 17, 20, 23, 26, 30] as const;
const roleSchema = z.enum(["tank", "healer", "dps", "sorcerer"]);
const candidateSchema = z.object({ name: z.string(), description: z.string(), element: z.string(),
  role: roleSchema, proposed_unlock_level: z.number().int() });
export type SkillPet = { id: string; species: string | null; line: string; level: number; stage: string; ran_away: boolean };

/** Learning metadata only. Never imports review proposals or approves combat effects. */
export function learningPath(species: string, element: string) {
  const profile = findCharacterProfileBySpeciesId(species);
  if (!profile?.profile_enabled || profile.element !== element) return [];
  const path = skillMilestones.map(level => {
    const candidates = catalog.skills.filter(entry => entry.species_ids.includes(species)
      && entry.catalog_id.startsWith(`${profile.species_key}/`) && entry.unlock_level === level)
      .flatMap(entry => {
        const parsed = candidateSchema.safeParse(entry.definition);
        if (!parsed.success || parsed.data.element !== element || parsed.data.proposed_unlock_level !== level) return [];
        const approved = speciesSkill(entry.skill_id);
        return [{ catalogId: entry.catalog_id,
          slug: approved ? entry.skill_id : entry.catalog_id.replace("/", "--"),
          sourceSlug: entry.skill_id, name: parsed.data.name, description: parsed.data.description,
          role: parsed.data.role, level, element, speciesIds: entry.species_ids,
          combatEnabled: Boolean(approved),
          manaCost: approved && "mana_cost" in approved.definition ? approved.definition.mana_cost : null }];
      });
    return { level, milestoneKey: `level-${level}`, candidates };
  });
  return path.every(m => m.candidates.length === 4 && new Set(m.candidates.map(c => c.role)).size === 4) ? path : [];
}

const learnedSchema = z.object({ skill_id: z.uuid(), equipped: z.boolean(),
  equipped_slot: z.number().int().min(1).max(4).nullable(), unlocked_at: z.string() });
const definitionSchema = z.object({ id: z.uuid(), slug: z.string(), name: z.string(), description: z.string().nullable(),
  required_level: z.number().int(), requirements: z.record(z.string(), z.unknown()) });
const claimSchema = z.object({ skill_id: z.uuid(), milestone_key: z.string(), config_version: z.string(),
  eligible_choices: z.array(z.unknown()), equipment_decision: z.enum(["legacy", "auto_equipped", "pending", "replaced", "declined"]),
  equipment_decision_slot: z.number().int().min(1).max(4).nullable() });
const receiptSchema = z.object({ skill_id: z.uuid(), milestone_key: z.string(),
  equipment_decision: claimSchema.shape.equipment_decision,
  equipment_decision_slot: claimSchema.shape.equipment_decision_slot });
export type LearnedSkill = z.infer<typeof learnedSchema>;
export type SkillClaim = z.infer<typeof claimSchema>;
export type SkillDefinition = z.infer<typeof definitionSchema>;

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError("Saved skill state is unavailable. Refresh before retrying.", 502, "SKILL_INVALID_RESPONSE");
  return result.data;
}
function failure(error: { message: string }): never {
  const messages: Record<string, string> = {
    SKILL_NOT_FOUND: "Kith not found.", SKILL_INELIGIBLE: "This skill choice is not eligible for this Kith.",
    SKILL_CONFLICT: "This choice was already resolved differently. Refresh your Kith.",
    SKILL_ORDER: "Resolve the oldest skill choice first.",
    SKILL_PENDING: "Resolve or decline the pending replacement first.",
    SKILL_RECONCILIATION_REQUIRED: "Saved skills need review before changes can be made. Existing skills are preserved.",
    SKILL_CONFIG: "Skill definitions are unavailable for this choice.",
  };
  if (messages[error.message]) throw new AppError(messages[error.message], error.message === "SKILL_NOT_FOUND" ? 404 : 409, error.message);
  throw new AppError("Skill persistence is unavailable. No change has been confirmed.", 503, "SKILL_UNAVAILABLE");
}

export function skillState(pet: SkillPet, learned: LearnedSkill[], claims: SkillClaim[], definitions: SkillDefinition[]) {
  const path = pet.stage === "egg" || pet.species === null ? [] : learningPath(pet.species, pet.line);
  const known = path.flatMap(m => m.candidates);
  const learnedDetails = learned.map(row => ({ ...row, definition: definitions.find(d => d.id === row.skill_id) ?? null }));
  const slots = learned.filter(row => row.equipped_slot !== null);
  const inconsistent = learned.some(row => row.equipped !== (row.equipped_slot !== null))
    || new Set(slots.map(row => row.equipped_slot)).size !== slots.length
    || claims.some(claim => claim.equipment_decision === "legacy" || !learned.some(row => row.skill_id === claim.skill_id)
      || !path.some(m => m.milestoneKey === claim.milestone_key && m.level <= pet.level))
    || path.some(m => {
      const rows = learnedDetails.filter(row => row.definition && (
        row.definition.requirements.milestone_key === m.milestoneKey
        || m.candidates.some(c => c.slug === row.definition?.slug || c.sourceSlug === row.definition?.slug)));
      const claim = claims.find(c => c.milestone_key === m.milestoneKey);
      if (!rows.length && !claim) return false;
      return rows.length !== 1 || !claim || claim.skill_id !== rows[0].skill_id
        || rows[0].definition?.required_level !== m.level
        || !m.candidates.some(c => c.slug === rows[0].definition?.slug)
        || path.some(earlier => earlier.level < m.level && !claims.some(c => c.milestone_key === earlier.milestoneKey));
    })
    || new Set(claims.map(c => c.milestone_key)).size !== claims.length
    || claims.filter(c => c.equipment_decision === "pending").length > 1;
  const next = path.find(m => m.level <= pet.level && !claims.some(c => c.milestone_key === m.milestoneKey));
  const pending = claims.find(c => c.equipment_decision === "pending") ?? null;
  const status = pet.stage === "egg" ? "ineligible" : !path.length ? "definitions_unavailable" : inconsistent ? "reconciliation_required"
    : pet.ran_away ? "ineligible" : "available";
  const combatSkills = learnedDetails.flatMap(row => {
    const candidate = known.find(c => c.slug === row.definition?.slug);
    const entry = candidate && speciesSkill(candidate.slug);
    const def = entry?.definition;
    if (status !== "available" || !row.equipped || row.equipped_slot === null || !candidate || candidate.level > pet.level
      || !def || !("mana_cost" in def) || !("target" in def) || !("role" in def)) return [];
    return [{ id: row.skill_id, slug: entry.skill_id, name: candidate.name, description: candidate.description,
      manaCost: def.mana_cost, role: def.role, target: def.target }];
  });
  return { learned: learnedDetails, claims, claim: claims.find(c => c.milestone_key === "level-2") ?? null,
    choices: status === "available" && !pending ? next?.candidates ?? [] : [],
    nextMilestone: next?.level ?? null, skillStatus: status, pendingReplacement: pending,
    equippedSlots: [1, 2, 3, 4].map(slot => ({ slot, skill: learnedDetails.find(row => row.equipped_slot === slot) ?? null })),
    normalLoadoutEditingAllowed: false, combatSkills };
}

export async function readSkillState(pet: SkillPet) {
  const [learned, claims, definitions] = await Promise.all([
    supabaseAdmin.from("pet_skills").select("skill_id,equipped,equipped_slot,unlocked_at").eq("pet_id", pet.id),
    supabaseAdmin.from("pet_skill_milestone_claims").select("skill_id,milestone_key,config_version,eligible_choices,equipment_decision,equipment_decision_slot").eq("pet_id", pet.id),
    supabaseAdmin.from("skill_defs").select("id,slug,name,description,required_level,requirements"),
  ]);
  for (const result of [learned, claims, definitions]) if (result.error) failure(result.error);
  return skillState(pet, parse(z.array(learnedSchema), learned.data), parse(z.array(claimSchema), claims.data),
    parse(z.array(definitionSchema), definitions.data));
}

export async function learnSkill(userId: string, pet: SkillPet, slug: string) {
  if (pet.stage === "egg" || pet.species === null) failure({ message: "SKILL_INELIGIBLE" });
  const milestone = learningPath(pet.species, pet.line).find(m => m.candidates.some(c => c.slug === slug));
  if (!milestone || pet.level < milestone.level || pet.ran_away) failure({ message: "SKILL_INELIGIBLE" });
  const result = await supabaseAdmin.rpc("claim_species_skill", {
    p_user_id: userId, p_pet_id: pet.id, p_species: pet.species, p_element: pet.line,
    p_level: milestone.level, p_skill_slug: slug, p_choices: milestone.candidates,
  });
  if (result.error) failure(result.error);
  return parse(receiptSchema.refine(r => r.milestone_key === milestone.milestoneKey), result.data);
}

export async function decideEquipment(userId: string, pet: SkillPet, input: unknown) {
  if (pet.stage === "egg") failure({ message: "SKILL_INELIGIBLE" });
  const body = z.object({ milestoneKey: z.string().refine(v => skillMilestones.some(l => v === `level-${l}`)),
    slot: z.number().int().min(1).max(4).nullable() }).strict().parse(input);
  const result = await supabaseAdmin.rpc("resolve_species_skill_equipment", {
    p_user_id: userId, p_pet_id: pet.id, p_milestone_key: body.milestoneKey, p_slot: body.slot,
  });
  if (result.error) failure(result.error);
  return parse(receiptSchema.refine(r => r.milestone_key === body.milestoneKey), result.data);
}
