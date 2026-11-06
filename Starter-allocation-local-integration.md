# Starter allocation local integration

## Results

Installed the complete proposal in disposable PostgreSQL17 clusters on127.0.0.1:55441 using synthetic data only. Harness changes final ROLLBACK to COMMIT in memory for this new local cluster only. Source SQL remains unchanged/unapplied. Every started cluster stopped automatically; final cluster C:/Users/maxwe/AppData/Local/Temp/starter-allocation-test-oeU5LD retained stopped for inspection. No production Supabase or Render access.

Fixed state integration: starterAllocation reports available points, missing levels, conflicting spending and reconciliation status. allocationStatus no longer implies availability when later history is missing. Diagnostics use separate reads and may transiently require refresh during spending; allocation RPC remains authoritative under lock.

Local API mount: /api/pets/progression/:petId/state (GET), /stats and /skill (POST), existing authenticated router/rate limits. Enabled ONLY with NODE_ENV=development, ENABLE_STARTER_ALLOCATION=true and loopback SUPABASE_URL. Production and shared-host configs disabled. No frontend changes. Complete HTTP/PostgREST/authenticated user flow still needs a local Supabase stack; SQL and mocked service tests are not that end-to-end test.

Read-only reconciliation query reports missing entitlements and allocation mismatches. Executed on synthetic missing-history fixtures. No real pets inspected. Current XP/level is insufficient proof of historical rewards: no automatic backfill, no inferred points, no altered allocations. Individual evidence review remains necessary. Universal XP separate.

PASS: pnpm --dir backend/server build.
PASS: pnpm exec node tools/check-level-2-foundation.cjs.
PASS: pnpm exec node tools/check-level-2-skill-contract.cjs.
PASS: pnpm exec node tools/check-battle-engine.cjs (10 checks).
PASS: node tools/check-starter-allocation-db.cjs "C:/Program Files/PostgreSQL/17/bin".
Real SQL cases: six concurrent identical rewards and six identical spends; competing overspend; historical retry after later spending; conflicting request payload; wrong owner; split/saved spending;58 points through30; cap;HPx2/no healing; client RPC/table denial; missing history rejected without mutation; Kithna one-point rule; injected receipt failure atomically rolls back stats/entitlements/history; reconciliation query.

Initial failures resolved: sandbox blocked initdb WAL rename (authorized isolated run outside sandbox); fixture omitted pet_stats UPDATE privilege needed by FOR SHARE (corrected to match baseline grants). Final tests pass. No source SQL correction required. Fixture is not the complete Supabase schema/RLS/PostgREST environment.

## Recovery

Checkpoint backups/starter-allocation-integration-checkpoint.json contains exact pre-turn contents for7 files; previous backup verified readable. Restore only changed files listed below from checkpoint JSON values after checking for subsequent edits. Use Python: data=json.loads(Path(checkpoint).read_text(encoding='utf-8')); Path(filename).write_text(data[filename],encoding='utf-8'). Do not restore other files or use git reset/clean. New files can be retained as evidence.

Disable local integration by unsetting ENABLE_STARTER_ALLOCATION and restarting backend. Clusters already stopped. If interrupted, use PowerShell: & 'C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe' -D 'C:/Users/maxwe/AppData/Local/Temp/starter-allocation-test-oeU5LD' -m fast -w stop (only that disposable cluster). No deletion needed. Production untouched; no production rollback required. Preserve entitlement tables/data if a future approved deployment occurs; do not drop accrued history as recovery.

Ready for production review, NOT installation. Remaining gates: full Supabase/auth integration, historical evidence review, rollout/rollback approval and separate universal XP integration. No deployment, production SQL, commits or player changes.

## Exact replacements

filename: backend/server/src/pets/level2/contracts.ts

linenumber: 73

old_code:
```
    }, "Spend between one and 58 earned starter points"),
}).strict();
```

