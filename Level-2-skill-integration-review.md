# Level 2 skills — integration review

Status: configuration preparation only. No frontend, combat, database, migration execution, player-data, or authentication changes. This does NOT implement a working persistent skill-choice system.

## Evidence and current state

Branch Core_Systems_version_1; before this work: 43 unstaged modified files, 40 untracked entries, zero staged files. Existing work preserved. The current Twiglet JSON contains intervening user edits; those were preserved rather than restoring an older attachment.

Read-only Supabase list_tables inspection for project uhdpwgybrcizligqypzb reports skill_defs and pet_skills with RLS enabled and zero rows each. These are schema-tool row counts, not independently executed COUNT queries. No SQL was executed. Live policies/function bodies and exact record counts still require separately authorized read-only SQL verification.

- public.skill_defs: id UUID, unique slug text, name text, nullable description text, required_level integer default 1, requirements JSONB default {}, created_at timestamp. No dedicated role, element, mana, power, or cooldown columns.
- public.pet_skills: pet_id, skill_id UUID composite primary key; equipped boolean default false; unlocked_at timestamp; foreign keys to pets and skill_defs. This stores actual learned ownership and equipment; do not recreate it.
- No backend TypeScript references to skill_defs/pet_skills were found. The registry in frontend/web/src/components/Skills/skillsRegistry.ts uses string IDs; database UUIDs must be resolved through skill_defs.slug, not cast from slugs.
- frontend/web/src/components/skillChamber/skillChamber.tsx:288 derives availability from level/stage; :427 holds equipment in local React state. No persistent learned/equipped loading occurs here. Existing commands are basic-strike, guard, mend; species-skill is a generic Level 5 placeholder, not an approved Twiglet milestone.
- frontend/web/src/components/Skills/skillChoiceDraft.ts is design-only and has capitalized display-role labels and null skill IDs. Do not use those as server-authoritative grants or create a second catalog.
- backend/server/src/shared/pets/characterProfiles/characterRegistry.ts registers current Twiglet for earth_starter. Its JSON is species design data, not individual ownership.
- backend/server/src/middleware/auth.ts validates the bearer token through auth.getUser and sets req.user.id. backend/server/src/app.ts places normal /api endpoints behind apiLimiter, apiSpeedLimiter and requireUser. Follow this route boundary and strict Zod input validation; never accept owner ID from request input.
- The baseline migration pet_skills_own and pet_skills_write_own policies check ownership but permit writes without milestone/species validation. This is historical evidence, not verification of current live policies. Even a safe HTTP endpoint is insufficient if direct database writes can bypass its rules.

## Four roles and existing mechanics

Stable IDs already appear in Twiglet progression.skills.available_combat_roles and candidate_moves. Roles are labels, not permanent player classes or replacements for existing skill trees.

| Role | Twiglet choice | Existing implementation to reuse only after balancing approval |
| --- | --- | --- |
| tank | root-brace / Root Brace | defense tree; guard action and guarding flag |
| healer | sprout-mend / Sprout Mend | magic tree; living-ally healing path |
| dps | seed-tap / Seed Tap | combat tree; ATK damage path |
| sorcerer | pollen-puff / Pollen Puff | magic tree; MAGI and elemental damage path |

backend/server/src/battle/battleMath.ts uses max(1, round(offense * power * weakenedPenalty * exposedBonus * elementBonus - defense * 0.45)); ATK or MAGI supplies offense. Guard multiplies defense by 1.35 and clears at the actor's next turn in battleEngine.ts. Mend is round(max(4, round(MAGI * 1.25 + level * 2)) * multiplier), capped at missing HP. basic-strike uses power 1.25, MAGI, and elemental matchup; plain attack uses power 1 and ATK. These are observed existing formulas, NOT approved balancing for the new moves.

The action validator in battleEngine.ts:38 accepts only basic-strike/mend as skill actions. Battle participants have no mana resource field, and these actions have no skill-cooldown or accuracy-roll machinery. Do not silently assume null means free, always hits, or no cooldown. Preserve existing commands.

Approval decisions before activation:
- Root Brace: reuse current guard exactly versus a distinct defense modifier; magnitude, duration, stacking/expiry and self targeting must be approved.
- Sprout Mend: reuse Mend exactly versus a separately approved scale; minimum healing and permitted target (self/ally) needed; no resurrection.
- Seed Tap: ATK power and whether Earth matchup applies to physical damage; target one enemy.
- Pollen Puff: MAGI power and Earth matchup behavior; target one enemy. Ranged has no separate current range model.
- All four: mana cost/resource behavior, cooldown and duration where relevant, and explicit accuracy policy. Any absence must be approved, not invented as zero.

## Smallest persistent implementation proposal — not applied

