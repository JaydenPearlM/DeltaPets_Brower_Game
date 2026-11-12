// Run after the backend build: pnpm exec node tools/check-battle-engine.cjs
const assert = require("node:assert/strict");
const { createBattle, resolveBattleAction, BattleRuleError } = require("../backend/server/dist/battle/battleEngine.js");
const { calculateDamage, calculateMend, getElementMultiplier } = require("../backend/server/dist/battle/battleMath.js");
const { maximumMp, hasBattleMp } = require("../backend/server/dist/shared/battle/mana.js");

let checks = 0;
function check(name, run) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}
function pet(id, side, overrides = {}) {
  return {
    id, speciesId: side === "player" ? "fire_starter" : "kithna_pebelin",
    name: id, side, row: "middle", element: "fire", level: 1,
    hpMax: 40, hpCur: 40, atk: 8, def: 4, magi: 8, spd: 4,
    mpMax: 6, mpCur: 6,
    ...overrides,
  };
}
function act(state, action, targetId, skillId) {
  return resolveBattleAction(state, {
    actorId: state.activeParticipantId, turnNumber: state.turnNumber, action,
    ...(targetId ? { targetId } : {}), ...(skillId ? { skillId } : {}),
  });
}
function pair(overrides = {}, enemyOverrides = {}) {
  return createBattle("pair", [pet("p", "player", overrides), pet("e", "enemy", enemyOverrides)]);
}

check("4 versus 2: Attack, Guard, Mend, skill, enemy turns, defeat and victory", () => {
  const input = [
    pet("p1", "player", { row: "front" }), pet("p2", "player"),
    pet("p3", "player", { row: "back" }), pet("p4", "player", { hpCur: 20 }),
    pet("e1", "enemy", { spd: 3 }), pet("e2", "enemy", { spd: 3 }),
  ];
  const before = structuredClone(input);
  let state = createBattle("slice", input);
  assert.equal(state.activeParticipantId, "p1");
  state = act(state, "basic_attack", "e1");
  assert.equal(state.participants[4].hpCur, 34);
  state = act(state, "guard");
  assert.equal(state.participants[1].guarding, true);
  state = act(state, "skill", "p4", "mend");
  assert.equal(state.participants[3].hpCur, 32);
  state = act(state, "skill", "e1", "basic-strike");
  assert.ok(state.log.some((event) => event.type === "attack" && event.actorId === "e1"));
  assert.ok(state.log.some((event) => event.type === "attack" && event.actorId === "e2"));
  let turns = 0;
  while (state.status === "active" && turns++ < 100) {
    const target = state.participants.find((unit) => unit.side === "enemy" && !unit.defeated);
    state = act(state, "basic_attack", target.id);
  }
  assert.equal(state.status, "victory");
  assert.equal(state.activeParticipantId, null);
  assert.ok(state.participants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated && unit.hpCur === 0));
  assert.ok(state.log.some((event) => event.type === "participant_defeated"));
  assert.deepEqual(input, before);
});

check("existing damage, Guard, elemental and Mend calculations", () => {
  const attacker = pet("p", "player", { atk: 20 });
  const defender = { ...pet("e", "enemy", { def: 20 }), guarding: false };
  assert.equal(calculateDamage({ attacker, defender, power: 1 }), 11);
  assert.equal(calculateDamage({ attacker, defender: { ...defender, guarding: true }, power: 1 }), 8);
  assert.equal(calculateMend(8, 1, 1), 12);
  assert.equal(getElementMultiplier("fire", "earth"), 1.25);
  assert.equal(getElementMultiplier("fire", "water"), 0.85);
  assert.equal(getElementMultiplier("null_element", "fire"), 1);
});

check("small SPD values remain distinct and faster Kith act more often", () => {
  let state = createBattle("speed", [
    pet("slow", "player", { spd: 1 }), pet("fast", "player", { spd: 4 }),
    pet("e", "enemy", { spd: 1, atk: 0 }),
  ]);
  const order = [];
  for (let i = 0; i < 5; i++) {
    order.push(state.activeParticipantId);
    state = act(state, "guard");
  }
  assert.deepEqual(order, ["fast", "fast", "fast", "fast", "slow"]);
});

check("Guard survives enemy attacks and clears at the next actor turn", () => {
  const state = pair({ def: 20 }, { atk: 20 });
  const result = act(state, "guard");
  assert.equal(result.participants[0].hpCur, 32);
  assert.equal(result.activeParticipantId, "p");
  assert.equal(result.participants[0].guarding, false);
});

