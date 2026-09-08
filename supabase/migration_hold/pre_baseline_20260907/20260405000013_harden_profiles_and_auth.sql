begin;

-- Ensure columns expected by the auth/profile hardening logic exist
-- when rebuilding from the original Alpha schema.

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists role text not null default 'user';


-- Optional cleanup skipped:
-- profiles update is blocked by auth hardening trigger during CLI migration push.

alter table public.profiles
  alter column username drop not null;

create unique index if not exists profiles_username_unique_lower
on public.profiles (lower(username))
where username is not null;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_email_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_email_format_check
      check (
        email is null
        or email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
      );
  end if;
end $$;


drop trigger if exists prevent_profile_escalation_trigger on public.profiles;

create trigger prevent_profile_escalation_trigger
before update on public.profiles
for each row
execute function public.prevent_profile_escalation();


-- If duplicate usernames exist with case-only differences,
-- this migration will fail when the unique lower() index is created.
-- Fix those manually first if needed.

commit;