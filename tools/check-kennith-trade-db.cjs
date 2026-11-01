// Run only against a fresh, disposable local PostgreSQL cluster. Never uses .env.
// node tools/check-kennith-trade-db.cjs <port> <absolute psql.exe path>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawnSync, spawn} = require('node:child_process');
const {kennithDailyStock, kennithTradeCatalog} = require('../backend/server/dist/lib/kennithStock');
const {getKennithDay} = require('../backend/server/dist/lib/kennithDay');
const port = Number(process.argv[2]);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535, 'Explicit local test port required');
const psql = process.argv[3];
assert(psql, 'psql executable required');
const args = ['-X','-q','-A','-t','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'];
function sql(input, error) {
  const result = spawnSync(psql,args,{input,encoding:'utf8'});
  if(error) { assert.notEqual(result.status,0);assert(result.stderr.includes(error),result.stderr); }
  else assert.equal(result.status,0,result.stderr || String(result.error));
  return result.stdout.trim();
}
const literal = value => `'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;
const day = getKennithDay().deltaDay;
const seed = kennithDailyStock(day), catalog=kennithTradeCatalog();
const user='00000000-0000-0000-0000-000000000001';
const user2='00000000-0000-0000-0000-000000000002';
const item=seed.find(x=>x.category==='clothing');
const returned=catalog.find(x=>x.category==='clothing' && !seed.some(s=>s.slug===x.slug));
const line=(def,buy,sell)=>({slug:def.slug,category:def.category,buy,sell});
const trade=(lines,who=user,when=day)=>`SELECT public.trade_kennith_basket('${who}',${when},${literal(lines)},${literal(seed)},${literal(catalog)});`;
const snapshot=()=>sql(`SELECT jsonb_build_object('wallets',(SELECT jsonb_agg(w ORDER BY user_id) FROM wallets w),
  'merchant',(SELECT jsonb_agg(w ORDER BY delta_day) FROM kennith_wallet_days w),
  'stock',(SELECT jsonb_agg(s ORDER BY slug) FROM kennith_stock s),
  'inventory',(SELECT jsonb_agg(i ORDER BY user_id,item_id) FROM inventory i));`);
const rejected=(lines,message,who=user,when=day)=>{
  const before=snapshot();sql(trade(lines,who,when),message);assert.equal(snapshot(),before,'failed basket must roll back every change');
};
assert.equal(sql("SELECT count(*) FROM pg_tables WHERE schemaname='public';"),'0','Refusing a nonempty database');
sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE TABLE wallets(user_id uuid PRIMARY KEY,dots integer NOT NULL,updated_at timestamptz DEFAULT now());
  CREATE TABLE item_defs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE,name text,type text,description text,
    rarity integer DEFAULT 1,stack_limit integer DEFAULT 99,effects jsonb DEFAULT '{}');
  CREATE TABLE inventory(user_id uuid,item_id uuid REFERENCES item_defs(id),qty integer CHECK(qty>=0),updated_at timestamptz DEFAULT now(),PRIMARY KEY(user_id,item_id));
  CREATE TABLE profiles(user_id uuid PRIMARY KEY,avatar_customization jsonb DEFAULT '{}');
  GRANT SELECT,INSERT,UPDATE ON wallets,item_defs,inventory,profiles TO service_role;`);
for(const file of ['20261029221654_kennith_daily_wallet_proposal.sql','20261031000000_kennith_purchase_proposal.sql','20261101125225_kennith_atomic_trade.sql'])
  sql(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));
sql(`INSERT INTO wallets(user_id,dots) VALUES('${user}',500),('${user2}',500);
  INSERT INTO profiles(user_id) VALUES('${user}'),('${user2}');
  SELECT get_kennith_stock(${day},${literal(seed)});
  UPDATE kennith_wallet_days SET dots=1000 WHERE delta_day=${day};`);
