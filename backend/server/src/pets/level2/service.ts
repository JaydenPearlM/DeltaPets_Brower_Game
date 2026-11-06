import { STARTER_SPROUTS } from "../../shared/pets/species/starter-species";
import { z } from "zod";
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { allocationRequestSchema, starterAllocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema, statKeys, allocationHistoryStatus } from "./contracts";

function parseDatabase<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError("Invalid Level 2 database response. Refresh before retrying.", 502, "L2_INVALID_RESPONSE");
  }
  return result.data;
}

const petSchema = z.object({
  id: z.uuid(), user_id: z.uuid(), species: z.string(), line: z.string(),
  level: z.number().int().min(1).max(30), unspent_points: z.number().int().nonnegative(),
  hp_max: z.number().int().positive(), hp_cur: z.number().int().nonnegative(),
  atk: z.number().int().nonnegative(), magi: z.number().int().nonnegative(),
  def: z.number().int().nonnegative(), spd: z.number().int().nonnegative(), mana: z.number().int().nonnegative(),
});
const learnedSchema = z.object({ skill_id: z.uuid(), equipped: z.boolean(), unlocked_at: z.string() });
const definitionSchema = z.object({
  id: z.uuid(), slug: z.string(), name: z.string(), description: z.string().nullable(),
  required_level: z.number().int(), requirements: z.record(z.string(), z.unknown()),
});
const claimSchema = z.object({
  skill_id: z.uuid(), config_version: z.string(), eligible_choices: z.array(z.unknown()),
});
const rewardSchema = z.object({ points_awarded: z.literal(2), points_spent: z.number().int().min(0).max(2) });
type DatabaseError = { code?: string; message: string };
function databaseFailure(error: DatabaseError): never {
  if (["L2_NOT_FOUND", "L2_INELIGIBLE", "L2_CONFLICT", "L2_POINTS", "L2_RECONCILIATION_REQUIRED", "L2_CONFIG"].includes(error.message)) {
    throw new AppError("This Level 2 request cannot be completed. Refresh the Kith's state.",
      error.message === "L2_NOT_FOUND" ? 404 : 409, error.message);
  }
  throw new AppError("Level 2 persistence is unavailable. No success has been confirmed.", 503, "L2_UNAVAILABLE");
}

async function ownedPet(userId: string, petId: string) {
  z.uuid().parse(userId); petIdSchema.parse(petId);
  const result = await supabaseAdmin.from("pets")
    .select("id,user_id,species,line,level,unspent_points,hp_max,hp_cur,atk,magi,def,spd,mana")
    .eq("id", petId).eq("user_id", userId).maybeSingle();
  if (result.error) databaseFailure(result.error);
  if (!result.data) throw new AppError("Kith not found.", 404);
  return parseDatabase(petSchema.refine(pet => pet.id === petId && pet.user_id === userId), result.data);
}

