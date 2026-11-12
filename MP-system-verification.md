# MP implementation and skill verification — 2026-11-07

Status: approved Wildwood MP behavior implemented. Element Strike is physical and free; Mend costs 1 MP, per the user's follow-up. Branch remained `Core_Systems_version_1`.

## Implemented

- Maximum MP = (base Mana + level-one IV/earned allocations + passive Mana) × 3, using a shared helper. MAGI and HP formulas are unchanged.
- New Wildwood participants start with separate `mpMax` and `mpCur`. Existing room JSON persistence stores these fields without a migration.
- Both Skills Chambers use the shared formula. When a battle snapshot exists, the chamber uses its current/max MP and proportional bar. Without current MP it labels capacity only and does not draw a full resource bar.
- Battle cards show current/max MP. Old snapshots show unavailable MP and are not refilled or rewritten during recovery.
- Element Strike uses ATK and costs no MP, preserving its existing power and elemental multipliers. Mend uses MAGI and spends exactly 1 MP after server validation. Insufficient or unknown MP rejects the cast without changing state or consuming a turn.

## Follow-up replacements and verification

These current line references supersede shifted line numbers in the original implementation table below.

- `backend/server/src/shared/battle/mana.ts:1`: added `export const MEND_MP_COST = 1;` (helper now starts at line 4).
- `backend/server/src/battle/battleEngine.ts:116`: added `requireRule(hasBattleMp(actor), "MP is unavailable for this older battle. Finish it with Attack or Guard.");` and `requireRule(actor.mpCur >= MEND_MP_COST, "Not enough MP. Mend requires 1 MP.");`; line 121 adds `actor.mpCur -= MEND_MP_COST;` immediately before healing. Line 130 changes `useMagi: skill, elemental: skill,` to `useMagi: false, elemental: skill,`.
- `frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx:82`: added `const canMend = Boolean(actor && hasBattleMp(actor) && actor.mpCur >= MEND_MP_COST);`; target selection and submission check this at lines 88/93. Lines 272–273 label Element Strike physical/0 MP and Mend 1 MP, disabling unavailable Mend. The battle MP display is now line 210.
- `frontend/web/src/components/Skills/skillsRegistry.ts:33`: Element Strike description becomes `A level 1 physical elemental attack using ATK. Costs no MP.`; line 47 changes Mend description to `Restores health using MAGI. Costs 1 MP.`.
- `frontend/web/src/components/skillChamber/skillChamber.tsx:264`: replaced its Element Strike description override with the same physical/free description.
- `tools/check-battle-engine.cjs:216`: tests distinct ATK/MAGI values at zero MP and verifies existing elemental damage; line 223 tests Mend cost, rejected targets, insufficient MP, replay and serialized recovery. Test fixtures now include MP, with explicit missing fields for legacy cases.
- `tools/check-wildwood-integration.cjs:157`: concurrent Mend requests in the repository double yield one success, spend 1 MP, preserve the balance on recovery, and reject stale replay; invalid-target calls leave persisted mock state unchanged.

Both required builds, all 14 engine checks, isolated Wildwood integration checks, the level-2 skill contract, and `git diff --check` pass after the follow-up. The ATK regression test failed against the previous engine before implementation. No live database or browser-layout verification was performed.

## Changed files and exact replacements

Line numbers refer to the resulting working files. Earlier user edits to portraits, CSS, passive loading, and Wildwood stats were preserved; they are not attributed to this task.

