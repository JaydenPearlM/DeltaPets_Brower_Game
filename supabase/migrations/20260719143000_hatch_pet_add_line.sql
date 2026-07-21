begin;

do $$
declare
  hatch_pet_function record;
begin
  for hatch_pet_function in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'hatch_pet'
  loop
    execute format('drop function %s', hatch_pet_function.function_signature);
  end loop;
end
$$;

CREATE OR REPLACE FUNCTION public.hatch_pet(
  p_user_id uuid,
  p_egg_id uuid,
  p_iv_hp int,
  p_iv_atk int,
  p_iv_def int,
  p_iv_spd int,
  p_iv_magi int,
  p_iv_mana int,
  p_gender text,
  p_personality_id uuid,
  p_personality_key text,
  p_hatchling_name text,
  p_description text,
  p_growth_strong_stats text[],
  p_growth_weak_stat text,
  p_hatch_time_alignment text,
  p_line public.elemental_line
)
RETURNS TABLE (
  pet_row public.pets,
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_hp int;
  v_base_atk int;
  v_base_def int;
  v_base_spd int;
  v_base_magi int;
  v_base_mana int;
  v_total_hp int;
  v_total_atk int;
  v_total_def int;
  v_total_spd int;
  v_total_magi int;
  v_total_mana int;
  v_hp_max int;
  v_now timestamptz := now();
BEGIN
  SELECT
    base_hp,
    base_atk,
    base_def,
    base_spd,
    base_magi,
    base_mana
  INTO
    v_base_hp,
    v_base_atk,
    v_base_def,
    v_base_spd,
    v_base_magi,
    v_base_mana
  FROM public.pet_stats
  WHERE pet_id = p_egg_id;

  IF NOT FOUND THEN
    v_base_hp := 2;
    v_base_atk := 2;
    v_base_def := 2;
    v_base_spd := 2;
    v_base_magi := 2;
    v_base_mana := 0;

    INSERT INTO public.pet_stats (
      pet_id,
      base_hp,
      base_atk,
      base_magi,
      base_def,
      base_spd,
      base_mana,
      base_total
    ) VALUES (
      p_egg_id,
      v_base_hp,
      v_base_atk,
      v_base_magi,
      v_base_def,
      v_base_spd,
      v_base_mana,
      v_base_hp + v_base_atk + v_base_def + v_base_spd + v_base_magi + v_base_mana
    );
  END IF;

  INSERT INTO public.pet_stat_allocations (
    pet_id,
    level,
    hp,
    atk,
    def,
    spd,
    magi,
    mana
  ) VALUES (
    p_egg_id,
    1,
    p_iv_hp,
    p_iv_atk,
    p_iv_def,
    p_iv_spd,
    p_iv_magi,
    p_iv_mana
  )
  ON CONFLICT (pet_id, level) DO UPDATE SET
    hp = EXCLUDED.hp,
    atk = EXCLUDED.atk,
    def = EXCLUDED.def,
    spd = EXCLUDED.spd,
    magi = EXCLUDED.magi,
    mana = EXCLUDED.mana;

  v_total_hp := v_base_hp + p_iv_hp;
  v_total_atk := v_base_atk + p_iv_atk;
  v_total_def := v_base_def + p_iv_def;
  v_total_spd := v_base_spd + p_iv_spd;
  v_total_magi := v_base_magi + p_iv_magi;
  v_total_mana := v_base_mana + p_iv_mana;
  v_hp_max := GREATEST(1, v_total_hp * 2);

  UPDATE public.pets
  SET
    name = p_hatchling_name,
    line = p_line,
    stage = 'hatchling',
    hatched_at = v_now,
    hatch_ends_at = NULL,
    unspent_points = 0,
    is_active = false,
    location = 'storage',
    gender = coalesce(nullif(p_gender, ''), 'null_gender')::public.pet_gender,
    atk = v_total_atk,
    def = v_total_def,
    spd = v_total_spd,
    magi = v_total_magi,
    mana = v_total_mana,
    hp_max = v_hp_max,
    hp_cur = v_hp_max,
    hunger = 50,
    clean = 50,
    happy = 50,
    comfort = 50,
    rest = 50,
    energy = 100,
    bond = 0,
    neglect_hours = 0,
    ran_away = false,
    runaway_at = NULL,
    last_care_decay_at = v_now,
    personality_id = p_personality_id,
    personality_key = p_personality_key,
    description = p_description,
    hatch_time_alignment = p_hatch_time_alignment,
    growth_strong_stats = p_growth_strong_stats,
    growth_weak_stat = p_growth_weak_stat,
    updated_at = v_now
  WHERE id = p_egg_id
    AND user_id = p_user_id
    AND stage = 'egg'
  RETURNING * INTO pet_row;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::public.pets, false, 'Egg not found or already hatched';
    RETURN;
  END IF;

  RETURN QUERY SELECT pet_row, true, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.hatch_pet(
  uuid,
  uuid,
  int,
  int,
  int,
  int,
  int,
  int,
  text,
  uuid,
  text,
  text,
  text,
  text[],
  text,
  text,
  public.elemental_line
) FROM anon;

GRANT EXECUTE ON FUNCTION public.hatch_pet(
  uuid,
  uuid,
  int,
  int,
  int,
  int,
  int,
  int,
  text,
  uuid,
  text,
  text,
  text,
  text[],
  text,
  text,
  public.elemental_line
) TO authenticated;

NOTIFY pgrst, 'reload schema';

commit;