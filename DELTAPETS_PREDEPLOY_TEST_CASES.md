# DeltaPets pre-deployment test cases

Prepared October 5, 2026. Branch: `Core_Systems_version_1`.

## Release decision

The five blocker migrations are applied to the DeltaPets database (`uhdpwgybrcizligqypzb`). Application deployment was not performed. Keep traffic paused until the matching frontend and backend are deployed and release-gate checks pass.

This is a test plan plus an execution record, not a claim that every case passed. The wider gameplay/UI cases below are manual regression coverage requested by Jayden; they did not trigger a new repository audit or authorize additional fixes.

## Execution record

| Check actually executed | Result | Evidence and limits |
|---|---|---|
| `pnpm --dir frontend/web build` | PASS | TypeScript and Vite completed; 295 modules transformed. |
| `pnpm --dir backend/server build` | PASS | TypeScript completed; `Build was a success`. |
| `node tools/check-storage-actions.cjs` | PASS | Handler input validation, authenticated identity forwarding, eight action shapes and error handling. RPC double; no database ownership or transaction proof. |
| `node tools/check-daily-reward-route.cjs` | PASS | Real auth/route code with auth/RPC doubles: missing/invalid token, spoofed payload rejection, seven reward response shapes, duplicate and error handling. |
| `node tools/check-hatch-route.cjs` | PASS | Real auth/route code with database doubles: malformed egg IDs, owner filters, replay and errors, one normal hatch RPC. |
| Supabase migration dry run | PASS | Exactly the five approved blocker files; no unrelated migration included. |
| Initial migration apply | FAIL, corrected | Daily reward applied; storage SQL rejected an unparenthesized CASE expression. Storage had not applied. Added parentheses only and resumed. |
| Resumed migration apply | PASS | Remaining four migrations applied; remote migration history confirms all five original versions. |
| Live function ACL query | PASS | All eight relevant function signatures deny EXECUTE to anon/authenticated and permit service_role, including both hatch signatures. |
| Live table ACL query | PASS | Seven tables deny browser writes, retain authenticated SELECT, service-role CRUD and enabled RLS. No explicit column ACLs bypass these revocations. |
| Existing safe database availability | NOT AVAILABLE | No Supabase development branches. Local status failed because the Docker Linux engine pipe is absent. No safe isolated fixture database was identified. |
| Daily reward real concurrency | NOT EXECUTED | NOT EXECUTED — SAFE DATABASE TEST ENVIRONMENT NOT AVAILABLE |
| Hatch real concurrency | NOT EXECUTED | NOT EXECUTED — SAFE DATABASE TEST ENVIRONMENT NOT AVAILABLE |
| Live authenticated owner/cross-player flows | NOT EXECUTED | No player mutations performed for testing. |
| Browser/manual regression cases below | NOT EXECUTED | Checklist ready for execution. |

Build invocation used the process-only setting `$env:pnpm_config_verify_deps_before_run = 'false'` to prevent the bundled pnpm wrapper from attempting an automatic dependency reinstall. No manifest, lockfile or dependency changes were made by this pass. An earlier pnpm CLI-help invocation attempted an automatic install and aborted before removal because no TTY was available. The build setting does not skip TypeScript or Vite checks. Root `pnpm build` was not repeated: no shared/root application code changed, and its two constituent builds passed.

Git reports pre-existing LF-to-CRLF warnings. Supabase reports a newer CLI version; no upgrade was performed.

## Database changes and compatibility

All files below are under `supabase/migrations/` and are confirmed applied at their existing versions.

| Filename | Objects/change | Work in this pass | Existing Alpha data impact |
|---|---|---|---|
| `20261005023308_atomic_daily_login_reward.sql` | New service-only `claim_daily_login_reward(uuid)`; claim-marker write permissions restricted | Existing implementation reviewed and applied unchanged | No existing rewards reissued or balances rewritten by migration. Future claims serialize and commit marker/reward together. |
| `20261005023310_atomic_pet_storage_actions.sql` | Service-only `apply_pet_storage_action(uuid,text,uuid,integer)` | Corrected CASE parentheses after PostgreSQL rejected the unapplied file; applied | No existing pets/slots moved by migration. Future moves enforce existing limits inside one transaction. |
| `20261005023311_atomic_hatch_completion.sql` | Atomic hatch context signature; legacy hatch signature fails closed | Existing implementation reviewed and applied unchanged | No eggs hatched or balances rewritten by migration. New backend required; old hatch handler is incompatible. |
| `20261005023729_restrict_privileged_game_functions.sql` | Restricts `claim_poe_tay_toe(uuid,text)`, `hide_poe_tay_toe(uuid,text)`, `increment_pve_research_stats(uuid,integer,integer,integer)`, `restore_test_runaway_pets(text)` | Filled previously empty file and applied | Permission-only; function behavior and tester/player data unchanged. |
| `20261005023730_server_authoritative_progression.sql` | Removes browser writes to pets, party_slots, hatchery_slots, pet_stats, pet_stat_allocations, pet_elements; reinforces storage RPC ACL | Filled previously empty file and applied | Permission-only; reads/RLS and backend writes preserved. Updated storage frontend/backend required. |

