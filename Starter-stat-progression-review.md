# Starter stat progression review

## Result

Unapplied Wildwood reward calculation now grants starter Kith 2 points per newly gained level, including multi-level jumps (58 total from Level1 to30). Lifetime XP thresholds, cap30, 25XP victory amount, room retry receipt, ownership/locks and transaction boundaries remain unchanged. Non-starters retain the prior proposal formula: level delta plus one extra when crossing Level2. No automatic stat assignment, skill grant or healing.

Starter identity uses exact STARTER_SPROUTS speciesId values from backend/server/src/shared/pets/species/starter-species.ts: water_starter, fire_starter, earth_starter, air_starter, ice_starter, storm_starter, light_starter, shadow_night_bad, shadow_day_good. Tests compare the SQL list against the compiled authoritative registry and check every current Kithna non-starter. Element alone never qualifies. Future registry changes require explicit proposal review; the static test detects list drift.

## Allocation blocker and smallest follow-up proposal

The current pet_stat_allocations table has one row per (pet_id, level), but its constraint requires exactly ONE point at levels above2. It cannot currently store two points or partial spending for those levels. The aggregate pets.unspent_points does not identify each earned level's remaining entitlement. The separate pet_level2_rewards receipt tracks only Level2 and correctly caps that allocation RPC at two points total, even when later points exist. Leave that RPC, its checks, HP x2 conversion, current HP, 502 handling and receipt-integrity protections unchanged.

Do not widen the global constraint to 2 for all species: that would change Kithna behavior. Proposed follow-up (design only, no new objects added): retain Level2 receipts and add a service-only, RLS-protected per-pet/per-earned-level entitlement ledger for starter levels3-30, with a unique (pet_id, earned_level), pet FK, awarded2 and spent0..2. Insert receipts only for newly crossed starter levels within the existing locked victory transaction. A separately reviewed allocation RPC must select an earned-level entitlement explicitly, lock the owned pet and entitlement, enforce both its remaining budget and aggregate balance, update the corresponding allocation row, and persist a unique retry receipt atomically. Preserve the existing one-point non-starter path. A species-aware database validation trigger would be needed alongside any relaxed row CHECK, since a CHECK cannot safely read the owning pet's species. It must retain Level1/Level2 behavior and reject unsupported later-level writes rather than weaken Kithna constraints.

This requires new database objects and a later-level allocation contract, so it is documented rather than implemented under the stop condition. Existing later-level allocations cannot be retroactively treated as receipt-backed without evidence. No backfill, conversion, deletion or inferred extra points. Review existing writers and historical rows before approving that proposal. Recovery: keep it unapplied until reviewed and isolated tests prove atomic rollback; deployment would require separately planned recovery without deleting accrued entitlements. The current reward-only patch is not a complete later-level spending feature and must not be activated alone as one.

## Verification

PASS: pnpm --dir backend/server build
PASS: pnpm exec node tools/check-level-2-foundation.cjs (rerun after adding all authoritative Kithna identifiers)
PASS: pnpm exec node tools/check-level-2-skill-contract.cjs

Static proposal checks cover exact starter IDs, unchanged non-starter formula, shared persisted/reported point calculation, lifetime threshold/cap, locked ownership, retry-return before reward code and final ROLLBACK. Arithmetic model covers Level1->2,2->3,29->30, cap, multilevel jumps and58 total. Existing mocked tests still cover saved/individual Level2 spending, overspend, ownership, historical receipts and response validation. These checks do not execute SQL or prove runtime database concurrency/rollback. HP conversion and unchanged current HP verified by inspection of untouched allocation SQL. Existing-player reconciliation remains unchanged. No SQL, live-player, UI or gameplay tests executed.

## Changed files

- supabase/review/level-2-foundation.proposed.sql
- tools/check-level-2-foundation.cjs
- Starter-stat-progression-review.md (this document)
- backups/level2-before-starter-progression.json (pre-edit snapshots)

Branch Core_Systems_version_1 preserved; no staged changes initially. All pre-existing work preserved. No applied migrations, frontend, skills, runtime backend source, XP-source contracts, player records or route mounts changed. Universal XP integration remains separately blocked. Ready for Nova's next read-only review of this limited reward proposal; not ready for activation. Later-level allocation/schema proposal needs separate approval and isolated testing.

## Exact replacements

Current line numbers; exact original and complete replacement blocks below.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 319

old_code:
```
  v_xp integer;
```

