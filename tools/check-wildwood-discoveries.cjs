// Offline catalog and HTTP-handler contracts. Does NOT execute SQL or prove DB locking.
// Run after: pnpm --dir backend/server build
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const originalLoad = Module._load;
const user = '11111111-1111-4111-8111-111111111111';
const roomId = '22222222-2222-4222-8222-222222222222';
const calls = [];
let randomIndex = 0;
let readiness;
let readinessError = null;
let claimError = null;
let claimResult;
const auth = (_req, _res, next) => next();
Module._load = function(request, parent, isMain) {
  if (request === 'node:crypto') return { ...originalLoad.apply(this, arguments), randomInt: length => {
    assert.equal(length, 24); return randomIndex;
  } };
  if (request.endsWith('/lib/supabaseAdmin')) return { supabaseAdmin: { rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === 'wildwood_discovery_readiness') return { data: readiness, error: readinessError };
    assert.equal(name, 'claim_wildwood_discovery');
    assert.equal(args.p_user_id, user);
    assert.equal(args.p_room_id, roomId);
    assert.deepEqual(Object.keys(args).sort(), ['p_item_slug', 'p_room_id', 'p_user_id']);
    return { data: claimResult, error: claimError };
  } } };
  if (request.endsWith('/middleware/auth')) return { requireUser: auth };
  if (request.endsWith('/middleware/validateRequest')) return { validateBody: () => auth };
  if (request.endsWith('/lib/logger')) return { logger: { error() {} } };
  if (request.endsWith('/battle/battleEngine')) return { BattleRuleError: class extends Error {} };
  if (request === './wildwoodBattleService') return { WildwoodError: class extends Error {} };
  if (request === './wildwoodState') return {};
  return originalLoad.apply(this, arguments);
};
const service = require('../backend/server/dist/routes/cities/kithna/wildwoodDiscoveries.js');
const { wildwoodRouter } = require('../backend/server/dist/routes/cities/kithna/wildwood.js');
Module._load = originalLoad;

async function invoke(path, body = {}) {
  const route = wildwoodRouter.stack.find(layer => layer.route?.path === path).route;
  assert.equal(route.stack[0].handle, auth, 'Authentication must remain on every discovery route');
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await route.stack.at(-1).handle({ body, user: { id: user } }, response);
  return response;
}

(async () => {
  const catalog = service.getWildwoodDiscoveryCatalog();
  assert.equal(catalog.length, 24);
  assert.equal(new Set(catalog.map(item => item.slug)).size, 24);
  assert.equal(catalog.filter(item => item.category === 'relic').length, 8);
  assert.equal(catalog.filter(item => item.category === 'etching').length, 16);
  assert(catalog.every(item => !item.slug.endsWith('-delta')));
  assert.throws(() => service.selectWildwoodDiscovery([]));
  for (randomIndex = 0; randomIndex < 24; randomIndex++)
    assert.equal(service.selectWildwoodDiscovery(catalog), catalog[randomIndex]);
  randomIndex = 3;
  delete process.env.WILDWOOD_ITEM_COLLECTION_ENABLED;
  assert.equal((await invoke('/discoveries/status')).body.enabled, false);
  assert.equal((await invoke('/collect-item', { roomId })).statusCode, 503);
  assert.equal(calls.length, 0, 'Disabled rewards must never call the database');
  process.env.WILDWOOD_ITEM_COLLECTION_ENABLED = 'true';
  readinessError = { code: 'PGRST202' };
  assert.equal((await invoke('/collect-item', { roomId })).statusCode, 503);
  readinessError = null;
  readiness = { version: 2, items: catalog.slice(1) };
  assert.equal((await invoke('/discoveries/status')).body.enabled, false);
  readiness = { version: 2, items: structuredClone(catalog) };
  readiness.items[0].stack_limit += 1;
  assert.equal((await invoke('/discoveries/status')).body.enabled, false);
  readiness = { version: 1, items: catalog };
  assert.equal((await invoke('/discoveries/status')).body.enabled, false);
  readiness = { version: 2, items: catalog };
  assert.equal((await invoke('/discoveries/status')).body.enabled, true);
  calls.length = 0;
  for (const body of [{}, { roomId: 'invalid' }, { roomId, itemSlug: 'water-delta' }, { roomId, qty: 99 }])
    assert.equal((await invoke('/collect-item', body)).statusCode, 400);
  assert.equal(calls.length, 0, 'Invalid requests must not select or persist a reward');
  claimResult = { success: true, item: catalog[randomIndex], qty: 1, held: true };
  const success = await invoke('/collect-item', { roomId });
  assert.equal(success.statusCode, 200);
  assert.equal(success.body.item.slug, catalog[randomIndex].slug);
  assert.equal(success.body.held, true);
  claimResult = { success: true, item: catalog[randomIndex], qty: 1 };
  assert.equal((await invoke('/collect-item', { roomId })).statusCode, 500,
    'Legacy direct-inventory claims must not be reported as Treasure');
  assert.equal(calls.at(-1).args.p_item_slug, catalog[randomIndex].slug);
  for (const [status_code, error] of [[404, 'Wildwood discovery not found.'], [409, 'Already collected.'], [409, 'That item stack is full.'], [503, 'Catalog unavailable.']]) {
    claimResult = { success: false, status_code, error };
    const response = await invoke('/collect-item', { roomId });
    assert.equal(response.statusCode, status_code);
    assert.equal(response.body.item, undefined);
  }
  claimResult = null;
  assert.equal((await invoke('/collect-item', { roomId })).statusCode, 500);
  claimError = new Error('private database details');
  const failure = await invoke('/collect-item', { roomId });
  assert.equal(failure.statusCode, 500);
  assert(!JSON.stringify(failure.body).includes('private database details'));

  const sql = fs.readFileSync('supabase/migrations/20261110181755_wildwood_kithna_discovery_catalog.sql', 'utf8');
  const migrationCatalog = JSON.parse(sql.split('$items$')[1]);
  assert.deepEqual(migrationCatalog, catalog, 'Migration and JSON catalogs must agree exactly');
  // Static safeguards only; live transaction/concurrency testing remains blocked.
  for (const text of ['FOR UPDATE OF room', 'expedition.user_id = p_user_id', 'v_room.item_claimed_at IS NOT NULL',
    'WHERE owned.qty < v_item.stack_limit', 'VALUES (p_user_id, v_item.id, 1)',
    'SET item_claimed_at = now()', 'ON CONFLICT (slug) DO NOTHING', 'SECURITY INVOKER']) assert(sql.includes(text), text);
  assert(!/UPDATE public\.item_defs|DELETE FROM|ALTER TABLE|DROP /i.test(sql));
  console.log('PASS: 24-item catalog, uniform selection boundaries, deployment/readiness gates, strict claim input, server-selected rewards, failure handling, and migration/catalog parity.');
  console.log('NOT TESTED: PostgreSQL execution, atomicity/concurrency, or browser interactions. No SQL executed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
