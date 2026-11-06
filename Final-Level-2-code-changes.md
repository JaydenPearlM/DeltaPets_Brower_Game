filename: backend/server/src/pets/level2/contracts.ts
linenumber: 1
old_code: (new file; no existing code replaced)
new_code:
```
import { z } from "zod";
import { findCharacterProfileBySpeciesId } from "../../shared/pets/characterProfiles/characterRegistry";

export const statKeys = ["hp", "atk", "magi", "def", "spd", "mana"] as const;
export const combatRoleSchema = z.enum(["tank", "healer", "dps", "sorcerer"]);
const points = z.number().int().min(0).max(2);
export const allocationSchema = z.object({
  hp: points, atk: points, magi: points, def: points, spd: points, mana: points,
}).strict().refine(value => {
  const sum = statKeys.reduce((total, key) => total + value[key], 0);
  return sum >= 1 && sum <= 2;
}, "Spend one or two Level 2 points");
export type Allocation = z.infer<typeof allocationSchema>;
export const allocationRequestSchema = z.object({
  requestId: z.uuid(), allocation: allocationSchema,
}).strict();
export const choiceRequestSchema = z.object({ skillSlug: z.string().regex(/^[a-z][a-z0-9-]*$/).max(100) }).strict();
export const petIdSchema = z.uuid();

const candidateSchema = z.object({
  proposed_skill_id: z.string(), name: z.string(), element: z.string(),
  role: combatRoleSchema, category: z.string(), description: z.string(),
  proposed_unlock_level: z.literal(2),
  damage: z.null(), healing_amount: z.null(), defense_modifier: z.null(),
  duration_turns: z.null(), accuracy: z.null(), mana_cost: z.null(), cooldown: z.null(),
});
const designSchema = z.object({ skills: z.object({
  level_2_skill_choice: z.object({
    level: z.literal(2), selection_count: z.literal(1), milestone_key: z.literal("level-2"),
    selection_method: z.literal("player_choice"), automatic_grant: z.literal(false),
    candidate_skill_ids: z.array(z.string()).length(4),
  }),
  hatchling_move_design_draft: z.object({
    implementation_approved: z.literal(false), candidate_moves: z.array(candidateSchema).length(4),
  }),
}) });

/** Static design eligibility only. Database claims and learned rows remain authoritative. */
export function getLevel2Design(speciesId: string, element: string) {
  const profile = findCharacterProfileBySpeciesId(speciesId);
  if (!profile || !profile.profile_enabled || profile.element !== element) return null;
  const parsed = designSchema.safeParse(profile.progression);
  if (!parsed.success) return null;
  const { level_2_skill_choice: choice, hatchling_move_design_draft: draft } = parsed.data.skills;
  const candidates = draft.candidate_moves;
  if (new Set(candidates.map(candidate => candidate.role)).size !== 4
    || new Set(choice.candidate_skill_ids).size !== 4
    || new Set(candidates.map(candidate => candidate.proposed_skill_id)).size !== 4
    || candidates.some(candidate => candidate.element !== element
      || !choice.candidate_skill_ids.includes(candidate.proposed_skill_id))) return null;
  return { milestoneKey: choice.milestone_key, configVersion: "level-2-v1", candidates, combatEnabled: false };
}

/** Pure preview/check; the database repeats checks under a row lock. */
export function allocationCost(input: unknown, unspent: number, alreadySpent: number) {
  const allocation = allocationSchema.parse(input);
  const cost = statKeys.reduce((sum, key) => sum + allocation[key], 0);
  if (!Number.isSafeInteger(unspent) || unspent < cost
    || !Number.isSafeInteger(alreadySpent) || alreadySpent < 0 || alreadySpent + cost > 2) {
    throw new Error("Insufficient Level 2 points");
  }
  return cost;
}
```
description: Independent Level 2 foundation. Zod validates external values without unsafe casts; backend routes remain unmounted and production gameplay is unchanged.

