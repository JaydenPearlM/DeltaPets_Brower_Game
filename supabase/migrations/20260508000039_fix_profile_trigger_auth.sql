create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'Cannot modify another user profile';
  end if;

  if old.role is distinct from new.role then
    raise exception 'Role escalation denied';
  end if;

  return new;
end;
$$;