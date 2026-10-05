// node tools/check-daily-reward-route.cjs
// Real TypeScript auth/route handlers with an RPC boundary double. No network or
// player data. These checks do NOT prove PostgreSQL concurrency or rollback.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const backendRequire = createRequire(path.join(root, "backend/server/package.json"));
const ts = backendRequire("typescript");
const zod = backendRequire("zod");
const userId = "11111111-1111-4111-8111-111111111111";
const routes = new Map();
let calls = [], rpcResult, rpcThrows = false;
const db = {
  auth: {
    async getUser(token) {
      return token === "valid-token"
        ? { data: { user: { id: userId } }, error: null }
        : { data: { user: null }, error: new Error("Invalid token") };
    },
  },
  from() { throw new Error("Claim must not perform separate table operations"); },
  async rpc(name, args) {
    calls.push({ name, args });
    if (rpcThrows) throw new Error("Database unavailable");
    return rpcResult;
  },
};
const logger = { error() {} };
function load(relative, imports) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", js)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import ${name}`);
    return imports[name];
  }, exports);
  return exports;
}
const express = {
  Router: () => ({
    get(route, ...handlers) { routes.set(`GET ${route}`, handlers); },
    post(route, ...handlers) { routes.set(`POST ${route}`, handlers); },
  }),
};
const auth = load("backend/server/src/middleware/auth.ts", {
  express, "../lib/supabaseAdmin": { supabaseAdmin: db }, "../lib/logger": { logger },
});
load("backend/server/src/routes/rewards/rewards.ts", {
  express, zod, "../../middleware/auth": auth,
  "../../lib/supabaseAdmin": { supabaseAdmin: db }, "../../lib/logger": { logger },
});
async function request(body, authorization = "Bearer valid-token") {
  calls = [];
  const req = { headers: { authorization }, body };
  const res = {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  for (const handler of routes.get("POST /claim")) {
    let next = false;
    await handler(req, res, () => { next = true; });
    if (!next) break;
  }
  return res;
}
async function main() {
  for (const header of [undefined, "", "Basic xyz", "Bearer invalid-token"]) {
    // Explicit undefined must bypass request's default parameter.
    const res = await request({}, header === undefined ? null : header);
    assert.equal(res.statusCode, 401);
    assert.equal(calls.length, 0);
  }
  for (const body of [{ user_id: "another-player" }, { amount: 999 }, { day: 0 }, { now: "2099-01-01" }, [], "claim"]) {
    const res = await request(body);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  }
  const rewards = [
    { kind: "dots", amount: 300, label: "300 Dots" },
    { kind: "dots", amount: 200, label: "200 Dots" },
    { kind: "item", slug: "haiku_scroll_50", qty: 1, label: "Haiku Scroll #50" },
    { kind: "item", slug: "potion_small", qty: 3, label: "Potions x3" },
    { kind: "xp", amount: 100, label: "EXP +100" },
    { kind: "dots", amount: 500, label: "500 Dots" },
    { kind: "ribbon", label: "Alpha Tester Ribbon" },
  ];
  for (const [dayIndex, reward] of rewards.entries()) {
    const result = { ok: true, reward, streak: dayIndex + 1, dayIndex, reset: dayIndex === 0 };
    rpcResult = { data: result, error: null };
    const res = await request(undefined);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, result);
    assert.deepEqual(calls, [{ name: "claim_daily_login_reward", args: { p_user_id: userId } }]);
  }
  rpcResult = { data: { ok: false, error: "Already claimed today." }, error: null };
  assert.equal((await request({})).statusCode, 400);
  assert.equal(calls.length, 1);
  for (const result of [
    { data: null, error: new Error("private database diagnostic") },
    { data: null, error: null },
    { data: { ok: true }, error: null },
  ]) {
    rpcResult = result;
    const res = await request({});
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Failed to claim daily reward." });
  }
  rpcThrows = true;
  assert.equal((await request({})).statusCode, 500);
  console.log("PASS daily reward route/auth contract: missing/invalid token, client spoofing/malformed payload rejection, one own-user RPC, all seven response shapes, duplicate/error handling.");
  console.log("NOT EXECUTED: real database concurrent claims, reward counts, transaction rollback and privileges. RPC doubles are not database concurrency proof.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
