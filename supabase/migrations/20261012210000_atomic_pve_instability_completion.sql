
BEGIN;

CREATE FUNCTION public.complete_pve_instability_run(
  p_user_id uuid,
  p_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_run public.pve_instability_runs%ROWTYPE;
  v_instability public.pve_instabilities%ROWTYPE;
  v_completed integer;
  v_buff jsonb;
  v_buffs jsonb;
  v_strength numeric;
  v_duration numeric;
  v_completed_at timestamptz;
BEGIN
  -- Lock the run so completion requests execute one at a time.
  SELECT *
  INTO v_run
  FROM public.pve_instability_runs
  WHERE id = p_run_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'not_found'
    );
  END IF;

  -- Previously completed runs cannot receive rewards twice.
  IF v_run.status = 'completed' THEN
    RETURN jsonb_build_object(
      'outcome', 'already_completed'
    );
  END IF;

  IF v_run.status <> 'in_progress' THEN
    RETURN jsonb_build_object(
      'outcome', 'not_found'
    );
  END IF;

  -- Load the instability configuration.
  SELECT *
  INTO STRICT v_instability
  FROM public.pve_instabilities
  WHERE id = v_run.instability_id;

  -- Verify the required number of victories.
  SELECT count(*)::integer
  INTO v_completed
  FROM public.pve_instability_fights
  WHERE run_id = p_run_id
    AND result = 'victory';

  IF v_completed <> v_instability.total_fights THEN
    RETURN jsonb_build_object(
      'outcome', 'incomplete',
      'completed', v_completed,
      'total', v_instability.total_fights
    );
  END IF;


  v_completed_at := clock_timestamp();
  v_buffs := COALESCE(
    v_instability.reward_buffs,
    '[]'::jsonb
  );



  -- Preserve the established research rewards.
  PERFORM public.increment_pve_research_stats(
    p_user_id,
    1,
    v_instability.total_fights,
    CASE
      WHEN v_instability.has_boss THEN 1
      ELSE 0
    END
  );

  -- Grant existing reward buffs.
  IF jsonb_typeof(v_buffs) = 'array' THEN
    FOR v_buff IN
      SELECT value
      FROM jsonb_array_elements(v_buffs)
    LOOP
      v_strength := COALESCE(
        NULLIF(
          NULLIF(v_buff->>'strength', '')::numeric,
          0
        ),
        1.0
      );

      v_duration := COALESCE(
        NULLIF(
          NULLIF(v_buff->>'duration_hours', '')::numeric,
          0
        ),
        2
      );

      INSERT INTO public.pve_active_buffs (
        user_id,
        buff_type,
        strength,
        description,
        expires_at
      )
      VALUES (
        p_user_id,
        v_buff->>'type',
        v_strength,
        v_buff->>'description',
        v_completed_at
          + v_duration * interval '1 hour'
      );
    END LOOP;
  END IF;

  -- Mark completed after the rewards succeed.
  UPDATE public.pve_instability_runs
  SET status = 'completed',
      completed_at = v_completed_at
  WHERE id = p_run_id;

  RETURN jsonb_build_object(
    'outcome', 'completed',
    'rewards', jsonb_build_object(
      'xp', v_instability.reward_xp,
      'materials', v_instability.reward_materials,
      'buffs', v_buffs
    )
  );
END;
$$;

-- Never expose this function to normal players.
REVOKE ALL ON FUNCTION
  public.complete_pve_instability_run(uuid, uuid)
FROM PUBLIC, anon, authenticated;

-- Only the trusted backend may execute it.
GRANT EXECUTE ON FUNCTION
  public.complete_pve_instability_run(uuid, uuid)
TO service_role;

COMMIT;
