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