The existing route mount and storage hook already matched `/api/pets/storage/action`; neither needed editing. All existing TypeScript/UI/asset changes remain user-owned. This pass modified only the three SQL files noted above and created this checklist.

Do not roll back application code to the old hatch/storage flow while retaining these database changes. Keep maintenance enabled if rollout fails; prepare a reviewed forward-compatible correction. Do not restore browser mutation permissions as a shortcut. The unrelated pending `20261001005606_record_pet_battle_results.sql` was excluded, not reordered, edited or applied.

## Test setup and recording

Use two disposable accounts, A and B, in an existing safe staging/local database for mutation, race, rollback and fault-injection tests. Never edit real player balances, pets, eggs, claim timestamps or rewards to prepare fixtures. Browser/API smoke tests after deployment should use approved tester accounts through normal gameplay only.

Prepare safe fixtures for: eligible/not-ready eggs; inventory/storage/incubator eggs; party sizes 1 through 4; storage boundary counts; a runaway Kith; supported starter/non-starter/legendary eggs; all daily reward streak positions. Derive unspecified game values from the approved deployed rules, not from this checklist. Missing fixtures mean NOT EXECUTED, not PASS.

For each case record: case ID, environment, build/commit identifier, tester, timestamp, PASS/FAIL/NOT EXECUTED, actual HTTP response, before/after database counts where relevant, and screenshot/log reference. Redact credentials, session tokens and other players' private data. The tables below start as NOT EXECUTED unless a narrowly matching execution record above says otherwise.

## 1. Deployment and access gates

| ID | Steps | Expected result |
|---|---|---|
| DEP-01 | Verify remote migration history against the five versions above. | All five present exactly once; no unrelated pending migration applied. **Executed: PASS.** |
| DEP-02 | Deploy matching frontend/backend while traffic stays paused; check service startup and configured health check. | New build starts without missing-RPC, schema, import or environment errors. |
| DEP-03 | Load the production root and refresh a nested game route. | Express serves the frontend under the existing same-origin architecture; assets and routes load. |
| DEP-04 | Open a cached older client, then reload after rollout. | Client receives current assets. Updated storage/hatch requests work; old browser writes cannot bypass permissions. |
| DEP-05 | Visit as a signed-out user and as a user without Closed Alpha access. | Existing login and AlphaAccessGate remain enforced; Closed Alpha version unchanged. |
| DEP-06 | Verify browser network requests and application logs after one approved smoke flow. | Correct same-origin API routes; no service-role credentials in client requests/assets/logs. |
| DEP-07 | Recheck after service restart and browser refresh. | Persisted player state remains correct; no replayed reward or hatch. |
| DEP-08 | If deployment fails, leave traffic paused and inspect the exact failure. | No old incompatible hatch handler used, no automatic data reset or permission weakening. |

## 2. Authentication and ownership

Repeat relevant requests against `POST /api/pets/storage/action`, `POST /api/rewards/claim`, and `POST /api/pets/hatch`.

| ID | Steps | Expected result |
|---|---|---|
| AUTH-01 | Send no Authorization header. | 401; no game-state mutation. |
| AUTH-02 | Send malformed, invalid and expired bearer tokens. | 401; no privileged RPC invocation. |
| AUTH-03 | Sign out, then replay a request without a valid session. | Rejected; client returns to the established session-expired/login flow. |
| AUTH-04 | Authenticate as A; provide B's pet/egg UUID. | Storage rejects, hatch returns not found; B's rows unchanged. |
| AUTH-05 | Supply a different user ID, reward amount, XP or hatch time in the request body. | Strict storage/reward schemas reject extras; hatch derives identity and authoritative values on the server. |
| AUTH-06 | Send malformed UUIDs, nulls, missing required values, arrays and wrong primitive types. | Rejected before privileged mutation; no internal schema diagnostic exposed by storage/reward routes. |
| AUTH-07 | Repeat valid actions as the resource owner. | Allowed when existing game rules permit; reloaded state matches response. |
| AUTH-08 | Switch accounts in the browser and repeat reads/actions. | A's identity/state cannot be reused to access B's resources. |