new_code:
```
    }, "Spend between one and 58 earned starter points"),
}).strict();

export function allocationHistoryStatus(level: number, unspent: number,
  rewards: { level: number; points_awarded: number; points_spent: number }[],
  allocations: { level: number; hp: number; atk: number; magi: number; def: number; spd: number; mana: number }[]) {
  const missingLevels = Array.from({ length: Math.max(0, level - 1) }, (_, i) => i + 2)
    .filter(earnedLevel => !rewards.some(row => row.level === earnedLevel));
  const conflicts = rewards.filter(row => row.level > level || row.points_awarded !== 2
    || row.points_spent < 0 || row.points_spent > 2
    || row.points_spent !== allocations.filter(a => a.level === row.level)
      .reduce((sum, a) => sum + statKeys.reduce((n, key) => n + a[key], 0), 0)).map(row => row.level);
  const remaining = rewards.reduce((sum, row) => sum + row.points_awarded - row.points_spent, 0);
  const consistent = missingLevels.length === 0 && conflicts.length === 0 && remaining <= unspent
    && new Set(rewards.map(row => row.level)).size === rewards.length;
  return { missingLevels, conflictingLevels: conflicts, availablePoints: consistent ? remaining : 0,
    status: level < 2 ? 'ineligible' : consistent ? 'available' : 'reconciliation_required' };
}

export function localAllocationEnabled(mode: string | undefined, flag: string | undefined, url: string | undefined) {
  if (mode !== 'development' || flag !== 'true' || !url) return false;
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname); }
  catch { return false; }
}
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: backend/server/src/pets/level2/service.ts

linenumber: 3

old_code:
```
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { allocationRequestSchema, starterAllocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema, statKeys } from "./contracts";

function parseDatabase<T>(schema: z.ZodType<T>, value: unknown): T {
```

new_code:
```
import { AppError } from "../../lib/AppError";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { allocationRequestSchema, starterAllocationRequestSchema, choiceRequestSchema, getLevel2Design, petIdSchema, statKeys, allocationHistoryStatus } from "./contracts";

function parseDatabase<T>(schema: z.ZodType<T>, value: unknown): T {
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: backend/server/src/pets/level2/service.ts

linenumber: 60

old_code:
```
  const claim = parseDatabase(claimSchema.nullable(), claimResult.data);
  const reward = parseDatabase(rewardSchema.nullable(), rewardResult.data);
  const design = getLevel2Design(pet.species, pet.line);
  const slugs = design?.candidates.map(candidate => candidate.proposed_skill_id) ?? [];
```

new_code:
```
  const claim = parseDatabase(claimSchema.nullable(), claimResult.data);
  const reward = parseDatabase(rewardSchema.nullable(), rewardResult.data);
  let starterAllocation = null;
  if (STARTER_SPROUTS.some(starter => starter.speciesId === pet.species)) {
    const [later, history] = await Promise.all([
      supabaseAdmin.from("pet_starter_level_rewards").select("level,points_awarded,points_spent").eq("pet_id", petId),
      supabaseAdmin.from("pet_stat_allocations").select("level,hp,atk,magi,def,spd,mana").eq("pet_id", petId),
    ]);
    if (later.error) databaseFailure(later.error);
    if (history.error) databaseFailure(history.error);
    const rows = parseDatabase(z.array(rewardSchema.extend({ level: z.number().int().min(3).max(30) })), later.data);
    const n = z.number().int().nonnegative();
    const allocations = parseDatabase(z.array(z.object({ level: z.number().int().min(1).max(30),
      hp: n, atk: n, magi: n, def: n, spd: n, mana: n })), history.data);
    starterAllocation = allocationHistoryStatus(pet.level, pet.unspent_points,
      [...(reward ? [{ level: 2, ...reward }] : []), ...rows], allocations);
  }
  const design = getLevel2Design(pet.species, pet.line);
  const slugs = design?.candidates.map(candidate => candidate.proposed_skill_id) ?? [];
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: backend/server/src/pets/level2/service.ts

linenumber: 92

old_code:
```
      catalog.some(entry => entry.slug === slug && learned.some(row => row.skill_id === entry.id)))) : [];
  return { pet, learned: learned.map(row => ({ ...row, definition: catalog.find(entry => entry.id === row.skill_id) ?? null })),
    claim, choices, combatEnabled: false,
    level2Points: reward ? reward.points_awarded - reward.points_spent : 0,
    allocationStatus: pet.level < 2 ? "ineligible" : reward ? "available" : "reconciliation_required" };
}

```

new_code:
```
      catalog.some(entry => entry.slug === slug && learned.some(row => row.skill_id === entry.id)))) : [];
  return { pet, learned: learned.map(row => ({ ...row, definition: catalog.find(entry => entry.id === row.skill_id) ?? null })),
    claim, choices, combatEnabled: false, starterAllocation,
    level2Points: reward ? reward.points_awarded - reward.points_spent : 0,
    allocationStatus: starterAllocation?.status ?? (pet.level < 2 ? "ineligible" : reward ? "available" : "reconciliation_required") };
}

