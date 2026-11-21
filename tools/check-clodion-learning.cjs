// Offline service contract test; does not prove database transactions or live schema.
const assert = require('node:assert/strict');
const Module = require('node:module');
const owner = '11111111-1111-4111-8111-111111111111';
const petId = '22222222-2222-4222-8222-222222222222';
const { getLevel2Design } = require('../backend/server/dist/pets/level2/contracts');
const design = getLevel2Design('kithna_clodian', 'storm');
const definitions = design.candidates.map((c, i) => ({
  id: `33333333-3333-4333-8333-33333333333${i}`, slug:c.proposed_skill_id,
  name:c.name, description:c.description, required_level:2,
  requirements:{combat_enabled:true, config_version:'level-2-v1',milestone_key:'level-2',
    element:'storm',species_ids:['kithna_clodian'],prerequisite_slugs:[]},
}));
const pet = {id:petId,user_id:owner,species:'kithna_clodian',line:'storm',stage:'hatchling',ran_away:false,level:2,xp:100,
  unspent_points:1,hp_max:20,hp_cur:20,atk:4,magi:5,def:4,spd:4,mana:3};
let saved = null;
const allocations = []; const receipts = new Map();
const fake = {
  from(table) {
    const filters={};
    const result=()=>({error:null,data:table==='pets'
      ? filters.user_id===owner&&filters.id===petId?pet:null
      :table==='pet_skills'?saved?[{skill_id:saved,equipped:true,equipped_slot:1,unlocked_at:'2026-11-16'}]:[]
      :table==='pet_skill_milestone_claims'?saved?[{skill_id:saved,milestone_key:'level-2',config_version:'level-2-v1',eligible_choices:definitions,equipment_decision:'auto_equipped',equipment_decision_slot:1}]:[]
      :table==='pet_stat_allocations'?allocations:definitions});
    const query={select(){return query},eq(k,v){filters[k]=v;return query},
      maybeSingle(){return Promise.resolve(result())},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}};
    return query;
  },
  async rpc(name,args){
    assert.equal(args.p_user_id,owner);assert.equal(args.p_pet_id,petId);
    if(name==='allocate_level2_stats'){
      const old=receipts.get(args.p_request_id);
      if(old)return old.allocation===JSON.stringify(args.p_allocation)?{data:old.result,error:null}:{data:null,error:{message:'L2_CONFLICT'}};
      const spent=Object.values(args.p_allocation).reduce((a,b)=>a+b,0);
      if(spent>pet.unspent_points)return {data:null,error:{message:'L2_POINTS'}};
      pet.unspent_points-=spent;pet.hp_max+=args.p_allocation.hp*2;
      for(const k of ['atk','magi','def','spd','mana'])pet[k]+=args.p_allocation[k];
      allocations.push({level:2,...args.p_allocation});
      const result={request_id:args.p_request_id,pet_id:petId,spent,...pet};
      receipts.set(args.p_request_id,{allocation:JSON.stringify(args.p_allocation),result:structuredClone(result)});
      return {data:result,error:null};
    }
    assert.equal(name,'claim_species_skill');
    assert.equal(args.p_choices.length,4);assert.equal(args.p_level,2);assert.equal(args.p_species,pet.species);
    const selected=definitions.find(d=>d.slug===args.p_skill_slug);
    if(saved&&saved!==selected.id)return {error:{message:'SKILL_CONFLICT'},data:null};
    saved=selected.id;return {error:null,data:{skill_id:saved,milestone_key:'level-2',equipment_decision:'auto_equipped',equipment_decision_slot:1}};
  },
};
const original=Module._load;
Module._load=function(name,parent,main){return name==='../../lib/supabaseAdmin'?{supabaseAdmin:fake}:original.call(this,name,parent,main)};
const service=require('../backend/server/dist/pets/level2/service');Module._load=original;
(async()=>{
  assert.deepEqual((await service.readLevel2(owner,petId)).choices.map(d=>d.slug),definitions.map(d=>d.slug));
  assert.equal((await service.readLevel2(owner,petId)).availablePoints,1);
  const request={requestId:'44444444-4444-4444-8444-444444444444',allocation:{hp:1,atk:0,magi:0,def:0,spd:0,mana:0}};
  await assert.rejects(service.allocateLevel2(owner,petId,{...request,allocation:{...request.allocation,hp:2}}),e=>e.code==='L2_POINTS');
  await assert.rejects(service.allocateLevel2(owner,petId,{...request,allocation:{...request.allocation,hp:-1}}));
  const spent=await service.allocateLevel2(owner,petId,request);
  assert.deepEqual(await service.allocateLevel2(owner,petId,request),spent);
  assert.equal(pet.hp_max,22); assert.equal(pet.hp_cur,20);assert.equal(saved,null);
  assert.equal((await service.readLevel2(owner,petId)).availablePoints,0);
  await assert.rejects(service.readLevel2('55555555-5555-4555-8555-555555555555',petId),e=>e.statusCode===404);
  const choice={skillSlug:definitions[3].slug};
  const receipt=await service.chooseLevel2(owner,petId,choice);
  assert.deepEqual(await service.chooseLevel2(owner,petId,choice),receipt);
  const state=await service.readLevel2(owner,petId);
  assert.equal(state.learned.length,1);assert.equal(state.learned[0].definition.slug,choice.skillSlug);
  assert.equal(state.choices.length,0);
  assert.equal(state.combatSkills[0].slug,choice.skillSlug);
  assert.deepEqual((await service.readLevel2(owner,petId)).learned,state.learned);
  await assert.rejects(service.chooseLevel2(owner,petId,{skillSlug:definitions[0].slug}),e=>e.code==='SKILL_CONFLICT');
  assert.equal(saved,definitions[3].id);
  console.log('PASS: Clodion four-choice offer, single mocked save/retrieval, identical retry, conflicting retry, preserved learned choice. Database behavior NOT verified.');
})().catch(e=>{console.error(e);process.exitCode=1});
