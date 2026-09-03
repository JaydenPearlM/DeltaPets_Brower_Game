# DeltaPets Kith System Audit

Date: 2026-09-03  
Branch audited: `Core_Systems_version_1`  
Scope: repository evidence only; no production database inspection and no schema, balance, or gameplay changes.

## Executive findings

DeltaPets already has the beginnings of an individualized Kith model. A Kith row persists identity and progression, hatch rolls persist personality and growth traits, level-one individual values persist as stat allocations, mutations and passives have relational ownership, and care/Bond are stored per Kith. The frontend also derives dialogue from current care, Bond, personality, mutation, and passive data.

The largest gaps are durable relationship history and a single backend-owned interpretation layer. Visit “memory” is currently browser-local, Bond is currently a cooldown action that adds a fixed amount, and care/dialogue thresholds are duplicated in frontend files. There is no bounded, typed event/aggregate model connecting care, battle, quests, training, evolution, and unusual interactions into one Kith history.

One current correctness risk is visible in `starter-species.ts`: `shadow_night_bad` / Espyr is defined twice with the same ID and identical data, while no good-shadow starter definition is present. This should be corrected only after confirming the intended missing shadow form.

## 1. Current Kith system map

```text
Supabase/PostgreSQL
  pets (identity, stage, progression, care, Bond, personality, traits)
  pet_stats + pet_stat_allocations + pet_elements
  mutations + pet_mutations
  passive_traits + pet_passive_traits / pets.passive_trait_*
  skill_defs + pet_skills
  battle_runs + battle_run_fights
  user_kith_discoveries + retired Kith registry
       |
       v
Node/Express (authoritative writes and composition)
  routes/routePets/*       hatch, active/team/storage, stats, rescue
  routes/care/*            current state, decay, actions, daily care
  pets/*                   growth, personality, cooldown helpers
  shared/pets/*            species, care decay, character profiles
       |
       v
/api/care/current, /api/care/*, /api/pets/*
       |
       v
React/Vite
  PetPage -> PetDetailsPanel -> dialogue/selfAware presentation
  Hatchery -> hatch/storage flows
  MainTeam/Profile -> summaries
  kith/registry -> shared species bridge and asset lookup
```

Key locations:

- Shared species/evolution/base-stat definitions: `backend/server/src/shared/pets/species/`.
- Species-aware presentation profiles: `backend/server/src/shared/pets/characterProfiles/`.
- Hatch and Kith API: `backend/server/src/routes/routePets/`.
- Care and Bond actions: `backend/server/src/routes/care/` and `backend/server/src/shared/pets/care/CareDecay.ts`.
- Individual roll helpers: `backend/server/src/lib/stats/individualValues.ts`, `backend/server/src/pets/growthTraits.ts`, and `backend/server/src/pets/personalities.ts`.
- Frontend Kith bridge/assets: `frontend/web/src/kith/`.
- Main Kith UI: `frontend/web/src/pages/petsPage/`, `frontend/web/src/components/Hatchery/`, `frontend/web/src/components/MainTeam/`, and `frontend/web/src/pages/profile/`.
- Database history: `supabase/migrations/`, especially the initial schema, hatch RPC revisions, passive/mutation migrations, rarity, and Kith registry foundation.

The active-page flow is backend-authoritative: `PetPage` requests `/api/care/current`; the care route finds the active Kith, applies/persists care decay, loads stats/elements/team/profile data, and returns a composed response. Actions post to `/api/care/*` or `/api/pets/actions/do`, then the frontend refreshes state. Hatchery uses `/api/pets/hatchery` and `/api/pets/hatch`.

## 2. Duplicate / messy files and definitions

