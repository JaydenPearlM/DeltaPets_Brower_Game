// Run after backend build: node tools/check-pet-battle-results.cjs
// Real Wildwood service, battle engine, and /care/current handler with repository
// doubles. This does not test PostgreSQL constraints/RLS or use player data.
const assert = require("node:assert/strict");
const Module = require("node:module");
const crypto = require("node:crypto");
const originalLoad = Module._load;
const user = "11111111-1111-4111-8111-111111111111";
const otherUser = "99999999-9999-4999-8999-999999999999";
const petId = "22222222-2222-4222-8222-222222222222";
const faintedId = "33333333-3333-4333-8333-333333333333";
const expeditionId = "44444444-4444-4444-8444-444444444444";
const tables = {
  pets: [], party_slots: [], wildwood_rooms: [], pet_battle_results: [],
  profiles: [], pet_mutations: [], pet_elements: [],
};
let failWrite = false, loseWriteResponse = false, failCount = false;
let nullCount = false, failElements = false, encounter = true;
let countRequests = 0;
let currentPetId = petId;
const freshPet = id => ({
  id, user_id: user, name: "Kindlekin", species: "fire_starter", line: "fire",
  stage: "hatchling", level: 1, ran_away: false, hp_max: 100, hp_cur: 100,
  atk: 1000, def: 100, magi: 5, spd: 100, hunger: 50, clean: 50,
  happy: 50, comfort: 50, rest: 50, energy: 100, neglect_hours: 0,
  runaway_at: null, last_care_decay_at: new Date().toISOString(),
});
function reset() {
  for (const rows of Object.values(tables)) rows.length = 0;
  tables.pets.push(freshPet(petId), { ...freshPet(faintedId), hp_cur: 0 });
  tables.party_slots.push({ user_id: user, pet_id: petId, slot_index: 1 },
    { user_id: user, pet_id: faintedId, slot_index: 2 });
  failWrite = loseWriteResponse = failCount = nullCount = failElements = false;
  encounter = true;
  currentPetId = petId;
  countRequests = 0;
}
class Query {
  constructor(table) { this.table = table; this.filters = []; }
  select(_columns, options) { this.options = options; return this; }
  returns() { return this; }
  eq(key, value) {
    this.filters.push(row => String(key.includes("->>")
      ? row[key.split("->>")[0]][key.split("->>")[1]] : row[key]) === String(value));
    return this;
  }
  in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
  order(key, options = {}) { this.sortKey = key; this.ascending = options.ascending !== false; return this; }
  limit(value) { this.take = value; return this; }
  insert(value) { this.operation = "insert"; this.value = value; return this; }
  upsert(value, options) { this.operation = "upsert"; this.value = value; this.upsertOptions = options; return this; }
  update(value) { this.operation = "update"; this.value = value; return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
  execute() {
    const table = tables[this.table];
    assert.ok(table, `Unexpected table ${this.table}`);
    let rows = table.filter(row => this.filters.every(filter => filter(row)));
    if (this.table === "pet_elements" && failElements)
      return { data: null, error: Error("Injected element read failure") };
    if (this.operation === "insert") {
      assert.equal(this.table, "wildwood_rooms");
      const row = { id: crypto.randomUUID(), ...structuredClone(this.value) };
      table.push(row); rows = [row];
    }
    if (this.operation === "update") {
      assert.equal(this.table, "wildwood_rooms", "Pet/quest records must not be changed by this fixture");
      rows.forEach(row => Object.assign(row, structuredClone(this.value)));
    }
    if (this.operation === "upsert") {
      assert.equal(this.table, "pet_battle_results");
      assert.deepEqual(this.upsertOptions, { onConflict: "battle_id,pet_id", ignoreDuplicates: true });
      assert.ok(Array.isArray(this.value), "All participants must be written in one batch");
      if (failWrite) return { data: null, error: Error("Injected result write failure") };
      for (const record of this.value) {
        assert.ok(tables.pets.some(pet => pet.id === record.pet_id && pet.user_id === record.user_id));
        if (!table.some(row => row.battle_id === record.battle_id && row.pet_id === record.pet_id))
          table.push(structuredClone(record));
      }
      if (loseWriteResponse) {
        loseWriteResponse = false;
        return { data: null, error: Error("Injected lost write response") };
      }
      return { data: null, error: null };
    }
    if (this.options?.count) {
      assert.equal(this.table, "pet_battle_results");
      assert.deepEqual(this.options, { count: "exact", head: true });
      countRequests++;
      return { data: null, count: nullCount ? null : rows.length,
        error: failCount ? Error("Injected count failure") : null };
    }
    if (this.sortKey) rows.sort((a, b) => (a[this.sortKey] - b[this.sortKey]) * (this.ascending ? 1 : -1));
    if (this.take) rows = rows.slice(0, this.take);
    return { data: structuredClone(this.one ? rows[0] ?? null : rows), error: null };
  }
}
Module._load = function(request, parent, isMain) {
  if (request.endsWith("lib/supabaseAdmin")) return { supabaseAdmin: { from: name => new Query(name) } };
  if (request.endsWith("middleware/auth")) return { requireUser: (_req, _res, next) => next() };
  if (request.endsWith("lib/logger")) return { logger: { error() {} } };
  if (request.endsWith("routePets/petsRepo")) return {
    async fetchActivePet(id) { return { pet: structuredClone(tables.pets.find(pet => pet.id === currentPetId && pet.user_id === id) ?? null) }; },
  };
  if (request.endsWith("routePets/petsStats")) return { fetchTotalPoints: async () => null };
  if (request.endsWith("shared/pets/care/CareDecay")) return { applyCareDecay: pet => ({ ...pet }) };
  if (request.endsWith("wildwoodState")) return {
    getWildwoodState: async id => ({ wildwoodUnlocked: id === user,
      expedition: id === user ? { id: expeditionId } : null,
      quest: { status: "completed" }, foodQuest: { status: "completed" } }),
    selectProceduralEvent: () => encounter ? "corrupted_battle" : "flavor",
  };
  return originalLoad.call(this, request, parent, isMain);
};
const service = require("../backend/server/dist/routes/cities/kithna/wildwoodBattleService.js");
const { careRouter } = require("../backend/server/dist/routes/care/care.js");
Module._load = originalLoad;
const currentHandler = careRouter.stack.find(layer => layer.route?.path === "/current").route.stack.at(-1).handle;
async function current() {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await currentHandler({ user: { id: user } }, res);
  return res;
}
const request = () => ({ requestId: crypto.randomUUID(), previousRoomId: tables.wildwood_rooms.at(-1)?.id ?? null,
  formation: tables.party_slots.map(slot => ({ petId: slot.pet_id, row: "front" })) });
async function start() { return (await service.exploreWildwood(user, request())).room.battle; }
const attack = battle => ({ actorId: petId, turnNumber: battle.turnNumber, action: "basic_attack",
  targetId: battle.participants.find(pet => pet.side === "enemy").id });
async function win() { const battle = await start(); await service.actInWildwood(user, battle.id, attack(battle)); return battle; }
async function main() {
  reset();
  const petsBefore = structuredClone(tables.pets);
  const battle = await win();
  assert.equal(tables.pet_battle_results.length, 2, "Victory must record both participants, including the fainted Kith");
  assert.ok(tables.pet_battle_results.every(row => row.result === "victory" && row.user_id === user));
  await Promise.all([service.getWildwoodSession(user), service.getWildwoodSession(user)]);
  await assert.rejects(service.actInWildwood(user, battle.id, attack(battle)), /finished/);
  assert.equal(tables.pet_battle_results.length, 2, "Reloads and final-action replay must not duplicate a result");
  assert.deepEqual(tables.pets, petsBefore, "No changes to pet combat/care/XP data");
  await assert.rejects(service.actInWildwood(otherUser, battle.id, attack(battle)), /not found/);

  reset();
  const concurrentBattle = await start();
  const concurrent = await Promise.allSettled([service.actInWildwood(user, concurrentBattle.id, attack(concurrentBattle)),
    service.actInWildwood(user, concurrentBattle.id, attack(concurrentBattle))]);
  assert.equal(concurrent.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(tables.pet_battle_results.length, 2);

  reset();
  const pending = await start();
  assert.equal(tables.pet_battle_results.length, 0, "An active battle is not a result");
  failWrite = true;
  await assert.rejects(service.actInWildwood(user, pending.id, attack(pending)), /Injected result write failure/);
  assert.equal(tables.wildwood_rooms[0].event_payload.battle.status, "victory", "Battle must persist before its results");
  assert.equal(tables.pet_battle_results.length, 0);
  await assert.rejects(service.exploreWildwood(user, request()), /Injected result write failure/);
  assert.equal(tables.wildwood_rooms.length, 1, "Cannot advance past an unsettled result");
  failWrite = false;
  await service.getWildwoodSession(user);
  assert.equal(tables.pet_battle_results.length, 2);

  reset();
  loseWriteResponse = true;
  await assert.rejects(win(), /Injected lost write response/);
  assert.equal(tables.pet_battle_results.length, 2);
  await service.getWildwoodSession(user);
  assert.equal(tables.pet_battle_results.length, 2, "Retry after a committed write with a lost response is idempotent");

  reset();
  const legacy = await start();
  delete tables.wildwood_rooms[0].event_payload.recordBattleStats;
  await service.actInWildwood(user, legacy.id, attack(legacy));
  await service.getWildwoodSession(user);
  assert.equal(tables.pet_battle_results.length, 0, "Pre-change battles must not be backfilled");
  encounter = false;
  await service.exploreWildwood(user, request());
  assert.equal(tables.pet_battle_results.length, 0, "Noncombat rooms must not award a result");

  reset();
  const foreign = await start();
  tables.pets[1].user_id = otherUser;
  await assert.rejects(service.actInWildwood(user, foreign.id, attack(foreign)), /owned|ownership/i);
  assert.equal(tables.pet_battle_results.length, 0, "Ownership failure must not record a partial team");

  reset();
  Object.assign(tables.pets[0], { hp_cur: 1, def: 0, spd: 1 });
  let defeat = await start();
  for (let turn = 0; defeat.status === "active" && turn < 500; turn++) {
    defeat = (await service.actInWildwood(user, defeat.id,
      { actorId: petId, turnNumber: defeat.turnNumber, action: "guard" })).room.battle;
  }
  assert.equal(defeat.status, "defeat");
  assert.equal(tables.pet_battle_results.length, 2);
  assert.ok(tables.pet_battle_results.every(row => row.result === "defeat"));
  await service.getWildwoodSession(user);
  assert.equal(tables.pet_battle_results.length, 2);

  reset();
  await win();
  let response = await current();
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.pet.wins, 1, "The API must return the saved battle result");
  assert.equal(response.body.pet.losses, 0);
  currentPetId = faintedId;
  response = await current();
  assert.equal(response.body.pet.wins, 1, "Switching active Kith must read that participant's record");
  currentPetId = petId;
  // More than the usual API row limit: exact counts must not be page-length counts.
  tables.pet_battle_results.length = 0;
  for (let i = 0; i < 1005; i++) tables.pet_battle_results.push({ battle_id: crypto.randomUUID(), pet_id: petId, user_id: user, result: "victory" });
  tables.pet_battle_results.push({ battle_id: crypto.randomUUID(), pet_id: petId, user_id: user, result: "defeat" },
    { battle_id: crypto.randomUUID(), pet_id: faintedId, user_id: user, result: "victory" },
    { battle_id: crypto.randomUUID(), pet_id: petId, user_id: otherUser, result: "victory" });
  for (const fallback of [false, true]) {
    failElements = fallback;
    response = await current();
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.pet.wins, 1005);
    assert.equal(response.body.pet.losses, 1);
  }
  assert.ok(countRequests >= 8);
  failCount = true;
  assert.equal((await current()).statusCode, 500, "A failed count must not be displayed as zero wins");
  failCount = false; nullCount = true;
  assert.equal((await current()).statusCode, 500, "A missing count must not be displayed as zero wins");
  reset();
  response = await current();
  assert.equal(response.body.pet.wins, 0);
  assert.equal(response.body.pet.losses, 0);
  currentPetId = null;
  assert.equal((await current()).body.pet, null);
  assert.equal(countRequests, 2, "No-pet response must not query another Kith's record");
  console.log("PASS: victories/defeats, fainted participants, ownership, concurrency, replay, and write recovery");
  console.log("PASS: legacy/noncombat exclusions; API totals, active-pet selection, fallback, count failures, and >1000 results");
  console.log("LIMIT: repository doubles only; PostgreSQL constraints and RLS are not exercised");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
