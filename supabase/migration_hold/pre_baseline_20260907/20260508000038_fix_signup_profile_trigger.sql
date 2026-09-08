-- Migration: Fix signup profile trigger
-- Description: Makes auth user creation safe and stores signup username metadata

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    user_id,
    username,
    display_name,
    email
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      nullif(new.raw_user_meta_data ->> 'username', ''),
      ''
    ),
    new.email
  )
  on conflict (user_id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
    email = excluded.email,
    updated_at = now();

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_resources (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.daily_care (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.daily_login_rewards (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();