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
};
let failQuestWrite = false;
class Query {
  constructor(table) { this.table = table; this.filters = []; this.operation = "select"; }
  select() { return this; }
  returns() { return this; }
  eq(key, value) { this.filters.push(row => String(key.includes("->>") ? row[key.split("->>")[0]][key.split("->>")[1]] : row[key]) === String(value)); return this; }
  lt(key, value) { this.filters.push(row => row[key] < value); return this; }
  in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
  order(key, options = {}) { this.sortKey = key; this.ascending = options.ascending !== false; return this; }
  limit(value) { this.take = value; return this; }
  insert(value) { this.operation = "insert"; this.value = value; return this; }
  update(value) { this.operation = "update"; this.value = value; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
  execute() {
    const table = tables[this.table];
    if (!table) throw Error(`Unexpected table ${this.table}`);
    let rows = table.filter(row => this.filters.every(filter => filter(row)));
    if (this.operation === "insert") {
      if (this.table === "wildwood_expeditions" && table.some(row => row.user_id === this.value.user_id && row.status === "active")) return { data: null, error: { code: "23505" } };
      if (this.table === "wildwood_rooms" && table.some(row => row.expedition_id === this.value.expedition_id && row.sequence_number === this.value.sequence_number)) return { data: null, error: { code: "23505" } };
      const row = { id: crypto.randomUUID(), status: "active", intro_step: 0, depth: 0, rooms_since_corrupted: 0, ...structuredClone(this.value) };
      table.push(row); rows = [row];
    }
    if (this.operation === "update") {
      if (this.table === "player_quests" && failQuestWrite) { failQuestWrite = false; return { data: null, error: Error("Injected quest write failure") }; }
      rows.forEach(row => Object.assign(row, structuredClone(this.value)));
    }
    if (this.sortKey) rows = [...rows].sort((a, b) => (a[this.sortKey] - b[this.sortKey]) * (this.ascending ? 1 : -1));
    if (this.take) rows = rows.slice(0, this.take);
    return { data: structuredClone(this.one ? rows[0] ?? null : rows), error: null };
  }
}
Module._load = function(request, parent, isMain) {
  if (request.endsWith("lib/supabaseAdmin")) return { supabaseAdmin: { from: table => new Query(table) } };
  // Force the random encounter branch; production chance remains unchanged.
  if (request === "node:crypto") return { ...crypto, randomInt: () => 0 };
  return originalLoad.call(this, request, parent, isMain);
};
const service = require("../backend/server/dist/routes/cities/kithna/wildwoodBattleService.js");
Module._load = originalLoad;

async function main() {
  const petBefore = structuredClone(tables.pets);
  const initial = await service.getWildwoodSession(user);
  assert.equal(initial.team.length, 1);
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
  console.log("PASS: five qualifying victories reach 5/5 and ready_to_turn_in");
  console.log("PASS: concurrent actions, repeated exploration, stale actions, foreign battle access, invalid formation");
  console.log("PASS: saved victory recovers after a failed quest write, with no duplicate credit");
  console.log("PASS: pet records unchanged; no XP or egg writes; no live database used");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
