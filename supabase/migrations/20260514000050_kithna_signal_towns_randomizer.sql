begin;

alter table public.aliune_signal_reports
add column if not exists town text;

update public.aliune_signal_reports
set corruption = case
  when lower(corruption) in ('none', 'low', 'rising') then 'low'
  when lower(corruption) in ('high', 'too high') then 'high'
  else 'low'
end;

update public.aliune_signal_reports
set town = coalesce(town, 'Moonroot Fen')
where region = 'Kithna';

create or replace function public.get_or_create_kithna_tutorial_signal()
returns table (
  id uuid,
  enabled boolean,
  condition text,
  region text,
  town text,
  corruption text,
  report_text text,
  report_age_days integer,
  start_time time without time zone,
  end_time time without time zone,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_town text;
  v_condition text;
  v_corruption text;
  v_report_text text;
  v_duration interval := make_interval(mins => 45 + floor(random() * 46)::int);
  v_condition_roll numeric := random();
  v_corruption_roll numeric := random();
begin
  perform pg_advisory_xact_lock(hashtext('kithna_tutorial_signal_randomizer'));

  return query
  select
    asr.id,
    asr.enabled,
    asr.condition,
    asr.region,
    asr.town,
    asr.corruption,
    asr.report_text,
    asr.report_age_days,
    asr.start_time,
    asr.end_time,
    asr.starts_at,
    asr.ends_at,
    asr.created_at,
    asr.updated_at
  from public.aliune_signal_reports asr
  where asr.enabled = true
    and asr.region = 'Kithna'
    and (asr.starts_at is null or asr.starts_at <= v_now)
    and (asr.ends_at is null or asr.ends_at >= v_now)
  order by coalesce(asr.starts_at, asr.created_at) desc, asr.created_at desc
  limit 1;

  if found then
    return;
  end if;

  v_town := (array[
    'Moonroot Fen',
    'Ashfall Coast',
    'Starweald Rise',
    'Thornmere Hollow'
  ])[1 + floor(random() * 4)::int];

  v_condition := case
    when v_condition_roll < 0.72 then 'stable'
    else 'unstable'
  end;

  v_corruption := case
    when v_condition = 'unstable' and v_corruption_roll < 0.65 then 'high'
    when v_corruption_roll < 0.78 then 'low'
    else 'high'
  end;

  v_report_text := case
    when v_town = 'Moonroot Fen' and v_condition = 'stable' and v_corruption = 'low'
      then 'Moonroot Fen is quiet. Soft resonance is moving through the reeds, but no hostile Kith signatures are forming.'
    when v_town = 'Moonroot Fen' and v_condition = 'stable' and v_corruption = 'high'
      then 'Moonroot Fen is holding steady despite heavy violet static near the marsh paths. Hatchery patrols remain watchful.'
    when v_town = 'Moonroot Fen' and v_condition = 'unstable' and v_corruption = 'low'
      then 'A faint surge is stirring beneath Moonroot Fen. A minor boss echo may surface if the pulse is not stabilized.'
    when v_town = 'Moonroot Fen' and v_condition = 'unstable' and v_corruption = 'high'
      then 'Moonroot Fen is unstable. A corrupted boss echo is pushing through the marshlight and should be cleared before the signal fades.'

    when v_town = 'Ashfall Coast' and v_condition = 'stable' and v_corruption = 'low'
      then 'Ashfall Coast remains calm. Warm ash currents are drifting offshore with no major instability detected.'
    when v_town = 'Ashfall Coast' and v_condition = 'stable' and v_corruption = 'high'
      then 'Ashfall Coast is stable, but ember-colored corruption is clinging to the tide pools. No boss activity confirmed.'
    when v_town = 'Ashfall Coast' and v_condition = 'unstable' and v_corruption = 'low'
      then 'Ashfall Coast is flickering with low surge activity. A small boss presence may be forming near the black sand.'
    when v_town = 'Ashfall Coast' and v_condition = 'unstable' and v_corruption = 'high'
      then 'Ashfall Coast is unstable. A high-pressure corruption surge is pulling something hostile from beneath the ashline.'

    when v_town = 'Starweald Rise' and v_condition = 'stable' and v_corruption = 'low'
      then 'Starweald Rise is stable. The upper branches are glowing normally and Kithna scouts report safe passage.'
    when v_town = 'Starweald Rise' and v_condition = 'stable' and v_corruption = 'high'
      then 'Starweald Rise is stable, though bright corruption sparks are caught in the canopy. No battle response needed.'
    when v_town = 'Starweald Rise' and v_condition = 'unstable' and v_corruption = 'low'
      then 'Starweald Rise is showing unstable branch resonance. A weak boss echo is circling above the tutorial paths.'
    when v_town = 'Starweald Rise' and v_condition = 'unstable' and v_corruption = 'high'
      then 'Starweald Rise is unstable. A dangerous boss signal is gathering in the canopy and corruption pressure is rising.'

    when v_town = 'Thornmere Hollow' and v_condition = 'stable' and v_corruption = 'low'
      then 'Thornmere Hollow is quiet. Low corruption traces are fading into the old roots without spreading.'
    when v_town = 'Thornmere Hollow' and v_condition = 'stable' and v_corruption = 'high'
      then 'Thornmere Hollow remains stable, but dense corruption is resting below the hollow stones. Watchers are monitoring the trail.'
    when v_town = 'Thornmere Hollow' and v_condition = 'unstable' and v_corruption = 'low'
      then 'Thornmere Hollow is unstable. A low corruption pulse is waking something beneath the root paths.'
    else
      'Thornmere Hollow is unstable. Heavy corruption is rising from the hollow and a boss encounter is available until the signal expires.'
  end;

  insert into public.aliune_signal_reports (
    enabled,
    condition,
    region,
    town,
    corruption,
    report_text,
    report_age_days,
    start_time,
    end_time,
    starts_at,
    ends_at
  )
  values (
    true,
    v_condition,
    'Kithna',
    v_town,
    v_corruption,
    v_report_text,
    0,
    v_now::time,
    (v_now + v_duration)::time,
    v_now,
    v_now + v_duration
  );

  return query
  select
    asr.id,
    asr.enabled,
    asr.condition,
    asr.region,
    asr.town,
    asr.corruption,
    asr.report_text,
    asr.report_age_days,
    asr.start_time,
    asr.end_time,
    asr.starts_at,
    asr.ends_at,
    asr.created_at,
    asr.updated_at
  from public.aliune_signal_reports asr
  where asr.enabled = true
    and asr.region = 'Kithna'
    and asr.starts_at <= v_now
    and asr.ends_at >= v_now
  order by asr.starts_at desc, asr.created_at desc
  limit 1;
end;
$$;

grant execute on function public.get_or_create_kithna_tutorial_signal() to anon, authenticated;

commit;