| Item | Classification | Evidence / recommendation |
|---|---|---|
| Duplicate Espyr entry in `starter-species.ts` | **CURRENTLY USED — correctness risk** | Two identical `shadow_night_bad` records share one ID. Confirm whether one should be a good/day shadow form before changing data. |
| `STARTER_SPROUTS`, `SHARED_STARTER_SPROUTS`, route-level `STARTERS` | **SAFE TO CONSOLIDATE LATER** | They are compatibility projections of `SHARED_SPECIES`, not independent data today. Keep until consumers are migrated, then expose selectors rather than three public shapes. |
| `PetStage` in shared types, `kith/registry/creationTypes.ts`, and `kith/registry/Stats/petStage.ts` | **SAFE TO CONSOLIDATE** | Multiple unions can drift. Frontend should import the shared stage type. |
| Repeated `PetRecord`/care/passive/mutation response shapes in `PetPage`, `PetDetailsPanel`, `selfAware`, storage, and MainTeam | **SAFE TO CONSOLIDATE** | Introduce shared API DTOs; do not replace DB row types with UI models. |
| `petDialogue.ts` and `selfAware.tsx` both interpret care/Bond | **AMBIGUOUS / overlapping responsibility** | Both are live. Extract one typed presentation-context interpreter before moving files. |
| Browser-local visit memory in `selfAware.tsx` | **CURRENTLY USED, not authoritative** | Useful prototype, but device/browser-specific and user-editable. Do not treat as durable Kith history. |
| Legacy `personality` enum plus `personality_id` and `personality_key` | **AMBIGUOUS** | Schema history contains both old and newer personality representations. Confirm live reads/writes, backfill, then deprecate only with an approved migration. |
| Direct passive columns plus `pet_passive_traits` join table | **AMBIGUOUS / dual model** | Code reads `pets.passive_trait_id/key`, while migrations also define relational ownership. Establish whether one slot or multiple passives are intended. |
| `frontend/web/src/lib/supabase/database.types.ts` | **LIKELY STALE** | Generated types must be regenerated against the approved schema; audit showed historical/schema drift around rarity and newer Kith fields. |
| `backend/server/src/shared/pets/characterProfiles/kithna.zip` | **AMBIGUOUS** | Archive placed beside runtime JSON. Keep untouched; move to documentation/source storage only after ownership is confirmed. |
| Starter `old/` artwork | **LIKELY OLD, intentionally retained** | No runtime imports after the asset task. Keep as archive until deletion approval. |
| `backend/Retired/species.ts` references from Kithna comments | **DO NOT TOUCH** | Retired ownership is an explicit game/data preservation concept, not ordinary dead code. |
| Initial schema’s historical `Legion` casing and later enum repair | **DO NOT TOUCH migrations** | History explains compatibility work. Never rewrite applied migrations. Current canonical type should be lowercase `legion`. |

No files were deleted during this audit.

## 3. Current sources of truth

| Concern | Current authority | Assessment |
|---|---|---|
| Species, evolution names, starter base stats | `shared/pets/species/*` | Correct shared-code direction; fix duplicate shadow record. |
| Wild Kithna rarity/encounter/hatch rules | `kithna-species.ts` | Shared definition consumed by backend/frontend bridge. |
| Individual Kith state | `pets` row | Correct primary aggregate root. |
| Base stats | shared species at creation, persisted in `pet_stats` | Persisted snapshot protects existing Kith from later template changes. |
| Individual values and level allocations | `pet_stat_allocations` | Level 1 is the seven-point IV roll; later levels are accumulated allocations. |
| Displayed totals | backend `petsStats.ts` | Base + allocations; displayed HP is HP stat × 2. Passive effects are loaded but intentionally displayed separately rather than added to totals. |
| Rarity | `pets.rarity`; Kithna/shared species rules at creation | Starters are migrated as Epic. No rebalance recommended. |
| Elements | `pets.line` plus `pet_elements` affinity buckets | Two related but distinct concepts; naming should document line versus earned affinity. |
| Care decay | backend `CareDecay.ts` + shared constants | Authoritative calculation belongs on backend and persists during reads/actions. |
| Bond | `pets.bond`, cooldown fields, backend care action | Persistent but behavior is currently a fixed action increment. |
| Personality | `personalities` table and persisted ID/key; character profile metadata for presentation | Multiple representations need a compatibility decision. |
| Growth traits | persisted `growth_strong_stats` / `growth_weak_stat` | Rolled at hatch and durable. |
| Mutations | `mutations` + `pet_mutations`, DB assignment function | Relational and individual. |
| Passives | `passive_traits`, ownership relation and direct pet slot fields | Dual representation needs clarification. |
| Active skills | `skill_defs` + `pet_skills`; frontend skill/talent registries | Audit consumers before choosing one definition source. |
| Dialogue/self-awareness | frontend `petDialogue.ts`, `selfAware.tsx`, backend character profiles | Presentation is fragmented; factual Kith state still originates from API. |
| Visit history | localStorage in `selfAware.tsx` | Prototype only; not portable, secure, or durable. |

