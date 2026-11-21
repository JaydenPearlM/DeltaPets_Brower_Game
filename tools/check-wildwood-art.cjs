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
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wildwood-art-'));

const fixture = `
import {useSyncExternalStore} from 'react';
let time=0;const listeners=new Set();
window.__setTime=value=>{time=value;listeners.forEach(listener=>listener());};
export function useNow(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>time);}
export function useKithnaQuests(){return {wildwood:null,statusError:'',loading:false,retry:()=>{},visit:()=>{},dialogue:null};}
`;
const entry=path.join(temporary,'entry.tsx');
fs.writeFileSync(entry, `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import KithnaMap from '${path.join(webRoot,'src/pages/Cities/Kithna/KithnaMap.tsx').replaceAll('\\','/')}';
import Scene from '${path.join(webRoot,'src/pages/Cities/Kithna/Wildwood/WildwoodScene.tsx').replaceAll('\\','/')}';
import {selectWildwoodArt,wildwoodArt,WILDWOOD_ART_PHASES} from '${path.join(webRoot,'src/pages/Cities/Kithna/Wildwood/wildwoodArt.ts').replaceAll('\\','/')}';
window.__art=wildwoodArt;window.__select=selectWildwoodArt;window.__phases=WILDWOOD_ART_PHASES;
function App(){const [room,setRoom]=useState({id:'saved',sequence:0,corrupted:false});const [count,setCount]=useState(0);
window.__room=setRoom;return <><button onClick={()=>setCount(count+1)}>Encounter state: {count}</button><Scene room={room} step={room.sequence}/><MemoryRouter><KithnaMap/></MemoryRouter></>;}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);`);
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
        if (id.replaceAll('\\','/').endsWith('/lib/timers/useNow.ts')) return 'export { useNow } from "virtual:wildwood-fixture";';
        if (id.replaceAll('\\','/').endsWith('/KithnaQuest/useKithnaQuests.tsx')) return 'export { useKithnaQuests } from "virtual:wildwood-fixture";';
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


  await until(`document.querySelector('.ww-scene')`);
  await evaluate(`document.querySelector('button').click();window.__scene=document.querySelector('figure');undefined`);
  for(const [phase,minute] of [['dawn',0],['day',45],['dusk',135],['night',180],['deep_night',270],['twilight',330]]){
    await evaluate(`window.__setTime(${minute}*60000)`);
    await until(`document.querySelector('figure').dataset.aliunePhase==='${phase}'`);
    assert.equal(await evaluate(`document.querySelector('figure')===window.__scene`),true,'Clock must not remount scene');
    assert.equal(await evaluate(`document.querySelector('button').textContent`),'Encounter state: 1');
    assert.equal(await evaluate(`document.querySelector('figure').dataset.artSource`),'image');
    assert.equal(await evaluate(`document.querySelector('image').getAttribute('href')`),
      await evaluate(`window.__art.entrance['${phase}']`));
    const size = await evaluate(`(async()=>{const img=new Image();img.src=document.querySelector('image').getAttribute('href');await img.decode();return [img.naturalWidth,img.naturalHeight];})()`);
    assert(size[0]>=1500 && size[1]>=800,'Standalone background must decode at full resolution');
    const cityFile=phase==='day'?'kithna.png':`kithna_${phase==='twilight'?'late_night':phase}.png`;
    await until(`document.querySelector('.kithnaIsland').style.backgroundImage.includes('${cityFile}')`);
    assert(await evaluate(`(async()=>{const el=document.querySelector('.kithnaIsland image');
      if(!el.getAttribute('href').includes('${cityFile}'))return false;
      const img=new Image();img.src=el.getAttribute('href');await img.decode();return img.naturalWidth>0;})()`),
      'City CSS and SVG backgrounds both switch and decode: '+phase);
  }
  assert.equal(await evaluate(`Object.values(window.__art).flatMap(Object.values).length`),6,'Six entrance lighting variants registered');
  assert(await evaluate(`Object.keys(window.__art).every(scene=>window.__phases.every(phase=>{
    const library=structuredClone(window.__art);library[scene]={day:'verified-day'};
    if(window.__select(scene,phase,library)!=='verified-day')return false;
    library[scene][phase]='verified-phase';return window.__select(scene,phase,library)==='verified-phase';
  }))`),'All six locations / six art phases select exact variant then same-location day');
  assert(await evaluate(`Object.keys(window.__art).every(scene=>{
    const library=structuredClone(window.__art);library[scene]={};
    if(window.__select(scene,'dusk',library)!==null)return false;
    library[scene].day='verified-day';
    if(window.__select(scene,'dusk',library)!=='verified-day')return false;
    library[scene].twilight='verified-twilight';
    return window.__select(scene,'dusk',library)==='verified-twilight';
  })`),'Dusk uses Twilight, then same-location day, then SVG');
  await evaluate(`window.__room({id:'corrupt',sequence:2,corrupted:true})`);
  await until(`document.querySelector('.ww-scene--corrupted')`);
  await evaluate(`window.__setTime(45*60000)`);
  await until(`document.querySelector('.ww-scene--corrupted').dataset.aliunePhase==='day'`);
  await evaluate(`window.__room({id:'normal',sequence:2,corrupted:false});window.__setTime(270*60000)`);
  await until(`document.querySelector('.ww-scene--clearing').dataset.aliunePhase==='deep_night'`);
  assert.equal(await evaluate(`document.querySelector('figure').dataset.artSource`),'svg-placeholder');
  assert.equal(browserErrors.length,0,JSON.stringify(browserErrors));
  console.log('PASS: six full-resolution entrance PNGs load and switch across six Aliune phases; Dusk uses dedicated artwork; other locations retain SVG fallback; scene and encounter state preserved. Offline browser only.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(socket?.readyState===1){try{await cdp('Browser.close');}catch{}}
  socket?.close();browser?.kill();if(server)await server.close();
});
