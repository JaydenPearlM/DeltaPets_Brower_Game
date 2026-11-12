// Offline browser fixtures only. No credentials, live API, database, or rewards.
// Uses the existing Vite dependency and an installed Chromium browser; installs nothing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const webRoot = path.resolve('frontend/web');
const webRequire = createRequire(path.join(webRoot, 'package.json'));
const ts = webRequire('typescript');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wildwood-ui-'));
const sourcePath = path.join(webRoot, 'src/pages/Cities/Kithna/Wildwood/useWildwoodVisit.ts');
const transpiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const helper = { exports: {} };
new Function('require', 'module', 'exports', transpiled)(webRequire, helper, helper.exports);
const { moveTeamMember, advanceVisit, readVisit } = helper.exports;
assert.deepEqual(moveTeamMember(['a', 'b', 'c'], 'c', 0), ['c', 'a', 'b']);
assert.deepEqual(moveTeamMember(['a', 'b'], 'foreign', 0), ['a', 'b']);
assert.deepEqual(moveTeamMember(['a', 'b'], 'a', -1), ['a', 'b']);
const visit = { steps: 2, roomId: 'saved', prepared: true };
assert.deepEqual(advanceVisit(visit, 'saved'), visit);
assert.equal(advanceVisit({ ...visit, steps: 100 }, 'new').steps, 100);
assert.equal(readVisit('broken').steps, 0);
assert.equal(readVisit('{"steps":-1}').steps, 0);
assert.deepEqual(readVisit(JSON.stringify(visit)), visit);

