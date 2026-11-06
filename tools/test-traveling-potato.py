"""Run only against the disposable codex-potato-sql-test container (no project DB).
Usage: python tools/test-traveling-potato.py
Fixture reproduces relevant table columns/constraints, not the entire game schema.
"""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import uuid

CONTAINER = "codex-potato-sql-test-20261102"
ROOT = Path(__file__).resolve().parents[1]
DATABASE = "potato_test_" + uuid.uuid4().hex

def sql(query, fail=False):
    result = subprocess.run(["docker", "exec", "-i", CONTAINER, "psql", "-h", "/tmp",
        "-U", "postgres", "-d", DATABASE, "-X", "-qAt", "-v", "ON_ERROR_STOP=1"],
        input=query, text=True, capture_output=True)
    if fail:
        assert result.returncode != 0, "Expected database rejection"
        return result.stderr
    assert result.returncode == 0, result.stderr
    return result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ""

def uid(n):
    return f"00000000-0000-4000-8000-{n:012d}"

def status(n):
    return json.loads(sql(f"select public.get_poe_tay_toe_status('{uid(n)}');"))

def claim(n, snapshot=None, seed=None):
    s = snapshot or status(n)
    prefix = f"select setseed({seed});" if seed is not None else ""
    return json.loads(sql(prefix + f"select public.claim_poe_tay_toe_v2('{uid(n)}','{s['locationKey']}','{s['version']}');"))

def hide(n, discovery, target='home'):
    return sql(f"select public.hide_poe_tay_toe_v2('{uid(n)}','{target}','{discovery}');") == 't'

# Create an isolated database for this run in the disposable container only.
subprocess.run(["docker", "exec", CONTAINER, "createdb", "-h", "/tmp", "-U", "postgres", DATABASE], check=True)
# Refuse to overwrite any populated database.
assert sql("select count(*) from pg_tables where schemaname='public';") == '0', 'Test database must be empty'
for role in ('anon','authenticated','service_role'):
    if sql(f"select count(*) from pg_roles where rolname='{role}';") == '0':
        sql(f'create role {role};')
sql("create schema auth; create table auth.users(id uuid primary key);")
baseline = (ROOT / 'supabase/migrations/20260907160539_remote_baseline.sql').read_text(encoding='utf-8')
for table in ('poe_tay_toe_state','poe_tay_toe_finds','wallets'):
    start = baseline.index(f'CREATE TABLE IF NOT EXISTS "public"."{table}" (')
    end = baseline.index('\n);', start) + 3
    sql(baseline[start:end])
sql("""
alter table public.poe_tay_toe_state add primary key(id);
alter table public.poe_tay_toe_finds add primary key(id);
alter table public.poe_tay_toe_finds add foreign key(user_id) references auth.users(id);
alter table public.wallets add primary key(user_id);
alter table public.wallets add foreign key(user_id) references auth.users(id);
create table public.pets(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
 stage text, location text, hatch_ends_at timestamptz);
insert into public.poe_tay_toe_state(id,current_location_key) values(1,'home');
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
""")
for n in range(1, 25):
    sql(f"insert into auth.users values('{uid(n)}');")
sql((ROOT / 'supabase/migrations/20261102154932_traveling_potato_effects.sql').read_text())
print('PASS migration on baseline potato tables with fixture pets/auth')

expected=['potato_power','warm_potato','lucky_spud','potato_brain','rotten_luck','absolutely_nothing']
for roll, effect in zip([0,.2,.4,.6,.7,.8],expected):
    assert sql(f'select public.potato_effect_for_roll({roll});') == effect
sql('select public.potato_effect_for_roll(1);',fail=True)
# Obtain reproducible random seeds without changing production functions.
seeds={}
for i in range(-20,21):
    seed=i/20
    effect=sql(f'select setseed({seed}); select public.potato_effect_for_roll(random()::numeric);')
    seeds[effect]=seed
assert set(seeds)==set(expected)
print('PASS approved effect thresholds')

snapshot=status(1)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(lambda n:claim(n,snapshot,seeds['lucky_spud']),[1,2]))
assert sum(r['claimed'] for r in results)==1
winner=1 if results[0]['claimed'] else 2
loser=3-winner
result=results[winner-1]
assert sql('select count(*) from public.poe_tay_toe_finds;')=='1'
assert sql('select sum(dots) from public.wallets;')=='100'
assert status(loser)['canFind'] and not status(winner)['canFind']
assert status(winner)['findCount']==1
assert claim(winner)['reason']=='cooldown'
assert status(loser)['locationKey'] != snapshot['locationKey']
assert not hide(loser,result['discoveryId'])
assert not hide(winner,result['discoveryId'],'not-a-route')
assert hide(winner,result['discoveryId'])
assert not hide(winner,result['discoveryId'],'profile')
print('PASS concurrent claims, one reward, personal cooldown, owner-only and one-use relocation')

first=claim(loser,seed=seeds['absolutely_nothing'])
assert first['claimed']
assert claim(3,seed=seeds['absolutely_nothing'])['claimed']
assert not hide(loser,first['discoveryId'],'profile')
assert claim(4,snapshot)['reason']=='moved'
assert status(4)['canFind']
print('PASS immediate fallback, other-player discovery, stale relocation and no failed-claim cooldown')

