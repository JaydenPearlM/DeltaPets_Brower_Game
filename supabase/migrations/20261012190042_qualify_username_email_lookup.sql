-- Qualify the table because this function intentionally has an empty search_path.
-- CREATE OR REPLACE preserves the existing function ownership and permissions.
-- No player data or login matching rules are changed.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql SECURITY DEFINER
SET search_path TO ''
AS $$
  select au.email
  from public.profiles p
  join auth.users au
    on au.id = p.user_id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

COMMIT;
