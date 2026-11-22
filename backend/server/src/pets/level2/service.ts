import { readSkillState, learnSkill, decideEquipment } from "./skillProgression";
import { z } from "zod";
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { starterAllocationRequestSchema, choiceRequestSchema, petIdSchema, statKeys } from "./contracts";

function parseDatabase<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError("Invalid Level 2 database response. Refresh before retrying.", 502, "L2_INVALID_RESPONSE");
  }
  return result.data;
}

const petFields = z.object({
  id: z.uuid(), user_id: z.uuid(), species: z.string(), line: z.string(),
  stage: z.string(), ran_away: z.boolean(), xp: z.number().int().nonnegative(),
  level: z.number().int().min(1).max(30), unspent_points: z.number().int().nonnegative(),
  hp_max: z.number().int().positive(), hp_cur: z.number().int().nonnegative(),
  atk: z.number().int().nonnegative(), magi: z.number().int().nonnegative(),
  def: z.number().int().nonnegative(), spd: z.number().int().nonnegative(), mana: z.number().int().nonnegative(),
});
// Only eggs may lack species metadata; every other field remains validated.
const petSchema = z.union([
  petFields.extend({ stage: z.literal("egg"), species: z.string().nullable() }),
  petFields.extend({ stage: z.string().refine(stage => stage !== "egg") }),
]);
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
    .select("id,user_id,species,line,stage,ran_away,level,xp,unspent_points,hp_max,hp_cur,atk,magi,def,spd,mana")
    .eq("id", petId).eq("user_id", userId).maybeSingle();
  if (result.error) databaseFailure(result.error);
  if (!result.data) throw new AppError("Kith not found.", 404);
  return parseDatabase(petSchema.refine(pet => pet.id === petId && pet.user_id === userId), result.data);
}

export async function readLevel2(userId: string, petId: string) {
  const pet = await ownedPet(userId, petId);
  const [skills, allocationResult] = await Promise.all([
    readSkillState(pet),
    supabaseAdmin.from("pet_stat_allocations").select("level,hp,atk,magi,def,spd,mana").eq("pet_id", petId),
  ]);
  if (allocationResult.error) databaseFailure(allocationResult.error);
  const n = z.number().int().nonnegative();
  const allocations = parseDatabase(z.array(z.object({level:z.number().int().min(1).max(30),hp:n,atk:n,magi:n,def:n,spd:n,mana:n})),allocationResult.data);
  const supported = pet.stage !== "egg" && (pet.species === "light_starter" || pet.species === "kithna_clodian");
  const history = allocations.filter(row=>row.level>1);
  const consistent = history.every(row=>row.level<=pet.level && statKeys.reduce((sum,key)=>sum+row[key],0)===1)
    && new Set(history.map(row=>row.level)).size===history.length
    && pet.unspent_points===pet.level-1-history.length;
  return {pet, ...skills,
    allocationStatus:!supported||pet.level<2?"ineligible":consistent?"available":"reconciliation_required",
    availablePoints:supported&&consistent?pet.unspent_points:0,
    earnedPoints:pet.level-1, allocatedPoints:history.length,
    allocationHistory:allocations,
  };
}

export async function chooseLevel2(userId: string, petId: string, input: unknown) {
  const body = choiceRequestSchema.parse(input);
  const pet = await ownedPet(userId, petId);
  return learnSkill(userId, pet, body.skillSlug);
}

export async function resolveSkillEquipment(userId: string, petId: string, input: unknown) {
  return decideEquipment(userId, await ownedPet(userId, petId), input);
}

export async function allocateLevel2(userId: string, petId: string, input: unknown) {
  const parsed = starterAllocationRequestSchema.refine(body => statKeys.reduce((sum,key)=>sum+body.allocation[key],0)<=29,
    "Cannot allocate more than 29 earned points").parse(input);
  const pet = await ownedPet(userId, petId);
  const body = parsed;
  if (pet.stage === "egg" || pet.species === null || !["light_starter","kithna_clodian"].includes(pet.species)) throw new AppError("Stat allocation is not enabled for this species.",409,"L2_INELIGIBLE");
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