```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: backend/server/src/routes/pets/level2.ts

linenumber: 6

old_code:
```
import { petIdSchema } from "../../pets/level2/contracts";

// DELIBERATELY UNMOUNTED. Mount under the existing authenticated/rate-limited
// /api router only after the reviewed database proposal is approved and verified.
export const level2Router = Router();
level2Router.use(requireUser);
```

new_code:
```
import { petIdSchema } from "../../pets/level2/contracts";

// Local-only opt-in mount under the existing authenticated/rate-limited API.
// Production remains disabled pending separate schema/security approval.
export const level2Router = Router();
level2Router.use(requireUser);
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: backend/server/src/routes/index.ts

linenumber: 2

old_code:
```

import { Router } from "express";

import { meRouter } from "./me";
```

new_code:
```

import { Router } from "express";
import { level2Router } from "./pets/level2";
import { localAllocationEnabled } from "../pets/level2/contracts";
import { env } from "../env.server";

import { meRouter } from "./me";
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: backend/server/src/routes/index.ts

linenumber: 41

old_code:
```
apiRouter.use("/pets", resonanceEvolutionRouter);
apiRouter.use("/pets", storageActionsRouter);
apiRouter.use("/pets", petsRouter);
apiRouter.use("/battle", battleRouter);
```

new_code:
```
apiRouter.use("/pets", resonanceEvolutionRouter);
apiRouter.use("/pets", storageActionsRouter);
// Explicitly local-only until production schema/security review is approved.
if (localAllocationEnabled(env.NODE_ENV, process.env.ENABLE_STARTER_ALLOCATION, env.SUPABASE_URL)) {
  apiRouter.use("/pets/progression", level2Router);
}
apiRouter.use("/pets", petsRouter);
apiRouter.use("/battle", battleRouter);
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: tools/check-level-2-foundation.cjs

linenumber: 158

old_code:
```
    error => error.name === 'ZodError'); // Router maps client-input ZodError to 400.
  assert.equal(pet.hp_cur, 6); // Service never mutates combat stats locally.
  assert.ok(!fs.readFileSync('backend/server/src/routes/index.ts', 'utf8').includes('level2'));
  console.log('PASS: allocation validation/budgets, species eligibility, ownership filtering, RPC delegation, conflict/unavailable errors, invalid database responses (502), receipt binding, unchanged local HP, router unmounted.');
  console.log('NOTE: retry result mocked; database atomicity/concurrency/persistence still require approved integration testing.');
}
```

