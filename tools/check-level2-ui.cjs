// Real React components, offline API fixture. No production access or database writes.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{spawn}=require('node:child_process');
const root=path.resolve('frontend/web'),webRequire=createRequire(path.join(root,'package.json'));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'level2-ui-')),entry=path.join(temporary,'entry.tsx');
const fixture=`
export const user={id:'fixture-owner'};
const full=location.search.includes('full');
const key=full?(location.search.includes('replace')?'full-replace':'full-decline'):location.search.includes('solen')?'solen':'clodion';
const ids=key==='solen'?['solen-angelic-ward','solen-gleam-jab','solen-mending-light','solen-radiant-bolt']:['clodion-stormfeather-guard','clodion-thunder-talon','clodion-gentle-updraft','clodion-static-gust'];
const names=key==='solen'?['Angelic Ward','Gleam Jab','Mending Light','Radiant Bolt']:['Stormfeather Guard','Thunder Talon','Gentle Updraft','Static Gust'];
export const species=key==='solen'?'light_starter':'kithna_clodian';
export const element=key==='solen'?'light':'storm';
const choices=ids.map((slug,i)=>({id:slug,slug,combatEnabled:true,name:names[i],description:'Approved fixture description',manaCost:i<2?0:1,role:['tank','dps','healer','sorcerer'][i],target:i===0?'self':i===2?'living_ally':'enemy'}));
window.__writes=[];
export async function apiFetch(url,options={}){
 const saved=JSON.parse(sessionStorage.getItem(key)||'{"points":1,"skill":null}');
 if(full && url.endsWith('/state')) {
   const learned=[...choices.map(s=>({skill_id:s.slug,definition:{name:s.name}})),{skill_id:'new',definition:{name:'Newly learned skill'}}];
   return {pet:{id:'pet',level:14,xp:100,unspent_points:0},earnedPoints:13,allocatedPoints:13,availablePoints:0,allocationStatus:'ineligible',
     choices:[],combatSkills:[],learned,nextMilestone:17,skillStatus:'available',
     pendingReplacement:saved.decision?null:{skill_id:'new',milestone_key:'level-14'},
     equippedSlots:[1,2,3,4].map(slot=>({slot,skill:saved.slot===slot?learned[4]:learned[slot-1]}))};
 }
 if(url.endsWith('/state'))return {pet:{id:'pet',level:2,xp:100,unspent_points:saved.points},earnedPoints:1,allocatedPoints:1-saved.points,availablePoints:saved.points,allocationStatus:'available',nextMilestone:2,skillStatus:'available',pendingReplacement:null,equippedSlots:[1,2,3,4].map(slot=>({slot,skill:slot===1&&saved.skill?{skill_id:saved.skill,definition:{name:choices.find(s=>s.slug===saved.skill).name}}:null})),choices:saved.skill?[]:choices,learned:saved.skill?[{skill_id:saved.skill,definition:{name:choices.find(s=>s.slug===saved.skill).name}}]:[],combatSkills:choices.filter(s=>s.slug===saved.skill)};
 const body=options.json;if(!body)throw Error('Expected authenticated JSON request contract');window.__writes.push({url,body});
 if(url.endsWith('/stats')){if(saved.points<1)throw Error('No points');saved.points=0;}
 else if(url.endsWith('/skill')){if(saved.skill&&saved.skill!==body.skillSlug)throw Error('Already claimed');saved.skill=body.skillSlug;}
 else if(url.endsWith('/equipment-decision')&&full){saved.decision=true;saved.slot=body.slot;}
 else throw Error('Unexpected fixture request');
 sessionStorage.setItem(key,JSON.stringify(saved));return {};
}
export const useAuth=()=>({user});`;
const local=p=>path.join(root,'src',p).replaceAll('\\','/');
fs.writeFileSync(entry,`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import KithProgression from '${local('components/Skills/KithProgression.tsx')}';
import PveBattle from '${local('components/battle/PveBattle.tsx')}';
import '${local('components/Skills/PetSkillsInventory.css')}';
import {species,element} from 'virtual:fixture';
function App(){const [battle,setBattle]=useState(false);
const unit={id:'pet',sourcePetId:'pet',speciesId:species,name:'Kith',side:'player',row:'front',element,level:2,hpMax:20,hpCur:20,mpMax:6,mpCur:6,atk:4,magi:5,def:4,spd:4,turnMeter:0,guarding:false,defeated:false};
return <><KithProgression petId="pet"/><button onClick={()=>setBattle(true)}>Enter battle</button>{battle&&<PveBattle battle={{id:'battle',status:'active',participants:[unit,{...unit,id:'enemy',sourcePetId:undefined,side:'enemy',name:'Enemy'}],activeParticipantId:'pet',turnNumber:1,mendMultiplier:1,log:[]}} turnOrder={['pet','enemy']} busy={false} onAction={a=>window.__action=a} portrait={()=>null} scenery={null} renderSkillsChamber={(_u,c)=><div>{c.controls}{c.commandAction}</div>}/>}</>;
}createRoot(document.getElementById('root')!).render(<App/>);`);
let server,browser,socket;let sequence=0;const pending=new Map(),errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(`Boolean(${expression})`))return;await sleep(100);}throw Error('Timeout '+expression+' '+await evaluate('document.body.innerText'));}
async function click(text){await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`);await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);}
(async()=>{
 const {createServer}=await import(pathToFileURL(webRequire.resolve('vite')).href);
 server=await createServer({root,configFile:path.join(root,'vite.config.ts'),cacheDir:path.join(temporary,'vite'),
  optimizeDeps:{entries:[entry],include:['react','react-dom/client']},resolve:{dedupe:['react','react-dom']},
  server:{port:0,host:'127.0.0.1',fs:{allow:[path.resolve('.'),temporary]}},
  plugins:[{name:'offline-level2',enforce:'pre',resolveId(id){if(id==='virtual:fixture')return '\0fixture';},load(id){if(id==='\0fixture')return fixture;},
   transform(_,id){if(['/lib/api/baseClient.ts','/app/providers/useAuth.ts'].some(s=>id.replaceAll('\\','/').endsWith(s)))return 'export * from "virtual:fixture";';},
   configureServer(vite){vite.middlewares.use((req,res,next)=>{if(!req.url.startsWith('/fixture'))return next();res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/@fs/${entry.replaceAll('\\','/')}"></script></body></html>`);});}}]});
 await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,profile=path.join(temporary,'browser');
 browser=spawn(process.env.WILDWOOD_TEST_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0],tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json();
 socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Fetch.requestPaused'){const {requestId,request}=m.params;void cdp(request.url.startsWith(origin)?'Fetch.continueRequest':'Fetch.failRequest',request.url.startsWith(origin)?{requestId}:{requestId,errorReason:'BlockedByClient'});}});
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Fetch.enable',{patterns:[{urlPattern:'*'}]});
 await cdp('Page.navigate',{url:origin+'/fixture'});
 await click('Level & skills');await until(`document.querySelectorAll('input[type=radio]').length===4`);
 assert.equal(await evaluate('window.__writes.length'),0);
 await evaluate(`(()=>{const input=document.querySelector('input[type=number]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'1');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await click('Review allocation');assert.equal(await evaluate('window.__writes.length'),0);await click('Confirm allocation');
 await until(`document.body.textContent.includes('Unspent 0')`);
 await evaluate(`document.querySelectorAll('input[type=radio]')[3].click()`);await click('Review skill choice');
 assert.equal(await evaluate('window.__writes.length'),1);await click('Confirm skill');
 await until(`document.querySelectorAll('input[type=radio]').length===0&&document.body.textContent.includes('Static Gust')`);
 assert.equal(await evaluate('window.__writes.length'),2);
 await cdp('Page.reload');await click('Level & skills');
 await until(`document.body.textContent.includes('Static Gust')&&document.body.textContent.includes('Unspent 0')`);
 assert.equal(await evaluate(`document.querySelectorAll('input[type=radio]').length`),0);
 await click('Close');await click('Enter battle');await until(`document.querySelector('[aria-label="Learned battle skill"] option[value="clodion-static-gust"]')`);
 await evaluate(`(()=>{const s=document.querySelector('[aria-label="Learned battle skill"]');s.value='clodion-static-gust';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await click('Battle');assert.equal(await evaluate('window.__action.skillId'),'clodion-static-gust');assert.equal(await evaluate('window.__action.targetId'),'enemy');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp('Page.navigate',{url:origin+'/fixture?solen'});await click('Level & skills');await until(`document.querySelectorAll('input[type=radio]').length===4`);
 await evaluate(`document.querySelectorAll('input[type=radio]')[2].click()`);await click('Review skill choice');await click('Confirm skill');
 await until(`document.querySelectorAll('input[type=radio]').length===0&&document.body.textContent.includes('Mending Light')`);
 assert(await evaluate(`document.body.textContent.includes('Unspent 1')`));
 await click('Close');await click('Enter battle');await until(`document.querySelector('[aria-label="Learned battle skill"] option[value="solen-mending-light"]')`);
 await evaluate(`(()=>{const s=document.querySelector('[aria-label="Learned battle skill"]');s.value='solen-mending-light';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await click('Battle');assert.equal(await evaluate('window.__action.targetId'),'pet');assert.equal(errors.length,0,JSON.stringify(errors));
 for(const replace of [false,true]) {
   await cdp('Page.navigate',{url:origin+'/fixture?full'+(replace?'-replace':'')});await click('Level & skills');
   await until(`document.body.textContent.includes('All slots are full')`);
   await cdp('Page.reload');await click('Level & skills');await until(`document.body.textContent.includes('All slots are full')`);
   await click(replace?'Replace slot 2: Thunder Talon':'Decline replacement');
   await until(`!document.body.textContent.includes('All slots are full')&&document.querySelectorAll('ol li').length===4`);
   await cdp('Page.reload');await click('Level & skills');await until(`document.querySelectorAll('ol li').length===4`);
   assert.equal(await evaluate(`document.querySelectorAll('ul li').length`),5);
   assert.equal(await evaluate(`document.querySelectorAll('ol li')[1].textContent`),replace?'Newly learned skill':'Thunder Talon');
   assert.equal(await evaluate(`document.body.textContent.includes('All slots are full')`),false);
 }
 assert.equal(errors.length,0,JSON.stringify(errors));
 console.log('PASS offline UI: explicit independent confirmations, refresh recovery, learned-only battle selection, ally/enemy targeting, desktop/mobile, full-slot replacement/decline and refresh retention. Persistence mocked.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(socket?.readyState===1){try{await cdp('Browser.close');}catch{}}socket?.close();browser?.kill();if(server)await server.close();});
