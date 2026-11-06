// Exercises the actual Express routes/auth middleware with a database double.
// No network calls to Supabase and no player data writes.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const backendRequire = Module.createRequire(path.resolve('backend/server/package.json'));
const express = backendRequire('express');
const originalLoad = Module._load;
const userId = '00000000-0000-4000-8000-000000000001';
const version = '00000000-0000-4000-8000-000000000002';
let calls = [], response = { data: {}, error: null };
const db = {
  auth: { async getUser(token) { return { data: { user: token === 'valid-test-token' ? {id:userId} : null } }; } },
  async rpc(name,args) { calls.push({name,args}); return response; },
};
Module._load = function(name,parent,isMain) {
  if (name.endsWith('/lib/supabaseAdmin')) return {supabaseAdmin:db};
  if (name.endsWith('/lib/logger')) return {logger:{error(){}}};
  if (name.endsWith('/env.server')) return {env:{}};
  return originalLoad.call(this,name,parent,isMain);
};
const {poeTayToeRouter} = require('../backend/server/dist/routes/alphaAccess/poeTayToe/poeTayToe.js');
Module._load = originalLoad;
const app = express();
app.use(express.json());
app.use('/api/poe-tay-toe',poeTayToeRouter);
const server = app.listen(0,'127.0.0.1');
async function request(route='', body, token='valid-test-token') {
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/poe-tay-toe${route}`, {
    method:body === undefined ? 'GET':'POST',
    headers:{'Content-Type':'application/json',...(token ? {Authorization:`Bearer ${token}`} : {})},
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),
  });
  return {status:res.status,body:await res.json(),headers:res.headers};
}
(async()=>{
  await new Promise(resolve=>server.once('listening',resolve));
  for (const route of ['', '/find','/hide']) {
    assert.equal((await request(route,route ? {} : undefined,null)).status,401);
    assert.equal((await request(route,route ? {} : undefined,'expired')).status,401);
  }
  assert.equal(calls.length,0);
  assert.equal((await request('/find',{locationKey:'combat',version})).status,400);
  assert.equal((await request('/find',{locationKey:'home',version:[]})).status,400);
  assert.equal((await request('/hide',{locationKey:'home',discoveryId:'bad'})).status,400);
  assert.equal(calls.length,0);
  response={data:{locationKey:'home',version},error:null};
  let result=await request();
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal(result.body.locations.length,7);
  response={data:{claimed:true,discoveryId:version,effect:{key:'lucky_spud',dots:100}},error:null};
  result=await request('/find',{locationKey:'home',version,userId:'forged',dots:999999});
  assert.equal(result.status,200);
  assert.deepEqual(calls.at(-1),{name:'claim_poe_tay_toe_v2',args:{p_user_id:userId,p_location_key:'home',p_version:version}});
  response={data:{claimed:false,reason:'cooldown',cooldownEndsAt:'2026-11-02T18:00:00Z'},error:null};
  assert.equal((await request('/find',{locationKey:'home',version})).status,409);
  response={data:false,error:null};
  assert.equal((await request('/hide',{locationKey:'home',discoveryId:version,userId:'forged'})).status,409);
  assert.equal(calls.at(-1).args.p_user_id,userId);
  response={data:true,error:null};
  assert.equal((await request('/hide',{locationKey:'home',discoveryId:version})).body.hidden,true);
  response={data:null,error:{message:'private database details'}};
  for (const [route,body] of [['',undefined],['/find',{locationKey:'home',version}],['/hide',{locationKey:'home',discoveryId:version}]]) {
    result=await request(route,body);
    assert.equal(result.status,503);
    assert(!JSON.stringify(result.body).includes('private database details'));
  }
  console.log('PASS real auth middleware, validation, authenticated identity, version/discovery contracts, conflicts, no-store and safe errors (database double).');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
