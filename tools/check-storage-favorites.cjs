// Hook lifecycle/API doubles: refresh, relogin, failures, and transfer contracts.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const req = Module.createRequire(path.resolve('frontend/web/package.json')), ts = req('typescript');
const file = path.resolve('frontend/web/src/components/Hatchery/pages/storage/usePetStorage.ts');
let state = [], cursor = 0, effects = [], hook, fail = false, favorite = false, userId = 'owner';
const calls = [];
const pet = {id:'pet',user_id:'owner',name:'Kith',stage:'hatchling',location:'storage',created_at:'2026-11-01'};
const react = {
  useState(initial) {const i=cursor++; if(!(i in state))state[i]=initial; return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},
  useCallback(fn) {return fn;}, useMemo(fn) {return fn();},
  useEffect(fn) {const i=cursor++; if(!(i in state)){state[i]=true;effects.push(fn);}},
};
const apiFetch = async (url, options) => {
  calls.push({url, options});
  if(fail)throw Error('Favorite request failed');
  if(url.endsWith('/favorites'))return {pets:[{id:'pet',is_favorite:favorite}]};
  if(url.endsWith('/favorite')){favorite=options.json.favorite;return {favorite};}
  return {success:true};
};
const supabase = {from(table){return {select(){return this;},eq(){return this;},async order(){return {data:table==='pets'?[{...pet}]:[],error:null};}};}};
const original = Module._load;
Module._load = function(name,parent,...rest){if(parent?.filename===file){if(name==='react')return react;if(name==='@/lib/api/baseClient')return {apiFetch};if(name==='@/lib/supabase/client')return {supabase};}return original.call(this,name,parent,...rest);};
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
try{mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);}finally{Module._load=original;}
function render(){cursor=0;hook=mod.exports.usePetStorage({userId});}
(async()=>{
  render(); await hook.reload();render();assert.equal(hook.pets[0].is_favorite,false);
  await hook.setFavorite('pet',true);render();assert.equal(hook.pets[0].is_favorite,true);
  await hook.reload();render();assert.equal(hook.pets[0].is_favorite,true);
  // New hook instance after login reads server-backed state.
  state=[];render();await hook.reload();render();assert.equal(hook.pets[0].is_favorite,true);
  fail=true;await hook.setFavorite('pet',false);render();assert.equal(hook.pets[0].is_favorite,true);assert(hook.favoriteError);
  await hook.reload();render();assert.equal(hook.pets.length,1);assert.equal(hook.pets[0].is_favorite,undefined);assert(hook.favoriteError);
  fail=false;await hook.reload();render();await hook.assignPetToParty('pet',2);render();
  assert(calls.some(c=>c.options?.json?.action==='assign_party'&&c.options.json.slotIndex===2));
  assert.equal(hook.pets[0].is_favorite,true);
  await hook.setFavorite('pet',false);render();assert.equal(hook.pets[0].is_favorite,false);
  userId=undefined;await hook.reload();render(); // old callback still had owner; render then reload
  await hook.reload();render();assert.equal(hook.pets.length,0);
  console.log('PASS Favorite reload/relogin, toggle failure, unavailable-state storage preservation and protected team-transfer contracts (API doubles, not database persistence).');
})().catch(e=>{console.error(e);process.exitCode=1;});