const fixture = `
export const user = { id: 'fixture-user' };
const names = ['Kindlekin', 'Mizu', 'Twiglet'];
export const team = names.map((name, i) => ({ id: 'pet-' + i, sourcePetId: 'pet-' + i, speciesId: ['fire_starter','water_starter','earth_starter'][i],
  name, side: 'player', row: 'front', element: ['fire','water','earth'][i], level: 3, hpMax: 100, hpCur: 80, mpMax: 9, mpCur: 6, atk: 12, def: 9, magi: 10, spd: 14-i, imageUrl: null, displayHp: 80 }));
export const pets = team.map(p => ({ ...p, user_id: user.id, stage: 'hatchling', line: p.element, species: p.speciesId, location: 'party', hp: 100, mana: 3, passive_trait_effects: {} }));
export const eggs = [{ id: 'egg-1', user_id: user.id, name: 'Aqua Pod', line: 'water', stage: 'egg', location: 'inventory' }];
const enemy = { ...team[0], id: 'enemy', sourcePetId: undefined, speciesId: 'kithna_pebelin', name: 'Wild Pebelin', side: 'enemy', guarding: false, defeated: false, turnMeter: 0 };
const battle = { id: 'battle-1', status: 'active', activeParticipantId: 'pet-0', turnNumber: 1, mendMultiplier: 1,
  participants: [...team.map(p=>({...p, guarding: false, defeated: false, turnMeter: 0})), enemy],
  log: [{ type: 'battle_started', turnNumber: 1 }] };
const exploring = new URLSearchParams(location.search).get('mode') === 'explore';
let session = { team, room: { id: 'room-1', sequence: 42, eventKind: exploring ? 'flavor' : 'corrupted_battle', message: 'The canopy stirs.',
  pveEnabled: true, battle: exploring ? null : battle, turnOrder: ['pet-0','enemy','pet-1','pet-2'], corrupted: !exploring, images: {}, itemClaimed: false, questProgressTarget: null, xpReward: null } };
window.__wwRequests = [];
export class ApiError extends Error {}
export async function apiFetch(url, options = {}) {
  window.__wwRequests.push({ url, options });
  if (url === '/api/kithna/wildwood/session') return structuredClone(session);
  if (url === '/api/kithna/wildwood/status') return { wildwoodUnlocked: true, aliuneSignalUnlocked: true, quest: { status: 'active', progress: 0, target: 5 } };
  if (url === '/api/kithna/wildwood/treasure/discard') { if (window.__discardFailure) throw new Error('Fixture discard failure'); return { success: true }; }
  if (url === '/api/kithna/wildwood/treasure') return { items: [{roomId:'treasure-room',slug:'brookglass-pendant',name:'Brookglass Pendant',description:'A Wildwood relic.',type:'equipment',rarity:2,createdAt:'2026-11-11'}], eggs: window.__eggTransferred ? [] : [{roomId:'egg-room',name:'Wildwood Test Egg',species:'fixture',line:'water'}] };
  if (url === '/api/kithna/wildwood/treasure/transfer-egg') { if(window.__eggTransferFailure) throw new Error('Egg storage is full.'); if(options.json?.roomId!=='egg-room') throw new Error('Wrong egg'); window.__eggTransferred=true; return {success:true}; }
  if (url === '/api/kithna/wildwood/treasure/transfer') { if (!options.json?.roomId) throw new Error('JSON body required'); return { success:true }; }
  if (url === '/api/inventory') { if (window.__inventoryFailure) throw new Error('Fixture inventory failure'); return { items: [
    { slug: 'brookglass-pendant', name: 'Brookglass Pendant', type: 'equipment', qty: 1, description: 'A Wildwood relic.', rarity: 2, stackLimit: 1, effects: {} },
    { slug: 'battered-shirt-cream', name: 'Battered Cream Shirt', type: 'equipment', qty: 2, description: 'A familiar shirt.', rarity: 1, stackLimit: 99, effects: {} }
  ] }; }
  if (url === '/api/care/current') return { pet: pets[0], team: pets };
  if (url === '/api/kithna/wildwood/discoveries/status') return { enabled: false };
  if (url === '/api/kithna/roam') return { found: false };
  if (url === '/api/kithna/wildwood/explore') {
    session.room = { ...session.room, id: 'room-' + (session.room.sequence+1), sequence: session.room.sequence+1, battle: null, eventKind: 'flavor', corrupted: false };
    return structuredClone(session);
  }
  if (url.includes('/battle/') && url.endsWith('/action')) {
    const action = options.json;
    if (action.skillId === 'mend') { battle.participants[0].hpCur = 90; battle.participants[0].mpCur--; }
    if (action.action === 'guard') battle.participants[0].guarding = true;
    battle.log.push({ type: action.action === 'guard' ? 'guard' : 'skill', skillId: action.skillId, actorId: action.actorId, targetId: action.targetId, turnNumber: battle.turnNumber });
    battle.turnNumber++; return structuredClone(session);
  }
  throw new Error('Unexpected fixture request: ' + url);
}
export const useAuth = () => ({ user });
export const PARTY_SLOT_COUNT = 4;
export const usePetStorage = () => ({ allPets: pets, partySlots: pets.map((pet,i)=>({ pet, petId:pet.id, slotIndex:i+1 })), inventoryEggs: eggs,
  loading: false, error: '', reload: async()=>{}, pets: [], caps: { party:4 } });
`;
const entry = path.join(temporary, 'entry.tsx');
fs.writeFileSync(entry, `import React from 'react'; import {createRoot} from 'react-dom/client';
import {createBrowserRouter, RouterProvider, Outlet, Link} from 'react-router-dom';
import {UIProvider} from '${path.join(webRoot,'src/app/providers/UIProvider.tsx').replaceAll('\\','/')}';
import WildwoodPage from '${path.join(webRoot,'src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx').replaceAll('\\','/')}';
import '${path.join(webRoot,'src/global.css').replaceAll('\\','/')}';
import '${path.join(webRoot,'src/mobile.css').replaceAll('\\','/')}';
const router = createBrowserRouter([{ element:<UIProvider><Outlet/></UIProvider>, children:[
{path:'/cities/kithna/wildwood',element:<WildwoodPage/>},
{path:'*',element:<Link to='/cities/kithna/wildwood?mode=explore'>Return to Wildwood</Link>}] }]);
createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>);`);

let server, browser, socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pending = new Map(); let nextId = 0;
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const value = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (value.exceptionDetails) throw Error(value.exceptionDetails.text + ': ' + JSON.stringify(value.exceptionDetails.exception));
  return value.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await sleep(100); }
  throw Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText'));
}
async function clickText(text) {
  let point, hit;
  for (let attempt=0; attempt<20; attempt++) {
    await evaluate(`(() => { const el = [...document.querySelectorAll('button,a')].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!el) throw Error('Missing control'); el.scrollIntoView({block:'center',behavior:'instant'}); })()`);
    await sleep(100);
    point = await evaluate(`(() => { const el = [...document.querySelectorAll('button,a')].find(el => el.textContent.trim() === ${JSON.stringify(text)}); const r=el.getBoundingClientRect(); return { x:r.left+r.width/2,y:r.top+r.height/2 }; })()`);
    hit = await evaluate(`(() => {const hit=document.elementFromPoint(${point.x},${point.y});return {tag:hit?.tagName,text:hit?.textContent,scrollY,viewport:innerHeight}})()`);
    if (hit.text?.trim() === text) break;
  }
  assert(hit.text?.trim() === text, 'Pointer target for '+text+': '+JSON.stringify({point,hit}));
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}

