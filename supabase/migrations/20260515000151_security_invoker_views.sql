begin;

alter view if exists public.homepage_aliune_signal_live
set (security_invoker = true);

alter view if exists public.homepage_alpha_systems_live
set (security_invoker = true);

alter view if exists public.homepage_announcements_live
set (security_invoker = true);

alter view if exists public.homepage_patch_notes_live
set (security_invoker = true);

alter view if exists public.homepage_alerts_live
set (security_invoker = true);

alter view if exists public.v_pet_storage_stats
set (security_invoker = true);

alter view if exists public.v_pet_total_stats
set (security_invoker = true);

commit;