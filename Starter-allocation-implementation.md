# Starter allocation implementation

Implemented locally, not activated. Existing lifetime XP and starter reward formula retained. New pet_starter_level_rewards records two points for each newly crossed starter level3-30, unique per pet/level. Level2 receipt remains separate and unchanged in capacity. New receipts are inserted in the existing locked Wildwood victory transaction; duplicate room requests return the existing XP receipt before writes. No XP-source contract changes.

Existing allocate_level2_stats RPC now supports accumulated starter requests of1-58 points (the total lifetime earned maximum), verifies exact species IDs, owns/locks pet, locks entitlement rows, checks unspent balance, recorded versus actual allocations, and base-stat consistency. It consumes oldest earned levels first without changing the requested stat choices. Partial allocations and saved points persist. Each request has one existing unique receipt binding full requested allocation, pet and request ID; retries return historical result before spending. Concurrent requests serialize on the pet row. HP increases by2 per point; hp_cur untouched. Non-starters retain Level2-only allocation and prior later-level one-point constraint behavior.

The global CHECK permits0-2 aboveLevel2; a species-aware AFTER row trigger verifies starter allocation totals against receipts and enforces exactly1 for non-starters. AFTER is required to validate final ON CONFLICT UPDATE values rather than the tentative insert portion. Entitlement changes and allocation rows roll back together on errors. RLS enabled, no client access, invoker functions with empty search_path, service-only execution retained. SQL stays outside migrations and ends ROLLBACK. No new public callable award API.

Eligibility: water_starter, fire_starter, earth_starter, air_starter, ice_starter, storm_starter, light_starter, shadow_night_bad, shadow_day_good; compared with STARTER_SPROUTS in tests. Both registered Shadow variants preserved. TypeScript uses strict Zod request validation and the registry to retain smaller non-starter request limits. Existing response502 and client400 behavior preserved; no unsafe casts or new dependencies.

Existing-player safety: missing prior receipts or mismatched allocations fail with L2_RECONCILIATION_REQUIRED. No backfill from current level or historical assumptions. Existing historical retry receipts remain valid. Compatibility: existing later-level starter rows are not rewritten; new writes require coherent entitlements. Do not activate until historical-player review and isolated PostgreSQL tests. If future deployment fails, transaction rollback preserves prior schema/data; once live entitlements exist, recovery must preserve them rather than drop tables. Existing Level2 state endpoint remains Level2-focused (no new frontend); allocation response reports actual remaining aggregate unspent balance.

Skills were not edited: Twiglet choices and existing acquisition behavior preserved. This task does not implement or independently certify the global four-learned-skill limit. Universal XP-source integration remains separate. No routes mounted.

## Verification

PASS pnpm --dir backend/server build
PASS pnpm exec node tools/check-level-2-foundation.cjs (rerun after final SQL guard)
PASS pnpm exec node tools/check-level-2-skill-contract.cjs

Added mocked accumulated5-point split spending,53 saved points, duplicate receipt after later state change, and non-starter rejection without an RPC. Existing tests cover each starter threshold,58 total, Kithna exclusion, saved Level2 spending, ownership and receipt errors. Static checks cover ledger uniqueness, trigger, issued-level range, limits and rollback. Database atomicity, SQL execution, real concurrency and persistence are NOT runtime tested: SQL execution prohibited. Mocked responses do not establish SQL correctness. Ready for read-only security review, not deployment.

## Files changed

- supabase/review/level-2-foundation.proposed.sql
- backend/server/src/pets/level2/contracts.ts
- backend/server/src/pets/level2/service.ts
- tools/check-level-2-foundation.cjs
- Starter-allocation-implementation.md (this report)
- backups/before-starter-allocation.json (exact pre-edit source)

Branch Core_Systems_version_1 preserved; initially no staged files, existing modified/untracked work preserved. No SQL execution, migrations, player mutations, commits, merges or deployment.

## Exact replacements

Current line numbers. Full replacement hunks include unchanged context to make each independently searchable.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 12