| File | Resulting line | Change |
|---|---:|---|
| `backend/server/src/shared/battle/mana.ts` | 2 | New `maximumMp(savedMana, passiveMana = 0)`; validates numeric inputs and returns `Math.max(0, savedMana + passiveMana) * 3`. Lines 10–15 add optional legacy MP shape and bounded-current validation. |
| `backend/server/src/battle/battleTypes.ts` | 21 | Added `mpMax?: number; mpCur?: number;` after `hpCur`. Optional fields preserve old snapshots. |
| `backend/server/src/battle/battleEngine.ts` | 26 | Added `mpMax: statSchema.optional(), mpCur: statSchema.optional(),`. At line 33 added pair/bounds validation after existing HP validation. Action execution unchanged. |
| `backend/server/src/routes/routePets/petsStats.ts` | 183 | `return { base, alloc, total, total_points, hp_display };` → `return { base, alloc, total, total_points, hp_display, mpMax: maximumMp(total.mana, passiveEffects.mana ?? 0) };` plus helper import at line 5. |
| `backend/server/src/routes/cities/kithna/wildwoodBattleService.ts` | 390 | Added missing-Mana error after `fetchTotalPoints`; at 408 added `mpMax: points.mpMax, mpCur: points.mpMax,`; at 451 added enemy `mpMax: maximumMp(base.mana + iv.mana)!, mpCur: maximumMp(base.mana + iv.mana)!,`. Import added at line 7. |
| `frontend/web/src/components/skillChamber/skillChamber.tsx` | 486 | Replaced pre-task capacity calculation with the exact block below; added shared import at 14, `battleMp?: BattleMp` at 17 and destructuring at 427. |
| `frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodSkillsChamber.tsx` | 13 | Added optional `battleMp` prop and forwarded `battleMp={battleMp}` at 76; imported its shared type. |
| `frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx` | 477 | Added `battleMp={room?.battle?.participants.find(pet => pet.id === chamberPet?.id)}` to the existing chamber. |
| `frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx` | 208 | Added `<span>{hasBattleMp(pet) ? \`${pet.mpCur} / ${pet.mpMax} MP\` : "MP unavailable"}</span>` and helper import at 2. |
| `tools/check-battle-engine.cjs` | 184 | Added formula/passive/invalid-data tests and MP bounds, serialization, free-action, rejected-action and replay tests. |
| `tools/check-wildwood-integration.cjs` | 15 | Added Mana/passive fixtures; at 132 verifies `(2 + 1 + 2) × 3 = 15`; at 146 verifies initial and recovered battle MP of 9 without the passive. |

Chamber calculation before this task:

```ts
const maxMp = manaStatus === "ready" && typeof savedMana === "number" && Number.isFinite(savedMana)
  && typeof passiveMana === "number" && Number.isFinite(passiveMana)
  ? Math.max(0, savedMana + passiveMana) : null;
```

Replacement at line 486:

```ts
const resource = battleMp && hasBattleMp(battleMp) ? battleMp : null;
const maxMp = battleMp ? resource?.mpMax ?? null
  : manaStatus === "ready" ? maximumMp(savedMana, passiveMana) : null;
const mpLabel = resource ? `${resource.mpCur} / ${resource.mpMax}`
  : battleMp ? "MP unavailable"
    : manaStatus === "loading" ? "Loading MP…" : `Max ${maxMp ?? "Unavailable"}`;
```

Chamber bar at lines 584–590:

```tsx
// Old aria-label: `Maximum MP: ${maxMp ?? "unavailable"}`
// New aria-label:
aria-label={`MP: ${mpLabel}`}
// Old width: maxMp !== null && maxMp > 0 ? "100%" : "0%"
// New width:
style={{ width: resource && resource.mpMax > 0
  ? `${resource.mpCur / resource.mpMax * 100}%` : "0%" }}
// Old small text: loading message or `Max ${maxMp ?? "Unavailable"}`
<small>{mpLabel}</small>
```

## Formula evidence

`fetchTotalPoints` sums base and allocations from level 1 onward, keeping passive modifiers separate. Its existing passive-trait lookup is reused exactly once for MP. The hatch SQL inspected stores base + IV in `pets.mana`, without passive Mana. The storage UI reads this saved Mana and the existing care endpoint supplies passive metadata.

Tests confirm effective Mana 5 → 15 MP, 2 → 6, 1 → 3, 0 → 0; base 2 + allocation 1 + passive 2 → 15. No species values are hardcoded. Existing HP ×2 and MAGI remain unchanged. Talent-tree Mana percentages are catalog definitions, not activated battle passives; this change does not enable them.

## Skills audit