for n,effect in zip(range(5,11),expected):
    result=claim(n,seed=seeds[effect])
    assert result['claimed'] and result['effect']['key']==effect
    temporary=effect in ('potato_power','warm_potato','potato_brain','rotten_luck')
    assert bool(result['effect']['expiresAt'])==temporary
    if temporary:
        duration=1800 if effect in ('potato_power','warm_potato') else 900
        assert sql(f"select extract(epoch from effect_expires_at-found_at)::int from public.poe_tay_toe_finds where user_id='{uid(n)}';")==str(duration)
    for reward, multiplier in [('xp',1.1 if effect=='potato_power' else .9 if effect=='potato_brain' else 1),('dots',.9 if effect=='rotten_luck' else 1),('items',1)]:
        assert float(sql(f"select public.potato_battle_multiplier('{uid(n)}','{reward}');"))==multiplier
    assert sql(f"select public.potato_battle_multiplier('{uid(n)}','xp',now()+interval '1 hour');")=='1'
print('PASS all six outcomes, exact durations, non-stacking multipliers and expiry (no battle award consumer exists)')

assert sql("select public.potato_warm_due('2026-01-01 01:00Z','2026-01-01 00:00Z','2026-01-01 00:30Z')='2026-01-01 00:57Z';")=='t'
assert sql("select public.potato_warm_due('2026-01-01 00:11Z','2026-01-01 00:00Z','2026-01-01 00:30Z')='2026-01-01 00:10Z';")=='t'
sql(f"insert into public.pets(user_id,stage,location,hatch_ends_at) values('{uid(11)}','egg','hatchery',now()+interval '1 hour');")
claim(11,seed=seeds['warm_potato'])
assert sql(f"select abs(extract(epoch from hatch_ends_at-now())-3420)<5 from public.pets where user_id='{uid(11)}';")=='t'
assert sql(f"insert into public.pets(user_id,stage,location,hatch_ends_at) values('{uid(11)}','egg','hatchery',statement_timestamp()+interval '1 hour') returning abs(extract(epoch from hatch_ends_at-statement_timestamp())-3420)<5;")=='t'
assert sql(f"update public.pets set hatch_ends_at=hatch_ends_at where user_id='{uid(11)}' returning abs(extract(epoch from hatch_ends_at-now())-3420)<5;")=='t'
assert sql(f"insert into public.pets(user_id,stage,location,hatch_ends_at) values('{uid(12)}','egg','hatchery',statement_timestamp()+interval '1 hour') returning hatch_ends_at=statement_timestamp()+interval '1 hour';")=='t'
print('PASS warm exact progress, current/new eggs, no repeated speed application, unaffected other players')

# Force a history insert failure after wallet credit: the entire award must roll back.
sql(f"alter table public.poe_tay_toe_finds add constraint test_reject check(user_id<>'{uid(13)}');")
s=status(13)
sql(f"select setseed({seeds['lucky_spud']}); select public.claim_poe_tay_toe_v2('{uid(13)}','{s['locationKey']}','{s['version']}');",fail=True)
assert status(13)['version']==s['version'] and status(13)['canFind']
assert sql(f"select count(*) from public.wallets where user_id='{uid(13)}';")=='0'
sql('alter table public.poe_tay_toe_finds drop constraint test_reject;')
for role in ('anon','authenticated'):
    assert sql(f"select has_function_privilege('{role}','public.claim_poe_tay_toe_v2(uuid,text,uuid)','execute');")=='f'
assert sql(f"set role service_role; select (public.get_poe_tay_toe_status('{uid(14)}')->>'canFind')::boolean;")=='t'
assert sql(f"select claimed from public.claim_poe_tay_toe('{uid(14)}','home');")=='f'
assert sql(f"select public.hide_poe_tay_toe('{uid(14)}','home');")=='f'
print('PASS transaction rollback, service-role boundary, legacy bypass blocked')
# An incubation transaction holds a pet write lock while Warm Potato starts.
# Whichever wins, the new egg must receive exactly one warm adjustment.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    future=pool.submit(sql, f"begin; insert into public.pets(user_id,stage,location,hatch_ends_at) values('{uid(15)}','egg','hatchery',clock_timestamp()+interval '1 hour'); select pg_sleep(1); commit;")
    warm=pool.submit(claim,15,None,seeds['warm_potato'])
    future.result()
    assert warm.result()['claimed']
assert sql(f"select abs(extract(epoch from hatch_ends_at-now())-3420)<8 from public.pets where user_id='{uid(15)}';")=='t'
sql(f"update public.poe_tay_toe_finds set found_at=now()-interval '2 hours 1 second',effect_expires_at=now()-interval '1 hour' where user_id='{uid(winner)}';")
assert status(winner)['canFind'] and claim(winner,seed=seeds['absolutely_nothing'])['claimed']
assert status(winner)['findCount']==2
print('PASS concurrent warm grant/incubation and cooldown expiry with persistent personal count')
print('All Traveling Potato SQL regression checks passed.')
