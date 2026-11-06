// Isolated TypeScript/service tests. No network or database calls.
const assert = require('node:assert/strict');
const Module = require('node:module');
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
const retryPosition = victory.indexOf("IF v_room.event_payload ? 'xpReward'");
assert.ok(retryPosition >= 0 && retryPosition < victory.indexOf('v_points :='));
assert.ok(victory.includes('FOR UPDATE OF room') && victory.includes('user_id = p_user_id FOR UPDATE'));
assert.ok(proposal.trimEnd().endsWith('ROLLBACK;'));
function previewPoints(species, level, xp) {
  let next = level;
  while (next < 30 && xp >= 50 * next * (next + 1)) next++;
  return starterIds.includes(species) ? 2 * (next - level)
    : next - level + (level < 2 && next >= 2 ? 1 : 0);
}
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
assert.ok(proposal.includes('PRIMARY KEY (pet_id, level)'));
assert.ok(proposal.includes('CREATE TRIGGER guard_starter_allocation AFTER INSERT OR UPDATE'));
assert.ok(proposal.includes('r.points_spent=NEW.hp+NEW.atk+NEW.magi+NEW.def+NEW.spd+NEW.mana'));
assert.ok(proposal.includes('generate_series(greatest(3,v_pet.level+1),v_level)'));
assert.ok(proposal.includes('IF total_cost > 2-reward.points_spent'));
assert.ok(proposal.includes('pet.unspent_points < total_cost'));
const contracts = require('../backend/server/dist/pets/level2/contracts.js');
const allocation = { hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 };
assert.equal(contracts.allocationCost({ ...allocation, hp: 2 }, 2, 0), 2);
assert.equal(contracts.allocationCost({ ...allocation, hp: 1, atk: 1 }, 2, 0), 2);
assert.equal(contracts.allocationCost({ ...allocation, mana: 1 }, 1, 1), 1);
for (const bad of [allocation, { ...allocation, hp: -1 }, { ...allocation, hp: 0.5 },
  { ...allocation, hp: '1' }, { ...allocation, hp: 2, atk: 1 }, { ...allocation, hp: 1, owner: 'forged' }]) {
  assert.throws(() => contracts.allocationSchema.parse(bad));
}
assert.throws(() => contracts.allocationCost({ ...allocation, hp: 1 }, 0, 0));
assert.throws(() => contracts.allocationCost({ ...allocation, hp: 1 }, 1, 2));
const design = contracts.getLevel2Design('earth_starter', 'earth');
assert.equal(design.candidates.length, 4);
assert.equal(design.combatEnabled, false);
assert.deepEqual(design.candidates.map(c => c.role), ['tank', 'healer', 'dps', 'sorcerer']);
assert.equal(contracts.getLevel2Design('water_starter', 'water'), null);
assert.equal(contracts.getLevel2Design('earth_starter', 'fire'), null);
assert.equal(contracts.getLevel2Design('unknown', 'earth'), null);
assert.throws(() => contracts.choiceRequestSchema.parse({ skillSlug: 'root-brace', userId: 'forged' }));
assert.throws(() => contracts.allocationRequestSchema.parse({ requestId: 'bad', allocation: { ...allocation, hp: 1 } }));

const owner = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const skillId = '33333333-3333-4333-8333-333333333333';
const pet = { id, user_id: owner, species: 'earth_starter', line: 'earth', level: 2,
  unspent_points: 2, hp_max: 10, hp_cur: 6, atk: 3, magi: 3, def: 3, spd: 3, mana: 3 };
