// Spotlight handler regression checks with database doubles; no live data writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('backend/server/src/routes/care/care.ts', 'utf8');
const start = source.indexOf('careRouter.get("/spotlight"');
const end = source.indexOf('\nasync function getBattleStats', start);
let handler, rows = [], fail = false, race = false;
const db = { from(table) {
  let filters = [], inner = false, head = false, offset = 0;
  const q = {
    select(columns, options) { inner = columns.includes('party_slots!inner'); head = options?.head; return q; },
    eq(key,value) { filters.push(r => r[key] === value); return q; },
    neq(key,value) { filters.push(r => r[key] !== value); return q; },
    order() { return q; }, range(n) { offset=n; return q; }, limit() { return q; },
    result(single) {
      if(fail) return {error: Error('database unavailable')};
      if(table === 'profiles') return {data:{username:'Trainer'}};
      const eligible = rows.filter(r => (!inner || r.team) && filters.every(f => f(r)));
      if(head) return {count:eligible.length};
      if(race) {race=false;return {data:null};}
      return {data:single ? eligible[offset] ?? null : eligible};
    },
    maybeSingle() { return Promise.resolve(q.result(true)); },
    then(resolve,reject) { return Promise.resolve(q.result(false)).then(resolve,reject); },
  }; return q;
}};
new Function('careRouter','supabaseAdmin','hydrateMutationTraits','hydratePassiveTrait','titleCaseValue','logger',source.slice(start,end))(
  {get(_path,fn){handler=fn;}}, db, async p=>p, async p=>p, (_v,f)=>f, {error(){}}
);
async function request() {
  const res={statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  await handler({},res);return res;
}
(async()=>{
  rows=[
    {id:'inactive-first',team:true,is_active:false,ran_away:false,stage:'hatchling'},
    {id:'active-third',user_id:'owner',team:true,is_active:true,ran_away:false,stage:'hatchling',species:'Twiglet'},
    {id:'storage',team:false,is_active:true,ran_away:false,stage:'hatchling'},
    {id:'egg',team:true,is_active:true,ran_away:false,stage:'egg'},
    {id:'lost',team:true,is_active:true,ran_away:true,stage:'hatchling'},
  ];
  assert.equal((await request()).body.pet.id,'active-third');
  race=true;assert.equal((await request()).body.pet.id,'active-third');
  rows=[];assert.equal((await request()).body.pet,null);
  fail=true;assert.equal((await request()).statusCode,500);
  console.log('PASS active team selection, invalid candidate exclusion, concurrent removal fallback, empty team, and database errors (database doubles).');
})().catch(e=>{console.error(e);process.exitCode=1;});
