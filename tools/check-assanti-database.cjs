// Runs only in a new disposable local PostgreSQL cluster. Never uses .env or a remote DB.
// Usage: node tools/check-assanti-database.cjs "C:/Program Files/PostgreSQL/17/bin"
// Fixtures extract the relevant baseline table definitions; this is not a full Supabase replay.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawnSync, spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const bin = process.argv[2];
if (!bin) throw Error('Pass a local PostgreSQL bin directory. No database URL is accepted.');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'assanti-db-test-'));
const dataDir = path.join(temp, 'data');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
const exe = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
let port;
let running = false;
const run = (name, args, input) => {
  // pg_ctl's detached Windows child must not inherit captured stdout/stderr pipes.
  const result = spawnSync(exe(name), args, { input, encoding: 'utf8', env, windowsHide: true,
    stdio: name === 'pg_ctl' ? 'ignore' : 'pipe', timeout: 60_000 });
  if (result.error || result.status !== 0) throw Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout?.trim() ?? '';
};
const dbArgs = () => ['-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'assanti_test', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'];
const sql = text => run('psql', dbArgs(), text);
const json = query => JSON.parse(sql(query));
const id = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const trade = (slug, qty, direction, user = id, day = 100) =>
  `SELECT public.trade_assanti_food_on_day('${user}', '${slug}', ${qty}, '${direction}', ${day});`;
