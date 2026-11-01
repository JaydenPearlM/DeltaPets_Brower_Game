// SELECT-only inspection. Never prints credentials or calls gameplay RPCs.
const {spawnSync} = require('node:child_process');
const status = spawnSync('pnpm.cmd', ['exec','supabase','status','-o','json'],
  {encoding:'utf8',shell:true,windowsHide:true,timeout:30000});
if (status.status !== 0) throw Error('Local Supabase status unavailable.');
const url = new URL(JSON.parse(status.stdout).DB_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '54322') throw Error('Unexpected local database target.');
const query = `BEGIN READ ONLY;
SELECT n.nspname,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.proname ILIKE '%assanti%' ORDER BY 1,2;
SELECT version,name FROM supabase_migrations.schema_migrations
WHERE version >= '20261017001518' ORDER BY version;
SELECT to_regclass('public.assanti_food_stock') AS food_stock,
to_regclass('public.assanti_potion_catalog') AS potion_catalog;
SELECT max(version) AS latest_applied_migration FROM supabase_migrations.schema_migrations;
SELECT to_regclass('public.assanti_food_catalog') AS food_catalog;
COMMIT;`;
const result = spawnSync('C:/Program Files/PostgreSQL/17/bin/psql.exe',
  ['-X','-w','-h',url.hostname,'-p',url.port,'-U',decodeURIComponent(url.username),
    '-d','postgres','-v','ON_ERROR_STOP=1'],
  {input:query,encoding:'utf8',windowsHide:true,timeout:30000,
    env:{...process.env,PGPASSWORD:decodeURIComponent(url.password),PGCONNECT_TIMEOUT:'5'}});
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
process.exitCode = result.status ?? 1;
