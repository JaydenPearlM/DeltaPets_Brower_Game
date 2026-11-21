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
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wildwood-sparkle-'));
// Static migration checks only. This test never executes SQL.
const migration = fs.readFileSync('supabase/migrations/20261115145808_wildwood_sparkle_opportunity.sql', 'utf8');
const previousMigration = fs.readFileSync('supabase/migrations/20261111184319_wildwood_visit_treasure.sql', 'utf8');
const claim = sql => sql.replaceAll('\r\n', '\n').match(/CREATE OR REPLACE FUNCTION public\.claim_wildwood_discovery\([\s\S]*?\$\$;/)[0];
const expiryCheck = /  -- Check wall-clock time[\s\S]*?  END IF;\n\n/;
const playerLock = '  -- Serialize claims, transfers and departure for the same player.\n  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;\n';
assert(claim(migration).includes(playerLock), 'Preserve the later egg-Treasure migration player lock');
assert.equal(claim(migration).replace(expiryCheck, '').replace(playerLock, ''), claim(previousMigration).replaceAll('\r\n','\n'),
  'Claim ownership, locks, eligibility, catalog, quantity and atomic Treasure writes must remain identical');
assert(migration.includes('ADD COLUMN item_available_at timestamptz;'), 'Legacy timestamps must remain NULL');
assert(migration.includes('NEW.item_available_at := OLD.item_available_at;'), 'Updates cannot restart opportunities');
assert(migration.includes("NEW.event_kind = 'flavor'") && migration.includes("NEW.event_payload->'battle' = 'null'::jsonb"));
assert(migration.includes("clock_timestamp() >= v_room.item_available_at + interval '5 seconds'"));
assert(migration.indexOf('-- Check wall-clock time') > migration.indexOf('FOR SHARE;'), 'Expiry must be checked after lock waits');
assert(!/UPDATE public\.wildwood_treasure_items|UPDATE public\.inventory|DELETE FROM|DROP /i.test(migration));
console.log('PASS: migration static preservation/expiry checks. SQL execution and database concurrency remain untested.');

const fixture = `
window.__now=Date.now(); Date.now=()=>window.__now;
const timers=new Map(); let id=10000;
window.setTimeout=(fn,ms)=>{timers.set(++id,{fn,at:Date.now()+ms});return id;};
window.clearTimeout=id=>timers.delete(id);
window.__advance=ms=>{window.__now+=ms;for(const [id,t] of [...timers])if(t.at<=Date.now()){timers.delete(id);t.fn();}};
window.__timers=()=>timers.size;
window.__requests=[];
export async function apiFetch(url,options){
  if(url.endsWith('/discoveries/status'))return {enabled:true};
  if(url.endsWith('/collect-item')){window.__requests.push(JSON.parse(options.body));return new Promise((resolve,reject)=>{window.__finish=resolve;window.__fail=reject;});}
  throw Error('Unexpected request '+url);
}`;
const entry=path.join(temporary,'entry.tsx');
fs.writeFileSync(entry, `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import 'virtual:wildwood-fixture';
import Result from '${path.join(webRoot,'src/pages/Cities/Kithna/Wildwood/WildwoodExploreResult.tsx').replaceAll('\\','/')}';
window.__newRoom=(id=crypto.randomUUID())=>({id,sequence:1,eventKind:'flavor',message:'Forest',battle:null,corrupted:false,itemClaimed:false,
itemOpportunity:{availableAt:new Date(Date.now()).toISOString(),expiresAt:new Date(Date.now()+5000).toISOString()}});
window.__props={room:window.__newRoom(),step:1,busy:false};window.__collected=0;
const collecting=value=>{window.__collecting=value;};
function App(){const [props,setProps]=useState(window.__props);window.__render=changes=>{window.__props={...window.__props,...changes};setProps(window.__props);};
return <Result key={props.room.id} {...props} shinyTarget={document.getElementById('scenery')} onCollectingChange={collecting} onCollected={()=>window.__collected++}/>;}
const scenery=document.createElement('div');scenery.id='scenery';document.body.appendChild(scenery);
window.__root=createRoot(document.getElementById('root'));window.__root.render(<React.StrictMode><App/></React.StrictMode>);`);
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
  for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); }
  throw Error('Timed out: ' + expression + '\n' + await evaluate('document.body.innerText'));
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
        if (['/lib/api/baseClient.ts'].some(suffix => id.replaceAll('\\','/').endsWith(suffix)))
          return 'export * from "virtual:wildwood-fixture";';
        if (id.replaceAll('\\','/').endsWith('/components/inventory/inventory.tsx')) return 'export const getInventoryChangeEventName = () => "fixture-inventory";';
        if (id.replaceAll('\\','/').endsWith('/components/DpPopupWindow.tsx')) return 'export default function Popup({open, children}) { return open ? children : null; }';
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

  const shiny=`document.querySelector('.ww-discovery-shiny')`;
  await until(shiny);
  assert.equal(await evaluate('window.__timers()'),1);
  await evaluate('window.__advance(4999)');assert(await evaluate(`Boolean(${shiny})`));
  await evaluate('window.__advance(1)');await until(`!${shiny}`);
  assert(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Take').disabled`));
  await evaluate('window.__render({room:{...window.__props.room}})');
  assert.equal(await evaluate(`Boolean(${shiny})`),false,'Reload must not restart expiry');
  for(const changes of ['{step:0}','{room:{...window.__props.room,corrupted:true}}','{room:{...window.__props.room,battle:{status:"active"}}}','{busy:true}']){
    await evaluate('window.__render({room:window.__newRoom(),step:1,busy:false})');await until(shiny);
    await evaluate(`window.__render(${changes})`);await until(`!${shiny}`);
    assert.equal(await evaluate('window.__timers()'),0);
  }
  await evaluate('window.__render({room:window.__newRoom("claim"),step:1,busy:false})');await until(shiny);
  await evaluate(`{const b=${shiny};b.click();b.click();}`);await until(`window.__requests.length===1&&!${shiny}`);
  assert.deepEqual(await evaluate('window.__requests'),[{roomId:'claim'}]);
  await evaluate(`window.__finish({item:{slug:'brookglass-pendant',name:'Brookglass Pendant',description:'Existing reward'},qty:1})`);
  await until(`window.__collected===1&&document.body.innerText.includes('Brookglass Pendant')`);
  await evaluate('window.__render({room:window.__newRoom("failure")})');await until(shiny);
  await evaluate(`${shiny}.click()`);await until('window.__requests.length===2');
  await evaluate(`window.__advance(5000);window.__fail(new Error('This Wildwood discovery has expired.'))`);
  await until(`!window.__collecting&&document.body.innerText.includes('has expired')`);
  assert.equal(await evaluate(`Boolean(${shiny})`),false);
  await evaluate('window.__render({room:{...window.__newRoom("legacy"),itemOpportunity:null}})');
  await until(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Take'&&!b.disabled)`);
  assert.equal(await evaluate(`Boolean(${shiny})`),false);
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Take').click()`);
  await until('window.__requests.length===3');assert.equal(await evaluate('window.__requests[2].roomId'),'legacy');
  await evaluate(`window.__finish({item:{slug:'brookglass-pendant',name:'Legacy Treasure',description:'Preserved'},qty:1})`);
  await until('window.__collected===2');
  await evaluate('window.__render({room:window.__newRoom("unmount")})');await until(shiny);
  await evaluate('window.__root.unmount()');assert.equal(await evaluate('window.__timers()'),0);
  assert.equal(browserErrors.length,0,JSON.stringify(browserErrors));
  console.log('PASS: 4999/5000ms boundary, no restart, hidden states, timer cleanup, duplicate clicks, expiry failure, popup and legacy Take (offline browser).');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(socket?.readyState===1){try{await cdp('Browser.close');}catch{}}
  socket?.close();browser?.kill();if(server)await server.close();
});
