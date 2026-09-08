alter table public.signup_trigger_errors enable row level security;

drop policy if exists "Service role can view signup trigger errors"
on public.signup_trigger_errors;

create policy "Service role can view signup trigger errors"
on public.signup_trigger_errors
for select
to service_role
using (true);