// Component interaction test with hook lifecycle/API boundaries simulated; no DOM or live server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const req = Module.createRequire(path.resolve('frontend/web/package.json'));
const ts=req('typescript'), React=req('react');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true},
}).outputText,file);
const {kennithCatalog}=require('../frontend/web/src/lib/kithna/kennithCatalog.ts');
const {kennithDailyStock}=require('../backend/server/src/lib/kennithStock.ts');
const stock=kennithDailyStock(100);
const item=stock.find(x=>x.category==='clothing');
const def=kennithCatalog.clothing.find(x=>x.slug===item.slug);
const state=[],effects=[],listeners=new Map();let cursor=0,dirty=false,tree;
let dots=100,merchantDots=1000,tradeResult={ok:true};const calls=[];
const hooks={...React,
  useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;
    return [state[i],next=>{const value=typeof next==='function'?next(state[i]):next;if(!Object.is(value,state[i])){state[i]=value;dirty=true;}}];},
  useRef(initial){const i=cursor++;return state[i]??(state[i]={current:initial});},
  useEffect(callback,deps){const i=cursor++;const old=state[i];if(!old || deps.some((x,n)=>!Object.is(x,old.deps[n]))) {
    state[i]={deps,cleanup:old?.cleanup};effects.push(()=>{state[i].cleanup?.();state[i].cleanup=callback();});
  }},
};
global.window={addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
  removeEventListener(name,fn){listeners.get(name)?.delete(fn);},setInterval(){return 1;},clearInterval(){},setTimeout(){return 2;},clearTimeout(){}};
const apiFetch=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/trade'))return tradeResult;
  if(url==='/api/me/wallet')return {wallet:{dots}};
  if(url.endsWith('/kennith/wallet'))return {merchantDots};
  if(url.endsWith('/stock'))return {items:stock,deltaDay:100,serverNow:0,nextRotationAt:new Date(21600000).toISOString()};
  if(url==='/api/inventory')return {items:[{slug:item.slug,name:def.name,qty:3,availableQty:2},{slug:'green-beans',name:'Green Beans',qty:5}]};
  throw Error(url);
};
const original=Module._load;
const jsxRuntime=req('react/jsx-runtime');
const file=path.resolve('frontend/web/src/pages/Cities/Kithna/merchant/Kithna_Thrift_Shop.tsx');
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
Module._load=function(name,parent,isMain){if(name==='react/jsx-runtime')return jsxRuntime;return load(name,parent,isMain);};
function load(name,parent,isMain){
  if(name==='react')return hooks;
  if(name==='react-router-dom')return {Link:'a'};
  if(name==='@/lib/api/baseClient')return {apiFetch};
  if(name==='@/app/providers/useAuth')return {useAuth:()=>({user:{id:'test'}})};
  if(name==='@/lib/kithna/kennithCatalog')return {kennithCatalog};
  if(name==='@/lib/kithna/kennithItemImages')return {kennithItemImages:{}};
  if(name==='@/lib/inventoryDisplay')return {isRegularInventoryItem:()=>true};
  if(name.endsWith('.css')||name.endsWith('.png'))return '';
  return original.call(Module,name,parent,isMain);
}
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
}).outputText,file);
Module._load=original;
const Shop=mod.exports.default;
function render(){cursor=0;dirty=false;tree=Shop();}
async function settle(){for(let i=0;i<20;i++){render();while(effects.length)effects.shift()();await Promise.resolve();await Promise.resolve();if(!dirty&&!effects.length)return;}throw Error('Unsettled render');}
function nodes(node){if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=='object')return [];return [node,...nodes(node.props?.children)];}
function text(node){if(Array.isArray(node))return node.map(text).join('');if(node==null||typeof node==='boolean')return '';return typeof node==='object'?text(node.props.children):String(node);}
const button=label=>nodes(tree).find(n=>n.type==='button'&&text(n)===label);
const input=label=>nodes(tree).find(n=>n.type==='input'&&n.props['aria-label']===label);
const total=()=>text(nodes(tree).find(n=>n.props.className==='kithna-food-checkout-summary'));
async function quantity(label,value){input(label).props.onChange({currentTarget:{valueAsNumber:value}});await settle();}
async function main(){
  await settle();assert(!text(tree).includes('Green Beans'));
  assert.equal(input(`Sell ${def.name} quantity`).props.max,2,'equipped copy excluded');
  await quantity(`Sell ${def.name} quantity`,99);assert.equal(input(`Sell ${def.name} quantity`).props.value,2);
  assert(total().includes('−60 Dots'));assert.equal(button('Complete Trade').props.disabled,false);
  await quantity(`${def.name} quantity`,1);assert(total().includes('−30 Dots'));
  button('Clear Inventory Selection').props.onClick();await settle();assert(total().includes('+30 Dots'));
  button('Clear Goods').props.onClick();await settle();assert.equal(button('Complete Trade').props.disabled,true);
  dots=0;merchantDots=0;for(const fn of listeners.get('focus'))fn();await settle();
  await quantity(`Sell ${def.name} quantity`,1);assert.equal(button('Complete Trade').props.disabled,true);
  await quantity(`${def.name} quantity`,1);assert(total().includes('+0 Dots'));assert.equal(button('Complete Trade').props.disabled,false);
  const click=button('Complete Trade').props.onClick;click();click();await settle();
  const trades=calls.filter(x=>x.url.endsWith('/trade'));assert.equal(trades.length,1);
  assert.deepEqual(trades[0].options.json,{deltaDay:100,lines:[{slug:item.slug,category:'clothing',buy:1,sell:1}]});
  assert(text(tree).includes('Trade complete.'));assert.equal(input(`Sell ${def.name} quantity`).props.value,0);
  assert(calls.filter(x=>x.url==='/api/inventory').length>=2,'inventory reloaded after trade');
  await quantity(`Sell ${def.name} quantity`,1);await quantity(`${def.name} quantity`,1);tradeResult={ok:false};
  button('Complete Trade').props.onClick();await settle();assert(text(tree).includes('could not be confirmed'));
  assert(!text(tree).includes('Trade complete.'));
  console.log('PASS: Kennith component sell/buy inputs, equipped filtering, clears, signed totals, merchant budget, zero-net trade, double-click lock, inventory reload and unconfirmed-result error.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
