create or replace function public.get_email_by_username(
  p_username text
)
returns text
language sql
security definer
set search_path = public
as $$
  select au.email
  from profiles p
  join auth.users au
    on au.id = p.user_id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

grant execute on function public.get_email_by_username(text)
to anon, authenticated;