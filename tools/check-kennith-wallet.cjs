// Isolated router test: no real database calls or player changes.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const {once} = require('node:events');
const req = Module.createRequire(path.resolve(__dirname, '../backend/server/package.json'));
const express = req('express');
const {getKennithDay} = require('../backend/server/dist/lib/kennithDay');
let result = {data:{deltaDay:getKennithDay().deltaDay,merchantDots:1234},error:null};
let calls = [];
const original = Module._load;
Module._load = function(name,parent,isMain) {
  if (name === '../../middleware/auth') return {requireUser(req,res,next) {
    if (!req.headers['x-test-user']) return res.sendStatus(401);
    req.user={id:'test'};next();
  }};
  if (name === '../../lib/supabaseAdmin') return {supabaseAdmin:{rpc:async (name,args)=>{
    calls.push({name,args});return result;
  }}};
  return original.call(this,name,parent,isMain);
};
const {kennithRouter} = require('../backend/server/dist/routes/merchants/kennith');
Module._load = original;
async function main() {
  const app=express();app.use(express.json());app.use(kennithRouter);
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const read=auth=>fetch(`http://127.0.0.1:${server.address().port}/wallet?deltaDay=1&merchantDots=999999`,{
    headers:auth?{'x-test-user':'test'}:{},
  });
  try {
    assert.equal((await read(false)).status,401);assert.equal(calls.length,0);
    const rotationUrl=`http://127.0.0.1:${server.address().port}/rotation`;
    assert.equal((await fetch(rotationUrl)).status,401);
    const rotation=await fetch(rotationUrl,{headers:{'x-test-user':'test'}});
    assert.equal(rotation.status,200);
    const timing=await rotation.json();
    assert.equal(timing.deltaDay,getKennithDay().deltaDay);
    assert(Date.parse(timing.nextRotationAt)>timing.serverNow);
    assert.equal(calls.length,0);
    const response=await read(true);assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal((await response.json()).merchantDots,1234);
    assert.deepEqual(calls[0],{name:'get_kennith_wallet',args:{p_delta_day:getKennithDay().deltaDay}});
    for(const data of [null,{deltaDay:1,merchantDots:1234},{deltaDay:getKennithDay().deltaDay,merchantDots:-1},
      {deltaDay:getKennithDay().deltaDay,merchantDots:'1234'}]) {
      result={data,error:null};assert.equal((await read(true)).status,503);
    }
    result={data:null,error:{code:'PGRST202',message:'private schema details'}};
    const unavailable=await read(true);assert.equal(unavailable.status,503);
    assert(!(await unavailable.text()).includes('private schema'));
    const {kennithDailyStock} = require('../backend/server/dist/lib/kennithStock');
    const day=getKennithDay().deltaDay;
    const seed=kennithDailyStock(day);
    const url=`http://127.0.0.1:${server.address().port}`;
    const stockRead=()=>fetch(url+'/stock',{headers:{'x-test-user':'test'}});
    result={data:seed,error:null};
    assert.equal((await stockRead()).status,200);
    result={data:seed.map(item=>({...item,stock:0})),error:null};
    assert((await (await stockRead()).json()).items.every(item=>item.stock===0));
    for(const data of [[],seed.slice(1),seed.map(item=>({...item,stock:-1})),seed.map(item=>({...item,price:1}))]) {
      result={data,error:null};assert.equal((await stockRead()).status,503);
    }
    const line={slug:seed[0].slug,category:seed[0].category,quantity:1};
    const buy=(body,auth=true)=>fetch(url+'/trade',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'x-test-user':'test'}:{})},body:JSON.stringify(body)});
    const basket={deltaDay:day,lines:[line]};
    let before=calls.length;
    assert.equal((await buy(basket,false)).status,401);
    for(const body of [
      {...basket,price:1}, {...basket,userId:'another-player'},
      {...basket,lines:[{...line,price:1}]}, {...basket,lines:[{...line,sell:1}]},
      {...basket,lines:[{...line,quantity:0}]}, {...basket,lines:[{...line,quantity:-1}]},
      {...basket,lines:[{...line,quantity:1.5}]}, {...basket,lines:[{...line,quantity:21}]},
      {...basket,lines:[{...line,quantity:'1'}]}, {...basket,lines:[line,line]},
      {...basket,lines:[{...line,slug:'not-a-catalog-item'}]},
      {...basket,lines:[{...line,category:'petCare'}]},
    ]) assert.equal((await buy(body)).status,400,JSON.stringify(body));
    assert.equal((await buy({...basket,deltaDay:day-1})).status,409);
    assert.equal(calls.length,before);
    result={data:{ok:true,cost:line.quantity*seed[0].price},error:null};
    assert.equal((await buy(basket)).status,200);
    assert.deepEqual(calls.at(-1),{name:'purchase_kennith_basket',args:{p_user_id:'test',p_delta_day:day,p_lines:[line],p_seed:seed}});
    const {kennithTradeCatalog} = require('../backend/server/dist/lib/kennithStock');
    const catalog=kennithTradeCatalog();
    const returned=catalog.find(item=>!seed.some(stock=>stock.slug===item.slug));
    result={data:[...seed,{...returned,stock:199}],error:null};
    assert.equal((await stockRead()).status,200,'returned non-daily items are buyable');
    result={data:seed.map(item=>({...item,stock:200})),error:null};
    assert.equal((await stockRead()).status,503);
    const tradeLine={slug:returned.slug,category:returned.category,buy:0,sell:1};
    const trade={deltaDay:day,lines:[tradeLine]};
    before=calls.length;
    for(const invalid of [
      {...tradeLine,buy:21}, {...tradeLine,sell:200}, {...tradeLine,sell:-1},
      {...tradeLine,sell:1.5}, {...tradeLine,sell:'1'}, {...tradeLine,buy:0,sell:0},
      {...tradeLine,price:1}, {...tradeLine,slug:'green-beans'},
    ]) assert.equal((await buy({...trade,lines:[invalid]})).status,400);
    assert.equal((await buy({...trade,lines:[tradeLine,tradeLine]})).status,400);
    assert.equal((await buy({...trade,userId:'other'})).status,400);
    assert.equal((await buy(trade,false)).status,401);
    assert.equal((await buy({...trade,deltaDay:day-1})).status,409);
    assert.equal(calls.length,before);
    result={data:{ok:true,cost:0,value:returned.price},error:null};
    assert.equal((await buy(trade)).status,200);
    assert.deepEqual(calls.at(-1),{name:'trade_kennith_basket',args:{p_user_id:'test',p_delta_day:day,p_lines:[tradeLine],p_seed:seed,p_catalog:catalog}});
    for(const message of ['Merchant stock is full.','Not enough owned items.','Kennith does not have enough Dots.',
      'Unequip this item before using or selling its last available copy.']) {
      result={data:null,error:{code:'P0001',message}};
      const response=await buy(trade);assert.equal(response.status,409);assert.equal((await response.json()).error,message);
    }
    console.log('PASS: combined trade contract, returned stock, catalog allowlist, sell bounds, equipped/merchant errors, trusted catalog RPC inputs.');
    for(const message of ['Not enough merchant stock.','Not enough Dots.','Item stack is full.','The Aliune day changed. Refresh the shop.']) {
      result={data:null,error:{code:'P0001',message}};
      const response=await buy(basket);assert.equal(response.status,409);assert.equal((await response.json()).error,message);
    }
    result={data:null,error:{code:'PGRST202',message:'private schema details'}};
    const rejected=await buy(basket);assert.equal(rejected.status,503);assert(!(await rejected.text()).includes('private schema'));
    result={data:null,error:null};assert.equal((await buy(basket)).status,503);
    console.log('PASS: persisted zero stock, malformed stock rejection, purchase authentication, quantity/category/price tampering, stale day, trusted RPC inputs and safe failures.');
    console.log('PASS: authenticated wallet route, server-owned Aliune day, separate RPC, no-cache and safe failures.');
  } finally { await new Promise(resolve=>server.close(resolve)); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
