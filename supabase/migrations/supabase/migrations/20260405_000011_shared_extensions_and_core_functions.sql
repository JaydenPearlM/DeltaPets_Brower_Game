begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
    null,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    new.email
  )
  on conflict (user_id) do update
  set
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

create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if old.user_id <> new.user_id then
    raise exception 'user_id cannot be changed';
  end if;

  if old.is_admin is distinct from new.is_admin then
    raise exception 'is_admin cannot be changed by client';
  end if;

  if old.role is distinct from new.role then
    raise exception 'role cannot be changed by client';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if old.is_admin is distinct from new.is_admin then
    raise exception 'role escalation blocked';
  end if;

  if old.role is distinct from new.role then
    raise exception 'role escalation blocked';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

commit;