export async function readLevel2(userId: string, petId: string) {
  const pet = await ownedPet(userId, petId);
  const [learnedResult, claimResult, rewardResult] = await Promise.all([
    supabaseAdmin.from("pet_skills").select("skill_id,equipped,unlocked_at").eq("pet_id", petId),
    supabaseAdmin.from("pet_skill_milestone_claims").select("skill_id,config_version,eligible_choices")
      .eq("pet_id", petId).eq("milestone_key", "level-2").maybeSingle(),
    supabaseAdmin.from("pet_level2_rewards").select("points_awarded,points_spent").eq("pet_id", petId).maybeSingle(),
  ]);
  for (const result of [learnedResult, claimResult, rewardResult]) if (result.error) databaseFailure(result.error);
  const learned = parseDatabase(z.array(learnedSchema), learnedResult.data);
  const claim = parseDatabase(claimSchema.nullable(), claimResult.data);
  const reward = parseDatabase(rewardSchema.nullable(), rewardResult.data);
  let starterAllocation = null;
  if (STARTER_SPROUTS.some(starter => starter.speciesId === pet.species)) {
    const [later, history] = await Promise.all([
      supabaseAdmin.from("pet_starter_level_rewards").select("level,points_awarded,points_spent").eq("pet_id", petId),
      supabaseAdmin.from("pet_stat_allocations").select("level,hp,atk,magi,def,spd,mana").eq("pet_id", petId),
    ]);
    if (later.error) databaseFailure(later.error);
    if (history.error) databaseFailure(history.error);
    const rows = parseDatabase(z.array(rewardSchema.extend({ level: z.number().int().min(3).max(30) })), later.data);
    const n = z.number().int().nonnegative();
    const allocations = parseDatabase(z.array(z.object({ level: z.number().int().min(1).max(30),
      hp: n, atk: n, magi: n, def: n, spd: n, mana: n })), history.data);
    starterAllocation = allocationHistoryStatus(pet.level, pet.unspent_points,
      [...(reward ? [{ level: 2, ...reward }] : []), ...rows], allocations);
  }
  const design = getLevel2Design(pet.species, pet.line);
  const slugs = design?.candidates.map(candidate => candidate.proposed_skill_id) ?? [];
  const catalogResult = await supabaseAdmin.from("skill_defs").select("id,slug,name,description,required_level,requirements");
  if (catalogResult.error) databaseFailure(catalogResult.error);
  const catalog = parseDatabase(z.array(definitionSchema), catalogResult.data);
  const choices = design && pet.level >= 2 && !claim ? catalog.filter(definition =>
    slugs.includes(definition.slug) && definition.required_level === 2
    && definition.requirements.combat_enabled === false
    && definition.requirements.config_version === design.configVersion
    && definition.requirements.milestone_key === "level-2"
    && definition.requirements.element === pet.line
    && Array.isArray(definition.requirements.species_ids)
    && definition.requirements.species_ids.includes(pet.species)
    && Array.isArray(definition.requirements.prerequisite_slugs)
    && definition.requirements.prerequisite_slugs.every(slug =>
      catalog.some(entry => entry.slug === slug && learned.some(row => row.skill_id === entry.id)))) : [];
  return { pet, learned: learned.map(row => ({ ...row, definition: catalog.find(entry => entry.id === row.skill_id) ?? null })),
    claim, choices, combatEnabled: false, starterAllocation,
    level2Points: reward ? reward.points_awarded - reward.points_spent : 0,
    allocationStatus: starterAllocation?.status ?? (pet.level < 2 ? "ineligible" : reward ? "available" : "reconciliation_required") };
}

export async function chooseLevel2(userId: string, petId: string, input: unknown) {
  const body = choiceRequestSchema.parse(input);
  await ownedPet(userId, petId);
  // Eligibility and identical retry handling are authoritative inside the RPC.
  const result = await supabaseAdmin.rpc("claim_level2_skill", {
    p_user_id: userId, p_pet_id: petId, p_skill_slug: body.skillSlug,
  });
  if (result.error) databaseFailure(result.error);
  return parseDatabase(z.object({ skill_id: z.uuid(), milestone_key: z.literal("level-2") }), result.data);
}

export async function allocateLevel2(userId: string, petId: string, input: unknown) {
  const parsed = starterAllocationRequestSchema.parse(input);
  const pet = await ownedPet(userId, petId);
  const body = STARTER_SPROUTS.some(starter => starter.speciesId === pet.species)
    ? parsed : allocationRequestSchema.parse(input);
  const result = await supabaseAdmin.rpc("allocate_level2_stats", {
    p_user_id: userId, p_pet_id: petId, p_request_id: body.requestId, p_allocation: body.allocation,
  });
  if (result.error) databaseFailure(result.error);
  return parseDatabase(z.object({ request_id: z.uuid(), pet_id: z.uuid(), spent: z.number().int().min(1).max(58),
    unspent_points: z.number().int().nonnegative(), hp_max: z.number().int().positive(),
    hp_cur: z.number().int().nonnegative(), atk: z.number().int().nonnegative(), magi: z.number().int().nonnegative(),
    def: z.number().int().nonnegative(), spd: z.number().int().nonnegative(), mana: z.number().int().nonnegative(),
  }).refine(receipt => receipt.pet_id === petId && receipt.request_id === body.requestId
    && receipt.spent === statKeys.reduce((sum, key) => sum + body.allocation[key], 0)), result.data);
}
