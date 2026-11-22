const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const uid = '00000000-0000-4000-8000-000000000001';
const pid = '00000000-0000-4000-8000-000000000002';
let pet, rpcResult, calls, stockResult;
const runtimeEnv = { NODE_ENV: 'development', SUPABASE_URL: 'http://127.0.0.1:54321' };
const admin = {
  from(table) {
    calls.push(table);
    const result = table === 'assanti_daily_stock' ? stockResult : { data: table === 'pets' ? pet : [], error: null };
    const chain = { select() { return this; }, eq() { return this; }, maybeSingle() { return Promise.resolve(result); }, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
    return chain;
  },
  async rpc(name, args) { calls.push({ name, args }); return rpcResult; },
};
function stub(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports }; }
stub('../dist/env.server', { env: runtimeEnv });
stub('../dist/lib/supabaseAdmin', { supabaseAdmin: admin });
stub('../dist/middleware/auth', { requireUser(req, res, next) { if (!req.headers.authorization) return res.sendStatus(401); req.user = { id: uid }; next(); } });
const service = require('../dist/pets/level2/service');
const { kithnaMerchantsRouter } = require('../dist/routes/merchants/kithnaMerchants');
function reset() {
  calls = [];
  runtimeEnv.NODE_ENV = 'development'; runtimeEnv.SUPABASE_URL = 'http://127.0.0.1:54321';
  stockResult = { data: [], error: null };
  pet = { id: pid, user_id: uid, species: null, line: 'light', stage: 'egg', ran_away: false, xp: 0, level: 1, unspent_points: 0, hp_max: 10, hp_cur: 10, atk: 1, magi: 1, def: 1, spd: 1, mana: 1 };
}
test('species-less egg returns real saved state with ineligible skills, no choices or combat skills', async () => {
  reset(); const result = await service.readLevel2(uid, pid);
  assert.equal(result.pet.species, null); assert.equal(result.skillStatus, 'ineligible');
  assert.equal(result.allocationStatus, 'ineligible'); assert.deepEqual(result.choices, []); assert.deepEqual(result.combatSkills, []);
  assert(calls.includes('pet_skills')); assert(calls.includes('pet_stat_allocations'));
});
test('hatched null species, malformed eggs and wrong ownership still fail validation', async () => {
  for (const change of [{ stage: 'hatchling' }, { hp_max: 0 }, { user_id: pid }, { species: 12 }]) {
    reset(); Object.assign(pet, change);
    await assert.rejects(service.readLevel2(uid, pid), error => error.code === 'L2_INVALID_RESPONSE');
  }
});
test('hatched species retains progression, eggs cannot mutate skills or equipment', async () => {
  reset(); Object.assign(pet, { stage: 'hatchling', species: 'light_starter' });
  const result = await service.readLevel2(uid, pid); assert.equal(result.skillStatus, 'available');
  reset(); await assert.rejects(service.resolveSkillEquipment(uid, pid, { milestoneKey: 'level-2', slot: null }), error => error.code === 'SKILL_INELIGIBLE');
  assert(!calls.some(call => typeof call === 'object'));
});
async function http(run) {
  const app = express(); app.use(express.json()); app.use(kithnaMerchantsRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('food uses only existing RPC and preserves catalog, wallets and prices', async () => {
  reset(); const data = { catalog: [{ slug: 'alpha-meat', price: 7, available: true, quantity: 3 }], merchantDots: 101, playerDots: 55 };
  rpcResult = { data, error: null };
  await http(async url => {
    const res = await fetch(url + '/food', { headers: { authorization: 'test' } }); assert.equal(res.status, 200);
    const body = await res.json(); assert.deepEqual(body.catalog, [{ ...data.catalog[0], stockMode: 'unlimited' }]);
    assert.equal(body.merchantDots, 101); assert.equal(body.playerDots, 55); assert.equal(body.potionTrading, 'unconfigured');
  });
  assert.equal(calls.length, 1); assert.equal(calls[0].name, 'get_assanti_food_shop'); assert.equal(calls[0].args.p_user_id, uid);
});
test('food RPC failures and malformed results remain errors, never empty success', async () => {
  for (const result of [{ data: null, error: { code: 'test' } }, { data: {}, error: null }]) {
    reset(); rpcResult = result;
    await http(async url => { assert.equal((await fetch(url + '/food', { headers: { authorization: 'test' } })).status, 503); });
  }
});
test('potion stock and trades explicitly unavailable, never touch database; authentication retained', async () => {
  reset(); await http(async url => {
    for (const [method, route] of [['GET', '/potions'], ['POST', '/potions/purchase'], ['POST', '/potions/sell']]) {
      assert.equal((await fetch(url + route, { method })).status, 401);
      const res = await fetch(url + route, { method, headers: { authorization: 'test' } });
      assert.equal(res.status, 409); assert.match((await res.json()).error, /preview-only/);
    }
  }); assert.deepEqual(calls, []);
});
test('food buy/sell forward unchanged server-owned transaction parameters and receipts', async () => {
  reset(); const receipt = { ok: true, cost: 14, inventoryQuantity: 2, merchantDots: 115, wallet: { dots: 41, crystals: 3 } };
  rpcResult = { data: receipt, error: null };
  await http(async url => {
    for (const direction of ['purchase', 'sell']) {
      const res = await fetch(url + '/food/' + direction, { method: 'POST', headers: { authorization: 'test', 'content-type': 'application/json' }, body: JSON.stringify({ slug: 'alpha-meat', quantity: 2 }) });
      assert.equal(res.status, 200); assert.deepEqual(await res.json(), receipt);
      const call = calls.at(-1); assert.equal(call.name, 'trade_assanti_food_on_day');
      assert.equal(call.args.p_user_id, uid); assert.equal(call.args.p_direction, direction); assert.equal(call.args.p_quantity, 2);
      assert.equal(call.args.p_slug, 'alpha-meat'); assert(!('p_price' in call.args));
    }
    const count = calls.length;
    const res = await fetch(url + '/food/purchase', { method: 'POST', headers: { authorization: 'test', 'content-type': 'application/json' }, body: JSON.stringify({ slug: 'alpha-meat', quantity: 51 }) });
    assert.equal(res.status, 400); assert.equal(calls.length, count);
  });
});

test('finite contract retains stock, zero/missing rows, prices and availability without unlimited metadata', async () => {
  reset(); runtimeEnv.NODE_ENV = 'production';
  rpcResult = { data: { merchantDots: 100, catalog: [
    { slug: 'apple', price: 7, available: true, stockMode: 'unlimited' },
    { slug: 'rice', price: 9, available: true },
    { slug: 'bread', price: 5, available: false },
  ] }, error: null };
  stockResult = { data: [{ slug: 'apple', remaining_stock: 6 }, { slug: 'rice', remaining_stock: 0 }], error: null };
  await http(async url => {
    const res = await fetch(url + '/food', { headers: { authorization: 'test' } }); assert.equal(res.status, 200);
    const body = await res.json(); assert.equal(body.merchantDots, 100);
    assert.deepEqual(body.catalog, [
      { slug: 'apple', price: 7, available: true, stock: 6 },
      { slug: 'rice', price: 9, available: true, stock: 0 },
      { slug: 'bread', price: 5, available: false, stock: 0 },
    ]);
  }); assert(calls.includes('assanti_daily_stock'));
});
test('missing, denied, unavailable or malformed finite stock fails closed for every nonlocal configuration', async () => {
  for (const config of [
    { NODE_ENV: 'production', SUPABASE_URL: 'http://127.0.0.1:54321' },
    { NODE_ENV: 'development', SUPABASE_URL: 'https://example.invalid' },
    { NODE_ENV: undefined, SUPABASE_URL: 'http://127.0.0.1:54321' },
    { NODE_ENV: 'development', SUPABASE_URL: 'http://127.0.0.1:54322' },
  ]) for (const result of [
    { data: null, error: { code: '42P01' } },
    { data: null, error: { code: '42501' } },
    { data: null, error: { code: 'PGRST205' } },
    { data: null, error: null },
    { data: [{ slug: 'apple', remaining_stock: -1 }], error: null },
  ]) {
    reset(); Object.assign(runtimeEnv, config); stockResult = result;
    rpcResult = { data: { catalog: [{ slug: 'apple', price: 7, available: true }] }, error: null };
    await http(async url => { const res = await fetch(url + '/food', { headers: { authorization: 'test' } });
      assert.equal(res.status, 503); assert(!('catalog' in await res.json())); });
    assert(calls.includes('assanti_daily_stock'));
  }
});