## 4. Current individuality

Two Kith of the same species can currently differ through their persistent UUID/owner, name, gender, personality, rarity where applicable, level/XP, seven randomly distributed level-one IV points, player allocations, rolled strong/weak growth traits, mutation assignment, passive assignment, active skills, care values, energy, Bond, location/party status, hatch/ownership timestamps, awards, and battle-run references.

Exact stat behavior observed:

- Species egg base stats sum to 10 in the shared starter registry.
- `rollIV(7)` independently assigns each of seven points to one of HP/ATK/DEF/SPD/MAGI/MANA using cryptographic random selection.
- The IV is persisted as a level-1 `pet_stat_allocations` row.
- Current totals are `pet_stats base + sum(pet_stat_allocations where level >= 1)`.
- `hp_display = total.hp * 2`.
- Growth strong/weak traits are rolled by rarity with current probabilities in `growthTraits.ts`; they persist at hatch but are not part of the total-stat formula shown in `petsStats.ts`.
- Mutation slot 1 currently has a 30% assignment chance in the latest mutation function (`roll < 0.30`), then rarity weights 50% common, 30% uncommon, 15% rare, 5% legendary. The relational row persists even when no mutation is assigned.

This already produces meaningful birth variation. It does not yet make lived history a coherent, queryable part of identity.

## 5. Missing individuality

- No server-side relationship summary: visits, care consistency, absences, training, exploration, quest attempts, food preferences, and shared milestones are not unified.
- No typed, bounded significant-memory store.
- No idempotent event-ingestion contract linking battle/quest/care/evolution systems.
- Bond lacks provenance; a value of 60 cannot explain how the relationship developed.
- No backend context builder that combines identity, current needs, recent events, personality, and important memories.
- Care/emotional thresholds are frontend-local and duplicated.
- Battle history exists, but meaningful summaries are not projected onto the Kith identity response.
- No retention/compaction strategy because durable memory has not yet been introduced.

## 6. Proposed Kith Identity architecture

Keep `pets` as the identity/current-state aggregate root and keep immutable/catalog data in shared definitions or catalog tables. Add a backend domain layer rather than allowing UI components to interpret raw rows independently.

```text
Authoritative commands (care, hatch, battle, quest, training)
       |
       +--> existing gameplay transaction
       +--> KithHistoryRecorder (typed, idempotent event)
                    |
                    +--> aggregate counters/relationship summary
                    +--> bounded recent significant memories
                    +--> milestone records

KithContextService
  = pets identity/current state
  + stats/traits/skills
  + relationship summary
  + selected significant memories
  + derived care/presentation state
       |
       v
versioned API DTO -> Pet Details/Profile/Battle/Evolution UI
```

Recommended TypeScript domains: `KithIdentitySnapshot`, `KithTraitsSnapshot`, `KithCareSnapshot`, `KithRelationshipSummary`, `KithMemorySummary`, `KithPresentationState`, and a discriminated `KithGameEvent`. These are deterministic game types, not prompts or external AI integration.

