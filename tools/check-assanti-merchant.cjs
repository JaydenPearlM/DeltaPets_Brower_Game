// Run after the backend build: node tools/check-assanti-merchant.cjs
// Exercises the real router and Zod middleware with isolated auth/RPC doubles.
// This does NOT execute PostgreSQL or prove transaction rollback/RLS behavior.
const assert = require("node:assert/strict");
const Module = require("node:module");
const { once } = require("node:events");
const path = require("node:path");
const backendRequire = Module.createRequire(path.resolve(__dirname, "../backend/server/package.json"));
const express = backendRequire("express");
const originalLoad = Module._load;
const calls = [];
let rpcResult = { data: { ok: true }, error: null };
let throwRpc = false;
Module._load = function(request, parent, isMain) {
  if (request === "../../middleware/auth") return {
    requireUser(req, res, next) {
      if (!req.headers["x-test-user"]) return res.status(401).json({ error: "Not authenticated." });
      req.user = { id: req.headers["x-test-user"] };
      next();
    },
  };
  if (request === "../../lib/supabaseAdmin") return {
    supabaseAdmin: { async rpc(name, args) {
      calls.push({ name, args });
      if (throwRpc) throw Error("private database details");
      return rpcResult;
    } },
  };
  return originalLoad.call(this, request, parent, isMain);
};
const { kithnaMerchantsRouter } = require("../backend/server/dist/routes/merchants/kithnaMerchants.js");
Module._load = originalLoad;
const app = express();
app.use(express.json(), kithnaMerchantsRouter);
app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ error: error.message }));

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  let checked = 0;
  const send = async (direction, body, user = "account-A") => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/food/${direction}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(user ? { "x-test-user": user } : {}) },
      body: JSON.stringify(body),
    });
    checked++;
    return { status: response.status, body: await response.json() };
  };
  try {
    for (const direction of ["purchase", "sell"]) {
      const before = calls.length;
      assert.equal((await send(direction, { slug: "alpha-meat", quantity: 1 }, "")).status, 401);
      for (const quantity of [-1, 0, 1.5, "2", null, 429496730]) {
        assert.equal((await send(direction, { slug: "alpha-meat", quantity })).status, 400);
      }
      for (const slug of ["unknown", "", null, {}, "ALPHA-MEAT"]) {
        assert.equal((await send(direction, { slug, quantity: 1 })).status, 400);
      }
      for (const extra of [{ price: 9999 }, { total: 0 }, { user_id: "account-B" }, { owned: 999 }]) {
        assert.equal((await send(direction, { slug: "alpha-meat", quantity: 1, ...extra })).status, 400);
      }
      assert.equal((await send(direction, { quantity: 1 })).status, 400);
      assert.equal(calls.length, before, "Rejected requests must never reach the database");
      for (const slug of ["alpha-meat", "alpha-vegetables"]) {
        rpcResult = { data: { ok: true, slug, quantity: 2 }, error: null };
        const response = await send(direction, { slug, quantity: 2 });
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, rpcResult.data);
        assert.deepEqual(calls.at(-1), {
          name: "trade_assanti_food",
          args: { p_user_id: "account-A", p_slug: slug, p_quantity: 2, p_direction: direction },
        });
      }
    }
    const beforeLimit = calls.length;
    assert.equal((await send("purchase", { slug: "alpha-meat", quantity: 51 })).status, 400);
    assert.equal(calls.length, beforeLimit);
    await send("sell", { slug: "alpha-meat", quantity: 1 }, "account-B");
    assert.equal(calls.at(-1).args.p_user_id, "account-B");
    for (const message of ["Not enough owned food.", "Not enough Dots.", "Food stack is full."]) {
      rpcResult = { data: null, error: { code: "P0001", message } };
      const response = await send("sell", { slug: "alpha-meat", quantity: 1 });
      assert.equal(response.status, 400);
      assert.equal(response.body.error, message);
    }
    rpcResult = { data: null, error: { code: "23514", message: "private database details" } };
    assert.deepEqual(await send("purchase", { slug: "alpha-meat", quantity: 1 }), {
      status: 500, body: { error: "Failed to process food trade." },
    });
    throwRpc = true;
    assert.equal((await send("sell", { slug: "alpha-meat", quantity: 1 })).status, 500);
    console.log(`PASS: ${checked} real-router requests; validation, authenticated identity, single RPC, safe errors.`);
    console.log("Database ownership, atomicity, concurrency and RLS require a disposable PostgreSQL database.");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
