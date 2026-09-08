-- supabase/migrations/20260518000100_lock_down_sensitive_rpcs.sql

do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'hatch_pet',
        'increment_pve_research_stats',
        'get_active_buffs',
        'handle_new_user_profile',
        'prevent_profile_escalation',
        'log_signup_trigger_error'
      )
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public',
      fn.schema_name,
      fn.function_name,
      fn.args
    );

    execute format(
      'revoke execute on function %I.%I(%s) from anon',
      fn.schema_name,
      fn.function_name,
      fn.args
    );
  end loop;
end $$;

-- Re-grant authenticated users access to gameplay RPCs if needed by the app.
grant execute on all functions in schema public to authenticated;