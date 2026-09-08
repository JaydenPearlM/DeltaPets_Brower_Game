-- Migration: Add missing RLS policies
-- Description: Adds RLS policies to tables that have RLS enabled but no policies defined
-- Date: 2026-05-08
-- Migration number: 20260508_000033

-- ============================================================================
-- eggs table policies
-- ============================================================================

do $$
begin
  if to_regclass('public.eggs') is not null then
    execute 'drop policy if exists "eggs_select_own" on public.eggs';

    execute $policy$
      create policy "eggs_select_own"
      on public.eggs
      for select
      to authenticated
      using (user_id = auth.uid())
    $policy$;

    execute 'drop policy if exists "eggs_write_own" on public.eggs';

    execute $policy$
      create policy "eggs_write_own"
      on public.eggs
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $policy$;
  end if;
end $$;

-- ============================================================================
-- daily_login_rewards table policies
-- ============================================================================

do $$
begin
  if to_regclass('public.daily_login_rewards') is not null then
    execute 'drop policy if exists "daily_login_rewards_select_own" on public.daily_login_rewards';

    execute $policy$
      create policy "daily_login_rewards_select_own"
      on public.daily_login_rewards
      for select
      to authenticated
      using (id = auth.uid())
    $policy$;

    execute 'drop policy if exists "daily_login_rewards_write_own" on public.daily_login_rewards';

    execute $policy$
      create policy "daily_login_rewards_write_own"
      on public.daily_login_rewards
      for all
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid())
    $policy$;
  end if;
end $$;

-- ============================================================================
-- element_defs table policies
-- ============================================================================

do $$
begin
  if to_regclass('public.element_defs') is not null then
    execute 'drop policy if exists "element_defs_read_authed" on public.element_defs';

    execute $policy$
      create policy "element_defs_read_authed"
      on public.element_defs
      for select
      to authenticated
      using (true)
    $policy$;
  end if;
end $$;

-- ============================================================================
-- home_objects table policies
-- ============================================================================

do $$
begin
  if to_regclass('public.home_objects') is not null then
    execute 'drop policy if exists "home_objects_select_own" on public.home_objects';

    execute $policy$
      create policy "home_objects_select_own"
      on public.home_objects
      for select
      to authenticated
      using (user_id = auth.uid())
    $policy$;

    execute 'drop policy if exists "home_objects_insert_own" on public.home_objects';

    execute $policy$
      create policy "home_objects_insert_own"
      on public.home_objects
      for insert
      to authenticated
      with check (user_id = auth.uid())
    $policy$;

    execute 'drop policy if exists "home_objects_update_own" on public.home_objects';

    execute $policy$
      create policy "home_objects_update_own"
      on public.home_objects
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $policy$;

    execute 'drop policy if exists "home_objects_delete_own" on public.home_objects';

    execute $policy$
      create policy "home_objects_delete_own"
      on public.home_objects
      for delete
      to authenticated
      using (user_id = auth.uid())
    $policy$;
  end if;
end $$;

-- ============================================================================
-- pet_element_affinities table policies
-- ============================================================================

do $$
begin
  if to_regclass('public.pet_element_affinities') is not null then
    execute 'drop policy if exists "pet_element_affinities_select_own" on public.pet_element_affinities';

    execute $policy$
      create policy "pet_element_affinities_select_own"
      on public.pet_element_affinities
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.pets
          where pets.id = pet_element_affinities.pet_id
            and pets.user_id = auth.uid()
        )
      )
    $policy$;

    execute 'drop policy if exists "pet_element_affinities_write_own" on public.pet_element_affinities';

    execute $policy$
      create policy "pet_element_affinities_write_own"
      on public.pet_element_affinities
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.pets
          where pets.id = pet_element_affinities.pet_id
            and pets.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.pets
          where pets.id = pet_element_affinities.pet_id
            and pets.user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end $$;

-- ============================================================================
-- user_resources table policies
-- ============================================================================

do $$
begin
  if to_regclass('public.user_resources') is not null then
    execute 'drop policy if exists "user_resources_select_own" on public.user_resources';

    execute $policy$
      create policy "user_resources_select_own"
      on public.user_resources
      for select
      to authenticated
      using (user_id = auth.uid())
    $policy$;

    execute 'drop policy if exists "user_resources_write_own" on public.user_resources';

    execute $policy$
      create policy "user_resources_write_own"
      on public.user_resources
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $policy$;
  end if;
end $$;