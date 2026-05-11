begin;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_pets_updated_at on public.pets;
create trigger set_pets_updated_at
before update on public.pets
for each row
execute function public.set_updated_at();

drop trigger if exists set_pet_stats_updated_at on public.pet_stats;
create trigger set_pet_stats_updated_at
before update on public.pet_stats
for each row
execute function public.set_updated_at();

drop trigger if exists set_homepage_alerts_updated_at on public.homepage_alerts;
create trigger set_homepage_alerts_updated_at
before update on public.homepage_alerts
for each row
execute function public.set_updated_at();

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();

drop trigger if exists set_aliune_signal_reports_updated_at on public.aliune_signal_reports;
create trigger set_aliune_signal_reports_updated_at
before update on public.aliune_signal_reports
for each row
execute function public.set_updated_at();

drop trigger if exists set_aliune_signals_updated_at on public.aliune_signals;
create trigger set_aliune_signals_updated_at
before update on public.aliune_signals
for each row
execute function public.set_updated_at();

drop trigger if exists set_hatchery_slots_updated_at on public.hatchery_slots;
create trigger set_hatchery_slots_updated_at
before update on public.hatchery_slots
for each row
execute function public.set_updated_at();

drop trigger if exists set_hatchery_shelf_slots_updated_at on public.hatchery_shelf_slots;
create trigger set_hatchery_shelf_slots_updated_at
before update on public.hatchery_shelf_slots
for each row
execute function public.set_updated_at();

do $$
begin
  if to_regclass('public.incubation_shelves') is not null then
    drop trigger if exists set_incubation_shelves_updated_at on public.incubation_shelves;

    create trigger set_incubation_shelves_updated_at
    before update on public.incubation_shelves
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

drop trigger if exists set_home_objects_updated_at on public.home_objects;
create trigger set_home_objects_updated_at
before update on public.home_objects
for each row
execute function public.set_updated_at();

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_resources_updated_at on public.user_resources;
create trigger set_user_resources_updated_at
before update on public.user_resources
for each row
execute function public.set_updated_at();

drop trigger if exists set_inventory_updated_at on public.inventory;
create trigger set_inventory_updated_at
before update on public.inventory
for each row
execute function public.set_updated_at();

commit;