filename: supabase/review/admin-promotion.sql
linenumber: 1
old_code: (absent; new file)
new_code:
```text
-- REVIEW ONLY. Project: uhdpwgybrcizligqypzb. Requires separate explicit approval.
-- Run the WHOLE file in one postgres session; never run individual statements.
-- Defaults to ROLLBACK. Only after approval change the final ROLLBACK to COMMIT.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
-- Briefly blocks profile reads/writes; prevents concurrent writes during bypass.
LOCK TABLE public.profiles IN ACCESS EXCLUSIVE MODE;

DO $proposal$
DECLARE
  target constant uuid := 'd75a5ab0-0763-4548-87bb-cc9f5483b94f';
  expected_email constant text := 'jaydentestemail6790+admin@gmail.com';
  before_others jsonb;
  before_target jsonb;
  changed integer;
BEGIN
  IF current_user <> 'postgres' OR current_setting('session_replication_role') <> 'origin' THEN
    RAISE EXCEPTION 'Requires approved postgres maintenance session with normal triggers';
  END IF;
  -- Hold the verified identity stable until transaction completion.
  PERFORM 1 FROM auth.users
  WHERE id = target AND lower(email) = expected_email
    AND role = 'authenticated' AND email_confirmed_at IS NOT NULL
    AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until <= now())
  FOR UPDATE;
  IF NOT FOUND OR (SELECT count(*) FROM auth.users WHERE lower(email) = expected_email) <> 1 THEN
    RAISE EXCEPTION 'Auth identity or sign-in eligibility differs from review';
  END IF;
  IF (SELECT count(*) FROM public.profiles
      WHERE user_id = target AND lower(email) = expected_email
        AND is_admin = false AND role = 'user') <> 1
    OR (SELECT count(*) FROM public.profiles WHERE lower(email) = expected_email) <> 1 THEN
    RAISE EXCEPTION 'Profile identity or current role differs from review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE is_admin OR role = 'admin')
    OR EXISTS (SELECT 1 FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
               OR raw_app_meta_data->>'is_admin' = 'true') THEN
    RAISE EXCEPTION 'Administrator state differs from review; do not demote anyone';
  END IF;
  IF (SELECT md5(coalesce(string_agg(jsonb_build_array(user_id,is_admin,role)::text,
       E'\n' ORDER BY user_id),'')) FROM public.profiles WHERE user_id <> target)
       <> '04b39642937709d69001a8b027a2e105' THEN
    RAISE EXCEPTION 'Other profile membership or roles changed; review again';
  END IF;
  IF md5(pg_get_functiondef('public.prevent_role_escalation()'::regprocedure))
       <> 'b134123d52b903a50a5df66b6e08b08c'
    OR NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_prevent_role_escalation'
        AND tgenabled = 'O' AND md5(pg_get_triggerdef(oid)) = 'edcf0720f19b2facaeddbdc7f836a634') THEN
    RAISE EXCEPTION 'Role protection changed; review again';
  END IF;
  SELECT jsonb_agg(to_jsonb(p) ORDER BY user_id) INTO before_others
  FROM public.profiles p WHERE user_id <> target;
  SELECT to_jsonb(p) - ARRAY['is_admin','role','updated_at'] INTO before_target
  FROM public.profiles p WHERE user_id = target;

  -- Only this trigger is bypassed; RLS and all other triggers remain unchanged.
  ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_role_escalation;
  UPDATE public.profiles SET is_admin = true, role = 'admin'
  WHERE user_id = target AND lower(email) = expected_email AND NOT is_admin AND role = 'user';
  GET DIAGNOSTICS changed = ROW_COUNT;
  ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_role_escalation;

  IF changed <> 1 OR (SELECT count(*) FROM public.profiles WHERE is_admin OR role = 'admin') <> 1
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target
      AND lower(email) = expected_email AND is_admin AND role = 'admin') THEN
    RAISE EXCEPTION 'Promotion verification failed';
  END IF;
  IF before_others IS DISTINCT FROM
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY user_id) FROM public.profiles p WHERE user_id <> target)
    OR before_target IS DISTINCT FROM
      (SELECT to_jsonb(p) - ARRAY['is_admin','role','updated_at'] FROM public.profiles p WHERE user_id = target)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_prevent_role_escalation'
        AND tgenabled = 'O' AND md5(pg_get_triggerdef(oid)) = 'edcf0720f19b2facaeddbdc7f836a634')
    OR md5(pg_get_functiondef('public.prevent_role_escalation()'::regprocedure))
       <> 'b134123d52b903a50a5df66b6e08b08c' THEN
    RAISE EXCEPTION 'Unexpected profile change or role protection not restored';
  END IF;
END;
$proposal$;

SELECT user_id, email, is_admin, role FROM public.profiles WHERE is_admin OR role = 'admin';
ROLLBACK;
```
description: New review-only artifact; no existing code replaced.