TypeScript lesson: `storageActionSchema` uses a discriminated union keyed by `action`. `safeParse` validates untrusted JSON at runtime; after success, TypeScript narrows which properties exist. The server still derives `p_user_id` from the authenticated request. A compile-time type alone cannot prevent a browser from sending forged JSON.

## 3. Database permission bypass cases

Run mutation attempts only against safe fixtures. Catalog privilege checks require no player writes and have already passed on DeltaPets.

| ID | Steps | Expected result |
|---|---|---|
| DB-01 | Check anon/authenticated/service_role EXECUTE for the four privileged functions. | Browser roles false; service_role true. **Catalog check executed: PASS.** |
| DB-02 | Check the same for storage, daily reward and both hatch signatures. | Browser roles false; service_role true. **Catalog check executed: PASS.** |
| DB-03 | Attempt direct browser RPC calls for the same functions using A's own and B's IDs. | Permission denied before function behavior; no data change. Never invoke the restoration utility against real users. |
| DB-04 | Attempt direct INSERT/UPDATE/DELETE of pets, party_slots and hatchery_slots. | Denied, including requests targeting the caller's own rows. |
| DB-05 | Attempt direct writes to pet_stats, pet_stat_allocations and pet_elements. | Denied; cannot manufacture stats, allocation points or elements. |
| DB-06 | Attempt direct rewind, deletion or insertion of daily_login_rewards markers. | Denied; client cannot become eligible twice. |
| DB-07 | Query own pets/team/hatchery/stats after revocations. | Existing reads still work through unchanged owner RLS. |
| DB-08 | Query another account's rows using the browser client. | No unauthorized rows returned. |
| DB-09 | Verify table permissions, RLS and explicit column grants on all seven tables. | No browser write privilege; RLS true; backend CRUD true; no column bypass. **Catalog check executed: PASS.** |
| DB-10 | Use the normal authenticated Poe-Tay-Toe claim/hide and existing PvE research flow in safe testing. | Legitimate service-role-backed behavior still works with unchanged rewards/rules. |

## 4. Storage and Main Team

| ID | Steps | Expected result |
|---|---|---|
| STO-01 | Assign a stored non-runaway Kith to an empty party slot. | One owned party entry; pet location/active state consistent after reload. |
| STO-02 | Assign into an occupied slot. | Existing displacement/storage behavior preserved; no lost or duplicated pet. |
| STO-03 | Swap two occupied team slots. | Each Kith appears once; no partial swap. |
| STO-04 | Move an existing team member into an empty slot. | One party membership; established slot rules preserved. |
| STO-05 | Reassign the only team member. | Existing first-slot behavior preserved; team not accidentally emptied. |
| STO-06 | Return one of multiple party members to storage. | Move and slot removal both succeed; counts update. |
| STO-07 | Attempt to store/return the last Main Team Kith. | Existing minimum-one rule rejects; no partial change. |
| STO-08 | Store the active Kith when another eligible fallback exists. | Existing fallback choice becomes active; at most one active Kith. |
| STO-09 | Set an eligible stored/team Kith active. | Previous active cleared and chosen owned Kith active atomically. |
| STO-10 | Attempt team/active actions on an egg or runaway Kith. | Rejected; rows unchanged. |
| STO-11 | Send slot 0, 5, fractional value or string. | 400; no RPC mutation. |
| STO-12 | Return an empty party slot or store an already stored Kith. | Safe established no-op; no duplicate membership/reward. |
| STO-13 | Reach storage boundaries using fixtures: total 50, eggs 20, Kith 30. | Existing caps enforced; over-cap move fails entirely. |
| STO-14 | Move an inventory egg to storage. | Same egg moves once; correct source/target counts. |
| STO-15 | Incubate an inventory egg and a stored egg in separate fixture runs. | One free unlocked slot assigned; server uses existing pending duration/fallback, not client timestamp. |
| STO-16 | Incubate while another egg occupies the incubator or no unlocked free slot exists. | Rejected; original location and timer unchanged. |
| STO-17 | Return an incubating egg to storage. | Hatchery slot cleared in the same transaction; existing timer behavior preserved. |
| STO-18 | Submit a move whose source location does not match the action. | Rejected without moving the egg. |
| STO-19 | Send two simultaneous moves for the same pet/egg in a safe DB. | Serialized valid outcomes; no duplicated slots, partial move or capacity bypass. |
| STO-20 | Interrupt network after a successful action, then reload. | Persisted state is authoritative; no lost pet; busy/error state recovers. |