filename: backend/server/src/pets/level2/service.ts
linenumber: 1
old_code: (new file; no existing code replaced)
new_code:
```
import { z } from "zod";
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { allocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema } from "./contracts";

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
  return petSchema.parse(result.data);
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
  const learned = z.array(learnedSchema).parse(learnedResult.data);
  const claim = claimResult.data ? claimSchema.parse(claimResult.data) : null;
  const reward = rewardResult.data ? rewardSchema.parse(rewardResult.data) : null;
  const design = getLevel2Design(pet.species, pet.line);
  const slugs = design?.candidates.map(candidate => candidate.proposed_skill_id) ?? [];
  const catalogResult = await supabaseAdmin.from("skill_defs").select("id,slug,name,description,required_level,requirements");
  if (catalogResult.error) databaseFailure(catalogResult.error);
  const catalog = z.array(definitionSchema).parse(catalogResult.data);
  const choices = design && pet.level >= 2 && !claim ? catalog.filter(definition =>
    slugs.includes(definition.slug) && definition.required_level <= pet.level
    && definition.requirements.config_version === design.configVersion
    && definition.requirements.milestone_key === "level-2"
    && definition.requirements.element === pet.line
    && Array.isArray(definition.requirements.species_ids)
    && definition.requirements.species_ids.includes(pet.species)
    && Array.isArray(definition.requirements.prerequisite_slugs)
    && definition.requirements.prerequisite_slugs.every(slug =>
      catalog.some(entry => entry.slug === slug && learned.some(row => row.skill_id === entry.id)))) : [];
  return { pet, learned: learned.map(row => ({ ...row, definition: catalog.find(entry => entry.id === row.skill_id) ?? null })),
    claim, choices, combatEnabled: false,
    level2Points: reward ? reward.points_awarded - reward.points_spent : 0,
    allocationStatus: pet.level < 2 ? "ineligible" : reward ? "available" : "reconciliation_required" };
}

export async function chooseLevel2(userId: string, petId: string, input: unknown) {
  const body = choiceRequestSchema.parse(input);
  await ownedPet(userId, petId);
  // Eligibility and identical retry handling are authoritative inside the RPC.
  const result = await supabaseAdmin.rpc("claim_level2_skill", {
    p_user_id: userId, p_pet_id: petId, p_skill_slug: body.skillSlug,
  });
  if (result.error) databaseFailure(result.error);
  return z.object({ skill_id: z.uuid(), milestone_key: z.literal("level-2") }).parse(result.data);
}

export async function allocateLevel2(userId: string, petId: string, input: unknown) {
  const body = allocationRequestSchema.parse(input);
  await ownedPet(userId, petId);
  const result = await supabaseAdmin.rpc("allocate_level2_stats", {
    p_user_id: userId, p_pet_id: petId, p_request_id: body.requestId, p_allocation: body.allocation,
  });
  if (result.error) databaseFailure(result.error);
  return z.object({ request_id: z.uuid(), pet_id: z.uuid(), spent: z.number().int().min(1).max(2),
    unspent_points: z.number().int().nonnegative(), hp_max: z.number().int().positive(),
    hp_cur: z.number().int().nonnegative(), atk: z.number().int(), magi: z.number().int(),
    def: z.number().int(), spd: z.number().int(), mana: z.number().int(),
  }).parse(result.data);
}
```
description: Independent Level 2 foundation. Zod validates external values without unsafe casts; backend routes remain unmounted and production gameplay is unchanged.

