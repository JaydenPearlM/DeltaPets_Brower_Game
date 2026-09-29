// Run after backend build: node tools/check-owned-care.cjs
// Real Express handlers and care calculations; auth, repository and RPC are doubles.
// No database, credentials, or live player data are used.
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const { once } = require("node:events");
const backendRequire = Module.createRequire(path.resolve(__dirname, "../backend/server/package.json"));
const express = backendRequire("express");
const originalLoad = Module._load;
const user = "11111111-1111-4111-8111-111111111111";
const petId = "22222222-2222-4222-8222-222222222222";
const freshPet = () => ({
  id: petId, user_id: user, stage: "hatchling", hunger: 10, clean: 10, happy: 10,
  comfort: 10, rest: 10, energy: 20, bond: 10, neglect_hours: 0, ran_away: false,
  runaway_at: null, last_care_decay_at: new Date().toISOString(),
  cd_feed_ends_at: null, cd_clean_ends_at: null, cd_play_ends_at: null, cd_bond_ends_at: null,
});
let pet = freshPet(), failure = null, staleCount = 0;
const calls = [];
Module._load = function(request, parent, isMain) {
  if (request.endsWith("middleware/auth")) return {
    requireUser(req, res, next) {
      if (!req.headers["x-test-user"]) return res.status(401).json({ error: "Unauthorized" });
      req.user = { id: req.headers["x-test-user"] };
      next();
    },
  };
  if (request.endsWith("routePets/petsRepo")) return {
    async fetchActivePet(id) { assert.equal(id, user); return { pet: structuredClone(pet), used: "is_active" }; },
  };
  if (request.endsWith("supabaseAdmin")) return {
    supabaseAdmin: {
      async rpc(name, args) {
        calls.push({ name, args });
        if (failure) return { data: null, error: { code: "P0001", message: failure } };
        if (staleCount-- > 0) {
          pet.happy = 20;
          return { data: null, error: { code: "P0001", message: "CARE_STALE" } };
        }
        if (name === "perform_owned_care") {
          return { data: { pet: { ...pet, ...args.p_patch }, consumed_slug: args.p_action === "bond" ? null : "owned-item" }, error: null };
        }
        if (name === "claim_assanti_daily_food") return { data: { claimed: true }, error: null };
        throw Error("Unexpected RPC " + name);
      },
    },
  };
  return originalLoad.call(this, request, parent, isMain);
};
const { petActionsRouter } = require("../backend/server/dist/routes/care/petActions.js");
const { ownedCareHandler } = require("../backend/server/dist/routes/care/ownedCare.js");
const { kithnaMerchantsRouter } = require("../backend/server/dist/routes/merchants/kithnaMerchants.js");
Module._load = originalLoad;
const app = express();
app.use(express.json());
app.use("/actions", petActionsRouter);
for (const action of ["feed", "clean", "play", "pet"]) {
  app.post("/legacy/" + action, (req, res, next) => { req.user = { id: user }; next(); }, ownedCareHandler(action));
}
app.use("/merchant", kithnaMerchantsRouter);

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  let count = 0;
  async function send(url, body, authenticated = true) {
    count++;
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, {
      method: "POST", headers: { "content-type": "application/json", ...(authenticated ? { "x-test-user": user } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await send("/actions/do", { action: "feed" }, false)).status, 401);
    for (const body of [{ action: "unknown" }, { action: "feed", amount: 50 }, { action: "feed", user_id: "B" }, { action: "feed", item: "fake" }, {}]) {
      assert.equal((await send("/actions/do", body)).status, 400);
    }
    assert.equal(calls.length, 0);
    for (const [action, expected] of [
      ["feed", { hunger: 25, happy: 13 }], ["clean", { clean: 25, happy: 12 }],
      ["play", { happy: 18, energy: 17 }], ["bond", { bond: 18, happy: 15 }],
      ["pet", { comfort: 20, happy: 15 }],
    ]) {
      pet = freshPet();
      const response = await send("/actions/do", { action });
      assert.equal(response.status, 200, JSON.stringify(response));
      for (const [key, value] of Object.entries(expected)) assert.equal(response.body.pet[key], value);
      const call = calls.at(-1);
      assert.equal(call.name, "perform_owned_care");
      assert.equal(call.args.p_user_id, user);
      assert.equal(call.args.p_pet_id, petId);
      assert.equal(call.args.p_expected.happy, 10);
      if (action === "clean" || action === "play" || action === "bond") {
        const duration = { clean: 90000, play: 120000, bond: 75000 }[action];
        assert.equal(Date.parse(call.args.p_patch[`cd_${action}_ends_at`]) - Date.parse(response.body.server_now), duration);
      }
    }
    for (const action of ["feed", "clean", "play", "pet"]) {
      assert.equal((await send("/legacy/" + action, { amount: 50 })).status, 400);
      assert.equal((await send("/legacy/" + action)).status, 200);
    }
    for (const [message, status] of [["CARE_NO_ITEM", 409], ["CARE_COOLDOWN", 409], ["CARE_RUNAWAY", 409], ["CARE_NO_PET", 404], ["internal detail", 500]]) {
      failure = message;
      const response = await send("/actions/do", { action: "feed" });
      assert.equal(response.status, status);
      assert.ok(!JSON.stringify(response).includes("internal detail"));
    }
    failure = null;
    pet = freshPet(); staleCount = 1;
    const before = calls.length;
    const retry = await send("/actions/do", { action: "feed" });
    assert.equal(retry.status, 200); assert.equal(retry.body.pet.happy, 23);
    assert.equal(calls.length, before + 2); assert.equal(calls.at(-1).args.p_expected.happy, 20);
    staleCount = 5;
    const beforeLimit = calls.length;
    assert.equal((await send("/actions/do", { action: "feed" })).status, 409);
    assert.equal(calls.length, beforeLimit + 3);
    staleCount = 0;
    for (const body of [{ quantity: 1000 }, { claimed_at: "tomorrow" }, { user_id: "B" }]) {
      assert.equal((await send("/merchant/food/daily", body)).status, 400);
    }
    assert.equal((await send("/merchant/food/daily", undefined, false)).status, 401);
    assert.equal((await send("/merchant/food/daily")).status, 200);
    assert.deepEqual(calls.at(-1), { name: "claim_assanti_daily_food", args: { p_user_id: user } });
    for (const message of ["Daily Food is still locked.", "Daily Food is already claimed.", "Not enough room for the full food reward."]) {
      failure = message;
      assert.equal((await send("/merchant/food/daily")).status, 409);
    }
    console.log(`PASS: ${count} requests; care effects/cooldowns, identity, tampering, legacy aliases, stale retries, daily-claim boundary.`);
    console.log("SQL consumption, rollback, RLS and concurrency are NOT exercised by these doubles.");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