## 5. Daily rewards

Expected existing seven-day cycle: 300 Dots; 200 Dots; one Haiku Scroll #50; three small potions; 100 XP; 500 Dots; Alpha Tester Ribbon. Do not change these values to make tests pass.

| ID | Steps | Expected result |
|---|---|---|
| REW-01 | Claim on an eligible account with no prior claim row. | First reward once; one claim row with correct UTC marker/streak. |
| REW-02 | Claim each of the seven cycle positions in safe fixtures. | Reward type/value exactly matches the existing cycle; status preview agrees. |
| REW-03 | Repeat a claim in the same UTC day. | Duplicate rejected; balance/inventory/XP/award and marker unchanged by duplicate. |
| REW-04 | Send at least two simultaneous eligible claims for A. | Exactly one grant and one streak advance. Verify all reward tables, not just HTTP statuses. |
| REW-05 | Repeat REW-04 with no pre-existing claim row. | At most one row and one reward despite concurrent first claims. |
| REW-06 | Repeat races for Dots, inventory, XP and ribbon reward categories. | Each category obeys at-most-once grant within the period. |
| REW-07 | Claim after UTC day gaps of 1, 2, 3 and 4 in safe fixtures. | Gaps 1–3 continue streak; gap 4 resets according to existing rule. |
| REW-08 | Claim across UTC midnight, including a request waiting for the lock. | Eligibility uses database time after lock; at most one reward per UTC day. |
| REW-09 | Claim XP with an eligible active Kith, then with none. | Eligible active Kith receives existing 100 XP; no-active case retains established no-op reward behavior. |
| REW-10 | Force a reward-write failure in a disposable transaction/fixture DB. | Entire claim rolls back; no marker without reward or partial award. Fix cause, then claim once. |
| REW-11 | Drop response after successful commit, then retry/reload. | No duplicate reward; status shows claimed today and persisted reward. |
| REW-12 | Claim independently as A and B. | Separate identity/markers; one account never receives or blocks the other's reward. |

REW-04 through REW-08 concurrency/time fixture execution: **NOT EXECUTED — SAFE DATABASE TEST ENVIRONMENT NOT AVAILABLE**. Route doubles do not count as proof.

## 6. Hatch completion

The normal path transforms the existing egg row into a Kith. Check the same ID and related rows, not only total pet count. Existing corruption rules can deliberately consume an eligible non-protected egg; do not reinterpret that as a normal hatch or alter its probability.

| ID | Steps | Expected result |
|---|---|---|
| HAT-01 | Complete one ready, owned starter egg through `/api/pets/hatch`. | Exactly one hatchling transition; same pet ID; timer cleared and hatch timestamp set. |
| HAT-02 | Complete before timer, with no timer, unknown ID, non-egg ID and B's egg. | Rejected; no stats, inventory, slots or pet mutation. |
| HAT-03 | Send multiple simultaneous completions for the same eligible egg. | Exactly one successful transition and one reward; duplicates fail without mutation. |
| HAT-04 | Repeat after successful completion, including from another browser tab. | No second Kith, Delta or stat allocation. |
| HAT-05 | Complete eligible starter, non-starter and supported legendary fixtures. | Existing species/line/rarity/stats/growth/personality rules preserved. |
| HAT-06 | Inspect pet_stats, level-one allocations and pet_elements after completion. | Exactly the intended related records; allocation total equals existing server rule. |
| HAT-07 | Hatch a native elemental line; compare inventory before/after. | Exactly one matching native elemental Delta under existing rule. |
| HAT-08 | Hatch with free team slots and with all four occupied. | Lowest available team slot used when eligible; established storage fallback when full. |
| HAT-09 | Hatch with an existing active Kith and with none. | Existing active preserved or new eligible Kith selected; no duplicate active state. |
| HAT-10 | Hatch a level-gated legendary below and at its existing trainer threshold. | Existing gate enforced; no unauthorized active/team placement. |
| HAT-11 | Complete an egg that occupies a hatchery slot. | Slot cleared in same transaction; no simultaneously completed Kith and occupied egg slot. |
| HAT-12 | Force a late failure (for example missing required reward definition) only in a safe fixture DB. | Pet transition, stats, allocations, elements, reward and slot updates all roll back. |
| HAT-13 | Drop response after commit or simulate failure in response enrichment; reload and retry. | Committed Kith visible after reload; retry cannot duplicate hatch/reward. A 500 alone does not prove rollback. |
| HAT-14 | Race a storage move against completion in a safe DB. | Coherent serialized outcome; no duplicate pet, stale occupied slot or partial transaction. |
| HAT-15 | Exercise existing corruption-loss path using controlled safe fixtures, including concurrent normal completion. | Existing protected-egg rules preserved; only one terminal outcome, no hatch reward after loss. |
| HAT-16 | Verify starter original/rescue eligibility through normal safe test flows. | Existing eligibility and starter rules unchanged; no extra starter from retries. |