1. Reuse skill_defs.slug/name/description/required_level and requirements JSONB for species IDs, element, stable role/category, prerequisite slugs, milestone key, and explicit combat_enabled=false until approved. Generate proposed catalog inserts from the existing Twiglet definitions; do not overwrite any matching existing slug silently. No new definition columns are needed. Other species receive no Twiglet candidates.
2. Add a small milestone-claim ledger with a unique (pet_id, milestone_key) key and chosen skill UUID. This records consumption of a milestone, not a second learned/equipped loadout: pet_skills remains the sole learned/equipped source. Keep claims durable if learned skills are later replaced or removed, so the milestone cannot be re-claimed. A nullable milestone column on pet_skills alone loses this history when a skill is removed, so it is not the recommended option.
3. Add one transactional claim RPC, service-role-only, SECURITY INVOKER, with explicit public/anon/authenticated EXECUTE revocation. Backend supplies authenticated req.user.id, pet ID, milestone and slug. It locks the owned pets row, verifies level >= required level, species, element, prerequisite ownership, active catalog membership, and matching milestone metadata. Same-choice retries return the original result without changing timestamps/equipment; a different choice for an already claimed milestone returns conflict. Insert the claim and exactly one pet_skills row (equipped=false) in one transaction. Any error rolls back both. Row lock plus unique milestone key covers concurrent different choices and same-choice retries. Existing learned/equipped rows must never be overwritten; ambiguous preexisting data must fail for review.
4. Before exposing the operation, inspect ALL live grants, permissive policies, and triggers. If baseline direct ownership-only writes are still allowed, adding a restrictive-looking permissive policy is insufficient: policies combine with OR. A separately approved write-path protection change is essential. Preserve reads and legitimate equip operations, but prevent direct grants, pet/skill reassignment, milestone deletion/reclaim, and unauthorized ledger writes. Options are server-only grants/equipment writes with dedicated RPCs, or carefully scoped database validation triggers; selecting and testing this must precede launch. Existing RLS remains untouched in this task.
5. Backend read endpoint returns selected pet's actual learned/equipped records joined to skill_defs, eligible species-specific milestones, and claimed state. Strict Zod UUID/slug input; ownership filter on every read. Selection endpoint delegates the entire write to the RPC. No frontend read-then-write, in-memory lock, or localStorage. Do not mount a route that reports success before the RPC exists and is tested.
6. After separate frontend approval, reuse Skills Chamber and its four slots. Load by pet ID, cancel/ignore stale responses when switching Kith, display authoritative learned/equipped state, present four choices with one explicit selection, submit once, refetch server state, and retain useful loading/error/conflict handling. Reopening, refresh, logout/login must reload persisted state. Unbalanced learned skills must be clearly unavailable in combat; no battle actions are enabled by this preparation.

Proposed database changes require separate approval: catalog inserts, milestone ledger, atomic RPC and bypass protection. No tables or functions were added. Frontend and endpoint implementation are not claimed complete.

## Two manual stat points

supabase/migrations/20261104134447_wildwood_victory_progression.sql:81 reports pointsEarned as level delta; :85 adds that same delta to unspent_points. Thus 1 -> 2 yields one, conflicting with the approved two. backend/server/src/routes/cities/kithna/wildwood.ts calls settle_wildwood_victory_xp; petProgression.ts calls increment_active_pet_xp, which awards XP rather than selecting skills. The actual live function body is not confirmed by schema inspection.

supabase/review/level-2-stat-points.proposed.sql is an unapplied, rollback-default proposal. It compares the current live function body with the inspected repository version and fails if absent/different. It replaces only the existing settlement function, retaining signature, privileges, ownership checks, locks, victory receipt/idempotency, XP formula and hatch rolls. Both pointsEarned and unspent_points gain one extra point only when crossing Level 2. It does not invent later rewards: existing later-level behavior remains unchanged. Example results: 1->1 = 0, 1->2 = 2, 2->3 = existing 1, 1->3 = 2 for Level 2 plus existing 1 for Level 3. Existing Level 2 players receive no retroactive update. Later rewards remain a separate design question. Do not apply until live-source review and isolated database concurrency/retry tests pass.

## Applied work and verification

Only Twiglet's level_2_skill_choice gained selection_count=1, selection_method=player_choice and milestone_key=level-2. Its candidate list and numerical nulls remain unchanged. It is still configuration-only and cannot award a skill. No TypeScript production code changed; there are no casts, any, or disabled checks added. The JSON fields describe rules, not player records.

The exact replacement and complete new proposal/test files are in Level-2-skill-code-changes.md. Existing working copies were backed up before the edit. Verification results are reported with the task response. Database behavior, concurrent claims, refresh/login persistence, and UI are not tested or implemented. Those require the separately approved integration above.