old_code:
```
    (level = 1 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 30) OR
    (level = 2 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 2) OR
    (level > 2 AND hp + atk + magi + def + spd + mana = 1)
  )
);
```

new_code:
```
    (level = 1 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 30) OR
    (level = 2 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 2) OR
    (level > 2 AND hp + atk + magi + def + spd + mana BETWEEN 0 AND 2)
  )
);
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 69

old_code:
```
GRANT SELECT, INSERT, UPDATE ON public.pet_stat_allocations TO service_role;

CREATE FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
```

new_code:
```
GRANT SELECT, INSERT, UPDATE ON public.pet_stat_allocations TO service_role;

-- Later-level entitlements are issued only for newly crossed starter levels.
CREATE TABLE public.pet_starter_level_rewards (
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level BETWEEN 3 AND 30),
  points_awarded integer NOT NULL DEFAULT 2 CHECK (points_awarded = 2),
  points_spent integer NOT NULL DEFAULT 0 CHECK (points_spent BETWEEN 0 AND 2),
  PRIMARY KEY (pet_id, level)
);
ALTER TABLE public.pet_starter_level_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pet_starter_level_rewards FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_starter_level_rewards TO service_role;

-- CHECK constraints cannot consult species. Preserve the non-starter rule here.
CREATE FUNCTION public.guard_starter_allocation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE species_id text;
BEGIN
  IF NEW.level > 2 THEN
    SELECT species INTO species_id FROM public.pets WHERE id=NEW.pet_id FOR UPDATE;
    IF species_id IS NULL THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
    IF species_id = ANY (ARRAY['water_starter','fire_starter','earth_starter','air_starter','ice_starter','storm_starter','light_starter','shadow_night_bad','shadow_day_good']) THEN
      IF NOT EXISTS (SELECT 1 FROM public.pet_starter_level_rewards r
        WHERE r.pet_id=NEW.pet_id AND r.level=NEW.level
          AND r.points_spent=NEW.hp+NEW.atk+NEW.magi+NEW.def+NEW.spd+NEW.mana) THEN
        RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
      END IF;
    ELSIF NEW.hp+NEW.atk+NEW.magi+NEW.def+NEW.spd+NEW.mana <> 1 THEN
      RAISE EXCEPTION 'L2_POINTS';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_starter_allocation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_starter_allocation() TO service_role;
CREATE TRIGGER guard_starter_allocation AFTER INSERT OR UPDATE ON public.pet_stat_allocations
FOR EACH ROW EXECUTE FUNCTION public.guard_starter_allocation();

CREATE FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 181

old_code:
```
  h integer; a integer; m integer; d integer; s integer; n integer;
  result jsonb;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_allocation) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
```

new_code:
```
  h integer; a integer; m integer; d integer; s integer; n integer;
  result jsonb;
  starter boolean;
  earned record;
  remaining integer;
  stat_key text;
  portion integer;
  spend_level integer;
  spend jsonb;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_allocation) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 193

old_code:
```
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
```

new_code:
```
    OR NOT p_allocation ?& ARRAY['hp','atk','magi','def','spd','mana']
    OR EXISTS (SELECT 1 FROM jsonb_each(p_allocation) e WHERE jsonb_typeof(e.value) <> 'number'
      OR e.value::text !~ '^([0-9]|[1-4][0-9]|5[0-8])$') THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  h := (p_allocation->>'hp')::integer; a := (p_allocation->>'atk')::integer;
  m := (p_allocation->>'magi')::integer; d := (p_allocation->>'def')::integer;
  s := (p_allocation->>'spd')::integer; n := (p_allocation->>'mana')::integer;
  total_cost := h+a+m+d+s+n;
  IF total_cost NOT BETWEEN 1 AND 58 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO pet FROM public.pets WHERE id=p_pet_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 214

old_code:
```
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
```