HAT-03/HAT-14/HAT-15 real concurrency: **NOT EXECUTED — SAFE DATABASE TEST ENVIRONMENT NOT AVAILABLE**. HAT-12 rollback injection also not executed.

## 7. Care and inventory regression

| ID | Steps | Expected result |
|---|---|---|
| CARE-01 | Use each available care action with an eligible Kith and required item. | Existing effect and inventory consumption occur once; reload persists them. |
| CARE-02 | Repeat during cooldown and with insufficient inventory. | Existing rejection; no extra consumption or effect. |
| CARE-03 | Open care for eggs, runaway Kith and another player's Kith. | Existing eligibility/ownership restrictions remain enforced. |
| CARE-04 | Refresh after elapsed normal care time. | Existing decay/state rules preserved; no browser ability to overwrite care values. |
| INV-01 | Load inventory and switch its existing categories. | Counts/art/text load correctly and reflect server state. |
| INV-02 | Use an existing supported potion/food/hatch item through normal flows. | Existing eligibility and effect; quantity changes once. |
| INV-03 | Try zero-stock, invalid item and wrong-owner requests in safe testing. | Rejected without state change. |
| INV-05 | Perform an existing merchant purchase with enough and insufficient funds. | Existing price, wallet/inventory consistency and rejection preserved. |
| INV-06 | Check inventory after storage, daily reward and hatch flows. | UI counts match persisted authoritative state. |

## 8. Existing gameplay regression

These are manual smoke cases, not implementation/audit expansion. Use approved existing behavior as the oracle.

| ID | Steps | Expected result |
|---|---|---|
| GAME-01 | Explore the currently available Kithna/Wildwood route using a valid team. | Existing entry/energy/eligibility rules and navigation preserved. |
| GAME-02 | Complete one existing supported PvE encounter. | Existing result, rewards and research recording work without duplicate application on refresh. |
| GAME-03 | Refresh/reconnect after an encounter result. | Settled result remains consistent; no repeated grant. |
| GAME-04 | Open the Skill Chamber and perform an already supported action with eligible fixtures. | Existing requirements, cost and pet changes preserved. |
| GAME-05 | Exercise an already eligible Resonance Evolution fixture. | Existing requirements, costs, identity/art/animation and outcome preserved. |
| GAME-06 | Open and progress an existing quest through its normal steps. | Existing dialogue/progress/reward rules remain intact. |
| GAME-07 | Exercise Poe-Tay-Toe claim, cooldown and hide via backend. | Same intended rewards/location/cooldown behavior; direct browser RPC remains denied. |
| GAME-08 | Visit unfinished/locked features. | Existing locks remain; no accidental Open Alpha conversion or new gameplay exposed. |

## 9. Profile, UI and devices

| ID | Steps | Expected result |
|---|---|---|
| UI-01 | Open homepage on desktop and supported mobile viewport. | Established layout, FREE △ PLAY spacing and blue-grid presentation preserved. |
| UI-02 | Navigate profile, pets, Hatchery, storage and Main Team. | Correct current player/Kith; no blank screen, broken art or unexpected layout shift. |
| UI-03 | Use storage filters and action controls with mouse, touch and keyboard. | Existing controls remain usable; correct state after action/reload. |
| UI-04 | Test narrow portrait, landscape and normal desktop widths. | Existing responsive behavior; no newly clipped primary actions or horizontal overflow. |
| UI-05 | Open existing profile/avatar edits and save a normal supported edit. | Established save flow persists; no unrelated appearance regression. |
| UI-06 | Inspect hatch/reward success and failure feedback. | Correct result; errors do not leave controls permanently busy. |
| UI-07 | Run a supported Chromium browser and one other supported browser/device. | Core login, navigation, storage and hatch flows work consistently. |
| UI-08 | Check asset loading after a fresh load and cache refresh. | No missing species/egg/portrait assets from filename/case mismatches. |

