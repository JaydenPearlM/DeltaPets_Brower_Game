// Offline state/contract checks. Does NOT simulate or verify PostgreSQL transactions.
const assert = require('node:assert/strict');
const adminPath = require.resolve('../backend/server/dist/lib/supabaseAdmin');
let calls = [];
require.cache[adminPath] = { id: adminPath, filename: adminPath, loaded: true, exports: { supabaseAdmin: {
  async rpc(name, args) { calls.push({name,args}); return {error:null,data:{
    skill_id:'11111111-1111-4111-8111-111111111111', milestone_key:args.p_milestone_key ?? `level-${args.p_level}`,
    equipment_decision: name === 'claim_species_skill' ? 'auto_equipped' : args.p_slot === null ? 'declined' : 'replaced',
    equipment_decision_slot: name === 'claim_species_skill' ? 1 : args.p_slot,
  }}; },
} } };
const { learningPath, skillState, skillMilestones, learnSkill, decideEquipment } = require('../backend/server/dist/pets/level2/skillProgression');
const { CHARACTER_PROFILES } = require('../backend/server/dist/shared/pets/characterProfiles/characterRegistry');
const { ALL_PET_SPECIES } = require('../backend/server/dist/shared/pets/species/all-species');
assert.deepEqual(skillMilestones,[2,5,8,11,14,17,20,23,26,30]);
const pet = {id:'22222222-2222-4222-8222-222222222222',species:'light_starter',line:'light',level:30,stage:'hatchling',ran_away:false};
let supported = 0, starters = 0;
for (const profile of CHARACTER_PROFILES) {
  for (const species of profile.species_ids) {
    assert(ALL_PET_SPECIES.some(s=>s.id===species));
    const p={...pet,species,line:profile.element};
    const path=learningPath(species,p.line);
    if(species==='velune') {
      assert.deepEqual(path,[]);assert.equal(skillState(p,[],[],[]).skillStatus,'definitions_unavailable');continue;
    }
    assert.equal(path.length,10);
    assert.deepEqual(learningPath(species,'wrong-element'),[]);
    const definitions=[],learned=[],claims=[];
    for(let i=0;i<path.length;i++) {
      const m=path[i];
      assert.deepEqual(m.candidates.map(c=>c.role).sort(),['dps','healer','sorcerer','tank']);
      assert(m.candidates.every(c=>c.speciesIds.includes(species)&&c.level===m.level));
      const before=skillState({...p,level:m.level-1},learned,claims,definitions);
      assert.equal(before.choices.length,0);
      const eligible=skillState(p,learned,claims,definitions);
      assert.equal(eligible.nextMilestone,m.level);assert.equal(eligible.choices.length,4);
      const choice=m.candidates[i%4]; // Role mixing does not impose prerequisites.
      const id=`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`;
      definitions.push({id,slug:choice.slug,name:choice.name,description:choice.description,required_level:m.level,
        requirements:{milestone_key:m.milestoneKey}});
      learned.push({skill_id:id,equipped:i<4,equipped_slot:i<4?i+1:null,unlocked_at:'2026-11-19'});
      claims.push({skill_id:id,milestone_key:m.milestoneKey,config_version:'species-learning-v1',eligible_choices:[],
        equipment_decision:i<4?'auto_equipped':'pending',equipment_decision_slot:i<4?i+1:null});
      if(i>=4){
        const pending=skillState(p,learned,claims,definitions);
        assert.equal(pending.choices.length,0);assert.equal(pending.pendingReplacement.skill_id,id);
        claims[i].equipment_decision='declined';
        assert.equal(skillState(p,learned,claims,definitions).learned.length,i+1);
      }
      const state=skillState(p,learned,claims,definitions);
      assert.equal(state.equippedSlots.filter(s=>s.skill).length,Math.min(4,i+1));
      assert.equal(state.normalLoadoutEditingAllowed,false);
      for(const stage of ['lowform','highform','legion']) assert.deepEqual(skillState({...p,stage},learned,claims,definitions),state);
      assert.deepEqual(skillState({...p,location:'storage'},learned,claims,definitions),state);
      assert.deepEqual(skillState({...p,partySlot:3},learned,claims,definitions),state);
    }
    assert.equal(skillState(p,learned,claims,definitions).nextMilestone,null);
    assert.equal(skillState({...p,stage:'egg'},[],[],[]).skillStatus,'ineligible');
    assert.equal(skillState({...p,ran_away:true},[],[],[]).choices.length,0);
    const legacy=structuredClone(learned);legacy[0].equipped_slot=null;
    assert.equal(skillState(p,legacy,claims,definitions).skillStatus,'reconciliation_required');
    assert.equal(skillState(p,learned,claims.slice(1),definitions).skillStatus,'reconciliation_required');
    assert.equal(skillState(p,learned.slice(1),claims,definitions).skillStatus,'reconciliation_required');
    assert.equal(skillState(p,learned.slice(1),claims.slice(1),definitions).skillStatus,'reconciliation_required');
    const duplicateId='44444444-4444-4444-8444-444444444444';
    const extraChoice=path[0].candidates.find(c=>c.slug!==definitions[0].slug);
    const extraDefinition={...definitions[0],id:duplicateId,slug:extraChoice.slug,name:extraChoice.name};
    const extraLearned={...learned[0],skill_id:duplicateId,equipped:false,equipped_slot:null};
    assert.equal(skillState(p,[...learned,extraLearned],claims,[...definitions,extraDefinition]).skillStatus,'reconciliation_required');
    const wrongClaim=structuredClone(claims);wrongClaim[0].skill_id=learned[1].skill_id;
    assert.equal(skillState(p,learned,wrongClaim,definitions).skillStatus,'reconciliation_required');
    const wrongLevel=structuredClone(definitions);wrongLevel[0].required_level=30;
    assert.equal(skillState(p,learned,claims,wrongLevel).skillStatus,'reconciliation_required');
  }
  if(profile.species_key!=='velune') {supported++;if(['solen','kindlekin','mizu','twiglet','wistpip','cribi','volb','esperon'].includes(profile.species_key))starters++;}
}
assert.equal(supported,13);assert.equal(starters,8);assert.equal(CHARACTER_PROFILES.length,14);
(async()=>{
  const path=learningPath(pet.species,pet.line);
  await learnSkill('owner',pet,path[0].candidates[0].slug);
  assert.equal(calls[0].args.p_choices.length,4);assert.equal(calls[0].args.p_pet_id,pet.id);
  assert(!('damage' in calls[0].args.p_choices[0]));
  const n=calls.length;
  await assert.rejects(learnSkill('owner',{...pet,level:1},path[0].candidates[0].slug));
  await assert.rejects(learnSkill('owner',pet,'clodion-static-gust'));
  await assert.rejects(learnSkill('owner',{...pet,stage:'egg'},path[0].candidates[0].slug));
  await assert.rejects(decideEquipment('owner',pet,{milestoneKey:'level-3',slot:1}));
  await assert.rejects(decideEquipment('owner',pet,{milestoneKey:'level-2',slot:5}));
  await assert.rejects(decideEquipment('owner',pet,{milestoneKey:'level-2',slot:1,skillId:'forged'}));
  assert.equal(calls.length,n);
  for(const slot of [1,4,null]) {
    const result=await decideEquipment('owner',pet,{milestoneKey:'level-14',slot});
    assert.equal(result.equipment_decision,slot===null?'declined':'replaced');
    assert.equal(calls.at(-1).args.p_user_id,'owner');assert.equal(calls.at(-1).args.p_pet_id,pet.id);
  }
  console.log('PASS: 14 species inspected; 13 paths / 8 starters / ten milestones; Velune explicitly unavailable; oldest-first offers, pending/declined snapshots, slot/legacy validation, evolution/storage identity, and trusted RPC inputs. No database transactions tested.');
})().catch(e=>{console.error(e);process.exitCode=1;});
