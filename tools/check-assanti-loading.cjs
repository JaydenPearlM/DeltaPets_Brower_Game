// Exercises the frontend resource loader without a browser or real player data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const webRequire = Module.createRequire(path.resolve(__dirname, '../frontend/web/package.json'));
const ts = webRequire('typescript');
const filename = path.resolve(__dirname, '../frontend/web/src/lib/kithna/merchantLoad.ts');
const mod = new Module(filename);
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText, filename);
const {loadMerchantResources} = mod.exports;
const tradeFilename = path.resolve(__dirname, '../frontend/web/src/lib/kithna/merchantTrade.ts');
const tradeMod = new Module(tradeFilename);
tradeMod._compile(ts.transpileModule(fs.readFileSync(tradeFilename, 'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,tradeFilename);
const {merchantBuyLimit} = tradeMod.exports;
async function main() {
  const item = {available:true,price:5,stackLimit:99,stock:null,stockMode:'unlimited',purchaseLimit:50};
  assert.equal(merchantBuyLimit(item,0),50);
  assert.equal(merchantBuyLimit(item,80),19);
  assert.equal(merchantBuyLimit(item,99),0);
  assert.equal(merchantBuyLimit({...item,stockMode:undefined},0),0);
  assert.equal(merchantBuyLimit({...item,stockMode:undefined,stock:7},0),7);
  assert.equal(merchantBuyLimit({...item,available:false},0),0);
  assert.equal(merchantBuyLimit({...item,price:null},0),0);
  const shop = {catalog:[{slug:'alpha-meat',category:'food'},{slug:'healing-potion',category:'potion'}]};
  const inventory = {items:[{slug:'alpha-meat',qty:2}],wallet:{dots:100,crystals:0}};
  const quests = {foodQuest:{status:'available'}};
  const failure = new Error('unavailable');
  const load = (s,i,q) => loadMerchantResources(s,i,q);
  assert.deepEqual(await load(Promise.resolve(shop),Promise.resolve(inventory),Promise.resolve(quests)),
    {shop,inventory,quests,error:null});
  assert.deepEqual(await load(Promise.reject(failure),Promise.resolve(inventory),Promise.resolve(quests)),
    {shop:null,inventory,quests,error:failure});
  assert.deepEqual(await load(Promise.resolve(shop),Promise.reject(failure),Promise.resolve(quests)),
    {shop,inventory:null,quests,error:failure});
  assert.deepEqual(await load(Promise.resolve(shop),Promise.resolve(inventory),Promise.reject(failure)),
    {shop,inventory,quests:null,error:null});
  assert.deepEqual(await load(Promise.reject(failure),Promise.reject(failure),Promise.reject(failure)),
    {shop:null,inventory:null,quests:null,error:failure});
  console.log('PASS: stock/inventory failure isolation, optional quest failure, data preservation, unlimited supply, 50-item purchase cap, stack capacity, and missing-stock rejection.');
}
main().catch(error => {console.error(error);process.exitCode=1;});