## 10. Release gates and sign-off

- [x] Frontend and backend builds pass.
- [x] Focused storage/reward/hatch route checks pass with documented doubles.
- [x] Five approved migrations applied and history verified.
- [x] Privileged function ACLs and authoritative table permissions verified live.
- [ ] Matching application build deployed while traffic remains paused.
- [ ] Real owner/cross-player API flows verified with approved test accounts.
- [ ] Daily reward and hatch real concurrency/rollback checks pass in a safe database.
- [ ] Core login, storage, team, hatch, reward and care smoke checks pass.
- [ ] Existing Alpha data compatibility confirmed through authorized read/smoke checks.
- [ ] Desktop/mobile locked UI smoke checks pass.
- [ ] Release owner reviews failures and unexecuted gates before reopening traffic.

Do not label unexecuted concurrency or manual tests PASS. No commit, push, branch switch, application deployment or player-data test mutation was performed in this pass.

## Git evidence

The following command output is captured at the end of this pass. It includes pre-existing user work; `git diff` does not include the untracked SQL/checklist files. This pass's write set is listed in the compatibility table above.
`git status --short`

```text
 M backend/server/package.json
 M backend/server/src/routes/cities/kithna/wildwood.ts
 M backend/server/src/routes/index.ts
 M backend/server/src/routes/inventory/inventory.ts
 M backend/server/src/routes/me.ts
 M backend/server/src/routes/rewards/rewards.ts
 M backend/server/src/routes/routePets/resonanceEvolution.ts
 M backend/server/src/routes/routePets/routePets.ts
 M backend/server/src/shared/pets/characterProfiles/starters/esperon.json
 M backend/server/src/shared/pets/species/starter-species.ts
 D frontend/pet_items/Amor.json
 M frontend/pet_items/Potions.json
 M frontend/pet_items/care_items.json
 M frontend/pet_items/food.json
 M frontend/pet_items/hatch_items.json
 M frontend/web/src/app/App.tsx
 M frontend/web/src/components/Hatchery/pages/storage/PetStoragePanel.tsx
 M frontend/web/src/components/Hatchery/pages/storage/usePetStorage.ts
 M frontend/web/src/components/MainTeam/mainTeam.tsx
 M frontend/web/src/components/Quests/QuestDialogue.tsx
 M frontend/web/src/components/inventory/inventory.css
 M frontend/web/src/components/inventory/inventory.tsx
 M frontend/web/src/components/skillChamber/skillChamber.tsx
 M frontend/web/src/features/resonanceEvolution/ResonanceEvolutionCinematic.tsx
 D frontend/web/src/kith/assets/Kithna_pets/hatchling_clodion.png
 D frontend/web/src/kith/assets/Kithna_pets/hatchling_glimmer.png
 D frontend/web/src/kith/assets/Kithna_pets/hatchling_magmado.png
 D frontend/web/src/kith/assets/Kithna_pets/hatchling_pebelin.png
 D frontend/web/src/kith/assets/Kithna_pets/hatchling_shade.png
 D frontend/web/src/kith/assets/startepets/hatchling_cribi.png
 D frontend/web/src/kith/assets/startepets/hatchling_espyr.png
 D frontend/web/src/kith/assets/startepets/hatchling_kindlekin.png
 D frontend/web/src/kith/assets/startepets/hatchling_mizu.png
 D frontend/web/src/kith/assets/startepets/hatchling_solen.png
 D frontend/web/src/kith/assets/startepets/hatchling_twiglet.png
 D frontend/web/src/kith/assets/startepets/hatchling_volb.png
 D frontend/web/src/kith/assets/startepets/hatchling_whistpip.png
 M frontend/web/src/kith/registry/kithnaPets.ts
 M frontend/web/src/kith/registry/kithnaPortraits.ts
 M frontend/web/src/kith/registry/starterPortraits.ts
 M frontend/web/src/main.tsx
 M frontend/web/src/mobile.css
 M frontend/web/src/pages/Cities/Kithna/KithnaMap.tsx
 M frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx
 M frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodExploreResult.tsx
 M frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
 M frontend/web/src/pages/Homepage/homepage.tsx
 M frontend/web/src/pages/petsPage/components/petDetailsPanel/PetDetailsPanel.tsx
 M frontend/web/src/pages/profile/ProfilePage.tsx
 M pnpm-lock.yaml
 M tools/check-wildwood-integration.cjs
?? DELTAPETS_PREDEPLOY_TEST_CASES.md
?? backend/Retired/closed-alpha-care-package.md
?? backend/server/src/routes/pets/
?? frontend/pet_items/relics.json
?? frontend/web/src/kith/assets/Kithna_pets/corrupt/
?? frontend/web/src/kith/assets/Kithna_pets/corrupt_lowform/
?? frontend/web/src/kith/assets/Kithna_pets/hatchlings/
?? frontend/web/src/kith/assets/Kithna_pets/lowform/
?? frontend/web/src/kith/assets/startepets/hatchlings/
?? frontend/web/src/kith/assets/startepets/lowform/
?? frontend/web/src/preview_testing/
?? supabase/migrations/20261001005606_record_pet_battle_results.sql
?? supabase/migrations/20261005023308_atomic_daily_login_reward.sql
?? supabase/migrations/20261005023310_atomic_pet_storage_actions.sql
?? supabase/migrations/20261005023311_atomic_hatch_completion.sql
?? supabase/migrations/20261005023729_restrict_privileged_game_functions.sql
?? supabase/migrations/20261005023730_server_authoritative_progression.sql
?? tools/check-daily-reward-route.cjs
?? tools/check-hatch-route.cjs
?? tools/check-pet-battle-results.cjs
?? tools/check-storage-actions.cjs
```

