filename: backend/server/src/pets/level2/service.ts
linenumber: 4 (current; original line 4)
old_code:
```
import { allocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema } from "./contracts";
```
new_code:
```
import { allocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema, statKeys } from "./contracts";

function parseDatabase<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError("Invalid Level 2 database response. Refresh before retrying.", 502, "L2_INVALID_RESPONSE");
  }
  return result.data;
}
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/pets/level2/service.ts
linenumber: 46 (current; original line 38)
old_code:
```
  return petSchema.parse(result.data);
```
new_code:
```
  return parseDatabase(petSchema.refine(pet => pet.id === petId && pet.user_id === userId), result.data);
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/pets/level2/service.ts
linenumber: 58 (current; original line 50)
old_code:
```
  const learned = z.array(learnedSchema).parse(learnedResult.data);
  const claim = claimResult.data ? claimSchema.parse(claimResult.data) : null;
  const reward = rewardResult.data ? rewardSchema.parse(rewardResult.data) : null;
```
new_code:
```
  const learned = parseDatabase(z.array(learnedSchema), learnedResult.data);
  const claim = parseDatabase(claimSchema.nullable(), claimResult.data);
  const reward = parseDatabase(rewardSchema.nullable(), rewardResult.data);
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/pets/level2/service.ts
linenumber: 65 (current; original line 57)
old_code:
```
  const catalog = z.array(definitionSchema).parse(catalogResult.data);
```
new_code:
```
  const catalog = parseDatabase(z.array(definitionSchema), catalogResult.data);
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/pets/level2/service.ts
linenumber: 67 (current; original line 59)
old_code:
```
    slugs.includes(definition.slug) && definition.required_level <= pet.level
```
new_code:
```
    slugs.includes(definition.slug) && definition.required_level === 2
    && definition.requirements.combat_enabled === false
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/pets/level2/service.ts
linenumber: 91 (current; original line 82)
old_code:
```
  return z.object({ skill_id: z.uuid(), milestone_key: z.literal("level-2") }).parse(result.data);
```
new_code:
```
  return parseDatabase(z.object({ skill_id: z.uuid(), milestone_key: z.literal("level-2") }), result.data);
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/pets/level2/service.ts
linenumber: 101 (current; original line 92)
old_code:
```
  return z.object({ request_id: z.uuid(), pet_id: z.uuid(), spent: z.number().int().min(1).max(2),
```
new_code:
```
  return parseDatabase(z.object({ request_id: z.uuid(), pet_id: z.uuid(), spent: z.number().int().min(1).max(2),
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/pets/level2/service.ts
linenumber: 103 (current; original line 94)
old_code:
```
    hp_cur: z.number().int().nonnegative(), atk: z.number().int(), magi: z.number().int(),
    def: z.number().int(), spd: z.number().int(), mana: z.number().int(),
  }).parse(result.data);
```
new_code:
```
    hp_cur: z.number().int().nonnegative(), atk: z.number().int().nonnegative(), magi: z.number().int().nonnegative(),
    def: z.number().int().nonnegative(), spd: z.number().int().nonnegative(), mana: z.number().int().nonnegative(),
  }).refine(receipt => receipt.pet_id === petId && receipt.request_id === body.requestId
    && receipt.spent === statKeys.reduce((sum, key) => sum + body.allocation[key], 0)), result.data);
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: backend/server/src/routes/pets/level2.ts
linenumber: 23 (current; original line 23)
old_code:
```
      next(error instanceof ZodError ? new AppError("Invalid Level 2 request or response.", 400) : error);
```
new_code:
```
      next(error instanceof ZodError ? new AppError("Invalid Level 2 request.", 400) : error);
```
description: Separate validated database responses from client input; reject mismatched receipts and preserve existing error contracts.

filename: supabase/review/level-2-foundation.proposed.sql
linenumber: 60 (current; original line 60)
old_code:
```
```
new_code:
```

-- Hatch allocations are written by the existing service-role hatch_pet RPC.
-- Keep owner SELECT policies and service-role writes; block direct client spending.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.pet_stat_allocations FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id,pet_id,level,hp,atk,magi,def,spd,mana,created_at,xp),
  UPDATE (id,pet_id,level,hp,atk,magi,def,spd,mana,created_at,xp),
  REFERENCES (id,pet_id,level,hp,atk,magi,def,spd,mana,created_at,xp)
  ON public.pet_stat_allocations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_stat_allocations TO service_role;
```
description: Explicitly restrict client stat-allocation writes while preserving service-role hatch/allocation operations. SQL remains unapplied.

filename: tools/check-level-2-foundation.cjs
linenumber: 33 (current; original line 33)
old_code:
```
```
new_code:
```
let rpcData = { skill_id: skillId, milestone_key: 'level-2' };
let petData = pet;
```
description: Regression coverage for malformed database responses, request errors, ownership filtering and receipt binding; database calls remain mocked.