new_code:
```
  END IF;
  IF pet.level < 2 OR pet.level > 30 OR pet.stage::text='egg' THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  starter := pet.species = ANY (ARRAY['water_starter','fire_starter','earth_starter','air_starter','ice_starter','storm_starter','light_starter','shadow_night_bad','shadow_day_good']);
  IF NOT starter AND total_cost > 2 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO reward FROM public.pet_level2_rewards WHERE pet_id=p_pet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  IF pet.unspent_points < total_cost OR (NOT starter AND reward.points_spent+total_cost > 2) THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO old_alloc FROM public.pet_stat_allocations WHERE pet_id=p_pet_id AND level=2 FOR UPDATE;
  IF coalesce(old_alloc.hp+old_alloc.atk+old_alloc.magi+old_alloc.def+old_alloc.spd+old_alloc.mana,0)
    <> reward.points_spent THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  IF starter THEN
    PERFORM 1 FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id ORDER BY level FOR UPDATE;
    -- Missing history is ambiguous, never manufacture earned points from current level.
    IF (SELECT count(*) FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id AND level<=pet.level) <> pet.level-2
      OR EXISTS (SELECT 1 FROM public.pet_starter_level_rewards r
        LEFT JOIN public.pet_stat_allocations a ON a.pet_id=r.pet_id AND a.level=r.level
        WHERE r.pet_id=p_pet_id AND (r.level>pet.level OR r.points_spent<>
          coalesce(a.hp+a.atk+a.magi+a.def+a.spd+a.mana,0))) THEN
      RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
    END IF;
    IF total_cost > 2-reward.points_spent + (SELECT coalesce(sum(2-points_spent),0)
      FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id) THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  END IF;
  SELECT * INTO base FROM public.pet_stats WHERE pet_id=p_pet_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 246

old_code:
```
      AND pet.spd=base.base_spd+totals.spd AND pet.mana=base.base_mana+totals.mana
  ) THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
    VALUES(p_pet_id,2,h,a,m,d,s,n)
```

new_code:
```
      AND pet.spd=base.base_spd+totals.spd AND pet.mana=base.base_mana+totals.mana
  ) THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  IF starter THEN
    spend := p_allocation;
    FOR earned IN
      SELECT 2 AS level, 2-reward.points_spent AS available
      UNION ALL SELECT level,2-points_spent FROM public.pet_starter_level_rewards WHERE pet_id=p_pet_id
      ORDER BY level
    LOOP
      remaining := earned.available;
      FOREACH stat_key IN ARRAY ARRAY['hp','atk','magi','def','spd','mana'] LOOP
        portion := least(remaining,(spend->>stat_key)::integer);
        IF portion=0 THEN CONTINUE; END IF;
        spend_level := earned.level;
        IF spend_level=2 THEN
          UPDATE public.pet_level2_rewards SET points_spent=points_spent+portion WHERE pet_id=p_pet_id;
        ELSE
          UPDATE public.pet_starter_level_rewards SET points_spent=points_spent+portion
            WHERE pet_id=p_pet_id AND level=spend_level;
        END IF;
        INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
          VALUES(p_pet_id,spend_level,
            CASE WHEN stat_key='hp' THEN portion ELSE 0 END,
            CASE WHEN stat_key='atk' THEN portion ELSE 0 END,
            CASE WHEN stat_key='magi' THEN portion ELSE 0 END,
            CASE WHEN stat_key='def' THEN portion ELSE 0 END,
            CASE WHEN stat_key='spd' THEN portion ELSE 0 END,
            CASE WHEN stat_key='mana' THEN portion ELSE 0 END)
          ON CONFLICT(pet_id,level) DO UPDATE SET
            hp=public.pet_stat_allocations.hp+excluded.hp, atk=public.pet_stat_allocations.atk+excluded.atk,
            magi=public.pet_stat_allocations.magi+excluded.magi, def=public.pet_stat_allocations.def+excluded.def,
            spd=public.pet_stat_allocations.spd+excluded.spd, mana=public.pet_stat_allocations.mana+excluded.mana;
        spend := jsonb_set(spend,ARRAY[stat_key],to_jsonb((spend->>stat_key)::integer-portion));
        remaining := remaining-portion;
      END LOOP;
    END LOOP;
    IF EXISTS (SELECT 1 FROM jsonb_each_text(spend) e WHERE e.value::integer <> 0) THEN
      RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
    END IF;
  ELSE
  INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
    VALUES(p_pet_id,2,h,a,m,d,s,n)
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 291

