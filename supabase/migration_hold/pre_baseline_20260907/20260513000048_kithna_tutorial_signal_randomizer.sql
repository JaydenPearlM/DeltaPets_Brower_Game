begin;

-- =========================================================
-- KITHNA TUTORIAL ALIUNE SIGNAL RANDOMIZER
-- Keeps prod signals scoped to the tutorial island for Alpha.
-- The homepage can call this RPC safely. It returns the active
-- Kithna event if one exists, otherwise it has a small chance
-- to start a new tutorial event.
-- =========================================================

create or replace function public.get_or_create_kithna_tutorial_signal()
returns table (
  id uuid,
  enabled boolean,
  condition text,
  region text,
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
  v_now timestamp with time zone := now();
  v_should_start boolean := random() < 0.35;
  v_event_roll integer := floor(random() * 6)::integer;
  v_duration interval := make_interval(mins => 45 + floor(random() * 46)::integer);
  v_condition text := 'unbalanced';
  v_corruption text := 'rising';
  v_report_text text := 'A faint void pulse is moving through Kithna. Tutorial patrols are watching the Hatchery and town paths.';
  v_portal_event boolean := false;
  v_irregular_eggs boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('kithna_tutorial_signal_randomizer'));

  return query
  select
    asr.id,
    asr.enabled,
    asr.condition,
    asr.region,
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

  if not v_should_start then
    return;
  end if;

  case v_event_roll
    when 0 then
      v_condition := 'unbalanced';
      v_corruption := 'rising';
      v_report_text := 'A faint void pulse is moving through Kithna. Tutorial patrols are watching the Hatchery and town paths.';
      v_portal_event := false;
      v_irregular_eggs := false;
    when 1 then
      v_condition := 'unstable';
      v_corruption := 'high';
      v_report_text := 'A small tutorial void tear has opened near Kithna. Keep beginner Kith close until the pulse fades.';
      v_portal_event := true;
      v_irregular_eggs := false;
    when 2 then
      v_condition := 'unbalanced';
      v_corruption := 'rising';
      v_report_text := 'The Hatchery is reporting irregular shell resonance. No corrupted hatch confirmed, but handlers are watching the eggs.';
      v_portal_event := false;
      v_irregular_eggs := true;
    when 3 then
      v_condition := 'unstable';
      v_corruption := 'high';
      v_report_text := 'Void motes are gathering along the tutorial road. Kithna guards recommend clearing the route before travel.';
      v_portal_event := true;
      v_irregular_eggs := false;
    when 4 then
      v_condition := 'unbalanced';
      v_corruption := 'low';
      v_report_text := 'Kithna lanterns are flickering with low void static. The town remains safe, but the Signal is tracking the disturbance.';
      v_portal_event := false;
      v_irregular_eggs := false;
    else
      v_condition := 'unstable';
      v_corruption := 'rising';
      v_report_text := 'A training-field anomaly has formed near the Gym. Beginner battles may attract strange echoes until it collapses.';
      v_portal_event := true;
      v_irregular_eggs := false;
  end case;

  insert into public.aliune_signal_reports (
    enabled,
    condition,
    region,
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