filename: tools/check-level-2-foundation.cjs
linenumber: 43 (current; original line 41)
old_code:
```
        return { data: filters.user_id === owner && filters.id === id ? pet : null, error: null };
```
new_code:
```
        return { data: filters.user_id === owner && filters.id === id ? petData : null, error: null };
```
description: Regression coverage for malformed database responses, request errors, ownership filtering and receipt binding; database calls remain mocked.

filename: tools/check-level-2-foundation.cjs
linenumber: 49 (current; original line 47)
old_code:
```
    return { data: rpcError ? null : { skill_id: skillId, milestone_key: 'level-2' }, error: rpcError };
```
new_code:
```
    return { data: rpcError ? null : rpcData, error: rpcError };
```
description: Regression coverage for malformed database responses, request errors, ownership filtering and receipt binding; database calls remain mocked.

filename: tools/check-level-2-foundation.cjs
linenumber: 73 (current; original line 71)
old_code:
```
```
new_code:
```
  rpcError = null;
  rpcData = { skill_id: 'invalid', milestone_key: 'level-2' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }),
    error => error.statusCode === 502 && error.code === 'L2_INVALID_RESPONSE');
  petData = { ...pet, user_id: skillId };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 502);
  petData = { ...pet, hp_max: 'invalid' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 502);
  petData = pet;
  const request = { requestId: skillId, allocation: { ...allocation, hp: 1 } };
  const receipt = { request_id: skillId, pet_id: id, spent: 1, unspent_points: 1,
    hp_max: 12, hp_cur: 6, atk: 3, magi: 3, def: 3, spd: 3, mana: 3 };
  rpcData = receipt;
  assert.deepEqual(await service.allocateLevel2(owner, id, request), receipt);
  for (const bad of [{ ...receipt, pet_id: owner }, { ...receipt, request_id: owner },
    { ...receipt, spent: 2 }, { ...receipt, atk: -1 }, null]) {
    rpcData = bad;
    await assert.rejects(service.allocateLevel2(owner, id, request), error => error.statusCode === 502);
  }
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace', owner }),
    error => error.name === 'ZodError'); // Router maps client-input ZodError to 400.
```
description: Regression coverage for malformed database responses, request errors, ownership filtering and receipt binding; database calls remain mocked.

filename: tools/check-level-2-foundation.cjs
linenumber: 96 (current; original line 73)
old_code:
```
  console.log('PASS: allocation validation/budgets, species eligibility, ownership filtering, RPC delegation, conflict/unavailable errors, unchanged local HP, router unmounted.');
```
new_code:
```
  console.log('PASS: allocation validation/budgets, species eligibility, ownership filtering, RPC delegation, conflict/unavailable errors, invalid database responses (502), receipt binding, unchanged local HP, router unmounted.');
```
description: Regression coverage for malformed database responses, request errors, ownership filtering and receipt binding; database calls remain mocked.

filename: supabase/review/level-2-reconciliation-review.sql
linenumber: 1
old_code: (new file)
new_code:
```sql
-- UNAPPLIED - REQUIRES EXPLICIT APPROVAL. Read-only evidence proposal, NOT a backfill.
-- Run only after the foundation proposal has been separately approved and installed.
-- Historical XP receipts are evidence, not a complete ledger of stat grants/spending.
-- This query deliberately does not infer how many additional points to award.
BEGIN READ ONLY;
SELECT p.id AS pet_id, p.level, p.xp, p.unspent_points,
  coalesce(a.level_2_allocated, 0) AS level_2_allocated,
  coalesce(a.later_allocated, 0) AS later_allocated,
  r.points_awarded AS recorded_award, r.points_spent AS recorded_spending,
  evidence.level_2_crossing_receipts,
  CASE
    WHEN r.pet_id IS NULL THEN 'AMBIGUOUS_REQUIRES_INDIVIDUAL_EVIDENCE_REVIEW'
    WHEN r.points_spent IS DISTINCT FROM coalesce(a.level_2_allocated, 0)
      THEN 'CONFLICT_PRESERVE_AND_REVIEW'
    ELSE 'RECORDED_NO_BACKFILL'
  END AS review_status
FROM public.pets p
LEFT JOIN public.pet_level2_rewards r ON r.pet_id = p.id
LEFT JOIN LATERAL (
  SELECT sum(hp+atk+magi+def+spd+mana) FILTER (WHERE level = 2) AS level_2_allocated,
    sum(hp+atk+magi+def+spd+mana) FILTER (WHERE level > 2) AS later_allocated
  FROM public.pet_stat_allocations WHERE pet_id = p.id
) a ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(room.event_payload->'xpReward') AS level_2_crossing_receipts
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE expedition.user_id = p.user_id
    AND room.event_payload #>> '{xpReward,petId}' = p.id::text
    AND room.event_payload #>> '{xpReward,previousLevel}' = '1'
    AND room.event_payload #>> '{xpReward,level}' IN
      ('2','3','4','5','6','7','8','9','10','11','12','13','14','15','16',
       '17','18','19','20','21','22','23','24','25','26','27','28','29','30')
) evidence ON true
WHERE p.level >= 2
ORDER BY p.id;
ROLLBACK;
```
description: Unexecuted read-only evidence proposal; requires foundation schema first. No backfill, inferred reward credit, or player mutation.
