-- 20260619000068_add_pet_mutations.sql
--
-- Every pet receives one permanent mutation roll:
--   70% no mutation
--   30% one mutation
--
-- Conditional rarity weights when a mutation is rolled:
--   common    50%
--   uncommon  30%
--   rare      15%
--   legendary  5%

create table if not exists public.mutations (
  id uuid primary key default gen_random_uuid(),

  key text not null unique,
  name text not null,

  rarity text not null check (
    rarity in ('common', 'uncommon', 'rare', 'legendary')
  ),

  description text not null,
  effect_summary text not null,
  drawback_summary text,
  effects jsonb not null default '{}'::jsonb,

  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pet_mutations (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  mutation_id uuid references public.mutations(id) on delete set null,

  has_mutation boolean not null,
  roll_value double precision not null check (
    roll_value >= 0 and roll_value < 1
  ),

  assigned_at timestamptz not null default now(),

  check (
    (has_mutation = true and mutation_id is not null)
    or
    (has_mutation = false and mutation_id is null)
  )
);

create index if not exists idx_mutations_rarity
on public.mutations(rarity);

create index if not exists idx_mutations_active_rarity
on public.mutations(is_active, rarity);

create index if not exists idx_pet_mutations_mutation_id
on public.pet_mutations(mutation_id);

insert into public.mutations
  (
    key,
    name,
    rarity,
    description,
    effect_summary,
    drawback_summary,
    effects
  )
values
  (
    'sturdy_frame',
    'Sturdy Frame',
    'common',
    'This Kith developed a broader frame and greater natural endurance.',
    '+5% maximum HP',
    '-3% Speed',
    '{"stat_percent":{"hp_max":5,"spd":-3}}'
  ),
  (
    'light_bones',
    'Light Bones',
    'common',
    'A lighter skeletal structure lets this Kith move more quickly.',
    '+5% Speed',
    '-3% Defense',
    '{"stat_percent":{"spd":5,"def":-3}}'
  ),
  (
    'sharp_claws',
    'Sharp Claws',
    'common',
    'Naturally sharpened claws improve physical attacks.',
    '+5% Attack',
    '-3% Magi',
    '{"stat_percent":{"atk":5,"magi":-3}}'
  ),
  (
    'luminous_core',
    'Luminous Core',
    'common',
    'A small inner glow strengthens this Kith’s magical output.',
    '+5% Magi',
    '-3% Attack',
    '{"stat_percent":{"magi":5,"atk":-3}}'
  ),
  (
    'deep_lungs',
    'Deep Lungs',
    'common',
    'Expanded lungs help this Kith maintain a deeper mana reserve.',
    '+5% maximum Mana',
    '-3% Speed',
    '{"stat_percent":{"mana_max":5,"spd":-3}}'
  ),
  (
    'dense_hide',
    'Dense Hide',
    'common',
    'Thicker skin provides extra protection from direct attacks.',
    '+5% Defense',
    '-3% maximum Mana',
    '{"stat_percent":{"def":5,"mana_max":-3}}'
  ),
  (
    'keen_eyes',
    'Keen Eyes',
    'common',
    'Unusually sharp eyesight helps this Kith place attacks carefully.',
    '+3% Accuracy',
    '-2% Evasion',
    '{"battle_percent":{"accuracy":3,"evasion":-2}}'
  ),
  (
    'flexible_spine',
    'Flexible Spine',
    'common',
    'An unusually flexible spine makes sudden evasive movement easier.',
    '+3% Evasion',
    '-2% Accuracy',
    '{"battle_percent":{"evasion":3,"accuracy":-2}}'
  ),
  (
    'warm_blood',
    'Warm Blood',
    'common',
    'A warmer body temperature helps healing effects take hold.',
    '+5% healing received',
    '-3% Ice resistance',
    '{"battle_percent":{"healing_received":5},"element_resistance_percent":{"ice":-3}}'
  ),
  (
    'cool_blood',
    'Cool Blood',
    'common',
    'A cooler body temperature improves resistance to heat.',
    '+5% Fire resistance',
    '-3% healing received',
    '{"element_resistance_percent":{"fire":5},"battle_percent":{"healing_received":-3}}'
  ),
  (
    'static_fur',
    'Static Fur',
    'common',
    'Charged fur occasionally bites back when touched.',
    '3% chance to deal minor retaliatory damage',
    '-2% Defense',
    '{"chance_percent":{"minor_retaliation":3},"stat_percent":{"def":-2}}'
  ),
  (
    'resonant_voice',
    'Resonant Voice',
    'common',
    'A naturally resonant call makes status skills slightly more reliable.',
    '+3% status-effect accuracy',
    '-2% physical Accuracy',
    '{"battle_percent":{"status_accuracy":3,"accuracy":-2}}'
  ),

  (
    'elemental_veins',
    'Elemental Veins',
    'uncommon',
    'Elemental energy runs visibly beneath this Kith’s skin.',
    '+8% damage with native-element skills',
    '-5% resistance to the element this Kith is weak against',
    '{"battle_percent":{"native_element_damage":8,"weak_element_resistance":-5}}'
  ),
  (
    'regenerative_tissue',
    'Regenerative Tissue',
    'uncommon',
    'Damaged tissue slowly repairs itself after combat.',
    'Restore 3% maximum HP after a battle',
    '-5% maximum Mana',
    '{"after_battle_percent":{"restore_hp_max":3},"stat_percent":{"mana_max":-5}}'
  ),
  (
    'predators_focus',
    'Predator’s Focus',
    'uncommon',
    'This Kith becomes intensely focused when it sees an opening.',
    '+6% critical-hit chance',
    '-5% healing received',
    '{"battle_percent":{"critical_chance":6,"healing_received":-5}}'
  ),
  (
    'guardians_crest',
    'Guardian’s Crest',
    'uncommon',
    'A protective crest radiates a faint defensive field around allies.',
    'Allies take 4% less damage while this Kith is active',
    '-5% Speed',
    '{"aura_percent":{"ally_damage_reduction":4},"stat_percent":{"spd":-5}}'
  ),
  (
    'mana_overflow',
    'Mana Overflow',
    'uncommon',
    'Excess mana constantly presses against this Kith’s physical defenses.',
    '+10% maximum Mana',
    '-5% Defense',
    '{"stat_percent":{"mana_max":10,"def":-5}}'
  ),
  (
    'glass_cannon',
    'Glass Cannon',
    'uncommon',
    'This Kith produces exceptional force but has a fragile defense.',
    '+8% Attack and +8% Magi',
    '-8% Defense',
    '{"stat_percent":{"atk":8,"magi":8,"def":-8}}'
  ),
  (
    'adrenal_glands',
    'Adrenal Glands',
    'uncommon',
    'Specialized glands flood this Kith with energy when it is wounded.',
    '+8% Speed while below 50% HP',
    '-3% Accuracy while above 50% HP',
    '{"conditional_percent":{"below_50_hp":{"spd":8},"above_50_hp":{"accuracy":-3}}}'
  ),
  (
    'reactive_scales',
    'Reactive Scales',
    'uncommon',
    'These scales harden immediately after receiving a direct hit.',
    '+6% Defense after being hit until the end of the next turn',
    '-5% first-turn Attack',
    '{"triggered_percent":{"after_hit_def":6},"conditional_percent":{"first_turn":{"atk":-5}}}'
  ),
  (
    'twin_core',
    'Twin Core',
    'uncommon',
    'Two smaller energy cores share the work of powering this Kith.',
    '+5% Attack and +5% Magi',
    '-5% maximum HP',
    '{"stat_percent":{"atk":5,"magi":5,"hp_max":-5}}'
  ),

  (
    'phoenix_marrow',
    'Phoenix Marrow',
    'rare',
    'Fiery marrow refuses to let this Kith fall without resistance.',
    'Once per battle, survive a fatal hit with 1 HP',
    '-8% maximum HP',
    '{"once_per_battle":{"survive_fatal_hit_hp":1},"stat_percent":{"hp_max":-8}}'
  ),
  (
    'prismatic_blood',
    'Prismatic Blood',
    'rare',
    'Rainbow-colored blood responds to every elemental current.',
    '+6% damage with all elemental skills',
    '+5% damage received from super-effective attacks',
    '{"battle_percent":{"all_element_damage":6,"super_effective_damage_received":5}}'
  ),
  (
    'void_scar',
    'Void Scar',
    'rare',
    'A dark scar disrupts hostile effects before they can fully settle.',
    '15% chance to resist a negative status effect',
    '-10% healing received',
    '{"chance_percent":{"resist_negative_status":15},"battle_percent":{"healing_received":-10}}'
  ),
  (
    'titan_growth',
    'Titan Growth',
    'rare',
    'Ancient growth patterns produced a much larger and tougher body.',
    '+12% maximum HP and +8% Defense',
    '-10% Speed',
    '{"stat_percent":{"hp_max":12,"def":8,"spd":-10}}'
  ),
  (
    'arcane_synapses',
    'Arcane Synapses',
    'rare',
    'Magical signals travel through this Kith’s mind with unnatural speed.',
    '+12% Magi and 5% lower skill Mana costs',
    '-8% Attack',
    '{"stat_percent":{"magi":12,"atk":-8},"battle_percent":{"mana_cost":-5}}'
  ),
  (
    'berserker_pulse',
    'Berserker Pulse',
    'rare',
    'Pain triggers a violent pulse of battle energy.',
    '+15% damage while below 35% HP',
    '+8% damage received while below 35% HP',
    '{"conditional_percent":{"below_35_hp":{"damage":15,"damage_received":8}}}'
  ),

  (
    'delta_heart',
    'Delta Heart',
    'legendary',
    'A tiny rainbow Delta beats at the center of this Kith’s life force.',
    '+7% maximum HP, Mana, Attack, Defense, Speed, and Magi',
    '-10% healing received',
    '{"stat_percent":{"hp_max":7,"mana_max":7,"atk":7,"def":7,"spd":7,"magi":7},"battle_percent":{"healing_received":-10}}'
  ),
  (
    'chrono_nerves',
    'Chrono Nerves',
    'legendary',
    'This Kith’s nerves occasionally move a fraction of a moment ahead of time.',
    '10% chance once per battle to immediately take one extra turn',
    '-10% maximum HP',
    '{"once_per_battle_chance_percent":{"extra_turn":10},"stat_percent":{"hp_max":-10}}'
  ),
  (
    'aliunes_echo',
    'Aliune’s Echo',
    'legendary',
    'A distant echo of Aliune amplifies every elemental current within this Kith.',
    '+15% elemental damage and 10% chance for a skill to cost no Mana',
    '+8% damage received',
    '{"battle_percent":{"all_element_damage":15,"damage_received":8},"chance_percent":{"zero_mana_cost":10}}'
  ),
  (
    'worldroot_soul',
    'Worldroot Soul',
    'legendary',
    'Ancient roots of living energy have intertwined with this Kith’s life force.',
    'Restore 5% maximum HP at the end of each third turn',
    '-12% Speed',
    '{"turn_interval_percent":{"interval":3,"restore_hp_max":5},"stat_percent":{"spd":-12}}'
  ),
  (
    'celestial_mirror',
    'Celestial Mirror',
    'legendary',
    'A reflective celestial pattern occasionally turns hostile magic back toward its source.',
    '15% chance to reflect a negative status effect back to its source',
    '-10% Defense',
    '{"chance_percent":{"reflect_negative_status":15},"stat_percent":{"def":-10}}'
  ),
  (
    'fatebreaker',
    'Fatebreaker',
    'legendary',
    'This Kith can tear through the edge of an otherwise certain defeat.',
    'Once per battle, remove all negative status effects when falling below 25% HP',
    '-10% maximum Mana',
    '{"once_per_battle":{"cleanse_below_hp_percent":25},"stat_percent":{"mana_max":-10}}'
  ),
  (
    'everstorm_crown',
    'Everstorm Crown',
    'legendary',
    'A permanent crown of charged energy surrounds this Kith’s elemental core.',
    '+12% Speed and +12% critical-hit damage',
    '-10% maximum HP',
    '{"stat_percent":{"spd":12,"hp_max":-10},"battle_percent":{"critical_damage":12}}'
  ),
  (
    'genesis_spark',
    'Genesis Spark',
    'legendary',
    'A fragment of creation energy continuously shifts between physical and magical power.',
    'At battle start, increase either Attack or Magi by 18%, choosing the higher stat',
    'Reduce the lower offensive stat by 10%',
    '{"battle_start_percent":{"increase_higher_offense":18,"decrease_lower_offense":-10}}'
  )
on conflict (key) do update
set
  name = excluded.name,
  rarity = excluded.rarity,
  description = excluded.description,
  effect_summary = excluded.effect_summary,
  drawback_summary = excluded.drawback_summary,
  effects = excluded.effects,
  is_active = true;

create or replace function public.assign_pet_mutation(p_pet_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_mutation_id uuid;
  v_existing_assignment boolean;
  v_mutation_roll double precision;
  v_rarity_roll double precision;
  v_rarity text;
  v_mutation_id uuid;
begin
  select true, mutation_id
  into v_existing_assignment, v_existing_mutation_id
  from public.pet_mutations
  where pet_id = p_pet_id;

  if coalesce(v_existing_assignment, false) then
    return v_existing_mutation_id;
  end if;

  if not exists (
    select 1
    from public.pets
    where id = p_pet_id
  ) then
    raise exception 'Cannot assign mutation: pet % does not exist.', p_pet_id;
  end if;

  v_mutation_roll := random();

  if v_mutation_roll >= 0.30 then
    insert into public.pet_mutations
      (pet_id, mutation_id, has_mutation, roll_value)
    values
      (p_pet_id, null, false, v_mutation_roll)
    on conflict (pet_id) do nothing;

    return null;
  end if;

  v_rarity_roll := random();

  v_rarity := case
    when v_rarity_roll < 0.50 then 'common'
    when v_rarity_roll < 0.80 then 'uncommon'
    when v_rarity_roll < 0.95 then 'rare'
    else 'legendary'
  end;

  select id
  into v_mutation_id
  from public.mutations
  where rarity = v_rarity
    and is_active = true
  order by random()
  limit 1;

  if v_mutation_id is null then
    raise exception 'Cannot assign mutation: no active % mutations exist.', v_rarity;
  end if;

  insert into public.pet_mutations
    (pet_id, mutation_id, has_mutation, roll_value)
  values
    (p_pet_id, v_mutation_id, true, v_mutation_roll)
  on conflict (pet_id) do nothing;

  return v_mutation_id;
end;
$$;

create or replace function public.assign_new_pet_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assign_pet_mutation(new.id);
  return new;
end;
$$;

drop trigger if exists trg_assign_new_pet_mutation on public.pets;

create trigger trg_assign_new_pet_mutation
after insert on public.pets
for each row
execute function public.assign_new_pet_mutation();

do $$
declare
  v_pet record;
begin
  for v_pet in
    select p.id
    from public.pets p
    left join public.pet_mutations pm on pm.pet_id = p.id
    where pm.pet_id is null
  loop
    perform public.assign_pet_mutation(v_pet.id);
  end loop;
end;
$$;

alter table public.mutations enable row level security;
alter table public.pet_mutations enable row level security;

drop policy if exists "mutations_read_active" on public.mutations;
create policy "mutations_read_active"
on public.mutations
for select
to authenticated
using (is_active = true);

drop policy if exists "users_read_own_pet_mutations" on public.pet_mutations;
create policy "users_read_own_pet_mutations"
on public.pet_mutations
for select
to authenticated
using (
  exists (
    select 1
    from public.pets
    where pets.id = pet_mutations.pet_id
      and pets.user_id = auth.uid()
  )
);

revoke insert, update, delete, truncate, references, trigger
on public.mutations
from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
on public.pet_mutations
from anon, authenticated;

grant select
on public.mutations
to authenticated;

grant select
on public.pet_mutations
to authenticated;

revoke all on function public.assign_pet_mutation(uuid) from public;
revoke all on function public.assign_pet_mutation(uuid) from anon;
revoke all on function public.assign_pet_mutation(uuid) from authenticated;

revoke all on function public.assign_new_pet_mutation() from public;
revoke all on function public.assign_new_pet_mutation() from anon;
revoke all on function public.assign_new_pet_mutation() from authenticated;
