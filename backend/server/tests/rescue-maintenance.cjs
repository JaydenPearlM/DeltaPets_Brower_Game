const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const { createRescueMaintenance, createRescueShutdown } = require('../dist/lib/rescueMaintenance');
const tick = () => new Promise(resolve => setImmediate(resolve));
function response() {
  return { statusCode: 200, set() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
}
test('normal, blocked and failed handlers preserve tracking', async () => {
  const events = [];
  const gate = createRescueMaintenance(false, (event, state) => events.push([event, state]));
  let calls = 0;
  const handler = gate.wrap(async (_, res) => { calls++; res.json({ success: true }); });
  const normal = response(); await handler({}, normal, assert.fail);
  assert.equal(normal.body.success, true);
  let caught;
  await gate.wrap(async () => { throw Error('failure'); })({}, response(), error => { caught = error; });
  assert.equal(caught.message, 'failure'); assert.equal(gate.state().active, 0);
  gate.begin(); const blocked = response(); await handler({}, blocked, assert.fail);
  assert.equal(blocked.statusCode, 503); assert.equal(blocked.body.code, 'RESCUE_MAINTENANCE');
  assert.equal(calls, 1); assert.equal(events.at(-1)[0], 'rescue_maintenance');
});
test('disconnect does not mark unfinished handler drained', async () => {
  const gate = createRescueMaintenance(false, () => {});
  let release; const work = new Promise(resolve => { release = resolve; });
  const running = gate.wrap(async () => work)({}, response(), assert.fail);
  gate.begin(); let drained = false; const waiting = gate.drained().then(() => { drained = true; });
  await tick(); assert.equal(drained, false); assert.equal(gate.state().active, 1);
  release(); await running; await waiting; assert.equal(drained, true);
});
test('shutdown waits for HTTP close AND rescue work; repeated signals are harmless', async () => {
  const gate = createRescueMaintenance(false, () => {});
  let release, closed; const exits = [];
  const running = gate.wrap(async () => new Promise(resolve => { release = resolve; }))({}, response(), assert.fail);
  const server = { close(cb) { closed = cb; } };
  const shutdown = createRescueShutdown(server, gate, () => {}, code => exits.push(code), 1000);
  shutdown(); shutdown(); closed(); await tick(); assert.deepEqual(exits, []);
  release(); await running; await tick(); assert.deepEqual(exits, [0]);
});
test('shutdown timeout reports failure, never drained success', async () => {
  const events = []; const gate = createRescueMaintenance(false, () => {});
  const code = await new Promise(resolve => createRescueShutdown({ close() {} }, gate,
    event => events.push(event), resolve, 10)());
  assert.equal(code, 1); assert.deepEqual(events, ['shutdown_incomplete']);
});
test('HTTP route retains authentication before maintenance rejection', async () => {
  const gate = createRescueMaintenance(true, () => {}); const app = express();
  app.post('/api/pets/rescue-egg', (req, res, next) => req.headers.authorization ? next() : res.sendStatus(401),
    gate.wrap(async (_, res) => res.json({ success: true })));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/pets/rescue-egg`;
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    const res = await fetch(url, { method: 'POST', headers: { authorization: 'synthetic' } });
    assert.equal(res.status, 503); assert.equal((await res.json()).code, 'RESCUE_MAINTENANCE');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