filename: backend/server/src/routes/pets/level2.ts
linenumber: 1
old_code: (new file; no existing code replaced)
new_code:
```
import { Router } from "express";
import { ZodError } from "zod";
import { requireUser, getUserId, type AuthedRequest } from "../../middleware/auth";
import { AppError } from "../../lib/AppError";
import { allocateLevel2, chooseLevel2, readLevel2 } from "../../pets/level2/service";
import { petIdSchema } from "../../pets/level2/contracts";

// DELIBERATELY UNMOUNTED. Mount under the existing authenticated/rate-limited
// /api router only after the reviewed database proposal is approved and verified.
export const level2Router = Router();
level2Router.use(requireUser);
for (const operation of ["state", "skill", "stats"] as const) {
  const method = operation === "state" ? "get" : "post";
  level2Router[method](`/:petId/${operation}`, async (req: AuthedRequest, res, next) => {
    try {
      const userId = getUserId(req);
      const petId = petIdSchema.parse(req.params.petId);
      const result = operation === "state" ? await readLevel2(userId, petId)
        : operation === "skill" ? await chooseLevel2(userId, petId, req.body)
        : await allocateLevel2(userId, petId, req.body);
      res.json(result);
    } catch (error) {
      next(error instanceof ZodError ? new AppError("Invalid Level 2 request or response.", 400) : error);
    }
  });
}
```
description: Independent Level 2 foundation. Zod validates external values without unsafe casts; backend routes remain unmounted and production gameplay is unchanged.

