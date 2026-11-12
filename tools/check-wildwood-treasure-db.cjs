// Disposable local PostgreSQL only; never reads project credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, execFile } = require('node:child_process');
const run = require('node:util').promisify(execFile);
const bin = process.argv[2];
assert(bin, 'Pass the installed PostgreSQL bin directory');
const exe = n => path.join(bin, n + (process.platform === 'win32' ? '.exe' : ''));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wildwood-treasure-'));
const port = '55443';
const args = ['-X', '-q', '-At', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];
const sql = input => execFileSync(exe('psql'), args, { input, encoding: 'utf8', stdio: 'pipe' }).trim();
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const user = id(1), other = id(2);
const rpc = (name, ...values) => `SELECT public.${name}(${values.map(v => `'${v}'`).join(',')});`;
const claim = n => rpc('claim_wildwood_discovery', user, id(n), 'brookglass-pendant');
const transfer = n => rpc('transfer_wildwood_treasure_item', user, id(n));
const discard = () => rpc('discard_wildwood_treasure', user);
const room = n => sql(`INSERT INTO wildwood_rooms VALUES ('${id(n)}','${user}','resolved','flavor','{"battle":null}',NULL);`);
const qty = () => Number(sql(`SELECT coalesce(sum(qty),0) FROM inventory WHERE user_id='${user}'`));
let started = false;
(async () => {
  execFileSync(exe('initdb'), ['-D', dir, '-U', 'postgres', '-A', 'trust', '--no-locale', '--encoding=UTF8'], { stdio: 'pipe', timeout: 60000 });
  execFileSync(exe('pg_ctl'), ['-D', dir, '-l', path.join(dir, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start'], { stdio: 'ignore', timeout: 30000 });
  started = true;
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE profiles(user_id uuid PRIMARY KEY);
    CREATE TYPE item_type AS ENUM ('equipment','material');
    CREATE TABLE item_defs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE, name text, description text, type item_type, rarity integer, stack_limit integer, effects jsonb);
    CREATE TABLE inventory(user_id uuid, item_id uuid REFERENCES item_defs, qty integer CHECK(qty>=0), PRIMARY KEY(user_id,item_id));
    CREATE TABLE wildwood_expeditions(id uuid PRIMARY KEY,user_id uuid,status text);
    CREATE TABLE wildwood_rooms(id uuid PRIMARY KEY,expedition_id uuid REFERENCES wildwood_expeditions,status text,event_kind text,event_payload jsonb,item_claimed_at timestamptz);
    INSERT INTO auth.users VALUES ('${user}'),('${other}'); INSERT INTO profiles SELECT id FROM auth.users;
    INSERT INTO wildwood_expeditions VALUES ('${user}','${user}','active');
    GRANT USAGE ON SCHEMA public TO service_role;
    GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO service_role;`);
  // Historical remote timestamps differ from dependency order. Test prerequisites first.
  for (const file of ['20261111184310_wildwood_kithna_discovery_catalog.sql','20261111184319_wildwood_visit_treasure.sql','20261111181527_wildwood_treasure_readiness.sql'])
    sql(fs.readFileSync(path.join('supabase/migrations', file), 'utf8'));
  assert.equal(JSON.parse(sql('SELECT wildwood_discovery_readiness()')).version, 2);
  room(10);
  assert.equal(JSON.parse(sql(claim(10))).held, true); assert.equal(qty(), 0);
  assert.equal(JSON.parse(sql(claim(10))).success, false);
  assert.equal(JSON.parse(sql(rpc('transfer_wildwood_treasure_item', other, id(10)))).success, false);
  const results = await Promise.all(Array.from({ length: 8 }, () => run(exe('psql'), [...args, '-c', transfer(10)])));
  assert.equal(results.filter(r => JSON.parse(r.stdout).success).length, 1); assert.equal(qty(), 1);
  room(11); sql(claim(11));
  assert.equal(JSON.parse(sql(transfer(11))).success, false, 'Relic stack limit is one');
  assert.equal(sql(`SELECT transferred_at IS NULL FROM wildwood_treasure_items WHERE room_id='${id(11)}'`), 't');
  room(12); sql(discard());
  assert.equal(qty(), 1, 'Departure preserves transferred inventory');
  assert.equal(JSON.parse(sql(transfer(11))).success, false);
  assert.equal(JSON.parse(sql(claim(12))).success, false, 'Late claims cannot recreate departed Treasure');
  room(13);
  await Promise.all([run(exe('psql'), [...args, '-c', claim(13)]), run(exe('psql'), [...args, '-c', discard()])]);
  assert.equal(sql('SELECT count(*) FROM wildwood_treasure_items WHERE transferred_at IS NULL AND discarded_at IS NULL'), '0');
  room(14); sql(claim(14));
  assert.throws(() => sql(`SET ROLE authenticated; ${transfer(14)}`));
  assert.throws(() => sql(`SET ROLE anon; SELECT * FROM wildwood_treasure_items`));
  assert.equal(JSON.parse(sql(`SET ROLE service_role; ${discard()}`)).success, true);
  console.log('PASS PostgreSQL: three migrations, temporary rewards, ownership, duplicate/concurrent transfer, stack limit, departure/claim race, permanent inventory preservation, service-only access.');
  // Exercise the actual existing storage RPC, not a duplicated capacity rule.
  sql(`CREATE TABLE pets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, name text, species text,
    rarity text, line text, stage text, energy integer, hatch_ends_at timestamptz, pending_hatch_minutes integer,
    is_active boolean DEFAULT false, location text, hatch_time_alignment text, growth_strong_stats text[],
    growth_weak_stat text, passive_trait_id uuid, passive_trait_key text, mutation_capacity integer,
    ran_away boolean DEFAULT false, runaway_at timestamptz, hatched_at timestamptz, created_at timestamptz DEFAULT now(), xp integer DEFAULT 0);
    CREATE TABLE pet_stats(pet_id uuid PRIMARY KEY REFERENCES pets,base_hp integer NOT NULL,base_atk integer,
      base_def integer,base_spd integer,base_magi integer,base_mana integer,base_total integer);
    CREATE TABLE party_slots(id uuid DEFAULT gen_random_uuid(),user_id uuid,pet_id uuid,slot_index integer);
    CREATE TABLE hatchery_slots(id uuid DEFAULT gen_random_uuid(),user_id uuid,pet_id uuid,slot_index integer,unlocked boolean);
    INSERT INTO pets(user_id,name,stage,location,is_active) VALUES ('${user}','Existing Kith','hatchling','active',true);
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;`);
  sql(fs.readFileSync('supabase/migrations/20261005023310_atomic_pet_storage_actions.sql','utf8'));
  const progression = fs.readFileSync('supabase/migrations/20261104165826_wildwood_victory_progression.sql','utf8');
  sql(progression.slice(progression.indexOf('CREATE FUNCTION public.increment_active_pet_xp'), progression.indexOf('REVOKE ALL ON FUNCTION public.increment_active_pet_xp')));
  sql(fs.readFileSync('supabase/migrations/20261111185111_wildwood_egg_treasure.sql','utf8'));
  const egg = JSON.stringify({name:'Fixture Egg',species:'fixture',line:'water',rarity:'common',pending_hatch_minutes:7,mutation_capacity:1});
  const stats = JSON.stringify({hp:1,atk:1,def:1,spd:1,magi:1,mana:1,base_total:6});
  const hold = (n, owner=user) => rpc('hold_wildwood_egg', owner, id(n), id(n+1000), egg, stats, 5);
  const moveEgg = (n, owner=user) => rpc('transfer_wildwood_egg', owner, id(n));
  const eggs = () => Number(sql(`SELECT count(*) FROM pets WHERE user_id='${user}' AND stage='egg'`));
  room(20);
  assert.equal(JSON.parse(sql(hold(20,other))).success,false);
  assert.equal(JSON.parse(sql(hold(20))).held,true); assert.equal(eggs(),0);
  sql(hold(20)); assert.equal(sql(`SELECT xp FROM pets WHERE is_active`),'5','Hold retry cannot duplicate XP');
  assert.equal(JSON.parse(sql(moveEgg(20,other))).success,false);
  const moves=await Promise.all(Array.from({length:8},()=>run(exe('psql'),[...args,'-c',moveEgg(20)])));
  assert.equal(moves.filter(r=>JSON.parse(r.stdout).success).length,1); assert.equal(eggs(),1);
  assert.equal(sql(`SELECT location||':'||pending_hatch_minutes FROM pets WHERE stage='egg'`),'storage:7');
  assert.equal(sql('SELECT count(*) FROM pet_stats'),'1');
  room(21);sql(hold(21));sql(discard());
  assert.equal(JSON.parse(sql(moveEgg(21))).success,false);assert.equal(eggs(),1);
  room(22);sql(hold(22));
  sql(`INSERT INTO pets(user_id,stage,location) SELECT '${user}','egg','storage' FROM generate_series(1,19)`);
  assert.throws(()=>sql(moveEgg(22)),/Egg storage is full/);
  assert.equal(eggs(),20,'Full-storage transfer must roll back the new pet');
  assert.equal(sql(`SELECT event_payload#>>'{eggTreasure,status}' FROM wildwood_rooms WHERE id='${id(22)}'`),'pending');
  assert.equal(sql('SELECT count(*) FROM pet_stats'),'1','Failed transfer rolls back base stats');
  room(23);sql(discard());assert.equal(JSON.parse(sql(hold(23))).success,false,'Late egg acceptance after departure is rejected');
  room(24);
  await Promise.all([run(exe('psql'),[...args,'-c',hold(24)]),run(exe('psql'),[...args,'-c',discard()])]);
  assert.notEqual(sql(`SELECT event_payload#>>'{eggTreasure,status}' FROM wildwood_rooms WHERE id='${id(24)}'`),'pending');
  assert.throws(()=>sql(`SET ROLE authenticated; ${hold(24)}`));
  console.log('PASS egg PostgreSQL: temporary-only acceptance, XP replay, ownership, concurrent transfer, existing storage capacity/rollback, departure race, and permanent egg preservation.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => {
  if (started) execFileSync(exe('pg_ctl'), ['-D', dir, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
  console.log('Disposable test cluster: ' + dir);
});
