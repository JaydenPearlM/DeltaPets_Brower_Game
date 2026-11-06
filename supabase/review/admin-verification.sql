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