filename: supabase/review/level-2-foundation.proposed.sql
linenumber: 1
old_code: (new file; no existing code replaced)
new_code:
```
-- UNAPPLIED â€” REQUIRES EXPLICIT APPROVAL
-- Review-only, outside migrations. Run as postgres only after isolated integration tests.
-- Supersedes the earlier level-2-stat-points.proposed.sql; never apply both.
-- No existing-player backfill. Unbalanced skills remain combat_enabled=false.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.pet_stat_allocations DROP CONSTRAINT pet_alloc_points_valid;
ALTER TABLE public.pet_stat_allocations ADD CONSTRAINT pet_alloc_points_valid CHECK (
  hp >= 0 AND atk >= 0 AND magi >= 0 AND def >= 0 AND spd >= 0 AND mana >= 0 AND (
    (level = 1 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 30) OR
    (level = 2 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 2) OR
    (level > 2 AND hp + atk + magi + def + spd + mana = 1)
  )
);

CREATE TABLE public.pet_level2_rewards (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  points_awarded integer NOT NULL DEFAULT 2 CHECK (points_awarded = 2),
  points_spent integer NOT NULL DEFAULT 0 CHECK (points_spent BETWEEN 0 AND 2),
  awarded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pet_skill_milestone_claims (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.skill_defs(id) ON DELETE RESTRICT,
  species_id text NOT NULL,
  config_version text NOT NULL,
  eligible_choices jsonb NOT NULL CHECK (jsonb_typeof(eligible_choices) = 'array'),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, milestone_key)
);
CREATE TABLE public.pet_stat_spend_receipts (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  allocation jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, request_id)
);
ALTER TABLE public.pet_level2_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_skill_milestone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_stat_spend_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pet_level2_rewards, public.pet_skill_milestone_claims,
  public.pet_stat_spend_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_level2_rewards, public.pet_skill_milestone_claims,
  public.pet_stat_spend_receipts TO service_role;
-- Preserve existing SELECT policies and rows. Route future equipment changes through server validation.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.pet_skills,
  public.skill_defs FROM PUBLIC, anon, authenticated;
REVOKE INSERT (pet_id,skill_id,equipped,unlocked_at), UPDATE (pet_id,skill_id,equipped,unlocked_at), REFERENCES (pet_id,skill_id,equipped,unlocked_at)
  ON public.pet_skills FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id,slug,name,description,required_level,requirements,created_at),
  UPDATE (id,slug,name,description,required_level,requirements,created_at),
  REFERENCES (id,slug,name,description,required_level,requirements,created_at)
  ON public.skill_defs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_skills TO service_role;
GRANT SELECT ON public.skill_defs TO service_role;

CREATE FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  pet public.pets%ROWTYPE;
  chosen public.skill_defs%ROWTYPE;
  claim public.pet_skill_milestone_claims%ROWTYPE;
  choices jsonb;
  candidate_count integer;
  role_count integer;
BEGIN
  SELECT * INTO pet FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  SELECT * INTO claim FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND milestone_key = 'level-2';
  IF FOUND THEN
    IF EXISTS (SELECT 1 FROM public.skill_defs WHERE id = claim.skill_id AND slug = p_skill_slug)
      AND EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND skill_id = claim.skill_id) THEN
      RETURN jsonb_build_object('skill_id', claim.skill_id, 'milestone_key', 'level-2');
    END IF;
    RAISE EXCEPTION 'L2_CONFLICT';
  END IF;
  IF pet.level < 2 OR pet.level > 30 OR pet.stage::text = 'egg' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  -- Lock approved definitions so configuration cannot change during selection.
  PERFORM id FROM public.skill_defs
    WHERE requirements->>'milestone_key' = 'level-2'
      AND requirements->'species_ids' ? pet.species ORDER BY id FOR SHARE;
  SELECT * INTO chosen FROM public.skill_defs WHERE slug = p_skill_slug;
  IF NOT FOUND OR chosen.required_level <> 2
    OR (chosen.requirements->'species_ids' ? pet.species) IS DISTINCT FROM true
    OR chosen.requirements->>'element' IS DISTINCT FROM pet.line::text
    OR coalesce(chosen.requirements->>'role','') NOT IN ('tank','healer','dps','sorcerer')
    OR chosen.requirements->>'milestone_key' IS DISTINCT FROM 'level-2'
    OR chosen.requirements->>'config_version' IS DISTINCT FROM 'level-2-v1'
    OR chosen.requirements->>'combat_enabled' IS DISTINCT FROM 'false'
    OR jsonb_typeof(chosen.requirements->'prerequisite_slugs') IS DISTINCT FROM 'array'
  THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(chosen.requirements->'prerequisite_slugs') required(slug)
    WHERE NOT EXISTS (SELECT 1 FROM public.pet_skills ps JOIN public.skill_defs sd ON sd.id = ps.skill_id
      WHERE ps.pet_id = p_pet_id AND sd.slug = required.slug)) THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT count(*), count(DISTINCT requirements->>'role'),
    jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name,
      'required_level', required_level, 'requirements', requirements) ORDER BY slug)
    INTO candidate_count, role_count, choices FROM public.skill_defs
    WHERE required_level = 2 AND requirements->>'milestone_key' = 'level-2'
      AND requirements->>'config_version' = 'level-2-v1'
      AND requirements->'species_ids' ? pet.species
      AND requirements->>'element' = pet.line::text
      AND requirements->>'role' IN ('tank','healer','dps','sorcerer')
      AND requirements->>'combat_enabled' = 'false';
  IF candidate_count <> 4 OR role_count <> 4 THEN RAISE EXCEPTION 'L2_CONFIG'; END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skills ps JOIN public.skill_defs sd ON sd.id = ps.skill_id
    WHERE ps.pet_id = p_pet_id AND sd.requirements->>'milestone_key' = 'level-2') THEN
    RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
  END IF;
  INSERT INTO public.pet_skill_milestone_claims(pet_id,milestone_key,skill_id,species_id,config_version,eligible_choices)
    VALUES(p_pet_id,'level-2',chosen.id,pet.species,'level-2-v1',choices);
  INSERT INTO public.pet_skills(pet_id,skill_id,equipped) VALUES(p_pet_id,chosen.id,false);
  RETURN jsonb_build_object('skill_id',chosen.id,'milestone_key','level-2');
END;
$$;
REVOKE ALL ON FUNCTION public.claim_level2_skill(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_level2_skill(uuid,uuid,text) TO service_role;

CREATE FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  pet public.pets%ROWTYPE;
  reward public.pet_level2_rewards%ROWTYPE;
  receipt public.pet_stat_spend_receipts%ROWTYPE;
  base public.pet_stats%ROWTYPE;
  old_alloc public.pet_stat_allocations%ROWTYPE;
  total_cost integer;
  h integer; a integer; m integer; d integer; s integer; n integer;
  result jsonb;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_allocation) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_allocation)) <> 6
    OR NOT p_allocation ?& ARRAY['hp','atk','magi','def','spd','mana']
    OR EXISTS (SELECT 1 FROM jsonb_each(p_allocation) e WHERE jsonb_typeof(e.value) <> 'number'
      OR e.value::text !~ '^[0-2]$') THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  h := (p_allocation->>'hp')::integer; a := (p_allocation->>'atk')::integer;
  m := (p_allocation->>'magi')::integer; d := (p_allocation->>'def')::integer;
  s := (p_allocation->>'spd')::integer; n := (p_allocation->>'mana')::integer;
  total_cost := h+a+m+d+s+n;
  IF total_cost NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO pet FROM public.pets WHERE id=p_pet_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  SELECT * INTO receipt FROM public.pet_stat_spend_receipts WHERE pet_id=p_pet_id AND request_id=p_request_id;
  IF FOUND THEN
    IF receipt.allocation IS DISTINCT FROM p_allocation THEN RAISE EXCEPTION 'L2_CONFLICT'; END IF;
    RETURN receipt.result;
  END IF;
  IF pet.level < 2 OR pet.level > 30 OR pet.stage::text='egg' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT * INTO reward FROM public.pet_level2_rewards WHERE pet_id=p_pet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  IF pet.unspent_points < total_cost OR reward.points_spent+total_cost > 2 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO old_alloc FROM public.pet_stat_allocations WHERE pet_id=p_pet_id AND level=2 FOR UPDATE;
  IF coalesce(old_alloc.hp+old_alloc.atk+old_alloc.magi+old_alloc.def+old_alloc.spd+old_alloc.mana,0)
    <> reward.points_spent THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  SELECT * INTO base FROM public.pet_stats WHERE pet_id=p_pet_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  -- Fail instead of silently overwriting existing combat stat discrepancies.
  IF NOT EXISTS (SELECT 1 FROM (
      SELECT coalesce(sum(hp),0) hp,coalesce(sum(atk),0) atk,coalesce(sum(magi),0) magi,
        coalesce(sum(def),0) def,coalesce(sum(spd),0) spd,coalesce(sum(mana),0) mana
      FROM public.pet_stat_allocations WHERE pet_id=p_pet_id) totals
    WHERE pet.hp_max=greatest(1,2*(base.base_hp+totals.hp)) AND pet.atk=base.base_atk+totals.atk
      AND pet.magi=base.base_magi+totals.magi AND pet.def=base.base_def+totals.def
      AND pet.spd=base.base_spd+totals.spd AND pet.mana=base.base_mana+totals.mana
  ) THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
    VALUES(p_pet_id,2,h,a,m,d,s,n)
    ON CONFLICT(pet_id,level) DO UPDATE SET
      hp=public.pet_stat_allocations.hp+excluded.hp, atk=public.pet_stat_allocations.atk+excluded.atk,
      magi=public.pet_stat_allocations.magi+excluded.magi, def=public.pet_stat_allocations.def+excluded.def,
      spd=public.pet_stat_allocations.spd+excluded.spd, mana=public.pet_stat_allocations.mana+excluded.mana;
  UPDATE public.pet_level2_rewards SET points_spent=points_spent+total_cost WHERE pet_id=p_pet_id;
  -- HP current is intentionally untouched: allocation must not heal.
  UPDATE public.pets SET unspent_points=unspent_points-total_cost, hp_max=hp_max+2*h,
    atk=atk+a,magi=magi+m,def=def+d,spd=spd+s,mana=mana+n WHERE id=p_pet_id RETURNING * INTO pet;
  result := jsonb_build_object('request_id',p_request_id,'pet_id',p_pet_id,'spent',total_cost,
    'unspent_points',pet.unspent_points,'hp_max',pet.hp_max,'hp_cur',pet.hp_cur,
    'atk',pet.atk,'magi',pet.magi,'def',pet.def,'spd',pet.spd,'mana',pet.mana);
  INSERT INTO public.pet_stat_spend_receipts(pet_id,request_id,allocation,result) VALUES(p_pet_id,p_request_id,p_allocation,result);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.allocate_level2_stats(uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_level2_stats(uuid,uuid,uuid,jsonb) TO service_role;

-- Catalog proposal generated from current Twiglet design; collisions require review.
DO $seed$
BEGIN
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='root-brace') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('root-brace','Root Brace','Twiglet briefly roots itself into the ground, gaining a minor defensive benefit.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "tank", "category": "defense", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": "self_proposed"}}'::jsonb);
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='sprout-mend') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('sprout-mend','Sprout Mend','Twiglet grows a small leaf to restore a little HP.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "healer", "category": "healing", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": null}}'::jsonb);
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='seed-tap') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('seed-tap','Seed Tap','Twiglet launches a hardened seed for light physical damage.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "dps", "category": "physical_damage", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": "one_enemy"}}'::jsonb);
  IF EXISTS (SELECT 1 FROM public.skill_defs WHERE slug='pollen-puff') THEN RAISE EXCEPTION 'Skill slug already exists; review required'; END IF;
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES('pollen-puff','Pollen Puff','Twiglet releases magical pollen for light ranged Earth damage.',2,'{"species_ids": ["earth_starter"], "element": "earth", "role": "sorcerer", "category": "ranged_magic", "milestone_key": "level-2", "config_version": "level-2-v1", "combat_enabled": false, "prerequisite_slugs": [], "effect": {"damage": null, "healing_amount": null, "defense_modifier": null, "duration_turns": null, "accuracy": null, "mana_cost": null, "cooldown": null, "target": "one_enemy"}}'::jsonb);
END;
$seed$;
DO $guard$
DECLARE actual text;
BEGIN
  SELECT prosrc INTO actual FROM pg_proc
  WHERE oid = to_regprocedure('public.settle_wildwood_victory_xp(uuid,uuid)');
  IF actual IS NULL OR btrim(replace(actual, chr(13), '')) <> btrim($expected$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_players jsonb;
  v_pet_id uuid;
  v_level integer;
  v_xp integer;
  v_reward jsonb;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wildwood room not found' USING ERRCODE = '23514';
  END IF;
  IF v_room.status <> 'resolved'
    OR v_room.event_kind <> 'corrupted_battle'
    OR (v_room.event_payload ->> 'xpRewardVersion') IS DISTINCT FROM '1'
    OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
    OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
    OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
  THEN
    RAISE EXCEPTION 'No eligible Wildwood victory' USING ERRCODE = '23514';
  END IF;
  SELECT jsonb_agg(participant) INTO v_players
  FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
  WHERE participant ->> 'side' = 'player';
  IF jsonb_array_length(v_players) IS DISTINCT FROM 1
    OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 2
    OR (v_players #>> '{0,defeated}') IS DISTINCT FROM 'false'
    OR COALESCE((v_players #>> '{0,hpCur}')::integer, 0) <= 0
  THEN
    RAISE EXCEPTION 'Expected one living player participant' USING ERRCODE = '23514';
  END IF;
  v_pet_id := COALESCE(v_players #>> '{0,sourcePetId}', v_players #>> '{0,id}')::uuid;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
  END IF;
  IF v_room.event_payload ? 'xpReward' THEN
    RETURN v_room.event_payload -> 'xpReward';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pet_battle_results
    WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
      AND user_id = p_user_id AND result = 'victory'
  ) THEN
    RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
  END IF;
  IF v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0 THEN
    RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
  END IF;
  -- Preserve lifetime XP. Reaching level L costs 100 * (1 + ... + L-1).
  -- Existing higher levels are never reduced and existing XP is never reset.
  v_xp := v_pet.xp + 25;
  v_level := v_pet.level;
  WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1) LOOP
    v_level := v_level + 1;
  END LOOP;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
    'previousLevel', v_pet.level, 'level', v_level,
    'pointsEarned', v_level - v_pet.level
  );
  UPDATE public.pets SET xp = v_xp, level = v_level,
    unspent_points = unspent_points + (v_level - v_pet.level)
  WHERE id = v_pet_id;
  UPDATE public.wildwood_rooms
  SET event_payload = jsonb_set(event_payload, '{xpReward}', v_reward)
  WHERE id = p_room_id;
  RETURN v_reward;
END;
$expected$) THEN
    RAISE EXCEPTION 'Live progression function differs from reviewed source; stop and review';
  END IF;
END;
$guard$;
CREATE OR REPLACE FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_players jsonb;
  v_pet_id uuid;
  v_level integer;
  v_xp integer;
  v_reward jsonb;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wildwood room not found' USING ERRCODE = '23514';
  END IF;
  IF v_room.status <> 'resolved'
    OR v_room.event_kind <> 'corrupted_battle'
    OR (v_room.event_payload ->> 'xpRewardVersion') IS DISTINCT FROM '1'
    OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
    OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
    OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
  THEN
    RAISE EXCEPTION 'No eligible Wildwood victory' USING ERRCODE = '23514';
  END IF;
  SELECT jsonb_agg(participant) INTO v_players
  FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
  WHERE participant ->> 'side' = 'player';
  IF jsonb_array_length(v_players) IS DISTINCT FROM 1
    OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 2
    OR (v_players #>> '{0,defeated}') IS DISTINCT FROM 'false'
    OR COALESCE((v_players #>> '{0,hpCur}')::integer, 0) <= 0
  THEN
    RAISE EXCEPTION 'Expected one living player participant' USING ERRCODE = '23514';
  END IF;
  v_pet_id := COALESCE(v_players #>> '{0,sourcePetId}', v_players #>> '{0,id}')::uuid;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
  END IF;
  IF v_room.event_payload ? 'xpReward' THEN
    RETURN v_room.event_payload -> 'xpReward';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pet_battle_results
    WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
      AND user_id = p_user_id AND result = 'victory'
  ) THEN
    RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
  END IF;
  IF v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0 THEN
    RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
  END IF;
  -- Preserve lifetime XP. Reaching level L costs 100 * (1 + ... + L-1).
  -- Existing higher levels are never reduced and existing XP is never reset.
  v_xp := v_pet.xp + 25;
  v_level := v_pet.level;
  WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1) LOOP
    v_level := v_level + 1;
  END LOOP;
  IF v_pet.level < 2 AND v_level >= 2 THEN
    INSERT INTO public.pet_level2_rewards(pet_id) VALUES(v_pet_id);
  END IF;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
    'previousLevel', v_pet.level, 'level', v_level,
    'pointsEarned', (v_level - v_pet.level) + CASE WHEN v_pet.level < 2 AND v_level >= 2 THEN 1 ELSE 0 END
  );
  UPDATE public.pets SET xp = v_xp, level = v_level,
    unspent_points = unspent_points + ((v_level - v_pet.level) + CASE WHEN v_pet.level < 2 AND v_level >= 2 THEN 1 ELSE 0 END)
  WHERE id = v_pet_id;
  UPDATE public.wildwood_rooms
  SET event_payload = jsonb_set(event_payload, '{xpReward}', v_reward)
  WHERE id = p_room_id;
  RETURN v_reward;
END;
$$;

ROLLBACK;
```
description: UNAPPLIED SQL proposal; database execution requires explicit approval. Atomic operations and receipt tables require integration testing.

