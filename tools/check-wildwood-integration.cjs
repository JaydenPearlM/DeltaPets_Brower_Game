// Isolated repository-double checks. No network, credentials, or player data.
const assert = require("node:assert/strict");
const Module = require("node:module");
const crypto = require("node:crypto");
const originalLoad = Module._load;
const user = "11111111-1111-4111-8111-111111111111";
const petId = "22222222-2222-4222-8222-222222222222";
const tables = {
  player_quests: [{ user_id: user, quest_key: "somethings_afoot", status: "active", progress: 0, target: 5 }],
  wildwood_expeditions: [], wildwood_rooms: [],
  party_slots: [{ user_id: user, pet_id: petId, slot_index: 1 }],
  pets: [{ id: petId, user_id: user, name: "Kindlekin", species: "fire_starter", line: "fire", level: 1, stage: "hatchling", ran_away: false, hp_max: 100, hp_cur: 100, atk: 30, def: 10, magi: 10, spd: 20 }],
  profiles: [{ user_id: user, active_title: null }], trainer_progression: [],
  pet_stats: [{ pet_id: petId, base_hp: 3 }],
  pet_stat_allocations: [
    { pet_id: petId, level: 0, hp: 100 },
    { pet_id: petId, level: 1, hp: 2 },
  ],
};
let failQuestWrite = false;
let encounterRoll = 0;
let completionWrites = 0;
class Query {
  constructor(table) { this.table = table; this.filters = []; this.operation = "select"; }
  select() { return this; }
  returns() { return this; }
  eq(key, value) { this.filters.push(row => String(key.includes("->>") ? row[key.split("->>")[0]][key.split("->>")[1]] : row[key]) === String(value)); return this; }
  lt(key, value) { this.filters.push(row => row[key] < value); return this; }
  gte(key, value) { this.filters.push(row => row[key] >= value); return this; }
  in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
  order(key, options = {}) { this.sortKey = key; this.ascending = options.ascending !== false; return this; }
  limit(value) { this.take = value; return this; }
  insert(value) { this.operation = "insert"; this.value = value; return this; }
  upsert(value, options) { this.operation = "upsert"; this.value = value; this.options = options; return this; }
  update(value) { this.operation = "update"; this.value = value; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
  execute() {
    const table = tables[this.table];
    if (!table) throw Error(`Unexpected table ${this.table}`);
    let rows = table.filter(row => this.filters.every(filter => filter(row)));
    if (this.operation === "upsert") {
      assert.equal(this.options.ignoreDuplicates, true);
      const keys = this.options.onConflict.split(",");
      const exists = table.some(row => keys.every(key => row[key] === this.value[key]));
      rows = exists ? [] : [structuredClone(this.value)];
      table.push(...rows);
    }
    if (this.operation === "insert") {
      if (this.table === "wildwood_expeditions" && table.some(row => row.user_id === this.value.user_id && row.status === "active")) return { data: null, error: { code: "23505" } };
      if (this.table === "wildwood_rooms" && table.some(row => row.expedition_id === this.value.expedition_id && row.sequence_number === this.value.sequence_number)) return { data: null, error: { code: "23505" } };
      const row = { id: crypto.randomUUID(), status: "active", intro_step: 0, depth: 0, rooms_since_corrupted: 0, ...structuredClone(this.value) };
      table.push(row); rows = [row];
    }
    if (this.operation === "update") {
      if (this.table === "player_quests" && failQuestWrite) { failQuestWrite = false; return { data: null, error: Error("Injected quest write failure") }; }
      if (this.table === "player_quests" && this.value.status === "completed") completionWrites += rows.length;
      rows.forEach(row => Object.assign(row, structuredClone(this.value)));
    }
    if (this.sortKey) rows = [...rows].sort((a, b) => (a[this.sortKey] - b[this.sortKey]) * (this.ascending ? 1 : -1));
    if (this.take) rows = rows.slice(0, this.take);
    return { data: structuredClone(this.one ? rows[0] ?? null : rows), error: null };
  }
}
Module._load = function(request, parent, isMain) {
  if (request.endsWith("lib/supabaseAdmin")) return { supabaseAdmin: { from: table => new Query(table) } };
  if (request.endsWith("middleware/auth")) return { requireUser: (_req, _res, next) => next() };
  if (request.endsWith("lib/logger")) return { logger: { error() {} } };
  // Force the random encounter branch; production chance remains unchanged.
  if (request === "node:crypto") return { ...crypto, randomInt: max => max === 100 ? encounterRoll : 0 };
  return originalLoad.call(this, request, parent, isMain);
};
const service = require("../backend/server/dist/routes/cities/kithna/wildwoodBattleService.js");
const { wildwoodRouter } = require("../backend/server/dist/routes/cities/kithna/wildwood.js");
Module._load = originalLoad;

// Invoke the real route handler with an already-authenticated test identity.
// This exercises turn-in persistence, not authentication middleware or HTTP.
async function post(path, userId = user) {
  const route = wildwoodRouter.stack.find(layer => layer.route?.path === path && layer.route.methods.post).route;
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await route.stack.at(-1).handle({ user: { id: userId } }, response);
  return response;
}

async function main() {
  const petBefore = structuredClone(tables.pets);
  const initial = await service.getWildwoodSession(user);
  assert.equal(initial.team.length, 1);
  assert.equal(initial.team[0].displayHp, 5, "HP display includes level-one allocations, excluding level zero");
  const requestFor = previousRoomId => ({ requestId: crypto.randomUUID(), previousRoomId, formation: [{ petId, row: "back" }] });
  await assert.rejects(service.exploreWildwood("locked-user", requestFor(null)), /Accept Somethings Afoot/);
  assert.equal(tables.wildwood_expeditions.length, 0);
  assert.equal((await post("/quest/turn-in")).statusCode, 409);
  let previousRoomId = null;
  for (let win = 1; win <= 5; win++) {
    const request = { requestId: crypto.randomUUID(), previousRoomId, formation: [{ petId, row: "back" }] };
    const session = await service.exploreWildwood(user, request);
    const room = session.room;
    assert.equal(room.battle.participants[0].row, "back");
    assert.equal(tables.player_quests[0].progress, win - 1, "Spawning must not credit a victory");
    assert.equal((await service.exploreWildwood(user, request)).room.id, room.id);
    assert.equal(tables.wildwood_rooms.length, win, "Explore replay created a duplicate room");
    await assert.rejects(service.actInWildwood("another-user", room.battle.id, {}), /Battle not found/);
    await assert.rejects(service.exploreWildwood(user, { ...request, requestId: crypto.randomUUID(), previousRoomId: room.id }), /Finish your current battle/);
    const enemy = room.battle.participants.find(p => p.side === "enemy");
    const action = { actorId: petId, turnNumber: room.battle.turnNumber, action: "basic_attack", targetId: enemy.id };
    if (win === 1) {
      const results = await Promise.allSettled([service.actInWildwood(user, room.battle.id, action), service.actInWildwood(user, room.battle.id, action)]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1, "Concurrent action was applied twice");
    } else if (win === 2) {
      failQuestWrite = true;
      await assert.rejects(service.actInWildwood(user, room.battle.id, action), /Injected/);
      assert.equal(tables.player_quests[0].progress, 1);
      assert.equal(tables.wildwood_rooms[1].event_payload.battle.status, "victory");
    } else await service.actInWildwood(user, room.battle.id, action);
    const recovered = await service.getWildwoodSession(user);
    assert.equal(recovered.room.battle.status, "victory");
    assert.equal(tables.player_quests[0].progress, win, "Recovery lost or duplicated quest credit");
    await service.getWildwoodSession(user);
    assert.equal(tables.player_quests[0].progress, win);
    await assert.rejects(service.actInWildwood(user, room.battle.id, action), /finished/);
    previousRoomId = room.id;
  }
  assert.equal(tables.player_quests[0].status, "ready_to_turn_in");
  assert.deepEqual(tables.pets, petBefore);
  await assert.rejects(service.exploreWildwood(user, { requestId: crypto.randomUUID(), previousRoomId, formation: [{ petId: crypto.randomUUID(), row: "front" }] }), /team changed/);
  const ready = structuredClone(tables.player_quests[0]);
  await post("/quest/accept");
  assert.deepEqual(tables.player_quests[0], ready, "Accept replay must preserve progress");
  failQuestWrite = true;
  const failedTurnIn = await post("/quest/turn-in");
  assert.equal(failedTurnIn.statusCode, 500);
  assert.equal(failedTurnIn.body.error, "Failed to complete Something’s Afoot.");
  assert.deepEqual(tables.player_quests[0], ready, "Failed turn-in must remain retryable");
  const turnedIn = await Promise.all([post("/quest/turn-in"), post("/quest/turn-in")]);
  assert.ok(turnedIn.every(result => result.statusCode === 200 && result.body.aliuneSignalUnlocked));
  assert.equal(completionWrites, 1, "Concurrent turn-in must complete the quest only once");
  const completed = structuredClone(tables.player_quests[0]);
  await post("/quest/turn-in");
  await post("/quest/accept");
  await service.getWildwoodSession(user);
  assert.deepEqual(tables.player_quests[0], completed, "Completed quest must survive retries and reloads");

  encounterRoll = 99;
  const flavorRequest = requestFor(previousRoomId);
  const flavor = await service.exploreWildwood(user, flavorRequest);
  assert.equal(flavor.room.battle, null);
  assert.equal((await service.exploreWildwood(user, flavorRequest)).room.id, flavor.room.id);
  await assert.rejects(service.exploreWildwood(user, requestFor(previousRoomId)), /another tab/);

  // A separate accepted quest makes false victory credit observable on defeat.
  tables.player_quests.push({ user_id: user, quest_key: "assanti_food_trouble", status: "active", progress: 0, target: 3 });
  Object.assign(tables.pets[0], { hp_cur: 1, def: 0 });
  const weakPetBefore = structuredClone(tables.pets);
  encounterRoll = 0;
  const fight = await service.exploreWildwood(user, requestFor(flavor.room.id));
  assert.equal((await service.getWildwoodSession(user)).room.battle.id, fight.room.battle.id, "Leaving/re-entering preserves active battle");
  await assert.rejects(service.actInWildwood(user, fight.room.battle.id, { actorId: petId, turnNumber: fight.room.battle.turnNumber, action: "retreat" }));
  assert.equal(tables.player_quests[1].progress, 0, "Unsupported retreat cannot credit a victory");
  let battle = fight.room.battle;
  for (let turn = 0; battle.status === "active" && turn < 500; turn++) {
    battle = (await service.actInWildwood(user, battle.id, { actorId: petId, turnNumber: battle.turnNumber, action: "guard" })).room.battle;
  }
  assert.equal(battle.status, "defeat");
  assert.equal((await service.getWildwoodSession(user)).team.length, 1);
  assert.equal(tables.player_quests[1].progress, 0, "Defeat/reload must not credit a victory");
  assert.deepEqual(tables.pets, weakPetBefore);
  Object.assign(tables.pets[0], petBefore[0]);
  const roomsBefore = tables.wildwood_rooms.length;
  const concurrent = await Promise.allSettled([service.exploreWildwood(user, requestFor(fight.room.id)), service.exploreWildwood(user, requestFor(fight.room.id))]);
  assert.equal(concurrent.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(tables.wildwood_rooms.length, roomsBefore + 1);
  console.log("PASS: five qualifying victories reach 5/5 and ready_to_turn_in");
  console.log("PASS: concurrent actions, repeated exploration, stale actions, foreign battle access, invalid formation");
  console.log("PASS: saved victory recovers after a failed quest write, with no duplicate credit");
  console.log("PASS: pet records unchanged; no XP or egg writes; no live database used");
  console.log("PASS: locked access, non-combat replay, battle re-entry, defeat, and concurrent exploration");
  console.log("PASS: premature turn-in rejected; concurrent/repeated turn-in and acceptance preserve completion and unlocks");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