## 7. Proposed Bond model

Bond should represent durable trust/history between one Kith and its trainer. Retain a fast current value for gameplay/UI, but record categorized provenance in relationship aggregates: care consistency, shared activity, challenge/recovery, milestones, and time/continuity.

Safe architecture rules:

- All gains/limits are backend-authoritative and transactionally tied to the qualifying action.
- Events carry idempotency keys so retries cannot double-award.
- Repeated trivial actions use cooldowns, daily/category caps, or diminishing eligibility—not frontend timers.
- Bond policy is versioned so future balancing does not rewrite history.
- Negative effects and exact values remain unimplemented until approved.
- Future battle/training/relic consumers receive a read-only `BondEffectContext`; they do not recalculate or mutate Bond.
- Store lifetime category counters alongside the current score so the relationship remains explainable.

The current `bond` action (`+8`, clamped 0–100, cooldown-controlled) is an early mechanic, not yet this model. Do not silently replace it.

## 8. Proposed memory model

Use three bounded layers:

1. **Counters/summary:** one row per Kith with counts and timestamps (visits, feeds, battles won/lost, training, quests, last interaction, longest absence, care streak summaries). Update incrementally.
2. **Significant memories:** typed discrete events only when an event meets retention policy (evolution, first victory, near-defeat survival, mutation discovery, important story event, repeated-failure-then-success).
3. **Recent context:** a small indexed query for the most recent retained events; cap by count/age and compact expired items into counters.

Suggested event envelope: event ID, Kith ID, trainer ID, typed event key, occurred-at, source system/reference, schema version, significance, and small validated metadata. Special systems such as Poe Tay Toe use a namespaced custom event key and validated metadata, not a potato-specific schema.

Do not store raw conversations or every click. A page view should increment an aggregate with rate limiting; only milestone counts create discrete memories. Retention should preserve milestones/important relationship events, keep a bounded recent window, and aggregate routine events.

## 9. Care awareness model

Continue using the existing persisted values: hunger, clean, happy, comfort, rest (0–50) and energy (0–100). Energy is action-driven and does not decay in `CareDecay.ts`. Personality currently adjusts each care decay interval deterministically by -30/-15/0/+15/+30 minutes. Runaway evaluation depends on hunger/clean/happy reaching zero and accumulated neglect reaching 72 hours.

Add a pure shared/backend `deriveKithCareState(snapshot, policy)` function returning typed flags/severity and a dominant need. Keep thresholds in one reviewed policy object. The frontend receives derived states plus raw values for bars; it should not invent a second care model. Current thresholds in `petDialogue.ts` and `selfAware.tsx` are evidence for review, not automatically canonical values.

Emotional presentation should be derived from current care + energy + recent significant events + personality + Bond. Persist only durable causes; do not persist transient labels such as “curious” unless a game mechanic truly needs them.

## 10. Stats / mutation / passive audit

**Stats:** birth variation persists and meets a basic “same species, different individual” requirement. Risks are multiple exported stat shapes and comments/history that mention changing base totals. Keep the backend total calculation authoritative and add formula tests before any consolidation. Evolution effects were not found as one clearly centralized calculation, so evolution/stat transition behavior needs a dedicated follow-up trace before implementation.

**Mutations:** definitions and individual ownership are relational, assignment is database-side, capacity is enforced, and the frontend can display mutation names. The identity context should expose normalized mutation DTOs. Battle-effect consumption and breeding/inheritance were not demonstrated as complete end-to-end systems in this audit; treat them as missing/unverified hooks, not implemented behavior.

**Passives:** catalog definitions include effects; Kith persist passive identity, and `petsStats.ts` loads effects but deliberately excludes them from base+IV totals. There are both direct pet fields and a join table. Decide whether the product supports one innate passive, multiple unlockable passives, or both, then name those concepts separately. Bond integration should be a later modifier hook, never an implicit edit of stored base stats.

