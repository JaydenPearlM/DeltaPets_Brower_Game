begin;

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'hatch_pet',
        'increment_pve_research_stats',
        'get_email_by_username',
        'handle_new_user_profile',
        'prevent_profile_escalation'
      )
  loop
    execute format('revoke execute on function %s from anon', fn);
  end loop;
end $$;

commit;