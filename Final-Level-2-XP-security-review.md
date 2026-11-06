# Final Level 2 XP and security review

Status: partial correction complete; universal XP progression remains blocked. Ready for Nova to review this limited patch, not ready for activation or merge as a complete Level 2 system. No SQL was executed.

## Changes and evidence

- Hardened the unapplied allocation RPC retry branch: stored JSON pet/request IDs and point cost must match the recorded request. Invalid data fails closed with L2_RECONCILIATION_REQUIRED. The existing TypeScript response validator continues checking result fields and returning HTTP 502 for malformed responses.
- Added a mocked service regression showing an old receipt is accepted after later allocation changes current stats and exhausts unspent points. This does not prove database idempotency.
- No runtime TypeScript, frontend, applied migration, XP amount, combat, skill, or player record changed. Router remains unmounted.

## XP source findings

| Source | Existing amount / recipient | Status |
|---|---|---|
| Kithna egg discovery | 20 XP; active owned Kith, via awardXpToActivePet | Separate egg insert, base-stat insert, XP RPC; no stable event receipt. increment_active_pet_xp locks the pet but only increments XP. Universal leveling is still blocked. |
| Egg hatching | No hatch XP amount or recipient found in routePets.ts / hatch_pet migration | Do not reuse discovery XP. Need approved rarity amounts and recipient. Kithna rarity order common, uncommon, rare, epic is unchanged; rarity rules contain hatch duration, encounter weight and stat bonuses, not hatch XP. Species xpMultiplier is not a rarity hatch reward schedule. |
| Etching application | No application XP amount/recipient or committed application endpoint found in inspected backend routes/migrations | Existing equipment code equips owned Relics; that is not applying an Etching. Need approved amount, recipient and committed operation contract. No reward added. |
| Assanti food quest | No XP amount or recipient in turn-in route | Marks completion/reward timestamp without Kith XP. Needs quest reward specification and atomic completion/award integration. |
| Wildwood victory | 25 XP to surviving owned participant | Existing room receipt, pet lock, victory and battle-result validation retained. Foundation proposal already awards two Level 2 points on crossing and keeps one per later level. No change this turn. |
| PvE instability completion | reward_xp metadata; baseline default 100 (live values not queried) | complete_pve_instability_run returns XP metadata but only applies research/buffs and completion, not Kith XP. Recipient missing; do not infer one. |

Relevant files: backend/server/src/pets/petProgression.ts; backend/server/src/routes/cities/kithna/kithnaEncounter.ts; backend/server/src/shared/pets/species/kithna-species.ts; backend/server/src/routes/routePets/routePets.ts; backend/server/src/routes/cities/kithna/wildwood.ts; backend/server/src/lib/equipment.ts; backend/server/src/routes/battle/pveInstabilities.ts; supabase/migrations/20261024013421_require_hatchery_slot_to_hatch.sql; supabase/migrations/20261012210000_atomic_pve_instability_completion.sql; supabase/migrations/20261104134447_wildwood_victory_progression.sql.

20 discovery XP versus 25 battle XP has not been rebalanced. No numeric definition of small/large authorizes a change. Hatch rarity and Etching failure/retry behavior cannot be runtime-tested as XP rewards because no such integration is established.

## Precise blocked transaction plan (not implemented)

1. Obtain approval to change the egg-discovery event contract in kithnaEncounter.ts and petProgression.ts. Today in-memory encounter state and separate inserts cannot atomically couple event completion with progression. The route also reports xp_awarded:20 even when the XP call throws; leave the event contract untouched pending this transaction fix.
2. Prepare a separate unapplied SQL proposal for durable server-created discovery identity and atomic egg/base-stat creation, recipient selection, XP grant and completion receipt. A generated egg ID alone cannot identify retries before creation commits. Bind the event to owner, event type and selected recipient; enforce one grant per event globally, not one per recipient. Retried events must return the original receipt even if the active Kith changes. Preserve existing rolling results and use the existing authenticated owner, not a client owner ID.
3. Within that approved transaction extract the existing lifetime progression calculation into a service-only SECURITY INVOKER helper with empty search_path, owned-pet row lock and validation. Keep threshold 50*L*(L+1), cap30, two points only on the first Level1-to-Level2 crossing, existing one-point increments above2, and fail on conflicting reward history. Never auto-allocate or auto-select skills. Replace the Wildwood calculation only while retaining its full room/battle validation and transaction receipt. Do not expose a client-callable arbitrary XP award function.
4. Apply the same helper inside hatch/Etching/quest/PvE completion transactions only after their amounts/recipients and source contracts are approved. Lock source event first then recipient consistently; unique durable event receipts prevent retry double-credit; pet locks serialize different events. Do not retry the existing two-argument XP increment blindly.
5. Separately authorize isolated PostgreSQL testing for duplicate/concurrent events, rollback of failed event completion, ownership, changed active Kith on retry, threshold crossing, later levels, saved points and receipt corruption. Only then review migration/application and route activation separately.