new_code:
```
  v_xp integer;
  v_points integer;
```

description: Starter-only reward calculation; retains non-starter behavior and existing transaction/receipt protections.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 375

old_code:
```
  END LOOP;
```

new_code:
```
  END LOOP;
  -- Exact STARTER_SPROUTS species IDs, not elemental-line eligibility.
  v_points := CASE WHEN v_pet.species = ANY (ARRAY[
    'water_starter','fire_starter','earth_starter','air_starter','ice_starter',
    'storm_starter','light_starter','shadow_night_bad','shadow_day_good'
  ]) THEN 2 * (v_level - v_pet.level)
  ELSE (v_level - v_pet.level) + CASE WHEN v_pet.level < 2 AND v_level >= 2 THEN 1 ELSE 0 END END;
```

description: Starter-only reward calculation; retains non-starter behavior and existing transaction/receipt protections.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 388

old_code:
```
    'pointsEarned', (v_level - v_pet.level) + CASE WHEN v_pet.level < 2 AND v_level >= 2 THEN 1 ELSE 0 END
```

new_code:
```
    'pointsEarned', v_points
```

description: Starter-only reward calculation; retains non-starter behavior and existing transaction/receipt protections.

filename: supabase/review/level-2-foundation.proposed.sql

linenumber: 391

old_code:
```
    unspent_points = unspent_points + ((v_level - v_pet.level) + CASE WHEN v_pet.level < 2 AND v_level >= 2 THEN 1 ELSE 0 END)
```

new_code:
```
    unspent_points = unspent_points + v_points
```

description: Starter-only reward calculation; retains non-starter behavior and existing transaction/receipt protections.

filename: tools/check-level-2-foundation.cjs

linenumber: 4

old_code:
```
const fs = require('node:fs');
```

new_code:
```
const fs = require('node:fs');
// Static proposal checks plus arithmetic cases; these do not execute PostgreSQL.
const { STARTER_SPROUTS } = require('../backend/server/dist/shared/pets/species/starter-species.js');
const proposal = fs.readFileSync('supabase/review/level-2-foundation.proposed.sql', 'utf8');
const victory = proposal.split('CREATE OR REPLACE FUNCTION public.settle_wildwood_victory_xp')[1];
const starterIds = [...victory.match(/v_pet.species = ANY \(ARRAY\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
assert.deepEqual(starterIds.sort(), STARTER_SPROUTS.map(starter => starter.speciesId).sort());
assert.ok(victory.includes('THEN 2 * (v_level - v_pet.level)'));
assert.ok(victory.includes('ELSE (v_level - v_pet.level) + CASE WHEN v_pet.level < 2 AND v_level >= 2 THEN 1 ELSE 0 END END;'));
assert.ok(victory.includes("'pointsEarned', v_points"));
assert.ok(victory.includes('unspent_points = unspent_points + v_points'));
assert.ok(victory.includes('WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1)'));
assert.ok(victory.indexOf("IF v_room.event_payload ? 'xpReward'") < victory.indexOf('v_points :='));
assert.ok(victory.includes('FOR UPDATE OF room') && victory.includes('user_id = p_user_id FOR UPDATE'));
assert.ok(proposal.trimEnd().endsWith('ROLLBACK;'));
function previewPoints(species, level, xp) {
  let next = level;
  while (next < 30 && xp >= 50 * next * (next + 1)) next++;
  return starterIds.includes(species) ? 2 * (next - level)
    : next - level + (level < 2 && next >= 2 ? 1 : 0);
}
for (const species of starterIds) {
  for (const [level, xp, expected] of [[1, 99, 0], [1, 100, 2], [2, 300, 2],
    [29, 43500, 2], [30, 50000, 0], [1, 600, 6], [1, 43500, 58]]) {
    assert.equal(previewPoints(species, level, xp), expected);
  }
}
const { KITHNA_NON_STARTER_SPECIES } = require('../backend/server/dist/shared/pets/species/kithna-species.js');
for (const species of [...KITHNA_NON_STARTER_SPECIES.map(entry => entry.id), 'earth', 'unknown']) {
  assert.ok(!starterIds.includes(species));
  assert.equal(previewPoints(species, 1, 100), 2);
  assert.equal(previewPoints(species, 2, 300), 1);
  assert.equal(previewPoints(species, 1, 600), 4);
}
```

description: Static SQL contract checks and arithmetic cases with authoritative species registries; no database execution.
