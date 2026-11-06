# Skill choice preparation — implementation boundary

Implemented only `frontend/web/src/components/Skills/skillChoiceDraft.ts`:
- Four named Level 2 Twiglet design candidates, all Earth; no runtime skill IDs.
- All unapproved numerical mechanics and targets remain null.
- A future Keep/Replace request shape identifies the pet and server-issued choice. Replace also identifies the expected old skill and requires confirmation.
- No runtime imports, UI activation, requests, database writes, grants, replacement success state, role assignment or persistent client storage.

## Existing persistence and correction

The earlier statement that permanent per-pet skill storage did not exist was too broad. The checked-in baseline `supabase/migrations/20260907160539_remote_baseline.sql` defines `pet_skills(pet_id, skill_id, equipped, unlocked_at)`, linked to `pets` and `skill_defs`. It also defines ownership policies. This proves checked-in schema support, not that live tables, data or policies currently match it; no live database was accessed.

The existing Skills Chamber uses local `equippedSkillIds` state and frontend string IDs. `/pet` and Wildwood mount that same component, but neither loads `pet_skills`. No pending-choice or atomic skill-replacement handler was found in backend routes. Do not interpret a Chamber selection as a permanent learned skill.

## Separate approval required for server integration

1. Reuse existing skill tables after verifying the deployed schema. Map approved battle definitions and frontend identifiers to `skill_defs` UUIDs. Do not insert these unimplemented draft candidates yet.
2. Add an authenticated read interface for owned-pet learned/equipped skills and outstanding approved choices. Wire the shared Chamber to this source only in a separately approved task.
3. Store pending milestone choices and resolved Keep/Replace decisions durably and idempotently. No suitable pending-choice record was found; an approved schema addition or extension is needed, with a unique per-pet milestone/choice identity and resolution state. Exact schema must follow deployed-schema verification; do not create a second learned-skills table.
4. Add a transactional decision endpoint/RPC. Lock the pending choice and affected pet skill records; validate owner, approved milestone, current element, implemented candidate and expected old skill. A stale request must fail without deleting anything. Keep resolves only the choice. Confirmed Replace removes the selected old skill and inserts the new one in the same transaction, then returns the authoritative updated records. Roll back every change on failure. Decide equipped-slot handling explicitly before implementing replacement.
5. Review existing direct-write grants/policies on `pet_skills` so client writes cannot bypass server eligibility checks. This is a future access-control review, not authorization to change policies now.
6. Hook approved milestones into level progression only after definitions and persistence are approved. Level 1 grants no new species skill; Level 2 is the first proposed choice. No additional milestones were inferred. No permanent role lock is needed.
7. `backend/server/src/battle/battleEngine.ts` currently accepts `basic-strike` and `mend`; `wildwoodBattleService.ts` routes current actions. New candidate effects and validation must be approved before adding executable moves. Existing actions stay unchanged.

## Verification boundary

Frontend build and draft-data assertions are the relevant checks. No backend source changed, so no backend build is needed. No live players, battle sessions or persistence were tested. Current checked-in Wildwood progression caps at 30; this work changes neither that code nor its deployed state. The older Twiglet JSON still records Level 2 as undesigned; the new module records the supplied candidates as design-only, without changing the JSON or granting its contents.

The live Keep/Replace interface, named-forgetting confirmation, milestone issuance and atomic replacement remain unimplemented until the authoritative integration is approved. No fake pending choice is shown to current players.