check("Mend clamps to max HP and logs actual restored HP", () => {
  const state = createBattle("heal", [
    pet("p", "player"), pet("ally", "player", { hpCur: 39 }), pet("e", "enemy"),
  ]);
  const result = act(state, "skill", "ally", "mend");
  assert.equal(result.participants[1].hpCur, 40);
  assert.equal(result.log.find((event) => event.type === "heal").amount, 1);
});

check("invalid actions reject without changing the input snapshot", () => {
  const state = createBattle("invalid", [
    pet("p", "player"), pet("ally", "player"), pet("dead", "player", { hpCur: 0 }),
    pet("e", "enemy"), pet("dead-e", "enemy", { hpCur: 0 }),
  ]);
  const base = { actorId: "p", turnNumber: state.turnNumber, action: "basic_attack", targetId: "e" };
  const actions = [
    { ...base, actorId: "missing" }, { ...base, actorId: "ally" },
    { ...base, actorId: "dead" }, { ...base, actorId: "e" },
    { ...base, targetId: "missing" }, { ...base, targetId: "dead-e" },
    { ...base, targetId: "ally" }, { ...base, damage: 999 },
    { ...base, turnNumber: 0 }, { ...base, action: "invalid" },
    { ...base, action: "skill", skillId: "unknown" },
    { ...base, action: "skill", skillId: "mend" },
    { ...base, action: "skill", skillId: "mend", targetId: "dead" },
    { ...base, action: "skill", skillId: "basic-strike", targetId: "ally" },
    null, {},
  ];
  const before = structuredClone(state);
  for (const action of actions) {
    assert.throws(() => resolveBattleAction(state, action), BattleRuleError);
    assert.deepEqual(state, before);
  }
});

check("duplicate action fails even when the same player becomes active again", () => {
  const state = pair();
  const action = { actorId: "p", turnNumber: state.turnNumber, action: "basic_attack", targetId: "e" };
  const result = resolveBattleAction(state, action);
  assert.equal(result.activeParticipantId, "p");
  assert.throws(() => resolveBattleAction(result, action), /Stale battle turn/);
  assert.equal(state.participants[1].hpCur, 40);
});

check("victory and defeat reject further actions; defeat does not mutate pet inputs", () => {
  const victory = act(pair({ atk: 100 }), "basic_attack", "e");
  assert.equal(victory.status, "victory");
  assert.throws(() => resolveBattleAction(victory, { actorId: "p", turnNumber: victory.turnNumber, action: "guard" }), /finished/);
  const input = [pet("p", "player", { hpCur: 1 }), pet("e", "enemy", { spd: 8 })];
  const defeat = createBattle("loss", input);
  assert.equal(defeat.status, "defeat");
  assert.equal(defeat.participants[0].hpCur, 0);
  assert.equal(input[0].hpCur, 1);
  assert.throws(() => resolveBattleAction(defeat, { actorId: "p", turnNumber: defeat.turnNumber, action: "guard" }), /finished/);
});

check("participant limits, rows, IDs, levels, HP and Speed validation", () => {
  const p = pet("p", "player");
  const e = pet("e", "enemy");
  const invalid = [
    [], [p], [p, { ...e, id: "p" }],
    [p, { ...e, spd: 0 }], [p, { ...e, spd: NaN }],
    [p, { ...e, hpCur: -1 }], [p, { ...e, hpCur: 41 }],
    [p, { ...e, row: "sky" }], [p, { ...e, level: 11 }],
    [p, { ...e, element: "voidborne" }],
    [...Array.from({ length: 5 }, (_, i) => pet(`p${i}`, "player")), e],
    [p, ...Array.from({ length: 5 }, (_, i) => pet(`e${i}`, "enemy"))],
    [{ ...p, sourcePetId: "same" }, { ...e, sourcePetId: "same" }],
  ];
  for (const participants of invalid) assert.throws(() => createBattle("invalid", participants), BattleRuleError);
  const full = createBattle("full", [
    ...Array.from({ length: 4 }, (_, i) => pet(`p${i}`, "player")),
    ...Array.from({ length: 4 }, (_, i) => pet(`e${i}`, "enemy")),
  ]);
  assert.equal(full.participants.length, 8);
});