| Skill/action | Existing Wildwood behavior and verification | MP status |
|---|---|---|
| Basic attack | All player participants on their turn; living enemy target; ATK damage, power 1, no elemental multiplier. Regression tests pass. | Free; MP unchanged, tested. |
| Guard | Self defensive action; guarding raises effective defense ×1.35, expires at next actor turn. Turn order/expiry tests pass. | Existing free command preserved; MP unchanged, tested. |
| Element Strike (`basic-strike`) | All player participants; living enemy; ATK ×1.25 with existing elemental multiplier and defense subtraction. No cooldown implemented. Cast/rejection tests pass. | Physical attack; free, tested at zero MP. |
| Mend | All player participants; living ally/self; `round(max(4, round(MAGI ×1.25 + level ×2)) × titleMultiplier)`; clamps to HP maximum. No cooldown implemented. Cast/target/clamp tests pass. | Costs 1 MP; successful, insufficient, invalid, replay and recovery paths tested. |
| Hatchling species skill | Catalog eligibility level 5; no executable Wildwood action. | Blocked: no executable definition/cost. |
| Lowform species skill | Catalog stage rank ≥2; no executable Wildwood action. | Blocked: no executable definition/cost. |
| Highform species skill | Catalog stage rank ≥3; no executable Wildwood action. | Blocked: no executable definition/cost. |
| Legion species skill | Catalog stage rank ≥4; no executable Wildwood action. | Blocked: no executable definition/cost. |
| Mythical Legendary species skill | Catalog stage rank ≥5; no executable Wildwood action. | Blocked: no executable definition/cost. |
| Root Brace | Twiglet level-2 Earth tank draft; combat disabled. | Cost, defense amount, target, duration and other execution values undecided. |
| Sprout Mend | Twiglet level-2 Earth healer draft; combat disabled. | Cost, healing, target and other execution values undecided. |
| Seed Tap | Twiglet level-2 Earth physical DPS draft; combat disabled. | Cost, damage, target and other execution values undecided. |
| Pollen Puff | Twiglet level-2 Earth ranged magic draft; combat disabled. | Cost, damage, target and other execution values undecided. |

Wildwood accepts only `basic-strike` and `mend` as special-skill IDs. No draft/progression/talent abilities were enabled. Rejected actions use a cloned snapshot; stale turn rejection and the existing room revision comparison remain unchanged. Mocked integration tests cover foreign battle rejection and concurrent/repeated requests, but not live authentication or PostgreSQL concurrency.

Element Strike now uses ATK in battle as requested. Existing chamber numeric previews still differ from full executable damage/healing/guard formulas (including defense, multipliers and clamps); those preview formulas were not redesigned. No new damage values were invented.

The separate legacy PvE route was inspected, not modified or runtime-tested: it has `element_strike`, `mend`, and `weaken`, also without MP costs. Its elemental strike applies burn/slow/turn-meter/weaken/self-heal effects by element; Wildwood's extracted engine applies elemental multipliers only. No cross-engine behavior was copied or redesigned.

## Checks executed

All exited 0:

- `pnpm --dir backend/server build`
- `pnpm --dir frontend/web build`
- `node tools/check-battle-engine.cjs` — 14 checks
- `node tools/check-wildwood-integration.cjs` — isolated repository double, no database
- `node tools/check-level-2-skill-contract.cjs`
- `git diff --check`

Not verified: browser/mobile visual rendering; production database, real concurrency, live authentication. Legacy snapshots have unknown MP rather than an inferred balance: Mend is rejected, while free actions still work. No cross-battle pet MP resource was added. Draft/progression skills remain combat-disabled and unimplemented.

Additional inspected files: repository AGENTS.md and package manifests; battleMath.ts; shared/battle/wildwoodTypes.ts; care.ts passive hydration; usePetStorage.ts Mana mapping; skillsRegistry.ts; skillChoiceDraft.ts; talentTreeRegistry.ts and feralSkillRegistry.ts; level2/contracts.ts and service.ts; Twiglet draft contract via its existing test; existing hatch SQL (read-only); frontend tsconfig.

No database commands, migrations, dependency additions, commits, pushes, merges or deployments were performed. Pre-existing artwork/CSS/stat changes remain untouched. No outstanding cost decision remains for the two executable Wildwood skills. The separate legacy PvE route remains outside this implementation.