A standalone level calculation patch to increment_active_pet_xp would leave duplicate/lost XP and event completion gaps. The task explicitly requires stopping before broad event-contract changes, so this portion remains unmodified.

## Security / existing players

Static review: foundation proposals retain table and column client-write revocations, RLS, service-only RPC execution, SECURITY INVOKER/empty search_path, owned-pet locks before claims/spends, unique milestone and request keys, foreign keys, and transaction rollback on failure. No new privileges introduced. Identical retries return before spending; later pet values are deliberately not compared to historical receipts. SQL changes remain outside migrations and end ROLLBACK.

Reconciliation review is unchanged and unexecuted: includes Level2+ pets, absent reward records, Level2/later allocations, recorded/actual spending and owned Wildwood crossing receipts. Missing receipts remain ambiguous; mismatched spending remains a conflict. Historical discovery XP has no event ledger, so it cannot justify inferred backfills. Existing players need individual evidence review, never an automatic reset/grant. Current source review is not verification of deployed permissions or live data.

## Verification

- PASS: pnpm --dir backend/server build
- PASS: pnpm exec node tools/check-level-2-foundation.cjs
- PASS: pnpm exec node tools/check-level-2-skill-contract.cjs
- Mocked checks cover existing budgets, saved single points, ownership filtering, invalid-response 502, request validation, receipt identity/cost and new historical retry. No automatic skills; Twiglet four Earth concepts unchanged.
- Static inspection only: SQL locking, receipt-before-write control flow, two-point crossing calculation, later-level preservation, reconciliation and source paths.
- Not executed: any SQL, database concurrency/rollback tests, live progression, hatch/Etching/quest XP integration, UI or production gameplay tests. No claim that universal XP is repaired.

## Files changed this turn

- supabase/review/level-2-foundation.proposed.sql
- tools/check-level-2-foundation.cjs
- Final-Level-2-XP-security-review.md (this report)
- backups/level2-before-final-xp-security.json (exact pre-edit snapshots)

Existing branch Core_Systems_version_1 preserved. Initial state: zero staged, 43 modified tracked files, 50 untracked entries. Existing work preserved; no commits, migrations, database mutations or deploys.

## Exact replacements

Line numbers refer to current edited files. Old blocks are exact pre-edit text; new blocks are complete replacements.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 160

old_code:
```
    IF receipt.allocation IS DISTINCT FROM p_allocation THEN RAISE EXCEPTION 'L2_CONFLICT'; END IF;
```

new_code:
```
    IF receipt.allocation IS DISTINCT FROM p_allocation THEN RAISE EXCEPTION 'L2_CONFLICT'; END IF;
    -- Validate the recorded request, not current stats: later spending is legitimate.
    IF jsonb_typeof(receipt.result) IS DISTINCT FROM 'object'
      OR receipt.result->'pet_id' IS DISTINCT FROM to_jsonb(receipt.pet_id::text)
      OR receipt.result->'request_id' IS DISTINCT FROM to_jsonb(receipt.request_id::text)
      OR receipt.result->'spent' IS DISTINCT FROM to_jsonb(total_cost) THEN
      RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED';
    END IF;
```

description: Validate recorded identity and cost before returning an allocation receipt; no comparison with current balances or stats.

filename: tools/check-level-2-foundation.cjs

linenumber: 86

old_code:
```
  assert.deepEqual(await service.allocateLevel2(owner, id, request), receipt);
```

new_code:
```
  assert.deepEqual(await service.allocateLevel2(owner, id, request), receipt);
  // A historical receipt stays valid after a later allocation changes current stats.
  petData = { ...pet, unspent_points: 0, hp_max: 12, atk: 4 };
  assert.deepEqual(await service.allocateLevel2(owner, id, request), receipt);
  petData = pet;
```

description: Regression: accept a valid historical receipt after later spending. Database response is mocked; no database executes.