`git diff --stat`

```text
 backend/server/package.json                        |    1 +
 .../server/src/routes/cities/kithna/wildwood.ts    |    3 +-
 backend/server/src/routes/index.ts                 |    2 +
 backend/server/src/routes/inventory/inventory.ts   |   46 +-
 backend/server/src/routes/me.ts                    |   36 +-
 backend/server/src/routes/rewards/rewards.ts       |  192 +--
 .../src/routes/routePets/resonanceEvolution.ts     |    9 +-
 backend/server/src/routes/routePets/routePets.ts   |  354 +-----
 .../pets/characterProfiles/starters/esperon.json   |    8 +-
 .../src/shared/pets/species/starter-species.ts     |    4 +-
 frontend/pet_items/Amor.json                       |   15 -
 frontend/pet_items/Potions.json                    |  637 ++++++++++
 frontend/pet_items/care_items.json                 |  624 ++++++++++
 frontend/pet_items/food.json                       | 1297 +++++++++++++++++++-
 frontend/pet_items/hatch_items.json                |  322 ++++-
 frontend/web/src/app/App.tsx                       |    6 +-
 .../Hatchery/pages/storage/PetStoragePanel.tsx     |    2 +-
 .../Hatchery/pages/storage/usePetStorage.ts        |  692 +----------
 frontend/web/src/components/MainTeam/mainTeam.tsx  |    2 +-
 .../web/src/components/Quests/QuestDialogue.tsx    |    5 +
 .../web/src/components/inventory/inventory.css     |  176 ---
 .../web/src/components/inventory/inventory.tsx     |  119 +-
 .../src/components/skillChamber/skillChamber.tsx   |    2 +-
 .../ResonanceEvolutionCinematic.tsx                |    9 +-
 .../kith/assets/Kithna_pets/hatchling_clodion.png  |  Bin 948608 -> 0 bytes
 .../kith/assets/Kithna_pets/hatchling_glimmer.png  |  Bin 940435 -> 0 bytes
 .../kith/assets/Kithna_pets/hatchling_magmado.png  |  Bin 939462 -> 0 bytes
 .../kith/assets/Kithna_pets/hatchling_pebelin.png  |  Bin 1074338 -> 0 bytes
 .../kith/assets/Kithna_pets/hatchling_shade.png    |  Bin 737739 -> 0 bytes
 .../src/kith/assets/startepets/hatchling_cribi.png |  Bin 1227118 -> 0 bytes
 .../src/kith/assets/startepets/hatchling_espyr.png |  Bin 1059921 -> 0 bytes
 .../kith/assets/startepets/hatchling_kindlekin.png |  Bin 1101486 -> 0 bytes
 .../src/kith/assets/startepets/hatchling_mizu.png  |  Bin 1181549 -> 0 bytes
 .../src/kith/assets/startepets/hatchling_solen.png |  Bin 1079527 -> 0 bytes
 .../kith/assets/startepets/hatchling_twiglet.png   |  Bin 931036 -> 0 bytes
 .../src/kith/assets/startepets/hatchling_volb.png  |  Bin 901848 -> 0 bytes
 .../kith/assets/startepets/hatchling_whistpip.png  |  Bin 1039272 -> 0 bytes
 frontend/web/src/kith/registry/kithnaPets.ts       |    2 +-
 frontend/web/src/kith/registry/kithnaPortraits.ts  |   20 +-
 frontend/web/src/kith/registry/starterPortraits.ts |   50 +-
 frontend/web/src/main.tsx                          |   33 +-
 frontend/web/src/mobile.css                        |   98 +-
 frontend/web/src/pages/Cities/Kithna/KithnaMap.tsx |   38 +-
 .../Cities/Kithna/Wildwood/WildwoodBattle.tsx      |   21 +-
 .../Kithna/Wildwood/WildwoodExploreResult.tsx      |    2 +-
 .../pages/Cities/Kithna/Wildwood/WildwoodPage.tsx  |   26 +-
 frontend/web/src/pages/Homepage/homepage.tsx       |    4 +-
 .../components/petDetailsPanel/PetDetailsPanel.tsx |    2 +-
 frontend/web/src/pages/profile/ProfilePage.tsx     |    2 +-
 pnpm-lock.yaml                                     |   40 +
 tools/check-wildwood-integration.cjs               |   84 +-
 51 files changed, 3413 insertions(+), 1572 deletions(-)
```