filename: supabase/review/admin-verification.sql
linenumber: 1
old_code: (absent; new file)
new_code:
```text
-- Read-only checks for project uhdpwgybrcizligqypzb, before/after approved promotion.
BEGIN READ ONLY;
SELECT count(*) AS administrator_count,
  count(*) FILTER (WHERE user_id = 'd75a5ab0-0763-4548-87bb-cc9f5483b94f'
    AND lower(email) = 'jaydentestemail6790+admin@gmail.com'
    AND is_admin AND role = 'admin') AS designated_administrator_count
FROM public.profiles WHERE is_admin OR role = 'admin';

SELECT p.user_id, p.email AS profile_email, u.email AS auth_email, p.is_admin, p.role,
  u.role AS auth_role, u.email_confirmed_at IS NOT NULL AS email_confirmed,
  u.deleted_at IS NULL AS not_deleted,
  (u.banned_until IS NULL OR u.banned_until <= now()) AS not_banned,
  EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email') AS email_identity
FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
WHERE p.user_id = 'd75a5ab0-0763-4548-87bb-cc9f5483b94f';

-- Expected: 9 and true. New signups also change this digest: investigate, don't overwrite.
SELECT count(*) AS other_profiles,
  md5(coalesce(string_agg(jsonb_build_array(user_id,is_admin,role)::text,E'\n' ORDER BY user_id),''))
    = '04b39642937709d69001a8b027a2e105' AS other_roles_unchanged_since_review
FROM public.profiles WHERE user_id <> 'd75a5ab0-0763-4548-87bb-cc9f5483b94f';

-- Expected: O and both true. Catalog verification, not an attempted escalation.
SELECT tgenabled,
  md5(pg_get_triggerdef(oid)) = 'edcf0720f19b2facaeddbdc7f836a634' AS trigger_unchanged,
  md5(pg_get_functiondef(tgfoid)) = 'b134123d52b903a50a5df66b6e08b08c' AS function_unchanged,
  pg_get_functiondef(tgfoid) AS protection_definition
FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_prevent_role_escalation';

SELECT count(*) AS app_metadata_admin_markers FROM auth.users
WHERE raw_app_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'is_admin' = 'true';
COMMIT;
```
description: New review-only artifact; no existing code replaced.