const shop = (day = 100) => json(`SELECT public.get_assanti_food_shop('${id}', ${day});`);
const fails = (statement, message) => {
  assert.throws(() => sql(statement), error => error.message.includes(message), message);
};
const asyncSql = text => new Promise(resolve => {
  const child = spawn(exe('psql'), dbArgs(), { env, windowsHide: true });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', error => resolve({ code: -1, stdout, stderr: error.message }));
  child.on('close', code => resolve({ code, stdout, stderr }));
  child.stdin.end(text);
});
async function main() {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  try {
    run('initdb', ['-D', dataDir, '-U', 'assanti_test', '-A', 'trust', '--no-locale', '-E', 'UTF8']);
    running = true;
    run('pg_ctl', ['-D', dataDir, '-l', path.join(temp, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
    const baseline = fs.readFileSync(path.join(root, 'supabase/migrations/20260907160539_remote_baseline.sql'), 'utf8');
    const enums = baseline.match(/CREATE TYPE "public"\."[^"]+" AS ENUM \([\s\S]*?\);/g);
    const tables = ['item_defs', 'inventory', 'wallets', 'pets', 'player_quests'].map(name => {
      const match = baseline.match(new RegExp('CREATE TABLE IF NOT EXISTS "public"\\."' + name + '" \\([\\s\\S]*?\\n\\);'));
      assert(match, name);
      return match[0];
    });
    sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      ${enums.join('\n')} ${tables.join('\n')}
      ALTER TABLE public.item_defs ADD PRIMARY KEY(id), ADD UNIQUE(slug);
      ALTER TABLE public.wallets ADD PRIMARY KEY(user_id);
      ALTER TABLE public.inventory ADD PRIMARY KEY(user_id,item_id),
        ADD FOREIGN KEY(item_id) REFERENCES public.item_defs(id);
      CREATE TABLE public.assanti_food_claims(user_id uuid PRIMARY KEY, last_claimed_at timestamptz NOT NULL);
      GRANT USAGE ON SCHEMA public TO service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
      INSERT INTO public.wallets(user_id,dots) VALUES ('${id}',1000),('${other}',1000);
      INSERT INTO public.item_defs(id,slug,name,type,stack_limit,effects)
        VALUES ('00000000-0000-0000-0000-000000000099','alpha-meat','Meat','care',99,'{"careCategory":"food"}');
      INSERT INTO public.inventory(user_id,item_id,qty) VALUES ('${id}','00000000-0000-0000-0000-000000000099',1);`);
    sql(fs.readFileSync(path.join(root, 'supabase/migrations/20261017001518_assanti_daily_food_shop.sql'), 'utf8'));
    assert.equal(sql("SELECT id FROM public.item_defs WHERE slug='alpha-meat'"), '00000000-0000-0000-0000-000000000099');
    assert.equal(sql(`SELECT qty FROM public.inventory WHERE user_id='${id}'`), '1');
    const first = shop();
    assert.equal(first.catalog.length, 25);
    assert.equal(first.dailyFood.status, 'locked');
    assert.deepEqual(shop(), first);
    let previous;
    const seen = new Set();
    for (let day = 100; day < 130; day++) {
      const current = shop(day);
      const offered = current.catalog.filter(item => item.available).map(item => item.slug).sort();
      assert(offered.length >= 8 && offered.length <= 12);
      assert.equal(new Set(offered).size, offered.length);
      assert(offered.includes('alpha-meat') && offered.includes('alpha-vegetables'));
      assert(current.merchantDots >= 1000 && current.merchantDots <= 2000);
      assert.notDeepEqual(offered, previous);
      previous = offered;
      offered.forEach(slug => seen.add(slug));
      assert.deepEqual(shop(day), current);
    }
    assert.equal(seen.size, 25);
    const catalog = require('../frontend/pet_items/food.json');
    for (const food of catalog) assert.equal(first.catalog.find(item => item.slug === food.slug).hunger, food.effects.hunger);
    const bought = json(trade('alpha-meat', 2, 'purchase'));
    assert.equal(bought.wallet.dots, 990);
    assert.equal(bought.inventoryQuantity, 3);
    assert.equal(bought.merchantDots, first.merchantDots + 10);
    assert.equal(shop().merchantDots, bought.merchantDots);
    const sold = json(trade('alpha-meat', 2, 'sell'));
    assert.equal(sold.wallet.dots, 1000);
    assert.equal(sold.merchantDots, first.merchantDots);
    assert.equal(sold.inventoryQuantity, 1);
    fails(trade('alpha-meat', -1, 'purchase'), 'Invalid food trade.');
    fails(trade('alpha-meat', 51, 'purchase'), 'Invalid food trade.');
    fails(trade('unknown', 1, 'purchase'), 'Invalid food trade.');
    fails(trade('alpha-meat', 2, 'sell'), 'Not enough owned food.');
    const absent = first.catalog.find(food => !food.available);
    fails(trade(absent.slug, 1, 'purchase'), 'That food is not available today.');
    sql(`UPDATE public.wallets SET dots=0 WHERE user_id='${id}'`);
    fails(trade('alpha-meat', 1, 'purchase'), 'Not enough Dots.');
    assert.equal(shop().merchantDots, first.merchantDots);
    sql(`UPDATE public.wallets SET dots=1000 WHERE user_id='${id}';
      UPDATE public.inventory SET qty=99 WHERE user_id='${id}';`);
    fails(trade('alpha-meat', 1, 'purchase'), 'Food stack is full.');
    assert.equal(sql(`SELECT dots FROM public.wallets WHERE user_id='${id}'`), '1000');
    assert.equal(shop().merchantDots, first.merchantDots);
    sql('UPDATE public.assanti_food_days SET dots=0 WHERE delta_day=100');
    fails(trade('alpha-meat', 1, 'sell'), 'Assanti does not have enough Dots.');
    assert.equal(sql(`SELECT qty FROM public.inventory WHERE user_id='${id}'`), '99');
    const claim = `SELECT public.claim_assanti_daily_food('${id}');`;
    fails(claim, 'Daily Food is still locked.');
    sql(`INSERT INTO public.player_quests(user_id,quest_key,status,target) VALUES ('${id}','assanti_food_trouble','completed',1);
      UPDATE public.inventory SET qty=0 WHERE user_id='${id}';`);
    assert.equal(shop().dailyFood.status, 'available');
    json(claim);
    assert.equal(sql(`SELECT string_agg(qty::text,',' ORDER BY item_id) FROM public.inventory WHERE user_id='${id}'`), '5,5');
    fails(claim, 'Daily Food is already claimed.');
    assert.equal(shop().dailyFood.status, 'claimed');
    sql(`UPDATE public.assanti_food_claims SET last_claimed_at=now()-interval '25 hours' WHERE user_id='${id}';
      UPDATE public.inventory SET qty=99 WHERE user_id='${id}' AND item_id=(SELECT id FROM public.item_defs WHERE slug='alpha-vegetables');`);
    fails(claim, 'Not enough room for the full food reward.');
    assert.equal(sql(`SELECT qty FROM public.inventory WHERE user_id='${id}' AND item_id=(SELECT id FROM public.item_defs WHERE slug='alpha-meat')`), '5');
    assert.equal(shop().dailyFood.status, 'available');

    // Two overlapping claims: one grant, one rejection. No extra food.
    sql(`UPDATE public.inventory SET qty=0 WHERE user_id='${id}'`);
    const claims = await Promise.all([asyncSql(claim), asyncSql(claim)]);
    assert.equal(claims.filter(result => result.code === 0).length, 1);
    assert(claims.some(result => result.stderr.includes('already claimed')));
    assert.equal(sql(`SELECT sum(qty) FROM public.inventory WHERE user_id='${id}'`), '10');

    // Two different players sell into a wallet with enough for only one sale.
    sql(`INSERT INTO public.inventory(user_id,item_id,qty) SELECT '${other}',id,1 FROM public.item_defs WHERE slug='alpha-meat';
      UPDATE public.assanti_food_days SET dots=5 WHERE delta_day=100;`);
    const sales = await Promise.all([asyncSql(trade('alpha-meat',1,'sell')), asyncSql(trade('alpha-meat',1,'sell',other))]);
    assert.equal(sales.filter(result => result.code === 0).length, 1);
    assert(sales.some(result => result.stderr.includes('Assanti does not have enough Dots.')));
    assert.equal(shop().merchantDots, 0);

    // Concurrent purchases cannot spend the same player's final five Dots twice.
    sql(`UPDATE public.wallets SET dots=5 WHERE user_id='${other}'`);
    const buys = await Promise.all([asyncSql(trade('alpha-meat',1,'purchase',other)), asyncSql(trade('alpha-meat',1,'purchase',other))]);
    assert.equal(buys.filter(result => result.code === 0).length, 1);
    assert(buys.some(result => result.stderr.includes('Not enough Dots.')));
    assert.equal(sql(`SELECT dots FROM public.wallets WHERE user_id='${other}'`), '0');

    // Feeding consumes the selected inventory item and applies that food's hunger.
    sql(`UPDATE public.inventory SET qty=0 WHERE user_id='${id}';
      INSERT INTO public.inventory(user_id,item_id,qty) SELECT '${id}',id,2 FROM public.item_defs WHERE slug='carrot';
      INSERT INTO public.pets(id,user_id,line,stage,hunger) VALUES ('${id}','${id}',
        (enum_range(NULL::public.elemental_line))[1], (enum_range(NULL::public.pet_stage))[2],10);`);
    const care = json(`SELECT public.perform_owned_care('${id}','${id}','feed','{}','{"hunger":25,"happy":50}')`);
    assert.equal(care.consumed_slug, 'carrot');
    assert.equal(care.pet.hunger, 19);
    assert.equal(sql(`SELECT qty FROM public.inventory WHERE user_id='${id}' AND item_id=(SELECT id FROM public.item_defs WHERE slug='carrot')`), '1');
    // New functions and persistent state are unavailable to browser roles.
    for (const role of ['anon', 'authenticated']) {
      fails(`SET ROLE ${role}; SELECT * FROM public.assanti_food_days;`, 'permission denied');
      fails(`SET ROLE ${role}; SELECT public.get_assanti_food_shop('${id}',100);`, 'permission denied');
      fails(`SET ROLE ${role}; ${trade('alpha-meat',1,'purchase')}`, 'permission denied');
      fails(`SET ROLE ${role}; ${claim}`, 'permission denied');
    }
    sql(`SET ROLE service_role; SELECT public.get_assanti_food_shop('${id}',100);`);
    console.log('PASS: real PostgreSQL migration, 30 stable daily rotations, catalog/hunger, wallet conservation, stack limits, atomic failure, 5+5 rewards, duplicate/concurrent claims, concurrent buys/sales, and browser-role denial.');
    console.log('Scope: isolated baseline table fixtures; not a full Supabase migration replay or live-data test.');
  } finally {
    if (running) run('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
    // Verify the exact disposable target before removing only this test's files.
    if (path.dirname(temp) !== path.resolve(os.tmpdir()) || !path.basename(temp).startsWith('assanti-db-test-')) throw Error('Unsafe cleanup target');
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