## 11. Database changes required (proposal only)

No migration was created or run. A minimal future design, subject to approval:

### `kith_relationship_summaries`

- `kith_id uuid primary key references pets(id) on delete cascade`
- `trainer_id uuid not null references auth.users(id) on delete cascade`
- categorized counters as non-negative bigint/integer columns
- `last_interaction_at`, `last_visit_at`, `last_care_at`, `updated_at` timestamptz
- optional `bond_policy_version text`
- unique/ownership index on `(trainer_id, kith_id)`; indexes for trainer and recent interaction

### `kith_memories`

- `id uuid primary key`
- `kith_id`, `trainer_id`
- `event_key text`, `event_version smallint`, `occurred_at timestamptz`
- `significance smallint` or reviewed enum
- `source_type text`, `source_id text`, `idempotency_key text`
- small validated `metadata jsonb`
- `retention_class text`
- unique `(kith_id, idempotency_key)`
- indexes `(kith_id, occurred_at desc)` and partial index for important/milestone retention

Migration impact: additive tables/RLS only; no destructive change to `pets`. Existing Alpha Kith receive zeroed summaries lazily or via a bounded backfill from reliable existing records. Do not fabricate historical visits/care. Battle runs may seed lifetime win/loss counters if semantics are verified. Storage growth stays bounded by counters plus a per-Kith recent-event cap; important milestones remain sparse. Exact columns, caps, RLS, and backfill require explicit approval.

## 12. Safe file reorganization

Safe now or in a small reviewed change:

- Consolidate duplicate frontend `PetStage` declarations onto the shared type.
- Add shared API DTO files and migrate one consumer at a time.
- Move archive ZIPs out of runtime source directories after confirming their owner.
- Keep runtime starter portraits in the normalized `startepets/` root and archival art in `old/`.
- Correct stale comments that point to the former `shared/pets/species.ts` path.

Do not move yet:

- `petDialogue.ts` / `selfAware.tsx` until their behavior and tests are separated.
- Passive ownership files until single-versus-multiple passive semantics are decided.
- Personality compatibility fields or any migration.
- Retired species/registry files.
- Any species definition until the duplicate shadow entry’s intended replacement is confirmed.

## 13. Staged implementation plan

1. **Correctness and contracts:** resolve duplicate shadow definition with design approval; inventory API DTOs; add tests around species uniqueness and existing stat/care formulas.
2. **Type/source consolidation:** canonical shared stage/species types and versioned Kith response DTO; regenerate Supabase types after schema confirmation.
3. **Identity context:** backend `KithContextService` that composes existing state without changing behavior; migrate Pet Details first.
4. **Bond foundation:** approve policy concepts and additive schema; preserve current Bond behavior until a versioned transition is specified.
5. **Memory foundation:** approve event vocabulary, idempotency, RLS, aggregation, retention, and migration; instrument one low-risk event end to end.
6. **Care awareness:** central derivation policy using current values/rates; replace duplicated frontend threshold interpretation incrementally.
7. **Personality/context:** combine personality, species profile, care state, Bond, and memory summaries into deterministic presentation selectors.
8. **Gameplay hooks:** integrate battle, training, quests, exploration, evolution, Relics, and special interactions one system at a time with idempotent events.
9. **UI presentation:** expose relationship summaries and important memories in protected existing layouts; no redesign required for foundation validation.
10. **Operations:** measure event volume, compaction, query latency, and retry behavior before broad rollout.

## Audit limits and decisions needed

- Repository migrations describe intended schema, but this audit did not query production Supabase state.
- Exact evolution-stat transformation and full battle consumption of mutations/passives require focused follow-up verification.
- Product decisions required before implementation: intended second shadow starter, passive slot semantics, Bond policy/categories, memory vocabulary/retention, and which historical Alpha data is trustworthy enough to backfill.

