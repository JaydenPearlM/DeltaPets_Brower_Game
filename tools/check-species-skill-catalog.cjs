const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const root = '../backend/server/src/shared/pets/characterProfiles/';
const catalog = require(root + 'skillCatalog.json');
const hashes = require('./species-skill-profile-hashes.json');
const { resolveProfileSkills } = require('../backend/server/dist/shared/pets/characterProfiles/skillCatalog.js');
const { createBattle, resolveBattleAction } = require('../backend/server/dist/battle/battleEngine.js');
const referenced = new Set();
for (const dir of ['starters', 'kithna']) {
  for (const file of fs.readdirSync(require('node:path').resolve(__dirname, root, dir))) {
    if (!file.endsWith('.json')) continue;
    const raw = require(root + dir + '/' + file);
    const resolved = resolveProfileSkills(raw);
    // Full pre-consolidation profile parity, including descriptions, nulls and progression.
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(resolved)).digest('hex'), hashes[raw.species_key]);
    function visit(value) {
      if (!value || typeof value !== 'object') return;
      if (value.catalog_skill_id) {
        assert(!referenced.has(value.catalog_skill_id));
        referenced.add(value.catalog_skill_id);
      }
      for (const item of Object.values(value)) visit(item);
    }
    visit(raw);
    assert.throws(() => resolveProfileSkills({ ...raw, progression: { catalog_skill_id: 'missing/skill' } }));
    assert.throws(() => resolveProfileSkills({ ...raw, species_ids: ['wrong-species'] }));
  }
}
assert.equal(Object.keys(hashes).length, 13);
assert.equal(referenced.size, catalog.skills.length);
const participant = (id, side) => ({ id, side, speciesId: 'earth_starter', name: id,
  row: 'middle', element: 'earth', level: 10, hpMax: 100, hpCur: 100,
  mpMax: 30, mpCur: 30, atk: 8, def: 4, magi: 8, spd: 4 });
const state = createBattle('catalog', [participant('p', 'player'), participant('e', 'enemy')]);
const before = structuredClone(state);
for (const entry of catalog.skills) {
  assert(referenced.has(entry.catalog_id));
  if (entry.approval_status !== 'pending') continue;
  assert.equal(entry.implementation_status, 'not_executable');
  assert.throws(() => resolveBattleAction(state, { actorId: state.activeParticipantId,
    turnNumber: state.turnNumber, action: 'skill', skillId: entry.skill_id, targetId: 'e' }));
  assert.deepEqual(state, before);
}
console.log(`PASS: ${catalog.skills.length} definitions, 13 unchanged resolved profiles, invalid references and every pending battle skill rejected.`);
