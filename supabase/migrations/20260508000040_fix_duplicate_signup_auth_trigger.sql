-- supabase/migrations/20260508000040_fix_duplicate_signup_auth_trigger.sql

begin;

drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

commit;