assert.deepEqual(JSON.parse(sql(`SET ROLE service_role; ${trade([line(item,2,0)])}`)),{ok:true,cost:60,value:0});
assert.deepEqual(JSON.parse(sql(trade([line(item,0,1)]))),{ok:true,cost:0,value:30});
assert.equal(sql(`SELECT dots FROM wallets WHERE user_id='${user}';`),'470');
assert.equal(sql(`SELECT dots FROM kennith_wallet_days WHERE delta_day=${day};`),'1030');
// A non-daily owned item can be sold, read in stock, and bought back.
sql(`INSERT INTO inventory(user_id,item_id,qty) SELECT '${user}',id,2 FROM item_defs WHERE slug='${returned.slug}';`);
sql(trade([line(returned,0,1)]));
assert(JSON.parse(sql(`SELECT get_kennith_stock(${day},${literal(seed)});`)).some(x=>x.slug===returned.slug && x.stock===1));
sql(trade([line(returned,1,0)]));
assert.equal(sql(`SELECT qty FROM inventory JOIN item_defs ON item_id=id WHERE user_id='${user}' AND slug='${returned.slug}';`),'2');
// A zero-net combined trade requires neither wallet to have spare Dots.
sql(`UPDATE wallets SET dots=0 WHERE user_id='${user}'; UPDATE kennith_wallet_days SET dots=0 WHERE delta_day=${day};`);
sql(trade([line(item,1,1)]));
rejected([line(item,1,0)],'Not enough Dots.');
rejected([line(item,0,1)],'Kennith does not have enough Dots.');
sql(`UPDATE wallets SET dots=500 WHERE user_id='${user}'; UPDATE kennith_wallet_days SET dots=1000 WHERE delta_day=${day};`);
rejected([line(item,0,2)],'Not enough owned items.');
rejected([line(item,1,0)],'The Aliune day changed.',user,day-1);
rejected([line(item,21,0)],'Invalid trade basket.');
rejected([line(item,1,0),line(item,1,0)],'Invalid trade basket.');
sql(`UPDATE kennith_stock SET quantity=199 WHERE slug='${item.slug}';`);
rejected([line(item,0,1)],'Merchant stock is full.');
sql(`UPDATE kennith_stock SET quantity=2 WHERE slug='${item.slug}'; UPDATE inventory SET qty=99 WHERE user_id='${user}' AND item_id=(SELECT id FROM item_defs WHERE slug='${item.slug}');`);
rejected([line(item,1,0)],'Item stack is full.');
sql(`UPDATE inventory SET qty=1 WHERE user_id='${user}' AND item_id=(SELECT id FROM item_defs WHERE slug='${item.slug}');
  UPDATE profiles SET avatar_customization=${literal({upperBodyClothing:item.slug})} WHERE user_id='${user}';`);
rejected([line(item,0,1)],'Unequip this item');
const relic=seed.find(x=>x.category==='relics');
sql(`CREATE TABLE pet_relic_equipment(user_id uuid,item_id uuid);
  INSERT INTO inventory(user_id,item_id,qty) SELECT '${user}',id,2 FROM item_defs WHERE slug='${relic.slug}';
  INSERT INTO pet_relic_equipment SELECT '${user}',id FROM item_defs WHERE slug='${relic.slug}';`);
sql(trade([line(relic,0,1)]));
rejected([line(relic,0,1)],'Unequip this item');
sql(`SET ROLE anon; ${trade([line(item,1,0)])}`,'permission denied');
// Whole basket rollback even when an earlier line was valid.
rejected([line(returned,0,1),line({...item,slug:'zz-not-in-catalog'},0,1)],'That item is not available today.');
sql(`UPDATE kennith_stock SET quantity=1 WHERE slug='${returned.slug}';`);
function concurrent(input) {
  return new Promise(resolve=>{const child=spawn(psql,args);let stderr='';child.stderr.on('data',x=>stderr+=x);child.stdout.resume();child.on('close',code=>resolve({code,stderr}));child.stdin.end(input);});
}
Promise.all([concurrent(trade([line(returned,1,0)])),concurrent(trade([line(returned,1,0)],user2))]).then(results=>{
  assert.equal(results.filter(x=>x.code===0).length,1);
  assert(results.find(x=>x.code!==0).stderr.includes('Not enough merchant stock.'));
  console.log('PASS: real PostgreSQL buy/sell/buyback, net-zero basket, balances, stock/stack caps, stale day, equipped copies, permissions, atomic rollback and concurrent last-item purchase.');
}).catch(error=>{console.error(error);process.exitCode=1;});
