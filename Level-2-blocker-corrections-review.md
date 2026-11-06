# Level 2 surgical blocker corrections

Branch Core_Systems_version_1. No SQL executed, no database tools called, no migration applied, no route mounted, no frontend/battle/profile/XP changes. Existing user work preserved. This report supersedes only the affected details of the earlier foundation report.

## Confirmed corrections

A — The foundation SQL now explicitly revokes client table AND column write privileges on pet_stat_allocations, preserving owner reads and service-role access. Dependency trace: the Level 1 hatch RPC in 20261024013421_require_hatchery_slot_to_hatch.sql writes allocations through the server; petsStats.ts only reads totals. Existing server_authoritative_progression migration 20261005023730 already revokes client table writes, so this is an explicit proposal safeguard against reliance on older grants/column grants, NOT evidence of a currently exploitable live direct-write path. No SQL was run to recheck production. Existing service-role hatch and reset paths remain authorized. Ownership policy alone is not an allocation budget check.

F — All parsed database rows and RPC responses now use a generic parseDatabase<T> helper. The generic preserves the output type inferred from the Zod schema without casting unknown database data. Invalid responses raise AppError 502/L2_INVALID_RESPONSE, while request schema Zod errors retain the router's HTTP 400 classification. Owned-pet responses must match requested pet and authenticated owner. Allocation receipts must match pet ID, retry UUID and requested point cost, and combat stat values must be nonnegative. No checks compare retry responses with current pet totals, because a legitimate retry can return its original receipt after later allocations. Clients must refetch current state. Read choices now require the exact Level 2 catalog requirement and combat_enabled=false, matching the proposed write RPC. Invalid responses may follow an already committed RPC; the message instructs refresh rather than asserting rollback or success.

## Reconciliation design (C)

New supabase/review/level-2-reconciliation-review.sql is an UNEXECUTED read-only evidence query, not a backfill. It requires the proposed foundation tables to exist first. It lists current level/XP/unspent points, Level 2 versus later allocations, receipt totals, and historical Wildwood crossing receipts. No receipt means ambiguous history, not zero prior awards. Mismatch between receipt spending and allocation rows is explicitly conflicting. Existing values remain untouched.

For a future individually approved reconciliation: establish authoritative prior Level 2 credit and spending from complete historical evidence; account for Level 2 allocations and distinguish later/unspent rewards. Require an auditable decision with expected pet, allocation and receipt state. Lock the pet, re-read those expected values, reject drift or conflicting records, and atomically record the proven award/spending with only the proven missing credit. Unique pet reward receipt prevents a second correction; an identical approved retry must return the existing result. Never add two points simply because a receipt is absent, and never count Level 1 rolls as Level 2 spending. If proof is incomplete, do not produce a write plan for that Kith. No executable backfill is supplied because current aggregate state cannot establish the missing historical facts.

## Remaining dependency (B)

Verified callers: Wildwood victory -> settle_wildwood_victory_xp; successful Kithna roaming egg discovery -> awardXpToActivePet -> increment_active_pet_xp. The latter deliberately increments XP only and does not advance levels. kithnaEncounter.ts catches XP failure after egg creation, so this also lacks an atomic event-level reward receipt. Altering it to advance levels, or adding grant receipts without an event identity, would change the existing egg-discovery contract and require broader caller changes. Per the stop instruction, this part is unchanged and blocked for separate approval. No new XP thresholds, later-level rewards or centralized mechanism was invented. A future approved design should centralize transition/reward handling with stable per-source event IDs, preserving each source's already-approved behavior. The current proposal remains Wildwood-specific, NOT universal XP progression.

## D/E review

Twiglet's current four Earth choices and static profile remain unchanged. Other species with no approved definitions remain unavailable. The existing proposal locks the owned pet, validates species/element/level/prerequisites, snapshots four definitions, uses a unique pet/milestone receipt, inserts one unequipped learned skill atomically, returns same-choice retries, and rejects different choices. Direct pet_skills writes remain revoked in the proposal. These properties were inspected, not tested against a database.

pet_alloc_points_valid preserves Level 1 and permits Level 2 totals 0–2. pet_stat_allocations_level_check is NOT changed; the existing progression migration already allows levels 1–30. No additional rewards are approved. Existing primary/foreign keys are retained. New functions remain SECURITY INVOKER with empty search_path and service-role-only EXECUTE. Allocation and claim receipts remain transactional. Foundation and reconciliation SQL both end in ROLLBACK.

## Verification

Passed: pnpm --dir backend/server build; pnpm exec node tools/check-level-2-foundation.cjs; pnpm exec node tools/check-level-2-skill-contract.cjs. New regression cases cover malformed pet/skill responses, owner mismatch, invalid allocation responses, receipt pet/request/cost binding, negative response stats, and client-input errors. Database calls are mocked; no concurrency, SQL execution, backfill or persistent gameplay verification was performed.

Inspected exact before/after changes and confirmed routes/index.ts and app.ts do not import or mount level2. contracts.ts, Twiglet JSON, existing XP functions, battle files, React and CSS were not edited. The existing 43 tracked modifications are unchanged by this task. Detailed exact replacement blocks and verified line numbers are in Level-2-blocker-corrections-code.md; originals are retained in backups/level2-before-blocker-corrections.json.

Ready for Nova's second source/security review with B and historical evidence explicitly unresolved. Not ready for database integration or runtime activation.
