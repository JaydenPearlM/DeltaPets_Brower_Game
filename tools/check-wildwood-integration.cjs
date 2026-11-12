// Isolated repository-double checks. No network, credentials, or player data.
const assert = require("node:assert/strict");
const Module = require("node:module");
const crypto = require("node:crypto");
const originalLoad = Module._load;
const user = "11111111-1111-4111-8111-111111111111";
const petId = "22222222-2222-4222-8222-222222222222";
const tables = {
  player_quests: [{ user_id: user, quest_key: "somethings_afoot", status: "active", progress: 0, target: 5 }],
  wildwood_expeditions: [], wildwood_rooms: [], pet_battle_results: [],
  party_slots: [{ user_id: user, pet_id: petId, slot_index: 1 }],
  pets: [{ id: petId, user_id: user, name: "Kindlekin", species: "fire_starter", line: "fire", level: 1, stage: "hatchling", ran_away: false, hp_max: 100, hp_cur: 100, atk: 30, def: 10, magi: 10, spd: 20 }],
  profiles: [{ user_id: user, active_title: null }],
  trainer_progression: [{ user_id: user, trainer_level: 5 }],
  pet_stats: [{ pet_id: petId, base_hp: 3, base_mana: 2 }],
  passive_traits: [{ key: "test-mana", is_active: true, effects: { mana: 2 } }],
  pet_stat_allocations: [
    { pet_id: petId, level: 0, hp: 100 },
    { pet_id: petId, level: 1, hp: 2, mana: 1 },
  ],
};
let failQuestWrite = false;
let failResultWrite = false;
let failXpWrite = false;
let loseXpResponse = false;
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
      if (this.table === "pet_battle_results" && failResultWrite)
        return { data: null, error: Error("Injected result write failure") };
      assert.equal(this.options.ignoreDuplicates, true);
      const keys = this.options.onConflict.split(",");
      const values = Array.isArray(this.value) ? this.value : [this.value];
      rows = [];
      for (const value of values) {
        const exists = table.some(row => keys.every(key => row[key] === value[key]));
        if (!exists) {
          const record = structuredClone(value);
          rows.push(record); table.push(record);
        }
      }
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
  if (request.endsWith("lib/supabaseAdmin")) return { supabaseAdmin: {
    from: table => new Query(table),
    // PostgreSQL concurrency/rollback are covered by check-wildwood-progression.cjs.
    // This double checks service routing, recovery and the response contract.
    async rpc(name, { p_user_id, p_room_id }) {
      assert.equal(name, 'settle_wildwood_victory_xp');
      const room = tables.wildwood_rooms.find(row => row.id === p_room_id);
      const data = room.event_payload;
      assert.equal(data.battle.status, 'victory');
      assert.equal(data.xpRewardVersion, 1);
      if (failXpWrite) { failXpWrite = false; return { data: null, error: Error('Injected XP failure') }; }
      if (data.xpReward) return { data: structuredClone(data.xpReward), error: null };
      const participant = data.battle.participants.find(p => p.side === 'player');
      const pet = tables.pets.find(p => p.id === participant.sourcePetId && p.user_id === p_user_id);
      const previousXp = pet.xp ?? 0, previousLevel = pet.level;
      pet.xp = previousXp + 25;
      while (pet.level < 30 && pet.xp >= 50 * pet.level * (pet.level + 1)) pet.level++;
      const pointsEarned = pet.level - previousLevel;
      pet.unspent_points = (pet.unspent_points ?? 0) + pointsEarned;
      data.xpReward = { petId: pet.id, amount: 25, previousXp, xp: pet.xp, previousLevel, level: pet.level, pointsEarned };
      if (loseXpResponse) { loseXpResponse = false; return { data: null, error: Error('Lost XP response') }; }
      return { data: structuredClone(data.xpReward), error: null };
    },
  } };
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
  const beforePausedClaim = structuredClone(tables);
  const pausedClaim = await post("/collect-item");
  assert.equal(pausedClaim.statusCode, 503);
  assert.equal(pausedClaim.body.error, "Wildwood item collection is temporarily unavailable.");
  assert.deepEqual(tables, beforePausedClaim, "Paused collection must not write any data");
  const petBefore = structuredClone(tables.pets);
  tables.pets[0].passive_trait_key = "test-mana";
  const initial = await service.getWildwoodSession(user);
  assert.equal(initial.team[0].mpMax, 15, "Base 2 + allocated 1 + passive 2, multiplied by 3 once");
  assert.equal(initial.team[0].mpCur, 15);
  delete tables.pets[0].passive_trait_key;
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
    assert.equal(room.battle.participants[0].mpMax, 9);
    assert.equal(room.battle.participants[0].mpCur, 9);
    assert.equal((await service.getWildwoodSession(user)).room.battle.participants[0].mpCur, 9);
    assert.equal(room.battle.participants[0].row, "back");
    assert.equal(tables.player_quests[0].progress, win - 1, "Spawning must not credit a victory");
    assert.equal((await service.exploreWildwood(user, request)).room.id, room.id);
    assert.equal(tables.wildwood_rooms.length, win, "Explore replay created a duplicate room");
    await assert.rejects(service.actInWildwood("another-user", room.battle.id, {}), /Battle not found/);
    await assert.rejects(service.exploreWildwood(user, { ...request, requestId: crypto.randomUUID(), previousRoomId: room.id }), /Finish your current battle/);
    const enemy = room.battle.participants.find(p => p.side === "enemy");
    if (win === 1) {
      const mend = { actorId: petId, turnNumber: room.battle.turnNumber, action: "skill", skillId: "mend", targetId: petId };
      const beforeInvalid = structuredClone(tables.wildwood_rooms);
      await assert.rejects(service.actInWildwood(user, room.battle.id, { ...mend, targetId: enemy.id }), /living ally/);
      assert.deepEqual(tables.wildwood_rooms, beforeInvalid);
      const casts = await Promise.allSettled([
        service.actInWildwood(user, room.battle.id, mend),
        service.actInWildwood(user, room.battle.id, mend),
      ]);
      assert.equal(casts.filter(result => result.status === "fulfilled").length, 1);
      room.battle = (await service.getWildwoodSession(user)).room.battle;
      assert.equal(room.battle.participants[0].mpCur, 8, "Concurrent Mend spends exactly 1 MP and recovers without refill");
      await assert.rejects(service.actInWildwood(user, room.battle.id, mend), /Stale battle turn/);
      assert.equal((await service.getWildwoodSession(user)).room.battle.participants[0].mpCur, 8);
    }
    const action = { actorId: petId, turnNumber: room.battle.turnNumber, action: "basic_attack", targetId: enemy.id };
    if (win === 1) {
      const results = await Promise.allSettled([service.actInWildwood(user, room.battle.id, action), service.actInWildwood(user, room.battle.id, action)]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1, "Concurrent action was applied twice");
    } else if (win === 2) {
      failQuestWrite = true;
      await assert.rejects(service.actInWildwood(user, room.battle.id, action), /Injected/);
      assert.equal(tables.player_quests[0].progress, 1);
      assert.equal(tables.wildwood_rooms[1].event_payload.battle.status, "victory");
    } else if (win === 3) {
      failResultWrite = true;
      await assert.rejects(service.actInWildwood(user, room.battle.id, action), /Injected result write failure/);
      assert.equal(tables.player_quests[0].progress, 2, "Failed statistics must not settle quest credit");
      await assert.rejects(service.exploreWildwood(user, requestFor(room.id)), /Injected result write failure/);
      assert.equal(tables.wildwood_rooms.length, win, "Cannot advance past unsettled statistics");
      failResultWrite = false;
    } else if (win === 4) {
      failXpWrite = true;
      await assert.rejects(service.actInWildwood(user, room.battle.id, action), /Injected XP failure/);
      assert.equal(tables.pets[0].xp, 75);
    } else if (win === 5) {
      loseXpResponse = true;
      await assert.rejects(service.actInWildwood(user, room.battle.id, action), /Lost XP response/);
      assert.equal(tables.pets[0].xp, 125);
    } else await service.actInWildwood(user, room.battle.id, action);
    const recovered = await service.getWildwoodSession(user);
    assert.equal(recovered.room.battle.status, "victory");
    assert.equal(recovered.room.xpReward.petId, petId);
    assert.equal(recovered.room.xpReward.amount, 25);
    assert.equal(tables.pets[0].xp, win * 25);
    assert.equal(tables.player_quests[0].progress, win, "Recovery lost or duplicated quest credit");
    await service.getWildwoodSession(user);
    assert.equal(tables.player_quests[0].progress, win);
    await assert.rejects(service.actInWildwood(user, room.battle.id, action), /finished/);
    previousRoomId = room.id;
  }
  assert.equal(tables.player_quests[0].status, "ready_to_turn_in");
  assert.equal(tables.pet_battle_results.length, 5, "Quest recovery must not duplicate battle results");
  assert.ok(tables.pet_battle_results.every(row => row.user_id === user && row.pet_id === petId && row.result === "victory"));
  assert.deepEqual(tables.pets, [{ ...petBefore[0], xp: 125, level: 2, unspent_points: 1 }]);
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
  const savedRoom = tables.wildwood_rooms.find(r => r.id === fight.room.id);
  delete savedRoom.event_payload.pveVersion;
  const legacyBefore = structuredClone(tables);
  await assert.rejects(service.actInWildwood(user, fight.room.battle.id, { actorId: petId, turnNumber: fight.room.battle.turnNumber, action: "guard" }), /legacy encounter/);
  await assert.rejects(service.exploreWildwood(user, requestFor(fight.room.id)), /unfinished legacy battle/);
  assert.deepEqual(tables, legacyBefore, "Legacy encounters must not mutate or award rewards");
  savedRoom.event_payload.pveVersion = 1;
  const originalOwner = tables.pets[0].user_id;
  tables.pets[0].user_id = "another-owner";
  await assert.rejects(service.actInWildwood(user, fight.room.battle.id, { actorId: petId, turnNumber: fight.room.battle.turnNumber, action: "guard" }), /ownership changed/);
  tables.pets[0].user_id = originalOwner;
  console.log("PASS: legacy recovery boundary and current participant ownership enforced");
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
  console.log("PASS: participating pet earns 25 XP once per victory, reaches level 2, and preserves other fields; no live database used");
  console.log("PASS: locked access, non-combat replay, battle re-entry, defeat, and concurrent exploration");
  console.log("PASS: premature turn-in rejected; concurrent/repeated turn-in and acceptance preserve completion and unlocks");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
