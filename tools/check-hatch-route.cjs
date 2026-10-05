// Handler/auth regression doubles only; NOT PostgreSQL concurrency proof.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const backendRequire = createRequire(path.join(root, 'backend/server/package.json'));
const ts = backendRequire('typescript');
const routes = new Map();
const userId = '11111111-1111-4111-8111-111111111111';
const eggId = '22222222-2222-4222-8222-222222222222';
let calls = [], reads = [], egg, rpcResult;
const stats = { hp: 2, atk: 2, def: 2, spd: 2, magi: 2, mana: 0, base_total: 10 };
const starter = { speciesId: 'test_starter', line: 'fire', hatchlingName: 'Test hatchling', baseStats: stats };
const db = {
  auth: { async getUser(token) { return { data: { user: token === 'valid' ? { id: userId } : null }, error: null }; } },
  from(table) {
    const filters = [];
    const query = {
      select() { return this; }, eq(k, v) { filters.push([k, v]); return this; },
      not() { return this; }, or() { return this; }, order() { return this; }, limit() { return this; },
      async maybeSingle() {
        reads.push({ table, filters });
        return { data: table === 'pets' && egg && filters.every(([k, v]) => egg[k] === v) ? egg : null, error: null };
      },
      // Any mutation outside the single RPC must fail this test.
      update() { throw new Error('Unexpected non-atomic UPDATE'); },
      upsert() { throw new Error('Unexpected non-atomic UPSERT'); },
      insert() { throw new Error('Unexpected non-atomic INSERT'); },
      delete() { throw new Error('Unexpected non-atomic DELETE'); },
    };
    return query;
  },
  async rpc(name, args) { calls.push({ name, args }); return rpcResult; },
};
const express = { Router: () => ({ get(p, ...h) { routes.set('GET '+p,h); }, post(p,...h) { routes.set('POST '+p,h); }, patch() {}, delete() {} }) };
const logger = { info() {}, warn() {}, error() {} };
function load(file, imports) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require','exports',js)(name => {
    assert.ok(Object.hasOwn(imports,name), 'Unexpected import '+name);
    return imports[name];
  }, exports);
  return exports;
}
const auth = load('backend/server/src/middleware/auth.ts', { express, '../lib/supabaseAdmin': { supabaseAdmin: db }, '../lib/logger': { logger } });
load('backend/server/src/routes/routePets/routePets.ts', {
  express, '../../middleware/auth': auth, '../../middleware/validateRequest': { validateBody: () => () => {} },
  '../../lib/supabaseAdmin': { supabaseAdmin: db }, '../../lib/logger': { logger },
  '../../lib/stats/individualValues': { rollIV: n => ({ hp: n, atk: 0, def: 0, spd: 0, magi: 0, mana: 0 }), sumStats: s => Object.values(s).reduce((a,b)=>a+b,0) },
  '../../shared/pets/care/CareDecay': {}, './petDescription': { generatePetDescription: () => 'description' }, './petsRepo': {},
  '../../pets/growthTraits': { sanitizeGrowthStrongStats: () => ['hp'], sanitizeGrowthWeakStat: () => 'atk' },
  '../../pets/personalities': {}, './petsStats': { fetchTotalPoints: async () => null },
  './starters': { STARTERS: [starter], STARTER_NAMES: ['Mystery Egg'] },
  '../../shared/pets/species/all-species': { findNonStarterSpeciesById: () => null, findNonStarterSpeciesByEggName: () => null },
  '../../shared/pets/species/kithna-species': { KITHNA_RARITY_RULES: { epic: { rarityBonusPoints: 3 } } },
  '../../shared/pets/species/voidborne': { isVoidborneLine: () => false },
  '../../shared/pets/species/legendary-species': { VELUNE: { id: 'velune' } }, '../../lib/deltaTime': {},
  './petsType': { HATCH_ALLOCATION_POINTS: 7 }, './petsUtils': { rollGender: () => 'male' },
  '../../lib/petCareHelpers': {}, '../../shared/pets/characterProfiles/characterRegistry': {},
  '../../lib/validation': {}, 'node:crypto': require('node:crypto'),
});
async function request(body, token = 'Bearer valid') {
  calls = []; reads = [];
  const req = { body, headers: { authorization: token } };
  const res = { statusCode: 200, status(n) { this.statusCode=n; return this; }, json(v) { this.body=v; return this; } };
  for (const handler of routes.get('POST /hatch')) { let next=false; await handler(req,res,()=>{next=true;}); if(!next) break; }
  return res;
}
async function main() {
  for(const token of [null, '', 'Bearer invalid']) { assert.equal((await request({eggId},token)).statusCode,401); assert.equal(reads.length,0); assert.equal(calls.length,0); }
  for(const value of ['', 'bad-id', {}, 42]) { assert.equal((await request({eggId:value})).statusCode,400); assert.equal(reads.length,0); }
  egg = { id: eggId, user_id: 'other-user', stage: 'egg' };
  assert.equal((await request({eggId})).statusCode,404); assert.equal(calls.length,0);
  egg = { id: eggId, user_id: userId, stage:'egg', species:starter.speciesId, line:'fire', name:'Mystery Egg', hatch_ends_at:new Date(Date.now()-1000).toISOString(), personality_id:'p', personality_key:'p', passive_trait_key:'existing' };
  rpcResult = { data: [{ success:true, pet_row:{...egg,stage:'hatchling',location:'active',is_active:true},party_slot_assigned:1,trainer_level:1,active_gameplay_locked:false }], error:null };
  let res=await request({eggId,userId:'spoofed'});
  assert.equal(res.statusCode,200); assert.equal(calls.length,1); assert.equal(calls[0].name,'hatch_pet'); assert.equal(calls[0].args.p_user_id,userId);
  assert.deepEqual(calls[0].args.p_hatch_context.base_stats,stats); assert.equal(res.body.party_slot_assigned,1);
  rpcResult={data:[{success:false,error_message:'Egg already completed'}],error:null};
  assert.equal((await request({eggId})).statusCode,409); assert.equal(calls.length,1);
  rpcResult={data:null,error:{message:'Simulated database failure'}};
  assert.equal((await request({eggId})).statusCode,500); assert.equal(calls.length,1);
  egg.stage='hatchling'; assert.equal((await request({eggId})).statusCode,404); assert.equal(calls.length,0);
  console.log('PASS hatch handler/auth/malformed/ownership/replay/error regression doubles. NOT database concurrency proof.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