old_code:
```
      spd=public.pet_stat_allocations.spd+excluded.spd, mana=public.pet_stat_allocations.mana+excluded.mana;
  UPDATE public.pet_level2_rewards SET points_spent=points_spent+total_cost WHERE pet_id=p_pet_id;
  -- HP current is intentionally untouched: allocation must not heal.
  UPDATE public.pets SET unspent_points=unspent_points-total_cost, hp_max=hp_max+2*h,
```

new_code:
```
      spd=public.pet_stat_allocations.spd+excluded.spd, mana=public.pet_stat_allocations.mana+excluded.mana;
  UPDATE public.pet_level2_rewards SET points_spent=points_spent+total_cost WHERE pet_id=p_pet_id;
  END IF;
  -- HP current is intentionally untouched: allocation must not heal.
  UPDATE public.pets SET unspent_points=unspent_points-total_cost, hp_max=hp_max+2*h,
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 482

old_code:
```
    INSERT INTO public.pet_level2_rewards(pet_id) VALUES(v_pet_id);
  END IF;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
```

new_code:
```
    INSERT INTO public.pet_level2_rewards(pet_id) VALUES(v_pet_id);
  END IF;
  IF v_pet.species = ANY (ARRAY['water_starter','fire_starter','earth_starter','air_starter','ice_starter','storm_starter','light_starter','shadow_night_bad','shadow_day_good']) THEN
    INSERT INTO public.pet_starter_level_rewards(pet_id,level)
      SELECT v_pet_id, earned_level FROM generate_series(greatest(3,v_pet.level+1),v_level) earned_level;
  END IF;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
```

description: Unapplied entitlement, constraint or atomic allocation extension; preserves historical receipts and fails closed on missing history.

filename: backend/server/src/pets/level2/contracts.ts

linenumber: 62

old_code:
```
  return cost;
}
```

new_code:
```
  return cost;
}

// Starter accumulated allocation; authoritative entitlement checks remain in the RPC.
const starterPoints = z.number().int().min(0).max(58);
export const starterAllocationRequestSchema = z.object({
  requestId: z.uuid(),
  allocation: z.object({ hp: starterPoints, atk: starterPoints, magi: starterPoints,
    def: starterPoints, spd: starterPoints, mana: starterPoints }).strict().refine(value => {
      const total = statKeys.reduce((sum, key) => sum + value[key], 0);
      return total >= 1 && total <= 58;
    }, "Spend between one and 58 earned starter points"),
}).strict();
```

description: Strict accumulated-starter request type; original Level2 contract remains unchanged.

filename: backend/server/src/pets/level2/service.ts

linenumber: 1

old_code:
```
import { z } from "zod";
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { allocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema, statKeys } from "./contracts";

