const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SECRET_KEY = 'synthetic-not-a-production-key';
process.env.RESCUE_MAINTENANCE = 'true';
const { env } = require('../dist/env.server');
let rows = [], reads = 0;
const fake = {
  auth: { getUser: async token => ({ data: { user: token === 'synthetic' ? { id: 'synthetic-owner' } : null } }) },
  from(table) {
    reads++;
    assert.ok(['pets', 'hatchery_slots'].includes(table));
    const query = {
      select() { return this; },
      eq(key, value) { if (key === 'user_id') assert.equal(value, 'synthetic-owner'); return this; },
      is() { return this; }, order() { return this; }, limit() { return this; },
      maybeSingle: async () => ({ data: null, error: null }),
      then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject); }
    };
    return query;
  }
};
const dbPath = require.resolve('../dist/lib/supabaseAdmin');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { supabaseAdmin: fake } };
const { petsRouter } = require('../dist/routes/routePets/routePets');
test('direct HTTP rescue gate, real authentication middleware, and legacy eligibility', async t => {
  const app = express(); app.use('/api/pets', petsRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const request = token => fetch(`http://127.0.0.1:${server.address().port}/api/pets/rescue-egg`, {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  try {
    await t.test('missing and invalid credentials rejected before gate', async () => {
      assert.equal((await request()).status, 401);
      assert.equal((await request('invalid')).status, 401);
      assert.equal(reads, 0);
    });
    await t.test('enabled blocks direct API without any database operations', async () => {
      const response = await request('synthetic');
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.json()).code, 'RESCUE_MAINTENANCE');
      assert.equal(reads, 0);
    });
    env.RESCUE_MAINTENANCE = false;
    await t.test('disabled preserves healthy-pet denial and owner filter', async () => {
      rows = [{ stage: 'hatchling', ran_away: false }];
      assert.equal((await request('synthetic')).status, 400);
    });
    await t.test('disabled preserves duplicate rescue denial', async () => {
      rows = [{ stage: 'egg', ran_away: false, is_rescue_reroll: true }];
      assert.equal((await request('synthetic')).status, 409);
    });
    await t.test('disabled preserves missing-slot denial', async () => {
      rows = [];
      const response = await request('synthetic');
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /No open hatchery slot/);
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('legacy database handler and app wiring remain byte-identical', () => {
  const path = 'backend/server/src/routes/routePets/routePets.ts';
  const old = execFileSync('git', ['show', `cb9556310b52baf426d448deb01025bf3deed285:${path}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const current = fs.readFileSync('src/routes/routePets/routePets.ts', 'utf8').replace(/\r\n/g, '\n');
  const handler = text => text.slice(text.indexOf('  async (req: AuthedRequest', text.indexOf('  "/rescue-egg",')));
  assert.equal(handler(current), handler(old));
  for (const path of ['src/app.ts', 'src/index.ts', 'src/middleware/auth.ts']) {
    const baseline = execFileSync('git', ['show', `HEAD:backend/server/${path}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
    assert.equal(fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n'), baseline);
  }
});
