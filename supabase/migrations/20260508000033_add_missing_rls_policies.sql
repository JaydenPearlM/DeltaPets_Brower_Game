-- Migration: Add missing RLS policies
-- Description: Adds RLS policies to tables that have RLS enabled but no policies defined
-- Date: 2026-05-08
-- Migration number: 20260508_000033

-- ============================================================================
-- eggs table policies
-- ============================================================================

DROP POLICY IF EXISTS "eggs_select_own" ON public.eggs;
CREATE POLICY "eggs_select_own"
  ON public.eggs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "eggs_write_own" ON public.eggs;
CREATE POLICY "eggs_write_own"
  ON public.eggs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- daily_login_rewards table policies
-- ============================================================================

DROP POLICY IF EXISTS "daily_login_rewards_select_own" ON public.daily_login_rewards;
CREATE POLICY "daily_login_rewards_select_own"
  ON public.daily_login_rewards
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "daily_login_rewards_write_own" ON public.daily_login_rewards;
CREATE POLICY "daily_login_rewards_write_own"
  ON public.daily_login_rewards
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- element_defs table policies
-- ============================================================================

DROP POLICY IF EXISTS "element_defs_read_authed" ON public.element_defs;
CREATE POLICY "element_defs_read_authed"
  ON public.element_defs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- home_objects table policies
-- ============================================================================

DROP POLICY IF EXISTS "home_objects_select_own" ON public.home_objects;
CREATE POLICY "home_objects_select_own"
  ON public.home_objects
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "home_objects_insert_own" ON public.home_objects;
CREATE POLICY "home_objects_insert_own"
  ON public.home_objects
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "home_objects_update_own" ON public.home_objects;
CREATE POLICY "home_objects_update_own"
  ON public.home_objects
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "home_objects_delete_own" ON public.home_objects;
CREATE POLICY "home_objects_delete_own"
  ON public.home_objects
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- pet_element_affinities table policies
-- ============================================================================

DROP POLICY IF EXISTS "pet_element_affinities_select_own" ON public.pet_element_affinities;
CREATE POLICY "pet_element_affinities_select_own"
  ON public.pet_element_affinities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_element_affinities.pet_id
      AND pets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pet_element_affinities_write_own" ON public.pet_element_affinities;
CREATE POLICY "pet_element_affinities_write_own"
  ON public.pet_element_affinities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_element_affinities.pet_id
      AND pets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_element_affinities.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- ============================================================================
-- user_resources table policies
-- ============================================================================

DROP POLICY IF EXISTS "user_resources_select_own" ON public.user_resources;
CREATE POLICY "user_resources_select_own"
  ON public.user_resources
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_resources_write_own" ON public.user_resources;
CREATE POLICY "user_resources_write_own"
  ON public.user_resources
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());