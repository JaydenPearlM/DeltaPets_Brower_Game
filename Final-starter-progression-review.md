# Final starter XP/stat verification

The previous starter-only SQL correction is already present and remains unchanged. Lifetime threshold 50*level*(level+1) is correct: transitions cost100,200,...2900; Level30 requires43500 lifetime XP; two points per newly gained level yields58. Non-starter formula and existing cap behavior are untouched. No new SQL objects or changes this turn.

Eligibility comes from STARTER_SPROUTS: water_starter, fire_starter, earth_starter, air_starter, ice_starter, storm_starter, light_starter, shadow_night_bad, shadow_day_good. Eight elemental lines have nine registered IDs because Shadow has two variants. Both were already included; neither was silently removed.

Inspected: supabase/review/level-2-foundation.proposed.sql; backend/server/src/pets/level2/contracts.ts and service.ts; backend/server/src/routes/pets/level2.ts; backend/server/src/shared/pets/species/starter-species.ts; tools/check-level-2-foundation.cjs. Earlier migration investigation remains documented in Starter-stat-progression-review.md.

Changed this turn: tools/check-level-2-foundation.cjs and Final-starter-progression-review.md. Added all29 threshold boundary cases for each starter; tightened static retry-branch presence assertion (a missing substring previously returned -1 and could pass the ordering check).

Allocation blocker: later points are currently only accumulated in pets.unspent_points, not tracked in a per-earned-level reward ledger. pet_stat_allocations has a per-pet/per-level history row but its level>2 CHECK requires exactly1 point. Level2 receipts correctly remain capped at2. No later-level allocation path can be declared complete. Under the explicit schema stop condition, no constraint was loosened or historical allocation reinterpreted.

Smallest follow-up proposal remains documented in Starter-stat-progression-review.md: earned-level receipts for starter levels3-30, explicit earned-level allocation, species-aware constraint enforcement preserving Kithna, owned-pet and receipt locks, unique request receipts, HP x2 without healing. New ledger/validation objects need separate review; do not extend Level2 receipts to58. Existing historical allocations require individual reconciliation evidence; no inferred grants or destructive recovery. Keep proposals unapplied until isolated testing and recovery review. Universal XP integration remains independently blocked.

Verification: backend build and both Level2 checks run this turn (results recorded below). Static/model checks are not PostgreSQL execution or proof of concurrent behavior. Existing mocked tests cover Level2 budgets, ownership, HTTP502 response handling, historical receipt validity and unmounted router. Saved/accumulated later-level spending is BLOCKED, not tested as working. No SQL, frontend, player data, routes, XP activity contracts or skill rules changed. Branch Core_Systems_version_1 preserved; initial staged files:none; existing modified/untracked work preserved.

Ready for Nova's read-only review of the reward proposal and tests, not activation or a claim of complete Level1-30 allocation.

## Exact replacements

filename: tools/check-level-2-foundation.cjs

linenumber: 16

old_code:
```js
assert.ok(victory.indexOf("IF v_room.event_payload ? 'xpReward'") < victory.indexOf('v_points :='));
```

new_code:
```js
const retryPosition = victory.indexOf("IF v_room.event_payload ? 'xpReward'");
assert.ok(retryPosition >= 0 && retryPosition < victory.indexOf('v_points :='));
```

description: Focused static/model regression coverage; no runtime or SQL behavior changes.

filename: tools/check-level-2-foundation.cjs

linenumber: 26

old_code:
```js
for (const species of starterIds) {

```

new_code:
```js
for (const species of starterIds) {
  // Independent cumulative sum of approved transition costs, including both boundaries.
  let threshold = 0;
  for (let current = 1; current < 30; current++) {
    threshold += 100 * current;
    assert.equal(previewPoints(species, current, threshold - 1), 0);
    assert.equal(previewPoints(species, current, threshold), 2);
    assert.equal(previewPoints(species, current + 1, threshold), 0);
  }
  assert.equal(threshold, 43500);

```

description: Focused static/model regression coverage; no runtime or SQL behavior changes.

Results: PASS pnpm --dir backend/server build; PASS pnpm exec node tools/check-level-2-foundation.cjs; PASS pnpm exec node tools/check-level-2-skill-contract.cjs.
