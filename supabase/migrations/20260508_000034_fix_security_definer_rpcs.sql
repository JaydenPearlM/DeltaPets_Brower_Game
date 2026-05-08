-- Migration: Fix SECURITY DEFINER RPC security issues
-- Description: Revokes anonymous access from sensitive RPCs and fixes hatch_pet to use auth.uid()
-- Date: 2026-05-08
-- Migration number: 20260508_000034

-- ============================================================================
-- Revoke anonymous access from handle_new_user_profile
-- This function should only fire via auth.users trigger, not as a direct RPC
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user_profile' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM anon;
  END IF;
END $$;

-- ============================================================================
-- Revoke public access from rls_auto_enable
-- This is a maintenance utility and should not be exposed via REST API
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'rls_auto_enable' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
  END IF;
END $$;

-- ============================================================================
-- Replace hatch_pet to use auth.uid() internally
-- Drop all versions of the function first
-- ============================================================================

-- Drop all possible signatures
DROP FUNCTION IF EXISTS public.hatch_pet(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.hatch_pet(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.hatch_pet(text, uuid) CASCADE;

-- Recreate with secure signature using auth.uid()
CREATE OR REPLACE FUNCTION public.hatch_pet(
  p_egg_id uuid,
  p_species text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_egg_user_id uuid;
  v_pet_id uuid;
  v_pet_name text;
  v_starter_element text;
  v_result json;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to hatch pets';
  END IF;

  -- Verify egg exists and belongs to the user
  SELECT user_id, starter_element INTO v_egg_user_id, v_starter_element
  FROM eggs
  WHERE id = p_egg_id;

  IF v_egg_user_id IS NULL THEN
    RAISE EXCEPTION 'Egg not found';
  END IF;

  IF v_egg_user_id != v_user_id THEN
    RAISE EXCEPTION 'Egg does not belong to authenticated user';
  END IF;

  -- Generate pet name
  v_pet_name := 'Kith_' || substr(md5(random()::text), 1, 6);

  -- Create the pet (matching your schema columns)
  INSERT INTO pets (
    user_id,
    name,
    line,
    stage,
    level,
    xp,
    hunger,
    clean,
    happy,
    energy,
    atk,
    def,
    spd,
    hp_max,
    hp_cur,
    bond,
    is_active,
    hatched_at,
    species
  )
  VALUES (
    v_user_id,
    v_pet_name,
    p_species::pet_line,
    'hatchling'::pet_stage,
    1,
    0,
    50,
    50,
    50,
    100,
    5,
    5,
    5,
    30,
    30,
    0,
    true,
    now(),
    p_species
  )
  RETURNING id INTO v_pet_id;

  -- Mark egg as hatched
  UPDATE eggs
  SET hatched_at = now(),
      pet_id = v_pet_id
  WHERE id = p_egg_id;

  -- Return result
  v_result := json_build_object(
    'pet_id', v_pet_id,
    'pet_name', v_pet_name,
    'species', p_species,
    'starter_element', v_starter_element
  );

  RETURN v_result;
END;
$$;

-- Revoke from anon and public, grant only to authenticated
REVOKE ALL ON FUNCTION public.hatch_pet(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.hatch_pet(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hatch_pet(uuid, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.hatch_pet(uuid, text) IS 'Hatch an egg into a pet. Uses auth.uid() internally. Only callable by authenticated users for their own eggs.';