begin;

-- =========================================================
-- HOMEPAGE READ VIEWS
-- These keep frontend queries small and consistent.
-- =========================================================

drop view if exists public.homepage_alerts;
create view public.homepage_alerts as
select
  id,
  message,
  alert_color,
  alert_type,
  cta_label,
  cta_href,
  starts_at,
  ends_at,
  updated_at
from public.homepage_alerts
where is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
order by updated_at desc, created_at desc;

drop view if exists public.homepage_announcements_live;
create view public.homepage_announcements_live as
select
  id,
  title,
  body,
  created_at,
  updated_at
from public.announcements
where is_published = true
  and page_scope = 'homepage'
order by created_at desc;

drop view if exists public.homepage_alpha_systems_live;
create view public.homepage_alpha_systems_live as
select
  id,
  title,
  description,
  sort_order,
  released_at,
  created_at
from public.alpha_systems
where enabled = true
order by sort_order asc, released_at desc, created_at desc;

drop view if exists public.homepage_patch_notes_live;
create view public.homepage_patch_notes_live as
select
  id,
  version,
  title,
  summary,
  released_at,
  created_at,
  new_notes,
  updated_notes,
  fixed_notes,
  notes
from public.patch_notes
where is_published = true
order by released_at desc, created_at desc;

-- =========================================================
-- ALIUNE SIGNAL: CANONICAL HOMEPAGE VIEW
-- Uses aliune_signal_reports because that appears to be the
-- newer homepage-facing model.
-- =========================================================

drop view if exists public.homepage_aliune_signal_live;
create view public.homepage_aliune_signal_live as
select
  id,
  condition,
  region,
  corruption,
  report_text,
  report_age_days,
  start_time,
  end_time,
  starts_at,
  ends_at,
  created_at,
  updated_at
from public.aliune_signal_reports
where enabled = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
order by
  coalesce(starts_at, created_at) desc,
  created_at desc;

-- =========================================================
-- PUBLIC READ ACCESS FOR HOMEPAGE VIEWS
-- Views run from underlying table permissions, but granting
-- select here keeps usage straightforward.
-- =========================================================

grant select on public.homepage_alerts to anon, authenticated;
grant select on public.homepage_announcements_live to anon, authenticated;
grant select on public.homepage_alpha_systems_live to anon, authenticated;
grant select on public.homepage_patch_notes_live to anon, authenticated;
grant select on public.homepage_aliune_signal_live to anon, authenticated;

commit;