# Final Level 2 foundation — review handoff

Status: PARTIAL IMPLEMENTATION, APPROVAL REQUIRED. No production data changes, migration execution, UI edits, commits, pushes, merges, or deployment.

## Added backend code

- backend/server/src/pets/level2/contracts.ts: strict Zod allocation/choice request schemas, lowercase universal combat roles, registry-backed species eligibility, and pure allocation-budget validation. z.infer derives Allocation from its runtime schema rather than asserting external data types. Unknown species fail closed; Twiglet choices are read from the current profile, not copied into a second TypeScript catalog. The two-point bound is the Level 2 budget, not a new per-stat cap.
- backend/server/src/pets/level2/service.ts: owner-filtered reads and calls to the proposed claim/allocation RPCs. Reads actual pet_skills and equipped flags; never infers learning from level. Missing database support returns unavailable rather than fake success. Existing Level 2 pets without a reward receipt require reconciliation. Writes and retry handling stay in the database. Identical allocation retries return the saved response for that request; clients should refetch state after success.
- backend/server/src/routes/pets/level2.ts: authenticated router for state, skill selection, and stat allocation. DELIBERATELY NOT IMPORTED OR MOUNTED. A later authorized activation must mount it under the existing /api authentication/rate-limit boundary after database integration tests. No endpoint is activated in production by these files.

## Database proposal (not a migration)

supabase/review/level-2-foundation.proposed.sql is UNAPPLIED — REQUIRES EXPLICIT APPROVAL. It supersedes, but does not edit or execute, the earlier level-2-stat-points.proposed.sql. Never apply both. The proposal defaults to ROLLBACK. It must be reviewed and tested in an isolated PostgreSQL database before approval to execute or change its final statement.

Affected objects:
- pet_stat_allocations.pet_alloc_points_valid: permit Level 2 totals 0–2; preserve Level 1 limits and existing Level 3+ one-point behavior.
- pet_level2_rewards: future per-pet two-point award/spend receipt. No backfill and no inferred rewards for current Level 2+ players.
- pet_stat_spend_receipts: per-pet/request UUID idempotency; a changed payload for the same request conflicts. Stored response makes identical retries safe even after later requests.
- pet_skill_milestone_claims: unique pet/milestone, selected existing skill_defs UUID, species, config version, and complete definition snapshots of the four eligible choices. Learned/equipped ownership remains exclusively in pet_skills. Claims are not cleared if later skill state changes.
- skill_defs: four catalog inserts generated from current Twiglet configuration. Duplicate slugs abort rather than overwriting existing definitions. requirements JSONB contains species/element/role/category/milestone/version, prerequisite list and combat_enabled=false. All unapproved numeric effects remain null. No moves are generated for other species.
- claim_level2_skill: service-only SECURITY INVOKER function locks the owned pet, checks eligibility/prerequisites/catalog version, records one milestone and inserts one unequipped learned skill together. Same-choice retry returns existing result; different choice conflicts; ambiguous preexisting milestone skill fails for review.
- allocate_level2_stats: service-only SECURITY INVOKER function locks the owned pet, validates exact six integer keys, budget, existing receipt and allocation consistency. It increments Level 2 allocation and persistent combat stats, decrements unspent points, and records the result atomically. Existing combat/base-allocation mismatch fails rather than being silently rewritten. One HP stat point adds two max-health units; current HP is unchanged. No Level 1 overwrite.
- settle_wildwood_victory_xp: guarded full replacement of inspected function adds the future receipt and one extra point on crossing Level 2. Retains room/pet locking, victory receipt, 25 XP, original thresholds and cap. Guard aborts if current function body differs. No reconciliation of existing pets.
- Grants: remove direct client insert/update/delete/truncate/reference/trigger access from skill_defs and pet_skills, including explicit column grants. Preserve SELECT policies and existing data. New receipt tables have RLS, no client grants, service-role access only. Existing service-role privilege is trusted; authenticated identity must come from requireUser, never the request body.

No equipment write endpoint is added: frontend equipment integration and any persistent equip mutation still need an approved design, including slot-limit rules. Existing equipment values are only read and preserved. Existing backend basic-strike/mend do not consume the new definitions; combat remains unchanged.

## Compatibility, rollback and recovery

All changes in this task are new files. Existing Twiglet/user edits, frontend files, gameplay, current progression and migrations are untouched. The live read-only recheck still found zero skill_defs and pet_skills rows and the one-point post-Level-1 constraint.

SQL rollback before commit restores the proposal as one transaction. After a later approved deployment and real claims, do not drop receipt tables, delete definitions, revert the allocation constraint to one point, or restore insecure client grants as a blind rollback. Disable/unmount new routes first and use a separately reviewed forward correction preserving claims, learned skills, allocations and receipts. Migration execution and production rollback are not authorized here.

For existing Level 2+ pets, no reward is automatically granted and no guessed correction is made. Missing reward receipt returns reconciliation_required for allocation. A separate reviewed reconciliation process is still needed. Stat spending verifies legacy combat totals; mismatched pets are blocked for review rather than altered.

Database row locks and uniqueness are proposed, not integration-tested here. The transaction functions have not been executed, even in a rollback dry run. Source review and mocked tests cannot establish database atomicity or permissions in operation.

## Remaining progression and frontend work

The current 25-XP Wildwood behavior is preserved. Level 3–30 one-point rewards are retained only as existing behavior and remain unapproved balancing. increment_active_pet_xp still adds XP without advancing levels. JSON hatch/care conditions remain design references with undecided thresholds. A universal shared-starter/species-specific XP implementation is not complete.

Frontend proposal (no React/CSS modified): mount the backend only after SQL approval/testing; load state by selected pet ID; discard stale responses after pet switches; display actual learned/equipped rows and an explicit four-option single-choice flow; submit selected slug and refetch. Show unbalanced skills as unusable in battle. Extend the existing stat editor for Level 2 without changing Level 1 rolls; retain the same request UUID for a retry and use a new UUID for a new allocation. Show remaining Level 2 budget separately from aggregate legacy unspent points. Preserve all layout. Replace fixed 100-XP displays only after server progression-response semantics are approved.

## Verification performed

- pnpm --dir backend/server build: passed.
- pnpm exec node tools/check-level-2-foundation.cjs: passed. Tests valid/invalid allocations, budget exhaustion, Twiglet-only eligibility, role mapping, forged owner input rejection, database ownership filters, RPC arguments, returned retry result, conflict/unavailable responses and unmounted router. Supabase is replaced by an in-memory stub: no external calls; database concurrency/retry implementation is NOT proved.
- pnpm exec node tools/check-level-2-skill-contract.cjs: passed. Current Twiglet JSON and null combat values remain valid.
- pnpm exec node tools/check-battle-engine.cjs: all 10 checks passed, preserving basic-strike, Mend, Guard, turn validation and Level 30 behavior.
- All registered profiles load through the compiled character registry used by the contract tests and backend build.
- No existing tracked files were edited in this task; existing 43 modified files remain user work.

Approval/testing still required: SQL syntax/execution in an isolated database; real same/different-skill concurrent claims; same/different-payload concurrent spending; owner/role rejection; transaction rollback injection; future 1->2 and multi-level award receipt behavior; HP/current-health persistence; refresh/login integration; exact live grants after change. No player or production tests were performed.

## Review artifacts

Final-Level-2-code-changes.md contains complete new source/proposal/test files with filename, line 1, old_code absent, new_code and explanations. No existing code replacement is claimed. This is ready for a bounded code review, not a claim that the entire dirty branch is ready to merge or that runtime Level 2 persistence is live.
