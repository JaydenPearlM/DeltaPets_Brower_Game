// Static SQL/API checks only. PostgreSQL concurrency and constraints require an isolated DB test.
const fs=require('node:fs'),assert=require('node:assert/strict');
const sql=fs.readFileSync('supabase/migrations/20261116161401_level2_skill_learning_and_allocation.sql','utf8');
const catalog=require('../backend/server/src/shared/pets/characterProfiles/skillCatalog.json');
const approved=catalog.skills.filter(e=>e.approval_status==='approved_initial_testing');
assert.equal(approved.length,8);
assert.equal((sql.match(/INSERT INTO public.skill_defs\(/g)||[]).length,8);
for(const entry of approved)assert(sql.includes(`VALUES ('${entry.skill_id}'`));
assert(sql.trimEnd().endsWith('COMMIT;'));
assert(!sql.includes('UPDATE public.skill_defs'));
assert(!sql.includes('settle_wildwood_victory_xp'));
for(const fragment of [
  'PRIMARY KEY (pet_id, milestone_key)', 'PRIMARY KEY (pet_id, request_id)',
  'user_id = p_user_id FOR UPDATE', 'IF c.skill_id <> d.id',
  'IF old_request.allocation <> p_allocation', 'RETURN old_request.result',
  'spent > p.unspent_points', 'generate_series(2,p.level)',
  'p.unspent_points <> COALESCE(cardinality(available_levels),0)',
  'p.hp_max=greatest(1,2*(base.base_hp+totals.hp))',
  'unspent_points = unspent_points-spent', 'hp_max = hp_max+h*2',
  'ON CONFLICT (slug) DO NOTHING', 'FROM PUBLIC, anon, authenticated',
  'TO service_role', 'ENABLE ROW LEVEL SECURITY',
])assert(sql.includes(fragment),fragment);
assert(!/UPDATE public\.pets SET[^;]*hp_cur\s*=/s.test(sql),'Allocations must not heal');
const routes=fs.readFileSync('backend/server/src/routes/index.ts','utf8');
assert(routes.includes('apiRouter.use("/pets/progression", level2Router)'));
const route=fs.readFileSync('backend/server/src/routes/pets/level2.ts','utf8');
assert(route.includes('level2Router.use(requireUser)'));
assert(route.includes('getUserId(req)'));assert(route.includes('petIdSchema.parse(req.params.petId)'));
const app=fs.readFileSync('backend/server/src/app.ts','utf8');
assert(app.includes('apiLimiter'));assert(app.includes('apiSpeedLimiter'));
console.log('PASS static migration/API contract: eight seeds, additive receipts, locks, ownership, bounded spending, retries, no healing/rewards/backfill, auth and service-only writes. SQL NOT executed.');