function parseDatabase<T>(schema: z.ZodType<T>, value: unknown): T {
```

new_code:
```
import { STARTER_SPROUTS } from "../../shared/pets/species/starter-species";
import { z } from "zod";
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { allocationRequestSchema, starterAllocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema, statKeys } from "./contracts";

function parseDatabase<T>(schema: z.ZodType<T>, value: unknown): T {
```

description: Select request limits by authoritative species registry and validate accumulated receipts.

filename: backend/server/src/pets/level2/service.ts

linenumber: 94

old_code:
```

export async function allocateLevel2(userId: string, petId: string, input: unknown) {
  const body = allocationRequestSchema.parse(input);
  await ownedPet(userId, petId);
  const result = await supabaseAdmin.rpc("allocate_level2_stats", {
    p_user_id: userId, p_pet_id: petId, p_request_id: body.requestId, p_allocation: body.allocation,
  });
  if (result.error) databaseFailure(result.error);
  return parseDatabase(z.object({ request_id: z.uuid(), pet_id: z.uuid(), spent: z.number().int().min(1).max(2),
    unspent_points: z.number().int().nonnegative(), hp_max: z.number().int().positive(),
    hp_cur: z.number().int().nonnegative(), atk: z.number().int().nonnegative(), magi: z.number().int().nonnegative(),
```

new_code:
```

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
```

description: Select request limits by authoritative species registry and validate accumulated receipts.

filename: tools/check-level-2-foundation.cjs

linenumber: 46

old_code:
```
  assert.equal(previewPoints(species, 1, 600), 4);
}
const contracts = require('../backend/server/dist/pets/level2/contracts.js');
const allocation = { hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 };
```

new_code:
```
  assert.equal(previewPoints(species, 1, 600), 4);
}
assert.ok(proposal.includes('PRIMARY KEY (pet_id, level)'));
assert.ok(proposal.includes('CREATE TRIGGER guard_starter_allocation AFTER INSERT OR UPDATE'));
assert.ok(proposal.includes('r.points_spent=NEW.hp+NEW.atk+NEW.magi+NEW.def+NEW.spd+NEW.mana'));
assert.ok(proposal.includes('generate_series(greatest(3,v_pet.level+1),v_level)'));
assert.ok(proposal.includes('IF total_cost > 2-reward.points_spent'));
assert.ok(proposal.includes('pet.unspent_points < total_cost'));
const contracts = require('../backend/server/dist/pets/level2/contracts.js');
const allocation = { hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 };
```

description: Focused static/mock regression; does not execute SQL.

filename: tools/check-level-2-foundation.cjs

linenumber: 118

old_code:
```
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 503);
  const before = rpcCalls.length;
  await assert.rejects(service.allocateLevel2(owner, id, { requestId: id, allocation: { ...allocation, hp: 3 } }));
  assert.equal(rpcCalls.length, before);
  rpcError = null;
```

new_code:
```
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 503);
  const before = rpcCalls.length;
  await assert.rejects(service.allocateLevel2(owner, id, { requestId: id, allocation: { ...allocation, hp: 59 } }));
  assert.equal(rpcCalls.length, before);
  rpcError = null;
```

description: Focused static/mock regression; does not execute SQL.

filename: tools/check-level-2-foundation.cjs

linenumber: 128

old_code:
```
  petData = { ...pet, hp_max: 'invalid' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 502);
  petData = pet;
  const request = { requestId: skillId, allocation: { ...allocation, hp: 1 } };
```

new_code:
```
  petData = { ...pet, hp_max: 'invalid' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 502);
  petData = { ...pet, level: 30, unspent_points: 58 };
  const accumulated = { requestId: id, allocation: { ...allocation, hp: 3, mana: 2 } };
  rpcData = { request_id: id, pet_id: id, spent: 5, unspent_points: 53,
    hp_max: 16, hp_cur: 6, atk: 3, magi: 3, def: 3, spd: 3, mana: 5 };
  const saved = await service.allocateLevel2(owner, id, accumulated);
  assert.equal(saved.unspent_points, 53);
  petData = { ...petData, unspent_points: 53, hp_max: 16, mana: 5 };
  assert.deepEqual(await service.allocateLevel2(owner, id, accumulated), saved);
  petData = { ...petData, species: 'kithna_shade' };
  const callsBeforeNonStarter = rpcCalls.length;
  await assert.rejects(service.allocateLevel2(owner, id, accumulated), error => error.name === 'ZodError');
  assert.equal(rpcCalls.length, callsBeforeNonStarter);
  petData = pet;
  const request = { requestId: skillId, allocation: { ...allocation, hp: 1 } };
```

description: Focused static/mock regression; does not execute SQL.