filename: tools/check-level-2-foundation.cjs
linenumber: 1
old_code: (new file; no existing code replaced)
new_code:
```
// Isolated TypeScript/service tests. No network or database calls.
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const contracts = require('../backend/server/dist/pets/level2/contracts.js');
const allocation = { hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 };
assert.equal(contracts.allocationCost({ ...allocation, hp: 2 }, 2, 0), 2);
assert.equal(contracts.allocationCost({ ...allocation, hp: 1, atk: 1 }, 2, 0), 2);
assert.equal(contracts.allocationCost({ ...allocation, mana: 1 }, 1, 1), 1);
for (const bad of [allocation, { ...allocation, hp: -1 }, { ...allocation, hp: 0.5 },
  { ...allocation, hp: '1' }, { ...allocation, hp: 2, atk: 1 }, { ...allocation, hp: 1, owner: 'forged' }]) {
  assert.throws(() => contracts.allocationSchema.parse(bad));
}
assert.throws(() => contracts.allocationCost({ ...allocation, hp: 1 }, 0, 0));
assert.throws(() => contracts.allocationCost({ ...allocation, hp: 1 }, 1, 2));
const design = contracts.getLevel2Design('earth_starter', 'earth');
assert.equal(design.candidates.length, 4);
assert.equal(design.combatEnabled, false);
assert.deepEqual(design.candidates.map(c => c.role), ['tank', 'healer', 'dps', 'sorcerer']);
assert.equal(contracts.getLevel2Design('water_starter', 'water'), null);
assert.equal(contracts.getLevel2Design('earth_starter', 'fire'), null);
assert.equal(contracts.getLevel2Design('unknown', 'earth'), null);
assert.throws(() => contracts.choiceRequestSchema.parse({ skillSlug: 'root-brace', userId: 'forged' }));
assert.throws(() => contracts.allocationRequestSchema.parse({ requestId: 'bad', allocation: { ...allocation, hp: 1 } }));

const owner = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const skillId = '33333333-3333-4333-8333-333333333333';
const pet = { id, user_id: owner, species: 'earth_starter', line: 'earth', level: 2,
  unspent_points: 2, hp_max: 10, hp_cur: 6, atk: 3, magi: 3, def: 3, spd: 3, mana: 3 };
let rpcError = null;
let rpcCalls = [];
const fake = {
  from(table) {
    assert.equal(table, 'pets');
    const filters = {};
    return {
      select() { return this; }, eq(key, value) { filters[key] = value; return this; },
      async maybeSingle() {
        assert.ok(filters.user_id, 'ownership must be included in the database filter');
        return { data: filters.user_id === owner && filters.id === id ? pet : null, error: null };
      },
    };
  },
  async rpc(name, args) {
    rpcCalls.push({ name, args });
    return { data: rpcError ? null : { skill_id: skillId, milestone_key: 'level-2' }, error: rpcError };
  },
};
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === '../../lib/supabaseAdmin') return { supabaseAdmin: fake };
  return load.call(this, name, parent, main);
};
const service = require('../backend/server/dist/pets/level2/service.js');
Module._load = load;
async function main() {
  await assert.rejects(service.chooseLevel2(skillId, id, { skillSlug: 'root-brace' }), /Kith not found/);
  assert.equal(rpcCalls.length, 0);
  const first = await service.chooseLevel2(owner, id, { skillSlug: 'root-brace' });
  const retry = await service.chooseLevel2(owner, id, { skillSlug: 'root-brace' });
  assert.deepEqual(first, retry);
  assert.deepEqual(rpcCalls[0], { name: 'claim_level2_skill', args: { p_user_id: owner, p_pet_id: id, p_skill_slug: 'root-brace' } });
  rpcError = { code: 'P0001', message: 'L2_CONFLICT' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'pollen-puff' }), error => error.statusCode === 409);
  rpcError = { code: 'PGRST202', message: 'missing function' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 503);
  const before = rpcCalls.length;
  await assert.rejects(service.allocateLevel2(owner, id, { requestId: id, allocation: { ...allocation, hp: 3 } }));
  assert.equal(rpcCalls.length, before);
  assert.equal(pet.hp_cur, 6); // Service never mutates combat stats locally.
  assert.ok(!fs.readFileSync('backend/server/src/routes/index.ts', 'utf8').includes('level2'));
  console.log('PASS: allocation validation/budgets, species eligibility, ownership filtering, RPC delegation, conflict/unavailable errors, unchanged local HP, router unmounted.');
  console.log('NOTE: retry result mocked; database atomicity/concurrency/persistence still require approved integration testing.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
```
description: Isolated validation/service regression tests; mocked RPC results do not prove database atomicity.
