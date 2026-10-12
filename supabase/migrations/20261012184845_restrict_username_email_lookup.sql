-- Permission-only change. Preserve the function body and all existing player data.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text)
TO service_role;

COMMIT;
