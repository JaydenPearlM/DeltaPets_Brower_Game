// Offline HTTP-handler contract test; no credentials or live reward mutations.
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
const user = '11111111-1111-4111-8111-111111111111';
const roomId = '22222222-2222-4222-8222-222222222222';
const calls = [];
let failHold = true;
let held;
const room = { id: roomId, status: 'resolved', event_kind: 'flavor', event_payload: { battle: null } };
const species = { id: 'fixture', rarity: 'common', line: 'water', evolution: { egg: 'Fixture Egg' },
  eggVisual: {}, rules: { encounterWeight: 1, hatchMinutes: { min: 7 } },
  eggBaseStats: { hp: 1, atk: 1, def: 1, spd: 1, magi: 1, mana: 1, base_total: 6 }, findXpReward: 5 };
const db = {
  from(table) {
    const query = {
      select() { return this; }, eq() { return this; }, neq() { return this; },
      is() { return this; }, in() { return this; }, order() { return this; }, limit() { return this; },
      maybeSingle() { return Promise.resolve({ data: room, error: null }); },
      insert() { throw Error('Wildwood acceptance must never insert permanent pets'); },
      then(resolve,reject) { return Promise.resolve({ data: table === 'pets' ? [{id:user}] : table === 'wildwood_rooms' ? [room] : [], error: null }).then(resolve,reject); },
    }; return query;
  },
  async rpc(name,args) {
    calls.push({name,args}); assert.equal(args.p_user_id,user);
    assert.equal(name,'hold_wildwood_egg');
    if(failHold) return {data:null,error:new Error('test persistence failure')};
    held=args;room.event_payload.eggTreasure={status:'pending',egg:args.p_egg};
    return {data:{success:true,held:true,encounterId:args.p_encounter_id,xp_awarded:5},error:null};
  },
};
const auth=(_req,_res,next)=>next();
Module._load=function(request) {
  if(request==='node:crypto') return {...original.apply(this,arguments),randomInt:()=>0};
  if(request.endsWith('/lib/supabaseAdmin')) return {supabaseAdmin:db};
  if(request.endsWith('/middleware/auth')) return {requireUser:auth};
  if(request.endsWith('/lib/logger')) return {logger:{error(){},info(){}}};
  if(request==='./wildwoodState') return {getWildwoodState:async()=>({expedition:{id:user}})};
  if(request.endsWith('/species/kithna-species')) return {getKithnaEggsForTime:()=>[species]};
  if(request.endsWith('/pets/eggQualityRoll')) return {rollNonStarterEggQuality:async()=>({hatch_minutes:9,mutation_capacity:1})};
  return original.apply(this,arguments);
};
const {kithnaRouter}=require('../backend/server/dist/routes/cities/kithna/kithnaEncounter');
const {wildwoodTreasureRouter}=require('../backend/server/dist/routes/cities/kithna/wildwoodTreasure');
Module._load=original;
async function invoke(router,path,body={}) {
  const route=router.stack.find(x=>x.route?.path===path).route;
  const res={statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  await route.stack.at(-1).handle({user:{id:user},body},res);return res;
}
(async()=>{
  assert.equal((await invoke(kithnaRouter,'/roam',{wildwoodRoomId:'bad'})).statusCode,400);
  assert.equal((await invoke(kithnaRouter,'/roam',{wildwoodRoomId:roomId})).body.found,true);
  assert.equal(calls.length,0,'An offer is not yet an earned reward');
  assert.equal((await invoke(kithnaRouter,'/roam/take')).statusCode,500);
  failHold=false;
  const result=await invoke(kithnaRouter,'/roam/take');
  assert.equal(result.body.location,'treasure'); assert.equal(result.body.held,true);
  assert.equal(held.p_room_id,roomId); assert.equal(held.p_egg.pending_hatch_minutes,7);
  assert.deepEqual(held.p_base_stats,species.eggBaseStats);
  assert.equal(calls[0].args.p_encounter_id,calls[1].args.p_encounter_id,'Retry keeps the same generated egg');
  const treasure=await invoke(wildwoodTreasureRouter,'/');
  assert.equal(treasure.body.eggs[0].name,'Fixture Egg');assert.equal(treasure.body.items.length,0);
  assert.equal((await invoke(kithnaRouter,'/roam/take')).statusCode,409);
  assert.equal((await invoke(kithnaRouter,'/roam',{wildwoodRoomId:roomId})).body.found,false);
  console.log('PASS egg handlers: room-scoped offer, failed acceptance retry, preserved generation values, temporary receipt, API egg list, no permanent insert or double acceptance.');
})().catch(e=>{console.error(e);process.exitCode=1});
