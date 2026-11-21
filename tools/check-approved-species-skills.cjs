const assert = require('node:assert/strict');
const { createBattle, resolveBattleAction } = require('../backend/server/dist/battle/battleEngine');
const { speciesSkillIds, speciesSkill } = require('../backend/server/dist/battle/speciesSkills');
const { getLevel2Design } = require('../backend/server/dist/pets/level2/contracts');
const unit = (id, side, speciesId, element) => ({id, side, speciesId, element, name:id,
  row:'middle', level:2, hpMax:100, hpCur:50, mpMax:6, mpCur:6, atk:8, magi:16, def:4, spd:4});
for (const id of speciesSkillIds) {
  const entry = speciesSkill(id), role = entry.definition.role;
  const state = createBattle(id, [unit('p','player',entry.species_ids[0],entry.definition.element),
    unit('ally','player',entry.species_ids[0],entry.definition.element), unit('e','enemy','kithna_pebelin','earth')]);
  const action = {actorId:'p',turnNumber:state.turnNumber,action:'skill',skillId:id,targetId:['tank','healer'].includes(role)?'p':'e'};
  const before = structuredClone(state);
  assert.throws(()=>resolveBattleAction(state,action));
  for(const change of [{level:1},{speciesId:'earth_starter'},{element:'water'}]){
    const bad=structuredClone(state);Object.assign(bad.participants[0],change);
    assert.throws(()=>resolveBattleAction(bad,action,[id]));
  }
  assert.throws(()=>resolveBattleAction(state,{...action,targetId:role==='tank'?'ally':role==='healer'?'e':'p'},[id]));
  const next=resolveBattleAction(state,action,[id]);
  const p=next.participants[0];
  assert.equal(p.mpCur,role==='healer'||role==='sorcerer'?5:6);
  if(role==='tank')assert.equal(p.guarding,true);
  if(role==='healer')assert.equal(p.hpCur,74);
  if(role==='dps'||role==='sorcerer'){
    const elemental=entry.definition.element==='storm'?0.85:1;
    assert.equal(next.participants[2].hpCur,50-Math.max(1,Math.round((role==='dps'?8:16)*1.25*elemental-4*0.45)));
  }
  if(role==='healer'||role==='sorcerer'){
    const empty=structuredClone(state);empty.participants[0].mpCur=0;
    assert.throws(()=>resolveBattleAction(empty,action,[id]));
    assert.equal(empty.participants[0].mpCur,0);
  }
  assert.throws(()=>resolveBattleAction(next,action,[id]));
  assert.deepEqual(state,before);
}
assert.equal(getLevel2Design('light_starter','light').candidates.length,4);
const clodion = getLevel2Design('kithna_clodian','storm');
assert.equal(clodion.milestoneKey, 'level-2');
assert.deepEqual(clodion.candidates.map(c => c.proposed_skill_id), speciesSkillIds.slice(4));

const adminPath=require.resolve('../backend/server/dist/lib/supabaseAdmin');
let mode='ok',queries=[];
require.cache[adminPath]={id:adminPath,filename:adminPath,loaded:true,exports:{supabaseAdmin:{from(table){
  const filters=[];queries.push({table,filters});
  const q={select(){return q},eq(k,v){filters.push([k,v]);return q},async maybeSingle(){
    if(mode==='error')return {error:new Error('offline'),data:null};
    const data=table==='pets'?{id:'p',species:'light_starter',line:'light',level:2}:
      table==='skill_defs'?{id:'definition',required_level:2}:{skill_id:'definition',equipped:mode!=='unequipped',equipped_slot:mode==='invalid-slot'?5:mode==='legacy-slot'?null:1};
    return {error:null,data:mode===table?null:data};
  }};return q;
}}}};
const {authorizeSpeciesSkill}=require('../backend/server/dist/battle/learnedSpeciesSkills');
(async()=>{
 const state={participants:[unit('p','player','light_starter','light')]};
 const action={actorId:'p',action:'skill',skillId:'solen-radiant-bolt'};
 assert.deepEqual(await authorizeSpeciesSkill('owner',state,action),['solen-radiant-bolt']);
 assert(queries.find(q=>q.table==='pets').filters.some(([k,v])=>k==='user_id'&&v==='owner'));
 assert(queries.find(q=>q.table==='pet_skills').filters.some(([k,v])=>k==='pet_id'&&v==='p'));
 for(mode of ['pets','skill_defs','pet_skills','error','unequipped','invalid-slot','legacy-slot'])await assert.rejects(()=>authorizeSpeciesSkill('owner',state,action));
 console.log('PASS: eight approved skills, formulas, eligibility, targets, MP, replay, immutable failures and read-only ownership/learning authorization.');
})().catch(e=>{console.error(e);process.exitCode=1});
