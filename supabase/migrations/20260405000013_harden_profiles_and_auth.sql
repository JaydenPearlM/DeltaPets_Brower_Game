begin;


-- Optional cleanup skipped:
-- profiles update is blocked by auth hardening trigger during CLI migration push.

-- keep the rest of the migration below this

alter table public.profiles
  alter column username drop not null;

create unique index if not exists profiles_username_unique_lower
on public.profiles (lower(username))
where username is not null;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin'));

alter table public.profiles
  add constraint profiles_email_format_check
  check (
    email is null
    or email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  );

drop trigger if exists prevent_profile_escalation_trigger on public.profiles;
create trigger prevent_profile_escalation_trigger
before update on public.profiles
for each row
execute function public.prevent_profile_escalation();





-- If duplicate usernames exist with case-only differences,
-- this migration will fail when the unique lower() index is created.
-- Fix those manually first if needed.

commit;