let rpcError = null;
let rpcCalls = [];
let rpcData = { skill_id: skillId, milestone_key: 'level-2' };
let petData = pet;
const fake = {
  from(table) {
    assert.equal(table, 'pets');
    const filters = {};
    return {
      select() { return this; }, eq(key, value) { filters[key] = value; return this; },
      async maybeSingle() {
        assert.ok(filters.user_id, 'ownership must be included in the database filter');
        return { data: filters.user_id === owner && filters.id === id ? petData : null, error: null };
      },
    };
  },
  async rpc(name, args) {
    rpcCalls.push({ name, args });
    return { data: rpcError ? null : rpcData, error: rpcError };
  },
};
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === '../../lib/supabaseAdmin') return { supabaseAdmin: fake };
  return load.call(this, name, parent, main);
};
const service = require('../backend/server/dist/pets/level2/service.js');
Module._load = load;
async function main() {
  await assert.rejects(service.chooseLevel2(skillId, id, { skillSlug: 'root-brace' }), /Kith not found/);
  assert.equal(rpcCalls.length, 0);
  const first = await service.chooseLevel2(owner, id, { skillSlug: 'root-brace' });
  const retry = await service.chooseLevel2(owner, id, { skillSlug: 'root-brace' });
  assert.deepEqual(first, retry);
  assert.deepEqual(rpcCalls[0], { name: 'claim_level2_skill', args: { p_user_id: owner, p_pet_id: id, p_skill_slug: 'root-brace' } });
  rpcError = { code: 'P0001', message: 'L2_CONFLICT' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'pollen-puff' }), error => error.statusCode === 409);
  rpcError = { code: 'PGRST202', message: 'missing function' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 503);
  const before = rpcCalls.length;
  await assert.rejects(service.allocateLevel2(owner, id, { requestId: id, allocation: { ...allocation, hp: 59 } }));
  assert.equal(rpcCalls.length, before);
  rpcError = null;
  rpcData = { skill_id: 'invalid', milestone_key: 'level-2' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }),
    error => error.statusCode === 502 && error.code === 'L2_INVALID_RESPONSE');
  petData = { ...pet, user_id: skillId };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 502);
  petData = { ...pet, hp_max: 'invalid' };
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace' }), error => error.statusCode === 502);
  petData = { ...pet, level: 30, unspent_points: 58 };
  const accumulated = { requestId: id, allocation: { ...allocation, hp: 3, mana: 2 } };
  rpcData = { request_id: id, pet_id: id, spent: 5, unspent_points: 53,
    hp_max: 16, hp_cur: 6, atk: 3, magi: 3, def: 3, spd: 3, mana: 5 };
  const saved = await service.allocateLevel2(owner, id, accumulated);
  assert.equal(saved.unspent_points, 53);
  petData = { ...petData, unspent_points: 53, hp_max: 16, mana: 5 };
  assert.deepEqual(await service.allocateLevel2(owner, id, accumulated), saved);
  petData = { ...petData, species: 'kithna_shade' };
  const callsBeforeNonStarter = rpcCalls.length;
  await assert.rejects(service.allocateLevel2(owner, id, accumulated), error => error.name === 'ZodError');
  assert.equal(rpcCalls.length, callsBeforeNonStarter);
  petData = pet;
  const request = { requestId: skillId, allocation: { ...allocation, hp: 1 } };
  const receipt = { request_id: skillId, pet_id: id, spent: 1, unspent_points: 1,
    hp_max: 12, hp_cur: 6, atk: 3, magi: 3, def: 3, spd: 3, mana: 3 };
  rpcData = receipt;
  assert.deepEqual(await service.allocateLevel2(owner, id, request), receipt);
  // A historical receipt stays valid after a later allocation changes current stats.
  petData = { ...pet, unspent_points: 0, hp_max: 12, atk: 4 };
  assert.deepEqual(await service.allocateLevel2(owner, id, request), receipt);
  petData = pet;
  for (const bad of [{ ...receipt, pet_id: owner }, { ...receipt, request_id: owner },
    { ...receipt, spent: 2 }, { ...receipt, atk: -1 }, null]) {
    rpcData = bad;
    await assert.rejects(service.allocateLevel2(owner, id, request), error => error.statusCode === 502);
  }
  await assert.rejects(service.chooseLevel2(owner, id, { skillSlug: 'root-brace', owner }),
    error => error.name === 'ZodError'); // Router maps client-input ZodError to 400.
  assert.equal(pet.hp_cur, 6); // Service never mutates combat stats locally.
  assert.equal(contracts.localAllocationEnabled('production', 'true', 'http://localhost:54321'), false);
  assert.equal(contracts.localAllocationEnabled('development', 'true', 'https://shared.supabase.co'), false);
  assert.equal(contracts.localAllocationEnabled('development', undefined, 'http://localhost:54321'), false);
  assert.equal(contracts.localAllocationEnabled('development', 'true', 'http://127.0.0.1:54321'), true);
  const history = [{ level: 2, points_awarded: 2, points_spent: 1 }];
  const allocations = [{ level: 2, ...allocation, hp: 1 }];
  assert.equal(contracts.allocationHistoryStatus(2, 1, history, allocations).availablePoints, 1);
  assert.deepEqual(contracts.allocationHistoryStatus(3, 3, history, allocations).missingLevels, [3]);
  assert.equal(contracts.allocationHistoryStatus(3, 3, history, allocations).availablePoints, 0);
  assert.equal(contracts.allocationHistoryStatus(2, 0, history, allocations).status, 'reconciliation_required');
  assert.equal(contracts.allocationHistoryStatus(2, 1, history, []).status, 'reconciliation_required');
  console.log('PASS: allocation validation/budgets, species eligibility, ownership filtering, RPC delegation, conflict/unavailable errors, invalid database responses (502), receipt binding, unchanged local HP, production route disabled, local opt-in, reconciliation diagnostics.');
  console.log('NOTE: retry result mocked; database atomicity/concurrency/persistence still require approved integration testing.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