(async () => {
  const { createServer } = await import(pathToFileURL(webRequire.resolve('vite')).href);
  server = await createServer({ root: webRoot, configFile: path.join(webRoot,'vite.config.ts'),
    cacheDir: path.join(temporary, 'vite-cache'),
    optimizeDeps: { entries: [entry], include: ['react', 'react-dom/client', 'react-router-dom'] },
    resolve: { dedupe: ['react', 'react-dom', 'react-router-dom'] },
    server: { port: 0, strictPort: false, host: '127.0.0.1', fs: { allow: [path.resolve('.'), temporary] } },
    plugins: [{ name: 'wildwood-offline-fixtures', enforce: 'pre',
      resolveId(id) { if (id === 'virtual:wildwood-fixture') return '\0wildwood-fixture'; },
      load(id) { if (id === '\0wildwood-fixture') return fixture; },
      transform(_code, id) {
        if (['/lib/api/baseClient.ts','/app/providers/useAuth.ts','/pages/storage/usePetStorage.ts'].some(suffix => id.replaceAll('\\','/').endsWith(suffix)))
          return 'export * from "virtual:wildwood-fixture";';
      },
      configureServer(vite) { vite.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/cities/')) return next();
        res.setHeader('Content-Type','text/html');
        res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/@fs/${entry.replaceAll('\\','/')}"></script></body></html>`);
      }); },
    }],
  });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const executable = process.env.WILDWOOD_TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  assert(fs.existsSync(executable), 'Set WILDWOOD_TEST_BROWSER to an installed Chromium browser');
  const profile = path.join(temporary,'browser');
  browser = spawn(executable, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const portFile = path.join(profile,'DevToolsActivePort');
  for (let i=0; i<100 && !fs.existsSync(portFile); i++) await sleep(100);
  assert(fs.existsSync(portFile), 'Headless browser did not start');
  const port = fs.readFileSync(portFile,'utf8').split('\n')[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  const browserErrors = [];
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){ const callback=pending.get(message.id);pending.delete(message.id);message.error?callback.reject(Error(message.error.message)):callback.resolve(message.result); }
    if(message.method==='Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails);
    if(message.method==='Fetch.requestPaused') {
      const {requestId,request}=message.params;
      void cdp(request.url.startsWith(origin) ? 'Fetch.continueRequest' : 'Fetch.failRequest', request.url.startsWith(origin) ? {requestId} : {requestId,errorReason:'BlockedByClient'});
    }
  });
  await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await cdp('Page.navigate',{url:origin+'/cities/kithna/wildwood'});
  await until(`document.querySelector('.skillChamberCommand') && document.body.innerText.includes('Brookglass Pendant')`);
  for(const width of [1440,1920,412,384,360]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await sleep(200);
    const sizes=await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);
    assert(sizes.scroll<=width && sizes.body<=width, 'Page overflow at '+width+': '+JSON.stringify(sizes));
    const image=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(temporary,`battle-${width}.png`),Buffer.from(image.data,'base64'));
  }
  await evaluate(`document.querySelector('.pve-controls').scrollIntoView({behavior:'instant'})`);
  await sleep(200);
  const clipped=await evaluate(`[...document.querySelectorAll('.pve-controls button,.pve-controls select')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>innerWidth)}).map(el=>el.textContent)`);
  assert.deepEqual(clipped,[],'Combat controls must fit the mobile viewport');
  const skillsImage=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(temporary,'skills-360.png'),Buffer.from(skillsImage.data,'base64'));
  await evaluate(`document.querySelector('[aria-label="Move Mizu up"]').click()`);
  await until(`document.querySelector('.ww-team-select').textContent==='Mizu'`);
  await clickText('Mizu');
  await until(`[...document.querySelectorAll('.ww-team-select')].some(el=>el.textContent==='Mizu'&&el.getAttribute('aria-pressed')==='true')`);
  await until(`document.querySelector('.ww-confirm-action button')?.disabled`);
  assert(await evaluate(`document.querySelector('.ww-confirm-action button').disabled`),'Non-active Kith cannot submit a battle action');
  await clickText('Kindlekin');
  await until(`document.querySelector('.ww-confirm-action button') && !document.querySelector('.ww-confirm-action button').disabled`);
  assert.equal(await evaluate(`window.__wwRequests.filter(r=>r.options.method && r.options.method!=='GET').length`),0,'Visual reordering must not mutate gameplay');
  await clickText('Confirm Battle Action');
  await until(`window.__wwRequests.some(r=>r.url.endsWith('/action')) && document.body.innerText.includes('used Elemental Strike')`);
  const action=await evaluate(`window.__wwRequests.find(r=>r.url.endsWith('/action')).options.json`);
  assert.equal(action.actorId,'pet-0');assert.equal(action.skillId,'basic-strike');assert.equal(action.targetId,'enemy');
  await evaluate(`document.getElementById('ww-tab-Eggs').click()`);
  await until(`document.getElementById('ww-inventory-panel').innerText.includes('Wildwood Test Egg')`);
  assert.equal(await evaluate(`document.getElementById('ww-inventory-panel').innerText.includes('Aqua Pod')`), false);
  await evaluate(`document.getElementById('ww-tab-Items').click()`);
  assert.equal(await evaluate(`document.getElementById('ww-inventory-panel').innerText.includes('Wildwood Test Egg')`), false);
  await evaluate(`document.getElementById('ww-tab-Eggs').click();window.__eggTransferFailure=true`);
  await clickText('Send all to Storage');await until(`document.body.innerText.includes('Egg storage is full.')`);
  assert(await evaluate(`document.getElementById('ww-inventory-panel').innerText.includes('Wildwood Test Egg')`));
  await evaluate(`window.__eggTransferFailure=false`);
  await clickText('Send all to Storage');await until(`document.body.innerText.includes('1 egg moved to Storage.')`);
  await until(`document.getElementById('ww-inventory-panel').innerText.includes('No unclaimed eggs')`);
  await evaluate(`document.getElementById('ww-tab-Clothes').click()`);
  await until(`document.getElementById('ww-inventory-panel').innerText.includes('No unclaimed Wildwood clothing')`);
  await evaluate(`document.getElementById('ww-tab-Items').click()`);
  await clickText('Send all to Inventory');
  await until(`document.body.innerText.includes('1 item moved to Inventory.')`);
  assert.equal(await evaluate(`window.__wwRequests.find(r=>r.url.endsWith('/transfer')).options.json.roomId`),'treasure-room');
  await cdp('Page.navigate',{url:origin+'/cities/kithna/wildwood?mode=explore'});
  await until(`document.body.innerText.includes('Enter Wildwood') && !document.querySelector('.ww-explore-control button').disabled`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Wildwood trail progress"]').getAttribute('aria-valuenow')`),'0');
  await clickText('Enter Wildwood');await until(`document.body.innerText.includes('Explore next path')`);await clickText('Explore next path');
  await until(`document.querySelector('[aria-label="Wildwood trail progress"]').getAttribute('aria-valuenow')==='1'`);
  await evaluate(`window.__beforeReload=true`);
  await cdp('Page.reload');await until(`!window.__beforeReload && document.querySelector('[aria-label="Wildwood trail progress"]') && document.querySelector('[aria-label="Wildwood trail progress"]').getAttribute('aria-valuenow')==='1' && !document.querySelector('.ww-explore-control button').disabled`);
  await evaluate(`window.__discardFailure=true`);
  await clickText('← Back to Kithna');await until(`document.body.innerText.includes('Could not discard unclaimed Treasure')`);
  assert(await evaluate(`location.pathname.endsWith('/wildwood')`));
  await evaluate(`window.__discardFailure=false`);
  await clickText('← Back to Kithna');await until(`document.body.innerText.includes('Return to Wildwood')`);await clickText('Return to Wildwood');
  await until(`document.querySelector('[aria-label="Wildwood trail progress"]') && document.querySelector('[aria-label="Wildwood trail progress"]').getAttribute('aria-valuenow')==='0'`);
  assert.equal(await evaluate(`window.__wwRequests.some(r=>/reset|delete|save/.test(r.url))`),false);
  assert.deepEqual(browserErrors,[],'Browser runtime errors');
  console.log('PASS: helper checks; 1440/1920/412/384/360px battle layouts; no page overflow; local reorder; original actor/target confirmation; Treasure tabs/JSON transfer/failed departure retry; refresh retains progress; route exit confirms Treasure discard and resets visit progress.');
  console.log('Offline fixture screenshots: '+temporary);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(socket?.readyState===1){await cdp('Browser.close').catch(()=>{});socket.close();}
  browser?.kill();await server?.close();
});