filename: supabase/review/admin-assignment-review.md
linenumber: 1
old_code: (absent; new file)
new_code:
```text
# Administrator assignment — review only

Project: Deltapets (`uhdpwgybrcizligqypzb`). Inspected 2026-11-06.
Target: `d75a5ab0-0763-4548-87bb-cc9f5483b94f`, `jaydentestemail6790+admin@gmail.com`.
No database writes, promotion, reset, session changes, or deployment performed.

## Observed findings

- Live auth.users and public.profiles both match the UUID and lowercase email. Profile currently has is_admin=false and role=user. Zero profile administrators and zero auth app_metadata role=admin/is_admin=true markers were found. Nine other profiles exist; their UUID/role/is_admin digest is captured in both SQL files.
- Auth role remains authenticated; email is confirmed, email identity exists, banned_until and deleted_at are null. These are sign-in prerequisites, not a successful login test. Passwords and sessions were not inspected or changed.
- The live prevent_role_escalation function unconditionally rejects changing either profile role field. The trigger is enabled for normal operation (O). A service-role RLS bypass does not bypass this trigger.
- Live announcements policy "admins manage announcements" checks profiles.is_admin against auth.uid(). This is a real database authorization effect. The inspected Express requireUser middleware verifies tokens with auth.getUser; /api/me returns is_admin but does not confer general administrative powers. No generic admin middleware was found. The proposal does not grant database roles, project access, service-role keys, or new backend permissions.
- Active baseline migration contains historical role-dependent functions; live catalog inspection takes precedence: current public functions referencing is_admin/admin comprise the escalation guard, with no matching public views. Existing role constraint permits user/admin.

## Proposed privileged method and risks

Use the project's SQL Editor as postgres, or a trusted direct postgres connection to this exact project, only after separate explicit approval. Verify the selected project manually; SQL cannot establish the dashboard project ref. Execute the complete admin-promotion.sql file in one session. It is deliberately outside migrations and ends with ROLLBACK. Approval must include replacing that last statement with COMMIT for a permanent assignment. Even a rollback dry run performs temporary writes and is NOT authorized yet.

The ACCESS EXCLUSIVE profile lock prevents concurrent profile reads/writes while exactly one named trigger is temporarily disabled. This briefly blocks profile-dependent requests; lock timeout is 5 seconds, statement timeout 30 seconds, idle transaction timeout 60 seconds. No interactive pause should occur while holding locks. Only the table owner/privileged maintenance operator can perform this operation. Ordinary API clients cannot use it. No callable function is installed, no RLS is changed, and replication-role bypass is not used. PostgreSQL documents owner requirements and trigger toggles at https://www.postgresql.org/docs/current/sql-altertable.html.

Identity, zero existing admins, other-role baseline, original trigger/function hashes, normal trigger mode, and target sign-in prerequisites must all pass before mutation. Concurrent privileged maintenance must be excluded operationally. The target auth row is locked; the script does not write auth data. Existing updated_at triggers will update the target profile timestamp. Every other target field and every other profile is compared after the update. Exactly one administrator and restored trigger are required before completion. Errors abort the transaction; ROLLBACK (or closing the connection) restores both flags and transactional trigger state. Do not bypass a failed guard or run selected statements. Reinspect if any reviewed state changes.

## Closed Alpha reset — unresolved blocker

No planned Closed Alpha progress-reset SQL was found in the repository's SQL/Markdown searches. The existing reset_test_account_game_data function and development-only self-destruct route are test-account deletion tools, not the requested alpha reset. Neither constitutes explicit UUID-based protection for the future reset. They were not changed or executed.

The future reset MUST explicitly exclude UUID d75a5ab0-0763-4548-87bb-cc9f5483b94f independently of admin flags. Build one reviewed reset-target set excluding that UUID and every designated admin, then scope EVERY deletion/update to that set. Derive pet IDs, battle/run IDs and other indirect child ownership from those targets before deleting any parents. Inspect cascades, triggers, dynamic SQL and cleanup RPCs; no blanket TRUNCATE or global cleanup may affect protected rows. Add a preflight assertion that the protected UUID is absent from all target sets and before/after assertions preserving its entire player-data graph. Do not delete auth identities. The actual reset script and its affected table graph must be supplied/reviewed before exclusion can be certified. No reset SQL is included here to avoid implying an unaudited deletion plan is safe.

## Verification and limitations

admin-verification.sql is read-only. Before promotion, administrator counts should be 0/0; after approved promotion, 1/1. Other-role digest must match, trigger/function hashes must match, trigger mode must remain O, and auth eligibility checks must remain true. Metadata admin count should remain zero; application profile admin and Supabase Auth role are distinct.

Live SELECTs confirmed the pre-promotion findings and trigger definition. Promotion SQL was reviewed against the live schema but was NOT executed, including with rollback. No attempted escalation, login, announcement write, player reset or gameplay test was performed. SQL-only review files do not require frontend/backend builds. Read-only catalog checks confirm enabled protection and unchanged implementation; they do not behaviorally test a rejected update. The supplied source confirms rejection of both fields.

## Change inventory

Only new review artifacts were added. No existing source, migrations or player records were replaced. The accompanying admin-code-changes.md records exact complete additions with line 1, old_code absent, and full new_code. git-status-before.txt records the existing working tree on branch Core_Systems_version_1; staged changes were absent. All pre-existing work is preserved.
```
description: New review-only artifact; no existing code replaced.

