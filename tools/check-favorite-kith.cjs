// Run: node tools/check-favorite-kith.cjs. No database or player data is accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('../backend/server/node_modules/typescript');
const userId = '11111111-1111-4111-8111-111111111111';
const petId = '22222222-2222-4222-8222-222222222222';
function compile(file, overrides = {}, suffix = '') {
  file = path.resolve(file);
  const original = Module._load;
  Module._load = function(name, parent, ...rest) {
    if (parent?.filename === file && name in overrides) return overrides[name];
    return original.call(this, name, parent, ...rest);
  };
  try {
    const mod = new Module(file, module); mod.filename = file;
    mod.paths = Module._nodeModulePaths(path.dirname(file));
    mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8') + suffix, {
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
    }).outputText, file);
    return mod.exports;
  } finally { Module._load = original; }
}
let calls = [], rpcError = null;
const handlers = compile('backend/server/src/routes/pets/storageActions.ts', {
  '../../middleware/auth': {requireUser() {}},
  '../../lib/logger': {logger: {error() {}}},
  '../../lib/supabaseAdmin': {supabaseAdmin: {
    async rpc(name, args) {calls.push({name, args}); return {data: args.p_favorite, error: rpcError};},
    from(table) {return {select(columns) {return {async eq(key, value) {
      calls.push({table, columns, key, value});
      return {data: [{id: petId, is_favorite: true}], error: rpcError};
    }}}};},
  }},
});
async function request(handler, body, user = {id: userId}) {
  let status = 200, payload;
  await handler({body, user}, {status(n) {status = n; return this;}, json(v) {payload = v; return this;}});
  return {status, payload};
}
const decay = compile('backend/server/src/shared/pets/care/CareDecay.ts', {
  '../../../lib/deltaTime': {getDeltaTime: () => ({phase: 'day'})},
  '../../../lib/utils': {safeNum: (x, fallback = 0) => Number.isFinite(Number(x)) ? Number(x) : fallback},
  '../../constants': compile('backend/server/src/shared/constants.ts'),
}).applyCareDecay;
(async () => {
  const update = handlers.handleFavoriteUpdate, list = handlers.handleFavoriteList;
  assert.equal((await request(update, {petId, favorite: true}, null)).status, 401);
  assert.equal((await request(list, {}, null)).status, 401);
  for (const body of [{}, {petId, favorite: 'true'}, {petId: 'bad', favorite: true},
    {petId, favorite: true, userId: 'someone else'}, {petId, favorite: null}]) {
    assert.equal((await request(update, body)).status, 400);
  }
  assert.equal(calls.length, 0);
  for (const favorite of [true, false]) {
    assert.deepEqual(await request(update, {petId, favorite}), {status: 200, payload: {favorite}});
    assert.deepEqual(calls.at(-1), {name: 'set_kith_favorite', args: {p_user_id: userId, p_pet_id: petId, p_favorite: favorite}});
  }
  assert.equal((await request(list, {})).payload.pets[0].is_favorite, true);
  assert.equal(calls.at(-1).value, userId);
  rpcError = {code: 'P0001', message: 'Kith not found.'};
  assert.deepEqual(await request(update, {petId, favorite: true}), {status: 409, payload: {error: 'Kith not found.'}});
  rpcError = {code: '42703', message: 'secret schema details'};
  for (const handler of [list, update]) {
    const result = await request(handler, {petId, favorite: true});
    assert.equal(result.status, 503); assert(!JSON.stringify(result).includes('secret'));
  }
  const pet = {id: petId, hunger: 0, clean: 0, happy: 0, comfort: 20, rest: 20,
    energy: 50, neglect_hours: 73, ran_away: false,
    last_care_decay_at: new Date(Date.now() - 3600000).toISOString()};
  const normal = decay(pet), favorite = decay({...pet, is_favorite: true});
  assert.equal(normal.ran_away, true); assert.equal(favorite.ran_away, false);
  assert.equal(favorite.runaway_at, null);
  for (const stat of ['hunger','clean','happy','comfort','rest','energy','neglect_hours'])
    assert.equal(favorite[stat], normal[stat], stat);
  assert.equal(decay({...pet, is_favorite: false}).ran_away, true);
  let authDeletes = 0;
  const reset = compile('backend/server/src/routes/debug/debugRoutes.ts', {
    '../../env.server': {env: {NODE_ENV: 'development'}},
    '../../lib/logger': {logger: {warn() {}, error() {}}},
    '../../lib/supabaseAdmin': {supabaseAdmin: {
      async rpc(name) {assert.equal(name, 'reset_test_account_game_data'); return {error: rpcError};},
      from() {throw Error('Reset must not issue partial table deletes');},
      auth: {admin: {async deleteUser(id) {assert.equal(id, userId); authDeletes++; return {error: null};}}},
    }},
  }).debugRouter.stack.find(layer => layer.route?.path === '/self-destruct').route.stack[0].handle;
  const testUser = {id: userId, email: 'jaydenauthentication6790+test123@gmail.com'};
  rpcError = {code: 'P0001', message: 'This account has favorited Kith.'};
  assert.equal((await request(reset, {confirm: 'RESET_MY_TEST_ACCOUNT'}, testUser)).status, 409);
  assert.equal(authDeletes, 0);
  rpcError = {code: 'XX000', message: 'database failure'};
  assert.equal((await request(reset, {confirm: 'RESET_MY_TEST_ACCOUNT'}, testUser)).status, 500);
  assert.equal(authDeletes, 0);
  rpcError = null;
  assert.equal((await request(reset, {confirm: 'RESET_MY_TEST_ACCOUNT'}, testUser)).status, 200);
  assert.equal(authDeletes, 1);
  console.log('PASS Favorite auth/input/ownership forwarding/errors and protected vs ordinary care decay. RPC doubles; database protection is not executed.');
})().catch(e => {console.error(e); process.exitCode = 1;});

