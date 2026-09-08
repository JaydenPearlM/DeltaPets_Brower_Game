begin;

-- =========================
-- USER-OWNED / FK HOT PATHS
-- =========================

create index if not exists idx_pets_user_id
  on public.pets (user_id);

do $$
begin
  if to_regclass('public.eggs') is not null then
    create index if not exists idx_eggs_user_id
      on public.eggs (user_id);
  end if;
end $$;

create index if not exists idx_battle_runs_user_id
  on public.battle_runs (user_id);

create index if not exists idx_battle_runs_pet_id
  on public.battle_runs (pet_id);

create index if not exists idx_battle_run_fights_run_id
  on public.battle_run_fights (run_id);

do $$
begin
  if to_regclass('public.pet_awards') is not null then
    create index if not exists idx_pet_awards_pet_id
      on public.pet_awards (pet_id);

    create index if not exists idx_pet_awards_award_id
      on public.pet_awards (award_id);
  end if;
end $$;

create index if not exists idx_pet_skills_pet_id
  on public.pet_skills (pet_id);

create index if not exists idx_pet_skills_skill_id
  on public.pet_skills (skill_id);

do $$
begin
  if to_regclass('public.pet_element_affinities') is not null then
    create index if not exists idx_pet_element_affinities_pet_id
      on public.pet_element_affinities (pet_id);

    create index if not exists idx_pet_element_affinities_element_id
      on public.pet_element_affinities (element_id);
  end if;
end $$;

create index if not exists idx_inventory_user_id
  on public.inventory (user_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inventory'
      and column_name = 'pet_id'
  ) then
    create index if not exists idx_inventory_pet_id
      on public.inventory (pet_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.hatchery_slots') is not null then
    create index if not exists idx_hatchery_slots_user_id
      on public.hatchery_slots (user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.hatchery_shelf_slots') is not null then
    create index if not exists idx_hatchery_shelf_slots_user_id
      on public.hatchery_shelf_slots (user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.incubation_shelves') is not null then
    create index if not exists idx_incubation_shelves_user_id
      on public.incubation_shelves (user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.home_objects') is not null then
    create index if not exists idx_home_objects_user_id
      on public.home_objects (user_id);
  end if;
end $$;

create index if not exists idx_wallet_ledger_user_id
  on public.wallet_ledger (user_id);

create index if not exists idx_daily_care_user_id
  on public.daily_care (user_id);

do $$
begin
  if to_regclass('public.user_resources') is not null then
    create index if not exists idx_user_resources_user_id
      on public.user_resources (user_id);
  end if;
end $$;

-- =========================
-- SLOT / GAMEPLAY LOOKUPS
-- =========================

create index if not exists idx_party_slots_user_id_slot_index
  on public.party_slots (user_id, slot_index);

do $$
begin
  if to_regclass('public.hatchery_slots') is not null then
    create index if not exists idx_hatchery_slots_user_id_slot_index
      on public.hatchery_slots (user_id, slot_index);
  end if;
end $$;

do $$
begin
  if to_regclass('public.hatchery_shelf_slots') is not null then
    create index if not exists idx_hatchery_shelf_slots_user_id_slot_index
      on public.hatchery_shelf_slots (user_id, slot_index);
  end if;
end $$;

do $$
begin
  if to_regclass('public.incubation_shelves') is not null then
    create index if not exists idx_incubation_shelves_user_id_shelf_index
      on public.incubation_shelves (user_id, shelf_index);
  end if;
end $$;

create index if not exists idx_pets_user_id_is_active
  on public.pets (user_id, is_active);

create index if not exists idx_pets_user_id_stage
  on public.pets (user_id, stage);

create index if not exists idx_pets_user_id_location
  on public.pets (user_id, location);

-- =========================
-- HOMEPAGE / PUBLIC READS
-- =========================

do $$
begin
  if to_regclass('public.announcements') is not null then
    create index if not exists idx_announcements_homepage_live
      on public.announcements (page_scope, is_published, created_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.homepage_alerts') is not null then
    create index if not exists idx_homepage_alerts_active_window
      on public.homepage_alerts (is_active, starts_at, ends_at, updated_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.alpha_systems') is not null then
    create index if not exists idx_alpha_systems_enabled_sort_release
      on public.alpha_systems (enabled, sort_order, released_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.patch_notes') is not null then
    create index if not exists idx_patch_notes_published_release
      on public.patch_notes (is_published, released_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.aliune_signal_reports') is not null then
    create index if not exists idx_aliune_signal_reports_enabled_window
      on public.aliune_signal_reports (enabled, starts_at, ends_at, created_at desc);
  end if;
end $$;

do $$
begin
  if to_regclass('public.homepage_logs') is not null then
    create index if not exists idx_homepage_logs_active_category_order
      on public.homepage_logs (is_active, category, display_order, created_at desc);
  end if;
end $$;

-- =========================
-- QUALITY-OF-LIFE LOOKUPS
-- =========================

create index if not exists idx_profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;

create index if not exists idx_profiles_email_lower
  on public.profiles (lower(email))
  where email is not null;

do $$
begin
  if to_regclass('public.element_defs') is not null then
    create index if not exists idx_element_defs_key
      on public.element_defs (key);
  end if;
end $$;

create index if not exists idx_item_defs_slug
  on public.item_defs (slug);

create index if not exists idx_skill_defs_slug
  on public.skill_defs (slug);

do $$
begin
  if to_regclass('public.personalities') is not null then
    create index if not exists idx_personalities_key
      on public.personalities (key);
  end if;
end $$;

commit;