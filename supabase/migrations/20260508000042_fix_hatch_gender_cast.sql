begin;

create or replace function public.hatch_pet(
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
  p_hatch_time_alignment text
)
returns table (
  pet_row public.pets,
  success boolean,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
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
begin
  select
    base_hp,
    base_atk,
    base_def,
    base_spd,
    base_magi,
    base_mana
  into
    v_base_hp,
    v_base_atk,
    v_base_def,
    v_base_spd,
    v_base_magi,
    v_base_mana
  from public.pet_stats
  where pet_id = p_egg_id;

  if not found then
    v_base_hp := 2;
    v_base_atk := 2;
    v_base_def := 2;
    v_base_spd := 2;
    v_base_magi := 2;
    v_base_mana := 0;

    insert into public.pet_stats (
      pet_id,
      base_hp,
      base_atk,
      base_magi,
      base_def,
      base_spd,
      base_mana,
      base_total
    ) values (
      p_egg_id,
      v_base_hp,
      v_base_atk,
      v_base_magi,
      v_base_def,
      v_base_spd,
      v_base_mana,
      v_base_hp + v_base_atk + v_base_def + v_base_spd + v_base_magi + v_base_mana
    );
  end if;

  insert into public.pet_stat_allocations (
    pet_id,
    level,
    hp,
    atk,
    def,
    spd,
    magi,
    mana
  ) values (
    p_egg_id,
    1,
    p_iv_hp,
    p_iv_atk,
    p_iv_def,
    p_iv_spd,
    p_iv_magi,
    p_iv_mana
  )
  on conflict (pet_id, level) do update set
    hp = excluded.hp,
    atk = excluded.atk,
    def = excluded.def,
    spd = excluded.spd,
    magi = excluded.magi,
    mana = excluded.mana;

  v_total_hp := v_base_hp + p_iv_hp;
  v_total_atk := v_base_atk + p_iv_atk;
  v_total_def := v_base_def + p_iv_def;
  v_total_spd := v_base_spd + p_iv_spd;
  v_total_magi := v_base_magi + p_iv_magi;
  v_total_mana := v_base_mana + p_iv_mana;
  v_hp_max := greatest(1, v_total_hp * 2);

  update public.pets
  set
    name = p_hatchling_name,
    stage = 'hatchling',
    hatched_at = v_now,
    hatch_ends_at = null,
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
    energy = 50,
    bond = 0,
    neglect_hours = 0,
    ran_away = false,
    runaway_at = null,
    last_care_decay_at = v_now,
    personality_id = p_personality_id,
    personality_key = p_personality_key,
    description = p_description,
    hatch_time_alignment = p_hatch_time_alignment,
    growth_strong_stats = p_growth_strong_stats,
    growth_weak_stat = p_growth_weak_stat,
    updated_at = v_now
  where id = p_egg_id
    and user_id = p_user_id
    and stage = 'egg'
  returning * into pet_row;

  if not found then
    return query select null::public.pets, false, 'Egg not found or already hatched';
    return;
  end if;

  return query select pet_row, true, null::text;
end;
$$;

notify pgrst, 'reload schema';

commit;