check("Wildwood opt-in accepts levels through 30 without changing the default cap", () => {
  for (const level of [1, 2, 10, 11, 29, 30]) {
    const inputs = [pet("p", "player", { level }), pet("e", "enemy")];
    const state = createBattle("wildwood", inputs, 1, 30);
    assert.equal(state.participants[0].level, level);
    const resumed = act(JSON.parse(JSON.stringify(state)), "skill", "e", "basic-strike");
    assert.equal(resumed.participants[0].level, level);
    if (level > 10) assert.throws(() => createBattle("default", inputs), BattleRuleError);
  }
  for (const level of [0, 31, 1.5, NaN]) {
    assert.throws(() => createBattle("invalid", [pet("p", "player", { level }), pet("e", "enemy")], 1, 30), BattleRuleError);
  }
  assert.throws(() => createBattle("invalid-cap", [pet("p", "player"), pet("e", "enemy")], 1, 100), /Invalid battle level cap/);
});

check("Mana capacity examples, passive bonus once, and invalid data", () => {
  for (const [mana, expected] of [[5, 15], [2, 6], [1, 3], [0, 0]]) {
    assert.equal(maximumMp(mana), expected);
  }
  assert.equal(maximumMp(2 + 1, 2), 15);
  for (const bad of [undefined, null, NaN, Infinity, "5"]) {
    assert.equal(maximumMp(bad), null);
    assert.equal(maximumMp(5, bad), bad === undefined ? 15 : null);
  }
});

check("MP survives serialization and free actions; invalid/replayed actions cannot spend it", () => {
  const state = pair({ mpMax: 15, mpCur: 4 });
  const recovered = JSON.parse(JSON.stringify(state));
  assert.equal(hasBattleMp(recovered.participants[0]), true);
  const action = { actorId: "p", turnNumber: state.turnNumber, action: "basic_attack", targetId: "e" };
  const next = resolveBattleAction(recovered, action);
  assert.equal(next.participants[0].mpCur, 4);
  assert.equal(act(next, "guard").participants[0].mpCur, 4);
  const before = structuredClone(next);
  assert.throws(() => resolveBattleAction(next, action), /Stale battle turn/);
  assert.throws(() => act(next, "basic_attack", "missing"), /Target does not exist/);
  assert.deepEqual(next, before);
  const legacy = pair({ mpMax: undefined, mpCur: undefined });
  assert.equal(hasBattleMp(legacy.participants[0]), false);
  assert.equal(act(legacy, "guard").participants[0].mpCur, undefined);
  for (const mp of [{ mpMax: 6 }, { mpCur: 1 }, { mpMax: 6, mpCur: 7 }, { mpMax: 6, mpCur: -1 }]) {
    assert.throws(() => pair({ mpMax: undefined, mpCur: undefined, ...mp }), BattleRuleError);
  }
});

check("Element Strike uses ATK and existing elemental power, even at zero MP", () => {
  const state = pair({ atk: 20, magi: 100, mpCur: 0 }, { element: "earth", def: 4 });
  const next = act(state, "skill", "e", "basic-strike");
  assert.equal(next.participants[1].hpCur, 11); // round(20 * 1.25 * 1.25 - 4 * .45) = 29
  assert.equal(next.participants[0].mpCur, 0);
});

check("Mend spends exactly 1 MP; insufficient, invalid, stale and legacy casts preserve state", () => {
  const state = pair({ hpCur: 20, mpCur: 1 });
  const action = { actorId: "p", turnNumber: state.turnNumber, action: "skill", skillId: "mend", targetId: "p" };
  const next = resolveBattleAction(state, action);
  assert.equal(next.participants[0].mpCur, 0);
  assert.equal(next.log.find(event => event.type === "heal").amount, 12);
  assert.equal(state.participants[0].mpCur, 1);
  const recovered = JSON.parse(JSON.stringify(next));
  const before = structuredClone(recovered);
  assert.throws(() => resolveBattleAction(recovered, action), /Stale battle turn/);
  assert.throws(() => act(recovered, "skill", "p", "mend"), /Not enough MP/);
  assert.deepEqual(recovered, before);
  for (const target of ["missing", "e"]) {
    assert.throws(() => act(state, "skill", target, "mend"), BattleRuleError);
    assert.equal(state.participants[0].mpCur, 1);
  }
  const legacy = pair({ mpMax: undefined, mpCur: undefined });
  const legacyBefore = structuredClone(legacy);
  assert.throws(() => act(legacy, "skill", "p", "mend"), /MP is unavailable/);
  assert.deepEqual(legacy, legacyBefore);
});

console.log(`${checks} battle engine checks passed.`);
