// Disposable local PostgreSQL only. No production URLs or credentials are used.
// Usage: node tools/check-wildwood-progression.cjs <postgres-bin-directory>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const bin = process.argv[2];
if (!bin) throw Error('Pass the installed PostgreSQL bin directory');
const exe = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wildwood-xp-test-'));
const port = '55439';
const args = ['-X', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
const sql = input => execFileSync(exe('psql'), args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const user = '11111111-1111-4111-8111-111111111111';
const pet = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
let serial = 0;
function room(status = 'victory', version = true) {
  const id = `44444444-4444-4444-8444-${String(++serial).padStart(12, '0')}`;
  const payload = { version: 1, recordBattleStats: true, ...(version ? { xpRewardVersion: 1 } : {}), battle: {
    id, status, participants: [
      { id: pet, sourcePetId: pet, side: 'player', hpCur: status === 'defeat' ? 0 : 10, defeated: status === 'defeat' },
      { id: other, side: 'enemy', hpCur: status === 'victory' ? 0 : 10, defeated: status === 'victory' },
    ],
  } };
  sql(`INSERT INTO wildwood_rooms VALUES ('${id}', '${user}', '${id}', '${status === 'active' ? 'unresolved' : 'resolved'}', 'corrupted_battle', '${JSON.stringify(payload)}');
    INSERT INTO pet_battle_results VALUES ('${id}', '${pet}', '${user}', '${status}');`);
  return id;
}
const claim = id => `SELECT public.settle_wildwood_victory_xp('${user}', '${id}');`;
const state = () => JSON.parse(sql(`SELECT json_build_array(xp, level, unspent_points, hp_cur, atk) FROM pets WHERE id='${pet}'`));
let started = false;
async function main() {
  execFileSync(exe('initdb'), ['-D', dir, '-U', 'postgres', '-A', 'trust', '--no-locale', '--encoding=UTF8'], { stdio: 'pipe', timeout: 60000 });
  started = true;
  // Do not give the detached Windows server inherited pipe handles.
  execFileSync(exe('pg_ctl'), ['-D', dir, '-l', path.join(dir, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start'], { stdio: 'ignore', timeout: 30000 });
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE pets (id uuid PRIMARY KEY, user_id uuid, xp integer NOT NULL DEFAULT 0, level integer NOT NULL DEFAULT 1,
      unspent_points integer NOT NULL DEFAULT 0, hp_cur integer DEFAULT 10, atk integer DEFAULT 7,
      is_active boolean DEFAULT false, ran_away boolean DEFAULT false,
      CONSTRAINT pets_level_check CHECK(level BETWEEN 0 AND 10));
    CREATE TABLE pet_stat_allocations (level integer CONSTRAINT pet_stat_allocations_level_check CHECK(level BETWEEN 1 AND 10));
    CREATE TABLE wildwood_expeditions (id uuid PRIMARY KEY, user_id uuid);
    CREATE TABLE wildwood_rooms (id uuid PRIMARY KEY, expedition_id uuid, battle_id uuid UNIQUE, status text, event_kind text, event_payload jsonb);
    CREATE TABLE pet_battle_results (battle_id uuid, pet_id uuid, user_id uuid, result text, PRIMARY KEY(battle_id,pet_id));
    INSERT INTO wildwood_expeditions VALUES ('${user}','${user}');
    INSERT INTO pets(id,user_id) VALUES ('${pet}','${user}'), ('${other}','${user}');
    GRANT SELECT, UPDATE ON pets, wildwood_rooms TO service_role;
    GRANT SELECT ON wildwood_expeditions, pet_battle_results TO service_role;`);
  sql(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261104165826_wildwood_victory_progression.sql'), 'utf8'));
  const first = room();
  const receipt = JSON.parse(sql(claim(first)));
  assert.equal(receipt.amount, 25);
  assert.deepEqual(state(), [25, 1, 0, 10, 7]);
  assert.deepEqual(JSON.parse(sql(claim(first))), receipt);
  assert.deepEqual(state(), [25, 1, 0, 10, 7]);
  // Each psql call reconnects; the saved receipt survives the client connection.
  const concurrent = room();
  await Promise.all(Array.from({ length: 8 }, () => run(exe('psql'), [...args, '-c', claim(concurrent)])));
  assert.deepEqual(state(), [50, 1, 0, 10, 7]);
  sql(claim(room())); sql(claim(room()));
  assert.deepEqual(state(), [100, 2, 1, 10, 7]);
  for (let i = 0; i < 8; i++) sql(claim(room()));
  assert.deepEqual(state(), [300, 3, 2, 10, 7]);
  for (const id of [room('defeat'), room('active'), room('victory', false)]) assert.throws(() => sql(claim(id)));
  assert.deepEqual(state(), [300, 3, 2, 10, 7]);
  const wrongOwner = room();
  assert.throws(() => sql(`SELECT public.settle_wildwood_victory_xp('${other}','${wrongOwner}');`));
  assert.throws(() => sql(`SET ROLE authenticated; ${claim(wrongOwner)}`));
  sql(`SET ROLE service_role; ${claim(wrongOwner)}`);
  const rollback = room();
  sql(`CREATE FUNCTION fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected receipt failure'; END $$;
    CREATE TRIGGER fail_receipt BEFORE UPDATE ON wildwood_rooms FOR EACH ROW EXECUTE FUNCTION fail_receipt();`);
  const before = state();
  assert.throws(() => sql(claim(rollback)));
  assert.deepEqual(state(), before);
  sql('DROP TRIGGER fail_receipt ON wildwood_rooms;');
  sql(claim(rollback));
  sql(`UPDATE pets SET xp=575, level=1, unspent_points=0 WHERE id='${pet}'`);
  const multiple = JSON.parse(sql(claim(room())));
  assert.equal(multiple.level, 4); assert.equal(multiple.pointsEarned, 3);
  sql(`UPDATE pets SET xp=43475, level=29, unspent_points=28 WHERE id='${pet}'`);
  sql(claim(room()));
  assert.deepEqual(state(), [43500, 30, 29, 10, 7]);
  sql(claim(room()));
  assert.deepEqual(state(), [43525, 30, 29, 10, 7]);
  assert.throws(() => sql(`UPDATE pets SET level=31 WHERE id='${pet}'`));
  assert.equal(sql(`SELECT xp FROM pets WHERE id='${other}'`), '0');
  sql(`UPDATE pets SET is_active=true WHERE id='${pet}'`);
  const parallelRoom = room();
  await Promise.all([
    run(exe('psql'), [...args, '-c', claim(parallelRoom)]),
    ...Array.from({length: 8}, () => run(exe('psql'), [...args, '-c', `SELECT increment_active_pet_xp('${user}', 10)`])),
  ]);
  assert.deepEqual(state(), [43630, 30, 29, 10, 7]);
  assert.throws(() => sql(`SET ROLE authenticated; SELECT increment_active_pet_xp('${user}', 10)`));
  console.log('PASS PostgreSQL: concurrent existing egg XP and Wildwood XP do not overwrite each other');
  console.log('PASS PostgreSQL: 25 XP, replay/reconnect, 8 concurrent claims, 1→2→3, multiple levels, level-30 cap, defeat/active/legacy rejection, ownership, role restrictions, atomic rollback, unrelated pet/stats preserved');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => {
  if (started) execFileSync(exe('pg_ctl'), ['-D', dir, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
  console.log(`Disposable test cluster: ${dir}`);
});
