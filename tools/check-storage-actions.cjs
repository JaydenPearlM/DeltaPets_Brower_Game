// Route contract checks only; these doubles do NOT prove database atomicity.
// Run from repository root: node tools/check-storage-actions.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("../backend/server/node_modules/typescript");
const filename = path.resolve("backend/server/src/routes/pets/storageActions.ts");
const userId = "11111111-1111-4111-8111-111111111111";
const petId = "22222222-2222-4222-8222-222222222222";
let calls = [], rpcError = null;
const originalLoad = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename === filename) {
    if (name === "../../middleware/auth") return { requireUser: () => {} };
    if (name === "../../lib/logger") return { logger: { error() {} } };
    if (name === "../../lib/supabaseAdmin") return { supabaseAdmin: {
      async rpc(name, args) { calls.push({ name, args }); return { error: rpcError }; },
    } };
  }
  return originalLoad.call(this, name, parent, ...rest);
};
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true },
}).outputText;
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(compiled, filename);
Module._load = originalLoad;
const { handleStorageAction } = mod.exports;

async function request(body, user = { id: userId }) {
  let status = 200, payload;
  await handleStorageAction({ body, user }, {
    status(value) { status = value; return this; },
    json(value) { payload = value; return this; },
  });
  return { status, payload };
}

(async () => {
  assert.equal((await request({ action: "set_active", petId }, null)).status, 401);
  assert.equal(calls.length, 0);
  for (const body of [
    {}, { action: "unknown", petId }, { action: "set_active", petId: "bad" },
    { action: "assign_party", petId, slotIndex: 0 },
    { action: "assign_party", petId, slotIndex: 5 },
    { action: "assign_party", petId, slotIndex: 1.5 },
    { action: "assign_party", petId },
    { action: "return_party", slotIndex: 1, petId },
    { action: "set_active", petId, userId: "another-player" },
    { action: "incubate_storage", petId, hatch_ends_at: "2000-01-01" },
    { action: "store_pet", petId, xp: 9999 },
  ]) assert.equal((await request(body)).status, 400, JSON.stringify(body));
  assert.equal(calls.length, 0, "Invalid inputs must not reach privileged RPC");
  for (const action of ["set_active", "store_pet", "incubate_storage",
    "incubate_inventory", "store_inventory_egg", "store_hatchery_egg"]) {
    assert.equal((await request({ action, petId })).status, 200);
    assert.deepEqual(calls.at(-1), { name: "apply_pet_storage_action", args: {
      p_user_id: userId, p_action: action, p_pet_id: petId, p_slot_index: null,
    } });
  }
  assert.equal((await request({ action: "assign_party", petId, slotIndex: 4 })).status, 200);
  assert.equal(calls.at(-1).args.p_slot_index, 4);
  assert.equal((await request({ action: "return_party", slotIndex: 2 })).status, 200);
  assert.equal(calls.at(-1).args.p_pet_id, null);
  rpcError = { code: "P0001", message: "Pet not found." };
  assert.deepEqual(await request({ action: "set_active", petId }), {
    status: 400, payload: { error: "Pet not found." },
  });
  rpcError = { code: "XX000", message: "private database details" };
  assert.deepEqual(await request({ action: "set_active", petId }), {
    status: 500, payload: { error: "Storage update failed." },
  });
  console.log("PASS storage route validation, authenticated identity forwarding and error handling (RPC double; no database proof)");
})().catch(error => { console.error(error); process.exitCode = 1; });