filename: supabase/review/git-status-before.txt
linenumber: 1
old_code: (absent; new file)
new_code:
```text
 M backend/server/src/battle/battleEngine.ts
 M backend/server/src/pets/petProgression.ts
 M backend/server/src/routes/alphaAccess/poeTayToe/poeTayToe.ts
 M backend/server/src/routes/cities/kithna/wildwood.ts
 M backend/server/src/routes/cities/kithna/wildwoodBattleService.ts
 M backend/server/src/shared/battle/wildwoodTypes.ts
 M backend/server/src/shared/pets/characterProfiles/starters/twiglet.json
 M frontend/web/src/app/App.tsx
 M frontend/web/src/app/entry/useEnterGame.tsx
 M frontend/web/src/components/Authentication/LoginMenus.tsx
 M frontend/web/src/components/Hatchery/pages/HatcheryPage.css
 M frontend/web/src/components/MainTeam/mainTeam.css
 M frontend/web/src/components/PoeTayToe/PoeTayToe.css
 M frontend/web/src/components/PoeTayToe/PoeTayToe.tsx
 M frontend/web/src/components/RoamEncounterToast/RoamEncounterToast.tsx
 M frontend/web/src/components/skillChamber/skillChamber.css
 M frontend/web/src/components/skillChamber/skillChamber.tsx
 M frontend/web/src/mobile.css
 M frontend/web/src/pages/Cities/Kithna/KithnaMap.tsx
 M frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx
 M frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodExploreResult.tsx
 M frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx
 M frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css
 M frontend/web/src/pages/Cities/Kithna/merchant/kithna_Food_Shop.tsx
 M frontend/web/src/pages/petsPage/PetPage.tsx
 M frontend/web/src/pages/profile/ProfilePage.tsx
 M tools/check-battle-engine.cjs
 M tools/check-wildwood-integration.cjs
?? AGENTS_backup.md
?? Skill-choice-code-changes.md
?? Skill-choice-integration-review.md
?? Skills-chamber-foundation-changes.md
?? Wildwood-approved-battle-font-changes.md
?? Wildwood-battle-intro-changes.md
?? Wildwood-chamber-resize-changes.md
?? Wildwood-eggs-only-changes.md
?? Wildwood-recent-finds-changes.md
?? Wildwood-skills-integration-changes.md
?? Wildwood-step6-review.md
?? Wildwood-ui-polish-changes.md
?? Wildwood-ui-repair-changes.md
?? Wildwood-visual-changes.md
?? backups/
?? frontend/pet_items.zip
?? frontend/retired/
?? frontend/web/src/components/Skills/skillChoiceDraft.ts
?? frontend/web/src/kith/assets/Avatar.zip
?? frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodScene.tsx
?? frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodSkillsChamber.tsx
?? merchant_shop_current.tsx
?? supabase/kennith-review.md
?? supabase/migrations/20261025000000_assanti_daily_stock.sql
?? supabase/migrations/20261026002000_merchant_stock_cap_199.sql
?? supabase/migrations/20261026003000_assanti_food_purchase_limit_99.sql
?? supabase/migrations/20261027010000_assanti_atomic_basket.sql
?? supabase/migrations/20261031023721_equipment_and_item_care_review.sql
?? supabase/migrations/20261102154932_traveling_potato_effects.sql
?? supabase/migrations/20261104134447_wildwood_victory_progression.sql
?? supabase/migrations_backup/
?? supabase/traveling-potato-review.md
?? tools/check-homepage-spotlight.cjs
?? tools/check-wildwood-progression.cjs
?? tools/test-traveling-potato-api.cjs
?? tools/test-traveling-potato.py
?? tools/wildwood-progression-review.md
```
description: New review-only artifact; no existing code replaced.