`git diff --name-only`

```text
backend/server/package.json
backend/server/src/routes/cities/kithna/wildwood.ts
backend/server/src/routes/index.ts
backend/server/src/routes/inventory/inventory.ts
backend/server/src/routes/me.ts
backend/server/src/routes/rewards/rewards.ts
backend/server/src/routes/routePets/resonanceEvolution.ts
backend/server/src/routes/routePets/routePets.ts
backend/server/src/shared/pets/characterProfiles/starters/esperon.json
backend/server/src/shared/pets/species/starter-species.ts
frontend/pet_items/Amor.json
frontend/pet_items/Potions.json
frontend/pet_items/care_items.json
frontend/pet_items/food.json
frontend/pet_items/hatch_items.json
frontend/web/src/app/App.tsx
frontend/web/src/components/Hatchery/pages/storage/PetStoragePanel.tsx
frontend/web/src/components/Hatchery/pages/storage/usePetStorage.ts
frontend/web/src/components/MainTeam/mainTeam.tsx
frontend/web/src/components/Quests/QuestDialogue.tsx
frontend/web/src/components/inventory/inventory.css
frontend/web/src/components/inventory/inventory.tsx
frontend/web/src/components/skillChamber/skillChamber.tsx
frontend/web/src/features/resonanceEvolution/ResonanceEvolutionCinematic.tsx
frontend/web/src/kith/assets/Kithna_pets/hatchling_clodion.png
frontend/web/src/kith/assets/Kithna_pets/hatchling_glimmer.png
frontend/web/src/kith/assets/Kithna_pets/hatchling_magmado.png
frontend/web/src/kith/assets/Kithna_pets/hatchling_pebelin.png
frontend/web/src/kith/assets/Kithna_pets/hatchling_shade.png
frontend/web/src/kith/assets/startepets/hatchling_cribi.png
frontend/web/src/kith/assets/startepets/hatchling_espyr.png
frontend/web/src/kith/assets/startepets/hatchling_kindlekin.png
frontend/web/src/kith/assets/startepets/hatchling_mizu.png
frontend/web/src/kith/assets/startepets/hatchling_solen.png
frontend/web/src/kith/assets/startepets/hatchling_twiglet.png
frontend/web/src/kith/assets/startepets/hatchling_volb.png
frontend/web/src/kith/assets/startepets/hatchling_whistpip.png
frontend/web/src/kith/registry/kithnaPets.ts
frontend/web/src/kith/registry/kithnaPortraits.ts
frontend/web/src/kith/registry/starterPortraits.ts
frontend/web/src/main.tsx
frontend/web/src/mobile.css
frontend/web/src/pages/Cities/Kithna/KithnaMap.tsx
frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx
frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodExploreResult.tsx
frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
frontend/web/src/pages/Homepage/homepage.tsx
frontend/web/src/pages/petsPage/components/petDetailsPanel/PetDetailsPanel.tsx
frontend/web/src/pages/profile/ProfilePage.tsx
pnpm-lock.yaml
tools/check-wildwood-integration.cjs
```

