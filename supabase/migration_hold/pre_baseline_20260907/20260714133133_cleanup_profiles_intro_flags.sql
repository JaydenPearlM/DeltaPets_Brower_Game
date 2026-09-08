begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'intro_cutscene_completed'
  ) then
    execute $update$
      update public.profiles as profiles
      set intro_seen = true
      where coalesce(profiles.intro_seen, false) = false
        and (
          coalesce(profiles.intro_cutscene_completed, false) = true
          or exists (
            select 1
            from public.pets as pets
            where pets.user_id = profiles.user_id
          )
        )
    $update$;
  else
    update public.profiles as profiles
    set intro_seen = true
    where coalesce(profiles.intro_seen, false) = false
      and exists (
        select 1
        from public.pets as pets
        where pets.user_id = profiles.user_id
      );
  end if;
end
$$;

commit;