new_code:
```
    error => error.name === 'ZodError'); // Router maps client-input ZodError to 400.
  assert.equal(pet.hp_cur, 6); // Service never mutates combat stats locally.
  assert.equal(contracts.localAllocationEnabled('production', 'true', 'http://localhost:54321'), false);
  assert.equal(contracts.localAllocationEnabled('development', 'true', 'https://shared.supabase.co'), false);
  assert.equal(contracts.localAllocationEnabled('development', undefined, 'http://localhost:54321'), false);
  assert.equal(contracts.localAllocationEnabled('development', 'true', 'http://127.0.0.1:54321'), true);
  const history = [{ level: 2, points_awarded: 2, points_spent: 1 }];
  const allocations = [{ level: 2, ...allocation, hp: 1 }];
  assert.equal(contracts.allocationHistoryStatus(2, 1, history, allocations).availablePoints, 1);
  assert.deepEqual(contracts.allocationHistoryStatus(3, 3, history, allocations).missingLevels, [3]);
  assert.equal(contracts.allocationHistoryStatus(3, 3, history, allocations).availablePoints, 0);
  assert.equal(contracts.allocationHistoryStatus(2, 0, history, allocations).status, 'reconciliation_required');
  assert.equal(contracts.allocationHistoryStatus(2, 1, history, []).status, 'reconciliation_required');
  console.log('PASS: allocation validation/budgets, species eligibility, ownership filtering, RPC delegation, conflict/unavailable errors, invalid database responses (502), receipt binding, unchanged local HP, production route disabled, local opt-in, reconciliation diagnostics.');
  console.log('NOTE: retry result mocked; database atomicity/concurrency/persistence still require approved integration testing.');
}
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: tools/check-starter-allocation-db.cjs

linenumber: 1

old_code:
```
(new file)
```

new_code:
```
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync,execFile} = require('node:child_process');
const run = require('node:util').promisify(execFile);
const bin = process.argv[2];
if (!bin) throw Error('PostgreSQL bin directory required');
const exe = n => path.join(bin,n+(process.platform==='win32'?'.exe':''));
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'starter-allocation-test-'));
const port='55441';
const args=['-X','-q','-h','127.0.0.1','-p',port,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'];
const sql=q=>execFileSync(exe('psql'),args,{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const uuid=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const owner=uuid(1), pet=uuid(2), wrong=uuid(3);
const stats={hp:0,atk:0,magi:0,def:0,spd:0,mana:0};
const alloc=(request,values,user=owner)=>`SET ROLE service_role; SELECT allocate_level2_stats('${user}','${pet}','${uuid(request)}','${JSON.stringify({...stats,...values})}'::jsonb);`;
const parallel=q=>run(exe('psql'),[...args,'-c',q]);
const state=()=>sql(`SELECT jsonb_build_array(level,xp,unspent_points,hp_max,hp_cur,atk,mana) FROM pets WHERE id='${pet}'`);
let started=false;
async function main(){
 execFileSync(exe('initdb'),['-D',dir,'-U','postgres','-A','trust','--no-locale','--encoding=UTF8'],{stdio:'pipe'});
 execFileSync(exe('pg_ctl'),['-D',dir,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start'],{stdio:'ignore'});started=true;
 sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE pets(id uuid PRIMARY KEY,user_id uuid,species text DEFAULT 'earth_starter',line text DEFAULT 'earth',stage text DEFAULT 'hatchling',level int DEFAULT 1 CONSTRAINT pets_level_check CHECK(level BETWEEN 0 AND 10),xp int DEFAULT 0,unspent_points int DEFAULT 0,hp_max int DEFAULT 10,hp_cur int DEFAULT 6,atk int DEFAULT 3,magi int DEFAULT 3,def int DEFAULT 3,spd int DEFAULT 3,mana int DEFAULT 3,is_active boolean DEFAULT true,ran_away boolean DEFAULT false);
 CREATE TABLE pet_stats(pet_id uuid PRIMARY KEY REFERENCES pets,base_hp int DEFAULT 5,base_atk int DEFAULT 3,base_magi int DEFAULT 3,base_def int DEFAULT 3,base_spd int DEFAULT 3,base_mana int DEFAULT 3);
 CREATE TABLE pet_stat_allocations(id uuid DEFAULT gen_random_uuid(),pet_id uuid REFERENCES pets,level int CONSTRAINT pet_stat_allocations_level_check CHECK(level BETWEEN 1 AND 10),hp int NOT NULL DEFAULT 0,atk int NOT NULL DEFAULT 0,magi int NOT NULL DEFAULT 0,def int NOT NULL DEFAULT 0,spd int NOT NULL DEFAULT 0,mana int NOT NULL DEFAULT 0,created_at timestamptz DEFAULT now(),xp int DEFAULT 0,UNIQUE(pet_id,level),CONSTRAINT pet_alloc_points_valid CHECK(level=1 OR hp+atk+magi+def+spd+mana=1));
 CREATE TABLE skill_defs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE,name text,description text,required_level int,requirements jsonb,created_at timestamptz DEFAULT now());
 CREATE TABLE pet_skills(pet_id uuid REFERENCES pets,skill_id uuid REFERENCES skill_defs,equipped boolean DEFAULT false,unlocked_at timestamptz DEFAULT now(),PRIMARY KEY(pet_id,skill_id));
 CREATE TABLE wildwood_expeditions(id uuid PRIMARY KEY,user_id uuid);
 CREATE TABLE wildwood_rooms(id uuid PRIMARY KEY,expedition_id uuid,battle_id uuid UNIQUE,status text,event_kind text,event_payload jsonb);
 CREATE TABLE pet_battle_results(battle_id uuid,pet_id uuid,user_id uuid,result text,PRIMARY KEY(battle_id,pet_id));
 GRANT SELECT,UPDATE ON pets,wildwood_rooms TO service_role;
 GRANT SELECT,UPDATE ON pet_stats TO service_role; GRANT SELECT ON wildwood_expeditions,pet_battle_results TO service_role;
 INSERT INTO pets(id,user_id,xp) VALUES('${pet}','${owner}',575);
 INSERT INTO pet_stats(pet_id) VALUES('${pet}');
 INSERT INTO wildwood_expeditions VALUES('${owner}','${owner}');`);
 sql(fs.readFileSync('supabase/migrations/20261104134447_wildwood_victory_progression.sql','utf8'));
 const proposal=fs.readFileSync('supabase/review/level-2-foundation.proposed.sql','utf8');
 assert.ok(proposal.trimEnd().endsWith('ROLLBACK;'));
 // Commit ONLY in this newly-created disposable loopback cluster. Source stays ROLLBACK.
 sql(proposal.replace(/ROLLBACK;\s*$/,'COMMIT;'));
 function victory(n){const id=uuid(n);const payload={xpRewardVersion:1,recordBattleStats:true,battle:{id,status:'victory',participants:[{id:pet,sourcePetId:pet,side:'player',hpCur:6,defeated:false},{id:wrong,side:'enemy',hpCur:0,defeated:true}]}};
 sql(`INSERT INTO wildwood_rooms VALUES('${id}','${owner}','${id}','resolved','corrupted_battle','${JSON.stringify(payload)}'); INSERT INTO pet_battle_results VALUES('${id}','${pet}','${owner}','victory');`);
 return `SET ROLE service_role; SELECT settle_wildwood_victory_xp('${owner}','${id}');`;}
 const award=victory(10);await Promise.all(Array.from({length:6},()=>parallel(award)));
 assert.equal(sql(`SELECT unspent_points FROM pets WHERE id='${pet}'`),'6');
 assert.equal(sql('SELECT count(*) FROM pet_starter_level_rewards'),'2');
 await Promise.all(Array.from({length:6},()=>parallel(alloc(20,{hp:1}))));
 assert.equal(sql('SELECT count(*) FROM pet_stat_spend_receipts'),'1');
 assert.equal(sql(`SELECT unspent_points FROM pets WHERE id='${pet}'`),'5');
 const first=sql(alloc(20,{hp:1}));
 const results=await Promise.allSettled([parallel(alloc(21,{atk:3})),parallel(alloc(22,{mana:3}))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(sql(`SELECT unspent_points FROM pets WHERE id='${pet}'`),'2');
 assert.equal(sql(alloc(20,{hp:1})),first);
 assert.throws(()=>sql(alloc(20,{mana:1})),/L2_CONFLICT/);
 assert.throws(()=>sql(alloc(24,{hp:1},wrong)),/L2_NOT_FOUND/);
 assert.throws(()=>sql(alloc(25,{hp:3})),/L2_POINTS/);
 sql(alloc(26,{hp:1,mana:1}));
 assert.equal(sql(`SELECT unspent_points FROM pets WHERE id='${pet}'`),'0');
 assert.equal(sql(`SELECT hp_cur FROM pets WHERE id='${pet}'`),'6');
 assert.equal(sql(`SELECT hp_max FROM pets WHERE id='${pet}'`),'14');
 assert.equal(sql('SELECT sum(points_spent) FROM pet_starter_level_rewards'),'4');
 assert.throws(()=>sql(`SET ROLE authenticated; SELECT allocate_level2_stats('${owner}','${pet}','${uuid(30)}','{}');`),/permission denied/);
 assert.throws(()=>sql(`SET ROLE authenticated; UPDATE pet_starter_level_rewards SET points_spent=0;`),/permission denied/);
 // Missing historical receipt is never fabricated.
 sql(`UPDATE pets SET level=5,unspent_points=2 WHERE id='${pet}'`);
 const before=state();assert.throws(()=>sql(alloc(31,{hp:1})),/L2_RECONCILIATION_REQUIRED/);assert.equal(state(),before);
 assert.ok(sql(fs.readFileSync('supabase/review/starter-allocation-reconciliation.sql','utf8')).includes('MISSING_EVIDENCE_NO_AUTOMATIC_BACKFILL'));
 sql(`UPDATE pets SET level=4,unspent_points=0,xp=43475 WHERE id='${pet}'`);
 sql(victory(32));assert.equal(sql(`SELECT unspent_points FROM pets WHERE id='${pet}'`),'52');
 sql(alloc(33,{mana:52}));assert.equal(sql(`SELECT mana FROM pets WHERE id='${pet}'`),results[1].status==='fulfilled'?'59':'56');
 assert.equal(sql('SELECT sum(points_spent) FROM pet_starter_level_rewards'),'56');
 sql(victory(34));assert.equal(sql(`SELECT unspent_points FROM pets WHERE id='${pet}'`),'0');
 // Rollback after stat writes but before the receipt persists.
 // Use a fresh synthetic pet for deterministic rollback and non-starter cases.
 const fresh=uuid(50);
 sql(`INSERT INTO pets(id,user_id,level,unspent_points) VALUES('${fresh}','${owner}',2,2);
 INSERT INTO pet_stats(pet_id) VALUES('${fresh}'); INSERT INTO pet_level2_rewards(pet_id) VALUES('${fresh}');
 CREATE FUNCTION reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected receipt failure'; END; $$;
 CREATE TRIGGER reject_receipt BEFORE INSERT ON pet_stat_spend_receipts FOR EACH ROW EXECUTE FUNCTION reject_receipt();`);
 const freshCall=alloc(51,{hp:1}).replaceAll(pet,fresh);
 assert.throws(()=>sql(freshCall),/injected receipt failure/);
 assert.equal(sql(`SELECT unspent_points FROM pets WHERE id='${fresh}'`),'2');
 assert.equal(sql(`SELECT count(*) FROM pet_stat_allocations WHERE pet_id='${fresh}'`),'0');
 assert.equal(sql(`SELECT points_spent FROM pet_level2_rewards WHERE pet_id='${fresh}'`),'0');
 sql('DROP TRIGGER reject_receipt ON pet_stat_spend_receipts;');
 sql(freshCall);
 sql(`UPDATE pets SET species='kithna_shade' WHERE id='${fresh}';`);
 assert.throws(()=>sql(alloc(52,{mana:3}).replaceAll(pet,fresh)),/L2_POINTS/);
 sql(`SET ROLE service_role; INSERT INTO pet_stat_allocations(pet_id,level,atk) VALUES('${fresh}',3,1);`);
 assert.throws(()=>sql(`SET ROLE service_role; UPDATE pet_stat_allocations SET atk=2 WHERE pet_id='${fresh}' AND level=3;`),/L2_POINTS/);
 assert.throws(()=>sql(`SET ROLE authenticated; INSERT INTO pet_stat_allocations(pet_id,level,atk) VALUES('${fresh}',4,1);`),/permission denied/);
 console.log('PASS local PostgreSQL: injected failure rolls back stats/entitlements/history; non-starter Level2 limit and later one-point writes preserved.');
 console.log('PASS local PostgreSQL: full proposal, concurrent XP/allocations, duplicate/reconnect/historical receipts, ownership, overspend, split/saved spending,58-point budget, cap, HP, RLS grants, missing-history rejection.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>{if(started)execFileSync(exe('pg_ctl'),['-D',dir,'-m','fast','-w','stop'],{stdio:'pipe'});console.log(`Stopped disposable cluster: ${dir}`);});

```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.

filename: supabase/review/starter-allocation-reconciliation.sql

linenumber: 1

old_code:
```
(new file)
```

new_code:
```
-- Read-only reconciliation evidence. Never infer or grant missing entitlements.
BEGIN READ ONLY;
WITH earned AS (
  SELECT pet_id,2 AS level,points_awarded,points_spent FROM public.pet_level2_rewards
  UNION ALL
  SELECT pet_id,level,points_awarded,points_spent FROM public.pet_starter_level_rewards
)
SELECT p.id AS pet_id,p.level AS current_level,p.xp,p.unspent_points,
  expected.level AS earned_level,e.points_awarded,e.points_spent,
  coalesce(a.hp+a.atk+a.magi+a.def+a.spd+a.mana,0) AS allocated,
  CASE WHEN e.pet_id IS NULL THEN 'MISSING_EVIDENCE_NO_AUTOMATIC_BACKFILL'
    WHEN e.points_spent<>coalesce(a.hp+a.atk+a.magi+a.def+a.spd+a.mana,0)
      THEN 'CONFLICT_REQUIRES_INDIVIDUAL_REVIEW'
    ELSE 'RECORDED' END AS review_status
FROM public.pets p
CROSS JOIN LATERAL generate_series(2,p.level) expected(level)
LEFT JOIN earned e ON e.pet_id=p.id AND e.level=expected.level
LEFT JOIN public.pet_stat_allocations a ON a.pet_id=p.id AND a.level=expected.level
WHERE p.species IN ('water_starter','fire_starter','earth_starter','air_starter','ice_starter',
  'storm_starter','light_starter','shadow_night_bad','shadow_day_good')
ORDER BY p.id,expected.level;
ROLLBACK;
```

description: Local integration, read-only evidence diagnostics or isolated regression verification. No production changes.
