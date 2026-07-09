begin;

alter table public.wallets
  alter column dots set default 5000,
  alter column crystals set default 0;

insert into public.wallets (user_id, dots, crystals)
select id, 5000, 0
from auth.users
on conflict (user_id) do nothing;

update public.wallets
set
  dots = 5000,
  updated_at = now()
where dots < 5000;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  desired_username text;
  safe_username text;
begin
  desired_username := nullif(new.raw_user_meta_data ->> 'username', '');

  if desired_username is not null and exists (
    select 1 from public.profiles where username = desired_username
  ) then
    safe_username := desired_username || '_' || left(replace(new.id::text, '-', ''), 6);
  else
    safe_username := desired_username;
  end if;

  insert into public.profiles (
    user_id,
    username,
    display_name,
    email
  )
  values (
    new.id,
    safe_username,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      safe_username,
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

  insert into public.wallets (user_id, dots, crystals)
  values (new.id, 5000, 0)
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

commit;