-- Fresh installation ONLY, on the pinned initialized Supabase platform.
BEGIN;
DO $$ BEGIN IF to_regclass('public.profiles') IS NOT NULL OR EXISTS(SELECT 1 FROM auth.users) THEN RAISE EXCEPTION 'Fresh bootstrap refuses existing application/player state'; END IF; END $$;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: admin; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA admin;


ALTER SCHEMA admin OWNER TO postgres;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

-- public schema is provided by PostgreSQL


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: age_stage; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.age_stage AS ENUM (
    'Baby_sprout',
    'Toddler_sprout',
    'Teen_sprout',
    'Adult_sprout',
    'Legion'
);


ALTER TYPE public.age_stage OWNER TO postgres;

--
-- Name: currency_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.currency_kind AS ENUM (
    'dots',
    'crystals',
    'gems'
);


ALTER TYPE public.currency_kind OWNER TO postgres;

--
-- Name: element_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.element_kind AS ENUM (
    'null',
    'water',
    'fire',
    'earth',
    'air',
    'ice',
    'storm',
    'light',
    'shadow'
);


ALTER TYPE public.element_kind OWNER TO postgres;

--
-- Name: elemental_line; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.elemental_line AS ENUM (
    'water',
    'fire',
    'earth',
    'air',
    'ice',
    'storm',
    'light',
    'shadow',
    'null_element'
);


ALTER TYPE public.elemental_line OWNER TO postgres;

--
-- Name: fight_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fight_kind AS ENUM (
    'normal',
    'boss'
);


ALTER TYPE public.fight_kind OWNER TO postgres;

--
-- Name: item_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.item_type AS ENUM (
    'care',
    'battle_food',
    'material',
    'equipment',
    'currency_pack'
);


ALTER TYPE public.item_type OWNER TO postgres;

--
-- Name: log_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.log_category AS ENUM (
    'complete',
    'coming_next',
    'patch'
);


ALTER TYPE public.log_category OWNER TO postgres;

--
-- Name: personality_trait; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.personality_trait AS ENUM (
    'friendly',
    'honest',
    'deceiver',
    'loyal',
    'cowardly',
    'brave',
    'vengeful',
    'impulsive',
    'reasonable',
    'lazy',
    'diligent',
    'naive',
    'cruel',
    'optimistic',
    'pessimistic',
    'arrogant',
    'humble',
    'snob',
    'respectful',
    'greedy',
    'generous',
    'kind'
);


ALTER TYPE public.personality_trait OWNER TO postgres;

--
-- Name: pet_gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pet_gender AS ENUM (
    'male',
    'female',
    'null',
    'null_gender'
);


ALTER TYPE public.pet_gender OWNER TO postgres;

--
-- Name: pet_location; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pet_location AS ENUM (
    'hatchery',
    'active',
    'storage',
    'inventory',
    'party'
);


ALTER TYPE public.pet_location OWNER TO postgres;

--
-- Name: pet_stage; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pet_stage AS ENUM (
    'egg',
    'baby',
    'child',
    'teen',
    'legion',
    'mythical',
    'hatchling',
    'lowform',
    'highform',
    'mythic_legendary',
    'mythical_legendary'
);


ALTER TYPE public.pet_stage OWNER TO postgres;

--
-- Name: delete_jayden_testing_emails(text); Type: FUNCTION; Schema: admin; Owner: postgres
--

CREATE FUNCTION admin.delete_jayden_testing_emails(p_confirm_text text DEFAULT 'DRY_RUN'::text) RETURNS TABLE(action text, target_email text, user_id uuid, matched_auth_email text, matched_profile_email text, display_name text, pet_count integer)
    LANGUAGE plpgsql
    AS $$
begin
  drop table if exists pg_temp._jayden_test_email_input;
  drop table if exists pg_temp._jayden_test_user_candidates;
  drop table if exists pg_temp._jayden_test_user_pets;
  drop table if exists pg_temp._jayden_test_delete_report;

  create temp table _jayden_test_email_input (
    target_email text primary key
  ) on commit drop;

  insert into _jayden_test_email_input (target_email)
  values
    ('jaydenauthentication6790@gmail.com'),
    ('jaydenauthentication6790+test6@gmail.com'),
    ('jaydentestemail6790@gmail.com'),
    ('jaydentestemail6790+2@gmail.com'),
    ('jaydentestemail6790+3@gmail.com'),
    ('maxwellpearl6790@gmail.com'),
    ('maxwellpearl90@gmail.com'),
    ('jaydentestemail6790+1@gmail.com');

  create temp table _jayden_test_user_candidates on commit drop as
  with matched_users as (
    select distinct
      i.target_email,
      u.id as user_id
    from _jayden_test_email_input i
    join auth.users u
      on lower(u.email) = lower(i.target_email)

    union

    select distinct
      i.target_email,
      pr.user_id
    from _jayden_test_email_input i
    join public.profiles pr
      on lower(pr.email) = lower(i.target_email)
  )
  select
    mu.target_email,
    u.id as user_id,
    u.email as matched_auth_email,
    pr.email as matched_profile_email,
    coalesce(
      nullif(pr.display_name, ''),
      nullif(u.raw_user_meta_data->>'display_name', ''),
      nullif(u.raw_user_meta_data->>'name', ''),
      nullif(u.raw_user_meta_data->>'username', ''),
      '-'
    ) as display_name,
    coalesce(pr.is_admin, false) as is_admin,
    coalesce(pr.role, 'user') as role
  from matched_users mu
  join auth.users u
    on u.id = mu.user_id
  left join public.profiles pr
    on pr.user_id = mu.user_id;

  if exists (
    select 1
    from (
      select
        c.target_email,
        count(distinct c.user_id) as matched_user_count
      from _jayden_test_user_candidates c
      group by c.target_email
    ) dupes
    where dupes.matched_user_count > 1
  ) then
    raise exception 'One testing email matched more than one user. Delete cancelled.';
  end if;

  if exists (
    select 1
    from _jayden_test_user_candidates c
    where c.is_admin = true
       or c.role = 'admin'
  ) then
    raise exception 'Admin account matched. Delete cancelled.';
  end if;

  create temp table _jayden_test_user_pets on commit drop as
  select
    p.id as pet_id,
    p.user_id
  from public.pets p
  join _jayden_test_user_candidates c
    on c.user_id = p.user_id;

  create temp table _jayden_test_delete_report on commit drop as
  select
    i.target_email,
    c.user_id,
    c.matched_auth_email,
    c.matched_profile_email,
    c.display_name,
    coalesce(count(p.id), 0)::int as pet_count
  from _jayden_test_email_input i
  left join _jayden_test_user_candidates c
    on c.target_email = i.target_email
  left join public.pets p
    on p.user_id = c.user_id
  group by
    i.target_email,
    c.user_id,
    c.matched_auth_email,
    c.matched_profile_email,
    c.display_name;

  if p_confirm_text is distinct from 'DELETE_JAYDEN_TESTING_EMAILS' then
    return query
    select
      case
        when r.user_id is null then 'NOT_FOUND_DRY_RUN'
        else 'DRY_RUN_ONLY'
      end::text as action,
      r.target_email::text,
      r.user_id,
      r.matched_auth_email::text,
      r.matched_profile_email::text,
      r.display_name::text,
      r.pet_count
    from _jayden_test_delete_report r
    order by r.target_email;

    return;
  end if;

  -- =========================================================
  -- PET-OWNED / BATTLE-OWNED DATA
  -- =========================================================

  delete from public.battle_run_fights brf
  where brf.run_id in (
    select br.id
    from public.battle_runs br
    where br.user_id in (
      select c.user_id
      from _jayden_test_user_candidates c
    )
       or br.pet_id in (
         select jtp.pet_id
         from _jayden_test_user_pets jtp
       )
  );

  delete from public.pve_instability_fights pif
  where pif.run_id in (
    select pir.id
    from public.pve_instability_runs pir
    where pir.user_id in (
      select c.user_id
      from _jayden_test_user_candidates c
    )
       or pir.pet_id in (
         select jtp.pet_id
         from _jayden_test_user_pets jtp
       )
  );

  delete from public.pet_mutations pm
  where pm.pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.pet_awards pa
  where pa.pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.pet_skills ps
  where ps.pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.pet_stat_allocations psa
  where psa.pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.pet_stats pst
  where pst.pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.pet_element_affinities pea
  where pea.pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.pet_elements pe
  where pe.pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.eggs e
  where e.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or e.pet_id in (
       select jtp.pet_id
       from _jayden_test_user_pets jtp
     );

  delete from public.inventory i
  where i.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or i.pet_id in (
       select jtp.pet_id
       from _jayden_test_user_pets jtp
     );

  delete from public.party_slots pslt
  where pslt.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or pslt.pet_id in (
       select jtp.pet_id
       from _jayden_test_user_pets jtp
     );

  delete from public.hatchery_slots hs
  where hs.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or hs.pet_id in (
       select jtp.pet_id
       from _jayden_test_user_pets jtp
     );

  delete from public.battle_runs br
  where br.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or br.pet_id in (
       select jtp.pet_id
       from _jayden_test_user_pets jtp
     );

  delete from public.pve_instability_runs pir
  where pir.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or pir.pet_id in (
       select jtp.pet_id
       from _jayden_test_user_pets jtp
     );

  -- =========================================================
  -- NEWER PLAYER SYSTEMS
  -- =========================================================

  delete from public.user_runes ur
  where ur.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.user_kith_discoveries ukd
  where ukd.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.user_retired_kith urk
  where urk.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.poe_tay_toe_finds ptf
  where ptf.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  update public.poe_tay_toe_state pts
  set
    hidden_by_user_id = case
      when pts.hidden_by_user_id in (
        select c.user_id
        from _jayden_test_user_candidates c
      )
      then null
      else pts.hidden_by_user_id
    end,

    claimed_by_user_id = case
      when pts.claimed_by_user_id in (
        select c.user_id
        from _jayden_test_user_candidates c
      )
      then null
      else pts.claimed_by_user_id
    end,

    claimed_at = case
      when pts.claimed_by_user_id in (
        select c.user_id
        from _jayden_test_user_candidates c
      )
      then null
      else pts.claimed_at
    end

  where pts.hidden_by_user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or pts.claimed_by_user_id in (
       select c.user_id
       from _jayden_test_user_candidates c
     );

  delete from public.trainer_progression tp
  where tp.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.player_quests pq
  where pq.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  -- wildwood_rooms are removed automatically through
  -- ON DELETE CASCADE when their expedition is deleted.
  delete from public.wildwood_expeditions we
  where we.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  -- Must be removed before pets/auth.users because this table
  -- can reference both the user and a pet egg.
  delete from public.legendary_kith_event_state lkes
  where lkes.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or lkes.egg_pet_id in (
       select jtp.pet_id
       from _jayden_test_user_pets jtp
     );

  -- =========================================================
  -- USER-OWNED DATA
  -- =========================================================

  delete from public.pve_active_buffs pab
  where pab.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.pve_research_stats prs
  where prs.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.wallet_ledger wl
  where wl.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.wallets w
  where w.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.daily_care dc
  where dc.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.user_resources ur
  where ur.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.daily_login_rewards dlr
  where dlr.id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.trainer_awards ta
  where ta.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.home_objects ho
  where ho.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.hatchery_shelf_slots hss
  where hss.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from public.signup_trigger_errors ste
  where ste.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  )
     or lower(ste.email) in (
       select lower(i.target_email)
       from _jayden_test_email_input i
     );

  -- Do not delete announcements themselves.
  -- Preserve the announcement and remove the deleted author reference.
  update public.announcements a
  set created_by = null
  where a.created_by in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  -- =========================================================
  -- PETS
  -- =========================================================

  delete from public.legendary_kith_event_state lkes
  where lkes.egg_pet_id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  delete from public.pets p
  where p.id in (
    select jtp.pet_id
    from _jayden_test_user_pets jtp
  );

  -- =========================================================
  -- PROFILE + AUTH
  -- =========================================================

  delete from public.profiles pr
  where pr.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from auth.identities ai
  where ai.user_id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  delete from auth.users au
  where au.id in (
    select c.user_id
    from _jayden_test_user_candidates c
  );

  return query
  select
    case
      when r.user_id is null then 'NOT_FOUND'
      else 'DELETE_DONE'
    end::text as action,
    r.target_email::text,
    r.user_id,
    r.matched_auth_email::text,
    r.matched_profile_email::text,
    r.display_name::text,
    r.pet_count
  from _jayden_test_delete_report r
  order by r.target_email;
end;
$$;


ALTER FUNCTION admin.delete_jayden_testing_emails(p_confirm_text text) OWNER TO postgres;

--
-- Name: reset_runaway_or_null_pet_users(boolean); Type: FUNCTION; Schema: admin; Owner: postgres
--

CREATE FUNCTION admin.reset_runaway_or_null_pet_users(p_dry_run boolean DEFAULT true) RETURNS TABLE(action text, user_id uuid, email text, display_name text, reset_reason text, total_pets integer, owned_pets integer, runaway_pets integer, affected_pet_count integer)
    LANGUAGE plpgsql
    AS $$
begin
  drop table if exists pg_temp._admin_reset_candidates;
  drop table if exists pg_temp._admin_reset_pets;

  create temp table _admin_reset_candidates on commit drop as
  with pet_status as (
    select
      u.id as user_id,
      coalesce(nullif(pr.email, ''), u.email, '-') as email,
      coalesce(
        nullif(pr.display_name, ''),
        nullif(u.raw_user_meta_data->>'display_name', ''),
        nullif(u.raw_user_meta_data->>'name', ''),
        nullif(u.raw_user_meta_data->>'username', ''),
        '-'
      ) as display_name,
      coalesce(pr.is_admin, false) as is_admin,
      coalesce(pr.intro_seen, false) as intro_seen,
      coalesce(pr.intro_cutscene_completed, false) as intro_cutscene_completed,
      coalesce(pr.food_trough_unlocked, false) as food_trough_unlocked,
      coalesce(pr.hatchery_initialized, false) as hatchery_initialized,
      count(p.id)::int as total_pets,
      (count(p.id) filter (
        where p.id is not null
          and coalesce(p.ran_away, false) = false
      ))::int as owned_pets,
      (count(p.id) filter (
        where coalesce(p.ran_away, false) = true
      ))::int as runaway_pets
    from auth.users u
    join public.profiles pr
      on pr.user_id = u.id
    left join public.pets p
      on p.user_id = u.id
    group by
      u.id,
      u.email,
      u.raw_user_meta_data,
      pr.email,
      pr.display_name,
      pr.is_admin,
      pr.intro_seen,
      pr.intro_cutscene_completed,
      pr.food_trough_unlocked,
      pr.hatchery_initialized
  )
  select
    ps.user_id,
    ps.email,
    ps.display_name,
    case
      when ps.total_pets = 0 then 'NO_PET_STUCK_AFTER_INTRO'
      when ps.owned_pets = 0 and ps.runaway_pets > 0 then 'ONLY_RUNAWAY_PETS'
      else 'UNKNOWN'
    end as reset_reason,
    ps.total_pets,
    ps.owned_pets,
    ps.runaway_pets
  from pet_status ps
  where ps.is_admin = false
    and (
      (
        ps.total_pets = 0
        and (
          ps.intro_seen = true
          or ps.intro_cutscene_completed = true
          or ps.food_trough_unlocked = true
          or ps.hatchery_initialized = true
        )
      )
      or (
        ps.total_pets > 0
        and ps.owned_pets = 0
        and ps.runaway_pets > 0
      )
    );

  create temp table _admin_reset_pets on commit drop as
  select
    p.id as pet_id,
    p.user_id
  from public.pets p
  join _admin_reset_candidates c
    on c.user_id = p.user_id;

  if p_dry_run then
    return query
    select
      'DRY_RUN_ONLY'::text as action,
      c.user_id,
      c.email,
      c.display_name,
      c.reset_reason,
      c.total_pets,
      c.owned_pets,
      c.runaway_pets,
      (
        select count(*)::int
        from _admin_reset_pets rp
        where rp.user_id = c.user_id
      ) as affected_pet_count
    from _admin_reset_candidates c
    order by c.email;

    return;
  end if;

  delete from public.battle_run_fights
  where run_id in (
    select br.id
    from public.battle_runs br
    where br.user_id in (select c.user_id from _admin_reset_candidates c)
       or br.pet_id in (select rp.pet_id from _admin_reset_pets rp)
  );

  delete from public.pve_instability_fights
  where run_id in (
    select pir.id
    from public.pve_instability_runs pir
    where pir.user_id in (select c.user_id from _admin_reset_candidates c)
       or pir.pet_id in (select rp.pet_id from _admin_reset_pets rp)
  );

  delete from public.pet_mutations
  where pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pet_awards
  where pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pet_skills
  where pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pet_stat_allocations
  where pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pet_stats
  where pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pet_element_affinities
  where pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pet_elements
  where pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.eggs
  where user_id in (select c.user_id from _admin_reset_candidates c)
     or pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.inventory
  where user_id in (select c.user_id from _admin_reset_candidates c)
     or pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.party_slots
  where user_id in (select c.user_id from _admin_reset_candidates c)
     or pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.hatchery_slots
  where user_id in (select c.user_id from _admin_reset_candidates c)
     or pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.battle_runs
  where user_id in (select c.user_id from _admin_reset_candidates c)
     or pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pve_instability_runs
  where user_id in (select c.user_id from _admin_reset_candidates c)
     or pet_id in (select rp.pet_id from _admin_reset_pets rp);

  delete from public.pve_active_buffs
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.pve_research_stats
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.wallet_ledger
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.wallets
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.daily_care
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.user_resources
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.daily_login_rewards
  where id in (select c.user_id from _admin_reset_candidates c);

  delete from public.trainer_awards
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.home_objects
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.hatchery_shelf_slots
  where user_id in (select c.user_id from _admin_reset_candidates c);

  delete from public.pets
  where id in (select rp.pet_id from _admin_reset_pets rp);

  update public.profiles pr
  set
    intro_seen = false,
    intro_cutscene_completed = false,
    food_trough_unlocked = false,
    hatchery_initialized = false,
    daily_care_completed_at = null,
    updated_at = now()
  where pr.user_id in (
    select c.user_id from _admin_reset_candidates c
  );

  return query
  select
    'RESET_DONE'::text as action,
    c.user_id,
    c.email,
    c.display_name,
    c.reset_reason,
    c.total_pets,
    c.owned_pets,
    c.runaway_pets,
    (
      select count(*)::int
      from _admin_reset_pets rp
      where rp.user_id = c.user_id
    ) as affected_pet_count
  from _admin_reset_candidates c
  order by c.email;
end;
$$;


ALTER FUNCTION admin.reset_runaway_or_null_pet_users(p_dry_run boolean) OWNER TO postgres;

--
-- Name: allocate_level2_stats(uuid, uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
DECLARE
  p public.pets%ROWTYPE; old_request public.pet_stat_spend_receipts%ROWTYPE;
  k text; n integer; spent integer := 0; available_levels integer[]; idx integer := 1;
  receipt jsonb; h integer; a integer; m integer; d integer; s integer; mp integer;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_allocation) IS DISTINCT FROM 'object'
    THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_allocation)) <> 6
    THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  FOREACH k IN ARRAY ARRAY['hp','atk','magi','def','spd','mana'] LOOP
    IF NOT p_allocation ? k OR jsonb_typeof(p_allocation->k) <> 'number'
      OR (p_allocation->>k) !~ '^(0|[1-9][0-9]?)$' THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
    n := (p_allocation->>k)::integer;
    IF n > 29 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
    spent := spent + n;
  END LOOP;
  IF spent < 1 OR spent > 29 THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  IF p.species IS NULL OR p.species NOT IN ('light_starter','kithna_clodian') OR p.stage = 'egg' OR p.ran_away
    THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT * INTO old_request FROM public.pet_stat_spend_receipts WHERE pet_id = p_pet_id AND request_id = p_request_id;
  IF FOUND THEN
    IF old_request.allocation <> p_allocation THEN RAISE EXCEPTION 'L2_CONFLICT'; END IF;
    RETURN old_request.result;
  END IF;
  IF p.level NOT BETWEEN 2 AND 30 OR spent > p.unspent_points THEN RAISE EXCEPTION 'L2_POINTS'; END IF;
  SELECT array_agg(l ORDER BY l) INTO available_levels FROM generate_series(2,p.level) l
    WHERE NOT EXISTS (SELECT 1 FROM public.pet_stat_allocations pa WHERE pa.pet_id = p_pet_id AND pa.level = l);
  IF p.unspent_points <> COALESCE(cardinality(available_levels),0)
    OR EXISTS (SELECT 1 FROM public.pet_stat_allocations pa WHERE pa.pet_id = p_pet_id AND pa.level > p.level)
    THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  -- Preserve existing stat components; discrepancies require review, not overwrite.
  IF NOT EXISTS (SELECT 1 FROM public.pet_stats base CROSS JOIN LATERAL (
    SELECT coalesce(sum(hp),0) hp,coalesce(sum(atk),0) atk,coalesce(sum(magi),0) magi,
      coalesce(sum(def),0) def,coalesce(sum(spd),0) spd,coalesce(sum(mana),0) mana
    FROM public.pet_stat_allocations WHERE pet_id=p_pet_id
  ) totals WHERE base.pet_id=p_pet_id
    AND p.hp_max=greatest(1,2*(base.base_hp+totals.hp)) AND p.atk=base.base_atk+totals.atk
    AND p.magi=base.base_magi+totals.magi AND p.def=base.base_def+totals.def
    AND p.spd=base.base_spd+totals.spd AND p.mana=base.base_mana+totals.mana)
    THEN RAISE EXCEPTION 'L2_RECONCILIATION_REQUIRED'; END IF;
  FOREACH k IN ARRAY ARRAY['hp','atk','magi','def','spd','mana'] LOOP
    FOR n IN 1..(p_allocation->>k)::integer LOOP
      INSERT INTO public.pet_stat_allocations(pet_id,level,hp,atk,magi,def,spd,mana)
        VALUES(p_pet_id,available_levels[idx],(k='hp')::integer,(k='atk')::integer,(k='magi')::integer,
          (k='def')::integer,(k='spd')::integer,(k='mana')::integer);
      idx := idx + 1;
    END LOOP;
  END LOOP;
  h := (p_allocation->>'hp')::integer; a := (p_allocation->>'atk')::integer;
  m := (p_allocation->>'magi')::integer; d := (p_allocation->>'def')::integer;
  s := (p_allocation->>'spd')::integer; mp := (p_allocation->>'mana')::integer;
  UPDATE public.pets SET unspent_points = unspent_points-spent, hp_max = hp_max+h*2,
    atk=atk+a,magi=magi+m,def=def+d,spd=spd+s,mana=mana+mp
    WHERE id=p_pet_id RETURNING * INTO p;
  receipt := jsonb_build_object('request_id',p_request_id,'pet_id',p_pet_id,'spent',spent,
    'unspent_points',p.unspent_points,'hp_max',p.hp_max,'hp_cur',p.hp_cur,
    'atk',p.atk,'magi',p.magi,'def',p.def,'spd',p.spd,'mana',p.mana);
  INSERT INTO public.pet_stat_spend_receipts(pet_id,request_id,allocation,result)
    VALUES(p_pet_id,p_request_id,p_allocation,receipt);
  RETURN receipt;
END; $_$;


ALTER FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb) OWNER TO postgres;

--
-- Name: apply_hunger_decay(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_hunger_decay(p_pet_id uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_hunger int;
  v_last_decay timestamptz;
  v_minutes_passed int;
  v_decay_amount int;
  v_new_hunger int;
begin
  select hunger, last_hunger_decay_at
  into v_hunger, v_last_decay
  from pets
  where id = p_pet_id;

  if not found then
    raise exception 'Pet not found: %', p_pet_id;
  end if;

  v_last_decay := coalesce(v_last_decay, now());
  v_minutes_passed := floor(extract(epoch from (now() - v_last_decay)) / 60);
  v_decay_amount := floor(v_minutes_passed / 30);
  v_hunger := greatest(0, least(100, coalesce(v_hunger, 100)));

  if v_decay_amount <= 0 then
    update pets
    set last_hunger_decay_at = coalesce(last_hunger_decay_at, now())
    where id = p_pet_id and last_hunger_decay_at is null;
    return v_hunger;
  end if;

  v_new_hunger := greatest(0, v_hunger - v_decay_amount);

  update pets
  set hunger = v_new_hunger,
      last_hunger_decay_at = now()
  where id = p_pet_id;

  return v_new_hunger;
end;
$$;


ALTER FUNCTION public.apply_hunger_decay(p_pet_id uuid) OWNER TO postgres;

--
-- Name: apply_pet_care_decay(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_pet_care_decay(p_pet_id uuid) RETURNS TABLE(hunger integer, clean integer, happy integer, comfort integer, rest integer, energy integer, ran_away boolean, last_care_decay_at timestamp with time zone)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_pet record;
  v_minutes_passed int;
  v_ticks int;

  v_new_hunger int;
  v_new_clean int;
  v_new_happy int;
  v_new_comfort int;
  v_new_rest int;
  v_new_energy int;
begin
  select
    pets.id,
    pets.hunger,
    pets.clean,
    pets.happy,
    pets.comfort,
    pets.rest,
    pets.energy,
    pets.ran_away,
    pets.last_care_decay_at
  into v_pet
  from public.pets
  where pets.id = p_pet_id
  for update;

  if not found then
    raise exception 'Pet not found: %', p_pet_id;
  end if;

  if coalesce(v_pet.ran_away, false) then
    return query
    select
      coalesce(v_pet.hunger, 0),
      coalesce(v_pet.clean, 0),
      coalesce(v_pet.happy, 0),
      coalesce(v_pet.comfort, 0),
      coalesce(v_pet.rest, 0),
      coalesce(v_pet.energy, 0),
      true,
      coalesce(v_pet.last_care_decay_at, now());
    return;
  end if;

  v_minutes_passed :=
    floor(extract(epoch from (now() - coalesce(v_pet.last_care_decay_at, now()))) / 60);

  v_ticks := floor(v_minutes_passed / 30);

  if v_ticks <= 0 then
    return query
    select
      coalesce(v_pet.hunger, 50),
      coalesce(v_pet.clean, 50),
      coalesce(v_pet.happy, 50),
      coalesce(v_pet.comfort, 50),
      coalesce(v_pet.rest, 50),
      coalesce(v_pet.energy, 50),
      coalesce(v_pet.ran_away, false),
      coalesce(v_pet.last_care_decay_at, now());
    return;
  end if;

  v_new_hunger  := greatest(0, least(50, coalesce(v_pet.hunger, 50) - v_ticks));
  v_new_clean   := greatest(0, least(50, coalesce(v_pet.clean, 50) - floor(v_ticks / 2)));
  v_new_happy   := greatest(0, least(50, coalesce(v_pet.happy, 50) - floor(v_ticks / 2)));
  v_new_comfort := greatest(0, least(50, coalesce(v_pet.comfort, 50) - v_ticks));
  v_new_rest    := greatest(0, least(50, coalesce(v_pet.rest, 50) - floor(v_ticks / 3)));
  v_new_energy  := greatest(0, least(50, coalesce(v_pet.energy, 50) - floor(v_ticks / 3)));

  update public.pets
  set
    hunger = v_new_hunger,
    clean = v_new_clean,
    happy = v_new_happy,
    comfort = v_new_comfort,
    rest = v_new_rest,
    energy = v_new_energy,
    ran_away = (
      v_new_hunger = 0
      or v_new_clean = 0
      or v_new_happy = 0
      or v_new_comfort = 0
      or v_new_rest = 0
    ),
    runaway_at = case
      when (
        v_new_hunger = 0
        or v_new_clean = 0
        or v_new_happy = 0
        or v_new_comfort = 0
        or v_new_rest = 0
      ) and public.pets.runaway_at is null
      then now()
      else public.pets.runaway_at
    end,
    last_care_decay_at = now()
  where public.pets.id = p_pet_id
  returning
    public.pets.hunger,
    public.pets.clean,
    public.pets.happy,
    public.pets.comfort,
    public.pets.rest,
    public.pets.energy,
    public.pets.ran_away,
    public.pets.last_care_decay_at
  into
    hunger,
    clean,
    happy,
    comfort,
    rest,
    energy,
    ran_away,
    last_care_decay_at;

  return next;
end;
$$;


ALTER FUNCTION public.apply_pet_care_decay(p_pet_id uuid) OWNER TO postgres;

--
-- Name: apply_pet_storage_action(uuid, text, uuid, integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.apply_pet_storage_action(p_user_id uuid, p_action text, p_pet_id uuid DEFAULT NULL::uuid, p_slot_index integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_pet public.pets%rowtype;
  v_displaced public.pets%rowtype;
  v_current public.party_slots%rowtype;
  v_target public.party_slots%rowtype;
  v_hatch_slot public.hatchery_slots%rowtype;
  v_to_store uuid;
  v_to_store_egg boolean := false;
  v_active uuid;
  v_fallback uuid;
  v_total integer;
  v_eggs integer;
  v_pets integer;
  v_party_count integer;
  v_target_slot integer := p_slot_index;
  v_hatch_minutes integer;
  v_hatch_ends timestamptz;
begin
  if p_user_id is null or p_action is null or p_action not in (
    'assign_party', 'return_party', 'store_pet', 'set_active',
    'incubate_storage', 'incubate_inventory', 'incubate_legacy',
    'store_inventory_egg', 'store_hatchery_egg'
  ) then raise exception 'Invalid storage action.'; end if;
  if p_action in ('assign_party', 'return_party')
     and (p_slot_index is null or p_slot_index not between 1 and 4) then
    raise exception 'Party slot must be between 1 and 4.';
  end if;

  -- Common lock order with hatch completion/rewards: player before pet.
  perform 1 from public.profiles where user_id = p_user_id for update;
  if not found then raise exception 'Player profile not found.'; end if;
  perform id from public.pets where user_id = p_user_id order by id for update;
  perform id from public.party_slots where user_id = p_user_id order by id for update;
  perform id from public.hatchery_slots where user_id = p_user_id order by id for update;

  if p_action = 'return_party' then
    select * into v_current from public.party_slots
      where user_id = p_user_id and slot_index = p_slot_index;
    if not found then return jsonb_build_object('success', true); end if;
    select * into v_pet from public.pets
      where id = v_current.pet_id and user_id = p_user_id;
  else
    select * into v_pet from public.pets
      where id = p_pet_id and user_id = p_user_id;
  end if;
  if not found then raise exception 'Pet not found.'; end if;
  if v_pet.runaway_at is not null or coalesce(v_pet.ran_away, false) then
    raise exception 'Runaway pets cannot be moved or activated.';
  end if;

  select id into v_active from public.pets
    where user_id = p_user_id and is_active is true order by id limit 1;
  select count(*) into v_party_count from public.party_slots s
    join public.pets p on p.id = s.pet_id and p.user_id = s.user_id
    where s.user_id = p_user_id and p.stage::text <> 'egg'
      and p.runaway_at is null and not coalesce(p.ran_away, false);

  if p_action in ('assign_party', 'set_active', 'store_pet', 'return_party') then
    if v_pet.stage::text = 'egg' then raise exception 'Eggs cannot join the Main Team.'; end if;
    if v_pet.location::text not in ('storage', 'active', 'party') then
      raise exception 'That pet is not in storage or the Main Team.';
    end if;
  end if;

  if p_action = 'assign_party' then
    select * into v_current from public.party_slots
      where user_id = p_user_id and pet_id = v_pet.id;
    if (select count(*) from public.party_slots where user_id = p_user_id) = 1
       and v_current.id is not null then v_target_slot := 1; end if;
    select * into v_target from public.party_slots
      where user_id = p_user_id and slot_index = v_target_slot;
    if v_current.id is null and v_target.id is not null then
      select * into v_displaced from public.pets
        where id = v_target.pet_id and user_id = p_user_id;
      if not found then raise exception 'Target slot pet not found.'; end if;
      v_to_store := v_displaced.id;
      v_to_store_egg := v_displaced.stage::text = 'egg';
    end if;
  elsif p_action in ('store_pet', 'return_party') then
    if v_pet.location::text = 'storage' and not exists (
      select 1 from public.party_slots where user_id = p_user_id and pet_id = v_pet.id
    ) then return jsonb_build_object('success', true); end if;
    if exists (select 1 from public.party_slots where user_id = p_user_id and pet_id = v_pet.id)
       and v_party_count <= 1 then
      raise exception 'Your Main Team must always keep at least 1 Delta.';
    end if;
    v_to_store := v_pet.id;
  elsif p_action in ('store_inventory_egg', 'store_hatchery_egg') then
    if v_pet.stage::text <> 'egg' or
       v_pet.location::text <> (case when p_action = 'store_inventory_egg' then 'inventory' else 'hatchery' end) then
      raise exception 'That egg is not in the expected location.';
    end if;
    v_to_store := v_pet.id;
    v_to_store_egg := true;
  elsif p_action in ('incubate_storage', 'incubate_inventory', 'incubate_legacy') then
    if v_pet.stage::text <> 'egg'
       or v_pet.location::text not in ('storage', 'inventory')
       or (p_action = 'incubate_storage' and v_pet.location::text <> 'storage')
       or (p_action = 'incubate_inventory' and v_pet.location::text <> 'inventory') then
      raise exception 'That egg is not in the expected location.';
    end if;
    if exists (select 1 from public.pets where user_id = p_user_id
      and stage::text = 'egg' and location::text = 'hatchery' and id <> v_pet.id) then
      raise exception 'Only one egg can be in the incubator at a time.';
    end if;
    select * into v_hatch_slot from public.hatchery_slots
      where user_id = p_user_id and unlocked is true and pet_id is null
      order by slot_index limit 1;
    if not found then raise exception 'No open hatchery slot is available right now.'; end if;
    -- This is the existing pending duration / 3-minute fallback, now using DB time.
    v_hatch_minutes := coalesce(v_pet.pending_hatch_minutes, 3);
    v_hatch_ends := clock_timestamp() + make_interval(mins => v_hatch_minutes);
    update public.pets set location = 'hatchery', is_active = false,
      hatch_ends_at = v_hatch_ends, pending_hatch_minutes = null
      where id = v_pet.id and user_id = p_user_id;
    update public.hatchery_slots set pet_id = v_pet.id
      where id = v_hatch_slot.id and user_id = p_user_id and pet_id is null;
    if not found then raise exception 'Hatchery slot is no longer available.'; end if;
    return jsonb_build_object('success', true, 'slot_index', v_hatch_slot.slot_index,
      'hatch_ends_at', v_hatch_ends);
  end if;

  if v_to_store is not null then
    -- Match the existing UI storage buckets, including orphaned active/team pets.
    select count(*), count(*) filter (where p.stage::text = 'egg'),
      count(*) filter (where p.stage::text is distinct from 'egg')
      into v_total, v_eggs, v_pets
      from public.pets p where p.user_id = p_user_id
        and p.runaway_at is null and not coalesce(p.ran_away, false)
        and (p.location::text = 'storage' or
          (p.location::text in ('active', 'party') and not exists (
            select 1 from public.party_slots s where s.user_id = p_user_id and s.pet_id = p.id
          )));
    if v_total + 1 > 50 then raise exception 'Storage is full. Max 50 stored creatures.'; end if;
    if v_to_store_egg and v_eggs + 1 > 20 then
      raise exception 'Egg storage is full. Max 20 stored eggs.';
    end if;
    if not v_to_store_egg and v_pets + 1 > 30 then
      raise exception 'Pet storage is full. Max 30 stored pets.';
    end if;
  end if;

  if p_action = 'assign_party' then
    if v_current.id is not null and v_current.slot_index = v_target_slot then
      update public.pets set location = 'active' where id = v_pet.id and user_id = p_user_id;
    elsif v_current.id is not null and v_target.id is not null then
      delete from public.party_slots where user_id = p_user_id and id in (v_current.id, v_target.id);
      insert into public.party_slots(user_id, slot_index, pet_id) values
        (p_user_id, v_target_slot, v_pet.id),
        (p_user_id, v_current.slot_index, v_target.pet_id);
      update public.pets set location = 'active'
        where user_id = p_user_id and id in (v_pet.id, v_target.pet_id);
    elsif v_current.id is not null then
      update public.party_slots set slot_index = v_target_slot
        where id = v_current.id and user_id = p_user_id;
      update public.pets set location = 'active' where id = v_pet.id and user_id = p_user_id;
    else
      if v_target.id is not null then
        delete from public.party_slots where id = v_target.id and user_id = p_user_id;
      end if;
      insert into public.party_slots(user_id, slot_index, pet_id)
        values (p_user_id, v_target_slot, v_pet.id);
      update public.pets set location = 'active' where id = v_pet.id and user_id = p_user_id;
      if v_to_store is not null then
        update public.pets set location = 'storage', is_active = false
          where id = v_to_store and user_id = p_user_id;
      end if;
      if v_active is null or v_active = v_to_store then
        update public.pets set is_active = false where user_id = p_user_id and is_active is true;
        update public.pets set location = 'active', is_active = true
          where id = v_pet.id and user_id = p_user_id;
      end if;
    end if;
  elsif p_action = 'set_active' then
    -- Main Team membership is checked under the existing player/party locks.
    if not exists (
      select 1 from public.party_slots
      where user_id = p_user_id and pet_id = v_pet.id
    ) then
      raise exception 'Add this Kith to your Main Team before making it active.';
    end if;
    update public.pets set is_active = false where user_id = p_user_id and is_active is true;
    update public.pets set location = 'active', is_active = true where id = v_pet.id and user_id = p_user_id;
  else
    delete from public.party_slots where user_id = p_user_id and pet_id = v_pet.id;
    update public.pets set location = 'storage', is_active = false where id = v_pet.id and user_id = p_user_id;
    if p_action = 'store_hatchery_egg' then
      update public.hatchery_slots set pet_id = null where user_id = p_user_id and pet_id = v_pet.id;
    end if;
    if v_active = v_pet.id then
      select p.id into v_fallback from public.party_slots s
        join public.pets p on p.id = s.pet_id and p.user_id = s.user_id
        where s.user_id = p_user_id and p.id <> v_pet.id and p.stage::text <> 'egg'
          and p.runaway_at is null and not coalesce(p.ran_away, false)
        order by s.slot_index limit 1;
      if v_fallback is null then
        select id into v_fallback from public.pets where user_id = p_user_id
          and id <> v_pet.id and location::text = 'storage' and stage::text <> 'egg'
          and runaway_at is null and not coalesce(ran_away, false)
          order by coalesce(hatched_at, created_at) desc, coalesce(name, '') limit 1;
      end if;
      update public.pets set is_active = false where user_id = p_user_id and is_active is true;
      if v_fallback is not null then
        update public.pets set location = 'active', is_active = true where id = v_fallback and user_id = p_user_id;
      end if;
    end if;
  end if;
  return jsonb_build_object('success', true);
end;
$$;


ALTER FUNCTION public.apply_pet_storage_action(p_user_id uuid, p_action text, p_pet_id uuid, p_slot_index integer) OWNER TO postgres;

--
-- Name: assign_new_pet_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_new_pet_mutation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  perform public.assign_pet_mutation(new.id);
  return new;
end;
$$;


ALTER FUNCTION public.assign_new_pet_mutation() OWNER TO postgres;

--
-- Name: assign_pet_mutation(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_pet_mutation(p_pet_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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
  where pet_id = p_pet_id
    and slot_index = 1;

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
      (pet_id, slot_index, mutation_id, has_mutation, roll_value)
    values
      (p_pet_id, 1, null, false, v_mutation_roll)
    on conflict (pet_id, slot_index) do nothing;

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
    (pet_id, slot_index, mutation_id, has_mutation, roll_value)
  values
    (p_pet_id, 1, v_mutation_id, true, v_mutation_roll)
  on conflict (pet_id, slot_index) do nothing;

  return v_mutation_id;
end;
$$;


ALTER FUNCTION public.assign_pet_mutation(p_pet_id uuid) OWNER TO postgres;

--
-- Name: assign_pet_personality(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_pet_personality() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  -- Only assign if empty
  if new.personality_id is null then
    select p.id
      into new.personality_id
    from public.personalities p
    order by random()
    limit 1;
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.assign_pet_personality() OWNER TO postgres;

--
-- Name: award_pet_element_delta(uuid, uuid, text, integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.award_pet_element_delta(p_user_id uuid, p_pet_id uuid, p_element text, p_quantity integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_elements public.pet_elements%ROWTYPE;
  v_current integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delta quantity must be positive.'
    );
  END IF;

  SELECT *
  INTO v_pet
  FROM public.pets
  WHERE id = p_pet_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kith not found.'
    );
  END IF;

  IF v_pet.stage::text = 'egg' OR v_pet.ran_away THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This Kith cannot receive a Delta.'
    );
  END IF;

  SELECT *
  INTO v_elements
  FROM public.pet_elements
  WHERE pet_id = p_pet_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This Kith has no elemental stats.'
    );
  END IF;

  /*
   * A Delta only stays if the Kith already has that element
   * through its natural element or future Gym training.
   */
  IF (
    CASE p_element
      WHEN 'null_element' THEN v_elements.null_element
      WHEN 'voidborne' THEN v_elements.null_element
      WHEN 'null' THEN v_elements.null_element
      WHEN 'water' THEN v_elements.water
      WHEN 'fire' THEN v_elements.fire
      WHEN 'earth' THEN v_elements.earth
      WHEN 'air' THEN v_elements.air
      WHEN 'ice' THEN v_elements.ice
      WHEN 'storm' THEN v_elements.storm
      WHEN 'light' THEN v_elements.light
      WHEN 'shadow' THEN v_elements.shadow
      ELSE 0
    END
  ) <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'absorbed', false,
      'reason', 'element_not_known',
      'element', p_element
    );
  END IF;

  INSERT INTO public.pet_element_deltas (pet_id)
  VALUES (p_pet_id)
  ON CONFLICT (pet_id) DO NOTHING;

  CASE p_element
    WHEN 'null_element' THEN
      UPDATE public.pet_element_deltas
      SET
        null_element = null_element + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING null_element INTO v_current;

    WHEN 'voidborne' THEN
      UPDATE public.pet_element_deltas
      SET
        null_element = null_element + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING null_element INTO v_current;

    WHEN 'null' THEN
      UPDATE public.pet_element_deltas
      SET
        null_element = null_element + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING null_element INTO v_current;

    WHEN 'water' THEN
      UPDATE public.pet_element_deltas
      SET
        water = water + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING water INTO v_current;

    WHEN 'fire' THEN
      UPDATE public.pet_element_deltas
      SET
        fire = fire + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING fire INTO v_current;

    WHEN 'earth' THEN
      UPDATE public.pet_element_deltas
      SET
        earth = earth + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING earth INTO v_current;

    WHEN 'air' THEN
      UPDATE public.pet_element_deltas
      SET
        air = air + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING air INTO v_current;

    WHEN 'ice' THEN
      UPDATE public.pet_element_deltas
      SET
        ice = ice + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING ice INTO v_current;

    WHEN 'storm' THEN
      UPDATE public.pet_element_deltas
      SET
        storm = storm + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING storm INTO v_current;

    WHEN 'light' THEN
      UPDATE public.pet_element_deltas
      SET
        light = light + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING light INTO v_current;

    WHEN 'shadow' THEN
      UPDATE public.pet_element_deltas
      SET
        shadow = shadow + p_quantity,
        updated_at = now()
      WHERE pet_id = p_pet_id
      RETURNING shadow INTO v_current;

    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unsupported Delta element.'
      );
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'absorbed', true,
    'element', p_element,
    'quantity', p_quantity,
    'total', v_current
  );
END;
$$;


ALTER FUNCTION public.award_pet_element_delta(p_user_id uuid, p_pet_id uuid, p_element text, p_quantity integer) OWNER TO postgres;

--
-- Name: claim_assanti_daily_food(uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.claim_assanti_daily_food(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_last timestamptz;
  v_item record;
  v_count integer := 0;
BEGIN
  -- The same wallet-first lock order as merchant/package operations.
  PERFORM 1 FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.player_quests
    WHERE user_id = p_user_id AND quest_key = 'assanti_food_trouble' AND status = 'completed') THEN
    RAISE EXCEPTION 'Daily Food is still locked.';
  END IF;
  SELECT last_claimed_at INTO v_last FROM public.assanti_food_claims WHERE user_id = p_user_id;
  IF v_last > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Daily Food is already claimed.';
  END IF;
  FOR v_item IN SELECT id, stack_limit FROM public.item_defs
    WHERE slug IN ('alpha-meat', 'alpha-vegetables') AND type = 'care' ORDER BY slug
  LOOP
    IF v_item.stack_limit < 5 THEN RAISE EXCEPTION 'Not enough room for the full food reward.'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item.id, 5)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + 5, updated_at = now()
    WHERE owned.qty <= v_item.stack_limit - 5;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not enough room for the full food reward.'; END IF;
    v_count := v_count + 1;
  END LOOP;
  IF v_count <> 2 THEN RAISE EXCEPTION 'Food definitions missing.'; END IF;
  INSERT INTO public.assanti_food_claims (user_id, last_claimed_at) VALUES (p_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET last_claimed_at = EXCLUDED.last_claimed_at;
  RETURN jsonb_build_object('claimed', true, 'next_claim_at', now() + interval '24 hours');
END;
$$;


ALTER FUNCTION public.claim_assanti_daily_food(p_user_id uuid) OWNER TO postgres;

--
-- Name: claim_daily_login_reward(uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.claim_daily_login_reward(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_claim public.daily_login_rewards%ROWTYPE;
  v_now timestamptz;
  v_diff integer;
  v_reset boolean;
  v_streak integer;
  v_day integer;
  v_reward jsonb;
  v_dots integer;
  v_slug text;
  v_qty integer;
  v_item uuid;
  v_stack_limit integer;
  v_pet uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player profile missing.';
  END IF;

  INSERT INTO public.daily_login_rewards (id) VALUES (p_user_id)
  ON CONFLICT (id) DO NOTHING;
  SELECT * INTO STRICT v_claim FROM public.daily_login_rewards
  WHERE id = p_user_id FOR UPDATE;

  -- Sample time after waiting for the lock, including across UTC midnight.
  v_now := clock_timestamp();
  v_diff := CASE WHEN v_claim.last_claimed_at IS NULL THEN 999
    ELSE (v_now AT TIME ZONE 'UTC')::date
       - (v_claim.last_claimed_at AT TIME ZONE 'UTC')::date END;
  IF v_diff = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already claimed today.');
  END IF;

  v_reset := v_diff >= 4;
  v_streak := CASE WHEN v_reset THEN 0 ELSE v_claim.streak END + 1;
  v_day := (v_streak - 1) % 7;
  CASE v_day
    WHEN 0 THEN
      v_dots := 300;
      v_reward := '{"kind":"dots","amount":300,"label":"300 Dots"}'::jsonb;
    WHEN 1 THEN
      v_dots := 200;
      v_reward := '{"kind":"dots","amount":200,"label":"200 Dots"}'::jsonb;
    WHEN 2 THEN
      v_slug := 'haiku_scroll_50';
      v_qty := 1;
      v_reward := '{"kind":"item","slug":"haiku_scroll_50","qty":1,"label":"Haiku Scroll #50"}'::jsonb;
    WHEN 3 THEN
      v_slug := 'potion_small';
      v_qty := 3;
      v_reward := '{"kind":"item","slug":"potion_small","qty":3,"label":"Potions x3"}'::jsonb;
    WHEN 4 THEN
      v_reward := '{"kind":"xp","amount":100,"label":"EXP +100"}'::jsonb;
    WHEN 5 THEN
      v_dots := 500;
      v_reward := '{"kind":"dots","amount":500,"label":"500 Dots"}'::jsonb;
    WHEN 6 THEN
      v_dots := 100;
      v_reward := '{"kind":"dots","amount":100,"label":"100 Dots"}'::jsonb;
    ELSE
      RAISE EXCEPTION 'Invalid daily reward streak.';
  END CASE;

  IF v_dots IS NOT NULL THEN
    -- Preserve increment_wallet's missing-row behavior and existing currencies.
    INSERT INTO public.wallets AS owned (user_id, dots, crystals)
    VALUES (p_user_id, v_dots, 0)
    ON CONFLICT (user_id) DO UPDATE
      SET dots = owned.dots + EXCLUDED.dots, updated_at = v_now;
  ELSIF v_slug IS NOT NULL THEN
    SELECT id, stack_limit INTO STRICT v_item, v_stack_limit
    FROM public.item_defs WHERE slug = v_slug FOR SHARE;
    IF v_stack_limit IS NULL THEN
      RAISE EXCEPTION 'Reward item stack limit is missing.';
    END IF;
    IF v_qty > v_stack_limit THEN
      RETURN jsonb_build_object('ok', false,
        'error', 'Make room for the full item reward before claiming.');
    END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item, v_qty)
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET qty = owned.qty + EXCLUDED.qty, updated_at = v_now
      WHERE owned.qty <= v_stack_limit - EXCLUDED.qty;
    IF NOT FOUND THEN
      -- No quantity or claim advancement occurs when the entire reward cannot fit.
      RETURN jsonb_build_object('ok', false,
        'error', 'Make room for the full item reward before claiming.');
    END IF;
  ELSIF v_day = 4 THEN
    SELECT id INTO v_pet FROM public.pets
    WHERE user_id = p_user_id AND is_active = true AND ran_away = false
    FOR UPDATE;
    -- Keep the reward available until an eligible active Kith can receive it.
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false,
        'error', 'Activate a non-runaway Kith before claiming this XP reward.');
    END IF;
    UPDATE public.pets SET xp = COALESCE(xp, 0) + 100
    WHERE id = v_pet AND user_id = p_user_id;
  END IF;

  -- Keep historical potato_received untouched. Any failure rolls back the reward.
  UPDATE public.daily_login_rewards SET streak = v_streak, last_claimed_at = v_now
  WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true, 'reward', v_reward, 'streak', v_streak,
    'dayIndex', v_day, 'reset', v_reset);
END;
$$;


ALTER FUNCTION public.claim_daily_login_reward(p_user_id uuid) OWNER TO postgres;

--
-- Name: claim_level2_skill(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE p public.pets%ROWTYPE; choices jsonb;
BEGIN
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'L2_NOT_FOUND'; END IF;
  IF p.species NOT IN ('light_starter','kithna_clodian') THEN RAISE EXCEPTION 'L2_INELIGIBLE'; END IF;
  SELECT jsonb_agg(jsonb_build_object('slug',sd.slug,'sourceSlug',sd.slug,'name',sd.name,
    'description',sd.description,'level',2,'element',p.line,'speciesIds',jsonb_build_array(p.species),
    'catalogId',(CASE WHEN p.species = 'light_starter' THEN 'solen/' ELSE 'clodian/' END) || sd.slug,
    'combatEnabled',true,'role',CASE
      WHEN sd.slug IN ('solen-angelic-ward','clodion-stormfeather-guard') THEN 'tank'
      WHEN sd.slug IN ('solen-gleam-jab','clodion-thunder-talon') THEN 'dps'
      WHEN sd.slug IN ('solen-mending-light','clodion-gentle-updraft') THEN 'healer' ELSE 'sorcerer' END))
    INTO choices FROM public.skill_defs sd WHERE
      (p.species = 'light_starter' AND sd.slug IN ('solen-angelic-ward','solen-gleam-jab','solen-mending-light','solen-radiant-bolt'))
      OR (p.species = 'kithna_clodian' AND sd.slug IN ('clodion-stormfeather-guard','clodion-thunder-talon','clodion-gentle-updraft','clodion-static-gust'));
  RETURN public.claim_species_skill(p_user_id,p_pet_id,p.species,p.line::text,2,p_skill_slug,choices);
END; $$;


ALTER FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text) OWNER TO postgres;

--
-- Name: claim_poe_tay_toe(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.claim_poe_tay_toe(p_user_id uuid, p_location_key text) RETURNS TABLE(claimed boolean, reason text, cooldown_ends_at timestamp with time zone, dots_awarded integer, item_slug text, item_qty integer)
    LANGUAGE sql
    SET search_path TO ''
    AS $$
 SELECT false,'refresh_required'::text,NULL::timestamptz,0,NULL::text,0;
$$;


ALTER FUNCTION public.claim_poe_tay_toe(p_user_id uuid, p_location_key text) OWNER TO postgres;

--
-- Name: claim_poe_tay_toe_v2(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.claim_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_version uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    SET lock_timeout TO '5s'
    AS $$
DECLARE s public.poe_tay_toe_state%ROWTYPE; v_last timestamptz; v_effect text;
 v_until timestamptz; v_id uuid := gen_random_uuid(); v_now timestamptz;
 v_dots integer := 0; v_spots text[] := public.potato_locations(); v_next text;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_version IS NULL OR p_location_key IS NULL OR NOT p_location_key = ANY(v_spots) THEN
   RETURN jsonb_build_object('claimed',false,'reason','invalid_location'); END IF;
 SELECT * INTO STRICT s FROM public.poe_tay_toe_state WHERE id = 1 FOR UPDATE;
 v_now := clock_timestamp();
 IF s.location_version <> p_version OR s.current_location_key <> p_location_key THEN
   RETURN jsonb_build_object('claimed',false,'reason','moved'); END IF;
 SELECT max(found_at) INTO v_last FROM public.poe_tay_toe_finds WHERE user_id = p_user_id;
 IF v_last + interval '2 hours' > v_now THEN
   RETURN jsonb_build_object('claimed',false,'reason','cooldown','cooldownEndsAt',v_last + interval '2 hours'); END IF;
 v_effect := public.potato_effect_for_roll(random()::numeric);
 IF v_effect IN ('potato_power','warm_potato') THEN v_until := v_now + interval '30 minutes';
 ELSIF v_effect IN ('potato_brain','rotten_luck') THEN v_until := v_now + interval '15 minutes'; END IF;
 -- Serialize the short warm grant with incubation writes, including inserts.
 -- Otherwise an egg started concurrently could miss both the grant and trigger.
 IF v_effect = 'warm_potato' THEN
   LOCK TABLE public.pets IN SHARE ROW EXCLUSIVE MODE;
 END IF;
 IF v_effect = 'lucky_spud' THEN
   v_dots := 100;
   INSERT INTO public.wallets(user_id,dots) VALUES (p_user_id,v_dots)
   ON CONFLICT(user_id) DO UPDATE SET dots = public.wallets.dots + v_dots, updated_at = v_now;
 END IF;
 -- Two-hour discovery cooldown exceeds every effect lifetime: effects cannot stack.
 -- Retain this replacement guard if durations are adjusted in a future approved change.
 IF v_until IS NOT NULL THEN
   UPDATE public.poe_tay_toe_finds SET effect_expires_at = v_now
   WHERE user_id = p_user_id AND effect_expires_at > v_now;
 END IF;
 INSERT INTO public.poe_tay_toe_finds(id,user_id,location_key,dots_awarded,item_slug,item_qty,found_at,effect_key,effect_expires_at)
 VALUES(v_id,p_user_id,p_location_key,v_dots,'',0,v_now,v_effect,v_until);
 IF v_effect = 'warm_potato' THEN
   UPDATE public.pets SET hatch_ends_at = public.potato_warm_due(hatch_ends_at,v_now,v_until)
   WHERE user_id = p_user_id AND stage::text = 'egg' AND location::text = 'hatchery' AND hatch_ends_at > v_now;
 END IF;
 -- Move immediately to the next allowed spot. No global pending/abandonment lock.
 v_next := v_spots[(array_position(v_spots,p_location_key) % array_length(v_spots,1)) + 1];
 UPDATE public.poe_tay_toe_state SET current_location_key = v_next, location_version = gen_random_uuid(),
 last_discovery_id = v_id, claimed_by_user_id = NULL, claimed_at = NULL,
 hidden_at = v_now, hidden_by_user_id = NULL, find_count = find_count + 1, updated_at = v_now WHERE id = 1;
 RETURN jsonb_build_object('claimed',true,'discoveryId',v_id,'cooldownEndsAt',v_now + interval '2 hours',
 'effect',jsonb_build_object('key',v_effect,'dots',v_dots,'expiresAt',v_until));
END;
$$;


ALTER FUNCTION public.claim_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_version uuid) OWNER TO postgres;

--
-- Name: claim_species_skill(uuid, uuid, text, text, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.claim_species_skill(p_user_id uuid, p_pet_id uuid, p_species text, p_element text, p_level integer, p_skill_slug text, p_choices jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
DECLARE
  p public.pets%ROWTYPE; d public.skill_defs%ROWTYPE;
  c public.pet_skill_milestone_claims%ROWTYPE;
  choice jsonb; selected jsonb; slot_number smallint; milestone text;
  required_config jsonb; decision text;
BEGIN
  -- Every writer takes this lock first; retries and competing decisions serialize.
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKILL_NOT_FOUND'; END IF;
  IF p.species IS DISTINCT FROM p_species OR p.line::text IS DISTINCT FROM p_element
    OR p.stage = 'egg' OR p.ran_away OR p_level IS NULL OR p.level < p_level
    OR p_level NOT IN (2,5,8,11,14,17,20,23,26,30)
    THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;
  milestone := 'level-' || p_level;
  -- p_choices comes from server-owned JSON, never from the HTTP request body.
  IF jsonb_typeof(p_choices) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  IF jsonb_array_length(p_choices) <> 4 THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  IF (SELECT count(DISTINCT value->>'role') FROM jsonb_array_elements(p_choices)) <> 4
    OR (SELECT count(DISTINCT value->>'slug') FROM jsonb_array_elements(p_choices)) <> 4
    THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  FOR choice IN SELECT value FROM jsonb_array_elements(p_choices) LOOP
    IF jsonb_typeof(choice) IS DISTINCT FROM 'object'
      OR COALESCE(choice->>'role','') NOT IN ('tank','healer','dps','sorcerer')
      OR (choice->>'level') IS DISTINCT FROM p_level::text
      OR (choice->>'element') IS DISTINCT FROM p_element
      OR jsonb_typeof(choice->'speciesIds') IS DISTINCT FROM 'array'
      OR NOT COALESCE((choice->'speciesIds') ? p_species, false)
      OR COALESCE(choice->>'slug','') !~ '^[a-z][a-z0-9-]{0,99}$'
      OR COALESCE(choice->>'catalogId','') !~ '^[a-z][a-z0-9-]*/[a-z][a-z0-9-]*$'
      OR jsonb_typeof(choice->'name') IS DISTINCT FROM 'string'
      OR jsonb_typeof(choice->'description') IS DISTINCT FROM 'string'
      OR jsonb_typeof(choice->'combatEnabled') IS DISTINCT FROM 'boolean'
      THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
    IF choice->>'slug' = p_skill_slug THEN selected := choice; END IF;
  END LOOP;
  IF selected IS NULL THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;

  -- Preserve conflicting history, including conflicts in earlier claimed levels.
  IF EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims pc
    LEFT JOIN public.skill_defs sd ON sd.id = pc.skill_id
    WHERE pc.pet_id = p_pet_id AND (
      sd.id IS NULL OR pc.species_id IS DISTINCT FROM p.species
      OR pc.milestone_key IS DISTINCT FROM ('level-' || sd.required_level)
      OR sd.required_level > p.level
      OR NOT EXISTS (SELECT 1 FROM public.pet_skills owned_skill WHERE owned_skill.pet_id = p_pet_id AND owned_skill.skill_id = pc.skill_id)
      OR (SELECT count(*) FROM public.pet_skills ps JOIN public.skill_defs learned_def ON learned_def.id = ps.skill_id
          WHERE ps.pet_id = p_pet_id AND (ps.skill_id = pc.skill_id
            OR learned_def.requirements->>'milestone_key' = pc.milestone_key)) <> 1
      OR EXISTS (SELECT 1 FROM unnest(ARRAY[2,5,8,11,14,17,20,23,26,30]) AS levels(n)
        WHERE n < sd.required_level AND NOT EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims earlier
          WHERE earlier.pet_id = p_pet_id AND earlier.milestone_key = 'level-' || n))))
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;

  SELECT * INTO c FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND milestone_key = milestone;
  IF FOUND THEN
    SELECT * INTO d FROM public.skill_defs WHERE id = c.skill_id;
    IF NOT FOUND OR d.slug IS DISTINCT FROM p_skill_slug THEN RAISE EXCEPTION 'SKILL_CONFLICT'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND skill_id = c.skill_id)
      THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
    RETURN jsonb_build_object('skill_id',c.skill_id,'milestone_key',c.milestone_key,
      'equipment_decision',c.equipment_decision,'equipment_decision_slot',c.equipment_decision_slot);
  END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND equipment_decision = 'pending') THEN RAISE EXCEPTION 'SKILL_PENDING'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY[2,5,8,11,14,17,20,23,26,30]) AS levels(n)
    WHERE n < p_level AND NOT EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims
      WHERE pet_id = p_pet_id AND milestone_key = 'level-' || n)) THEN RAISE EXCEPTION 'SKILL_ORDER'; END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id
      AND equipped IS DISTINCT FROM (equipped_slot IS NOT NULL))
    OR EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims pc
      WHERE pc.pet_id = p_pet_id AND (pc.equipment_decision = 'legacy' OR NOT EXISTS (SELECT 1 FROM public.pet_skills ps
        WHERE ps.pet_id = pc.pet_id AND ps.skill_id = pc.skill_id)))
    OR EXISTS (SELECT 1 FROM public.pet_skills ps JOIN public.skill_defs sd ON sd.id = ps.skill_id
      WHERE ps.pet_id = p_pet_id AND (sd.requirements->>'milestone_key' = milestone
        OR sd.slug IN (SELECT value->>'slug' FROM jsonb_array_elements(p_choices))
        OR sd.slug IN (SELECT value->>'sourceSlug' FROM jsonb_array_elements(p_choices))))
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;

  required_config := jsonb_build_object('config_version','species-learning-v1','milestone_key',milestone,
    'catalog_id',selected->>'catalogId','element',p_element,'species_ids',selected->'speciesIds',
    'role',selected->>'role','combat_enabled',selected->'combatEnabled','prerequisite_slugs','[]'::jsonb);
  -- Do not overwrite an existing definition or its UUID, even on conflict.
  INSERT INTO public.skill_defs(slug,name,description,required_level,requirements)
    VALUES(p_skill_slug,selected->>'name',selected->>'description',p_level,required_config)
    ON CONFLICT (slug) DO NOTHING;
  SELECT * INTO d FROM public.skill_defs WHERE slug = p_skill_slug FOR SHARE;
  IF d.required_level IS DISTINCT FROM p_level OR d.name IS DISTINCT FROM (selected->>'name')
    OR d.requirements->>'element' IS DISTINCT FROM p_element
    OR NOT COALESCE((d.requirements->'species_ids') ? p_species,false)
    OR d.requirements->>'milestone_key' IS DISTINCT FROM milestone
    OR d.requirements->'prerequisite_slugs' IS DISTINCT FROM '[]'::jsonb
    OR NOT COALESCE(d.requirements = required_config OR (
      p_level = 2 AND d.requirements->>'config_version' = 'level-2-v1'
      AND d.requirements->>'combat_enabled' = 'true' AND selected->>'combatEnabled' = 'true'
      AND ((p_species = 'light_starter' AND p_skill_slug IN (
        'solen-angelic-ward','solen-gleam-jab','solen-mending-light','solen-radiant-bolt'))
        OR (p_species = 'kithna_clodian' AND p_skill_slug IN (
        'clodion-stormfeather-guard','clodion-thunder-talon','clodion-gentle-updraft','clodion-static-gust')))), false)
    THEN RAISE EXCEPTION 'SKILL_CONFIG'; END IF;
  SELECT n INTO slot_number FROM generate_series(1,4) AS slots(n)
    WHERE NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND equipped_slot = n)
    ORDER BY n LIMIT 1;
  decision := CASE WHEN slot_number IS NULL THEN 'pending' ELSE 'auto_equipped' END;
  INSERT INTO public.pet_skills(pet_id,skill_id,equipped,equipped_slot)
    VALUES(p_pet_id,d.id,slot_number IS NOT NULL,slot_number);
  INSERT INTO public.pet_skill_milestone_claims(pet_id,milestone_key,skill_id,species_id,config_version,
    eligible_choices,equipment_decision,equipment_decision_slot)
    VALUES(p_pet_id,milestone,d.id,p_species,'species-learning-v1',p_choices,decision,slot_number);
  RETURN jsonb_build_object('skill_id',d.id,'milestone_key',milestone,
    'equipment_decision',decision,'equipment_decision_slot',slot_number);
END; $_$;


ALTER FUNCTION public.claim_species_skill(p_user_id uuid, p_pet_id uuid, p_species text, p_element text, p_level integer, p_skill_slug text, p_choices jsonb) OWNER TO postgres;

--
-- Name: claim_wildwood_discovery(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.claim_wildwood_discovery(p_user_id uuid, p_room_id uuid, p_item_slug text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_item public.item_defs%ROWTYPE;
  v_expected jsonb;
BEGIN
  -- Serialize claims, transfers and departure for the same player.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  SELECT room.*
  INTO v_room
  FROM public.wildwood_rooms AS room
  JOIN public.wildwood_expeditions AS expedition
    ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id
    AND expedition.user_id = p_user_id
    AND expedition.status = 'active'
  FOR UPDATE OF room;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'error', 'Active Wildwood room not found.'
    );
  END IF;

  IF v_room.event_kind <> 'flavor'
    OR v_room.status <> 'resolved'
    OR v_room.event_payload->'battle'
      IS DISTINCT FROM 'null'::jsonb
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'This room has no collectible item.'
    );
  END IF;

  IF v_room.item_claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'This discovery was already collected.'
    );
  END IF;

  -- Preserve the existing approved discovery catalog.
  SELECT value
  INTO v_expected
  FROM jsonb_array_elements(
    public.wildwood_discovery_catalog()
  )
  WHERE value->>'slug' = p_item_slug;

  IF v_expected IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Invalid Wildwood item.'
    );
  END IF;

  SELECT *
  INTO v_item
  FROM public.item_defs
  WHERE slug = p_item_slug
  FOR SHARE;

  IF NOT FOUND OR jsonb_build_object(
    'slug', v_item.slug,
    'name', v_item.name,
    'description', v_item.description,
    'type', v_item.type,
    'category', v_expected->>'category',
    'rarity', v_item.rarity,
    'stack_limit', v_item.stack_limit,
    'effects', v_item.effects
  ) IS DISTINCT FROM v_expected THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 503,
      'error', 'Discovery catalog is unavailable.'
    );
  END IF;

  -- Check wall-clock time after both row/catalog locks, immediately before awarding.
  -- Transaction-start time (now()) would allow a request waiting on a lock to expire.
  -- NULL is deliberately grandfathered: never time out pre-migration discoveries.
  IF v_room.item_available_at IS NOT NULL AND (
    clock_timestamp() < v_room.item_available_at OR
    clock_timestamp() >= v_room.item_available_at + interval '5 seconds'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'This Wildwood discovery has expired.'
    );
  END IF;

  INSERT INTO public.wildwood_treasure_items (
    room_id,
    user_id,
    item_id
  )
  VALUES (
    p_room_id,
    p_user_id,
    v_item.id
  );

  UPDATE public.wildwood_rooms
  SET item_claimed_at = now()
  WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'qty', 1,
    'held', true,
    'item', jsonb_build_object(
      'slug', v_item.slug,
      'name', v_item.name,
      'description', v_item.description,
      'type', v_item.type,
      'category', v_expected->>'category',
      'rarity', v_item.rarity,
      'stackLimit', v_item.stack_limit,
      'effects', v_item.effects
    )
  );
END;
$$;


ALTER FUNCTION public.claim_wildwood_discovery(p_user_id uuid, p_room_id uuid, p_item_slug text) OWNER TO postgres;

--
-- Name: claim_wildwood_item(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.claim_wildwood_item(p_user_id uuid, p_room_id uuid, p_item_slug text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_item public.item_defs%ROWTYPE;
  v_qty integer;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms AS room
  JOIN public.wildwood_expeditions AS expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status_code', 404, 'error', 'Wildwood discovery not found.');
  END IF;
  IF v_room.event_kind <> 'flavor' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'This Wildwood step does not contain an item.');
  END IF;
  IF v_room.item_claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'This Wildwood item has already been collected.');
  END IF;

  -- The server retains the existing random pool and probabilities.
  IF p_item_slug IS NULL OR p_item_slug <> ALL (ARRAY[
    'potion_small', 'haiku_scroll_50', 'water-delta', 'fire-delta',
    'earth-delta', 'air-delta', 'ice-delta', 'storm-delta', 'light-delta', 'shadow-delta'
  ]) THEN
    RAISE EXCEPTION 'Invalid Wildwood item.';
  END IF;
  SELECT * INTO v_item FROM public.item_defs WHERE slug = p_item_slug FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wildwood item definition is missing.'; END IF;
  IF v_item.stack_limit < 1 THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'That item stack is full.');
  END IF;

  INSERT INTO public.inventory AS owned (user_id, item_id, qty)
  VALUES (p_user_id, v_item.id, 1)
  ON CONFLICT (user_id, item_id) DO UPDATE
    SET qty = owned.qty + 1
    WHERE owned.qty < v_item.stack_limit
  RETURNING qty INTO v_qty;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'That item stack is full.');
  END IF;

  UPDATE public.wildwood_rooms SET item_claimed_at = now() WHERE id = v_room.id;
  -- Any error rolls back both the inventory increment and claim timestamp.
  RETURN jsonb_build_object('success', true, 'qty', v_qty, 'item', jsonb_build_object(
    'slug', v_item.slug, 'name', v_item.name, 'type', v_item.type,
    'description', v_item.description, 'rarity', v_item.rarity,
    'stackLimit', v_item.stack_limit, 'effects', v_item.effects));
END;
$$;


ALTER FUNCTION public.claim_wildwood_item(p_user_id uuid, p_room_id uuid, p_item_slug text) OWNER TO postgres;

--
-- Name: commit_resonance_evolution(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.commit_resonance_evolution(p_user_id uuid, p_pet_id uuid, p_species text, p_next_name text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_item_id uuid;
  v_slug text;
  v_cost integer;
  v_previous_hp integer;
  v_previous_hp_max integer;
BEGIN
  -- Lock first so repeated requests cannot charge for the same evolution twice.
  SELECT * INTO v_pet FROM public.pets
    WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kith not found.');
  END IF;
  IF v_pet.stage::text <> 'hatchling' OR v_pet.ran_away THEN
    RETURN jsonb_build_object('success', false, 'error', 'This Kith is not an available hatchling.');
  END IF;
  IF v_pet.level IS NULL OR v_pet.level < 15 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This Kith must be level 15 or higher before Resonance Evolution.');
  END IF;
  IF v_pet.hp_cur IS NULL OR v_pet.hp_cur <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This Kith must be conscious before Resonance Evolution.');
  END IF;
  -- The authenticated server resolves the name from the species registry.
  IF v_pet.species IS DISTINCT FROM p_species OR p_species IS NULL
     OR p_next_name IS NULL OR btrim(p_next_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evolution identity changed. Refresh and try again.');
  END IF;

  IF v_pet.line::text IN ('null_element', 'voidborne') THEN
    v_slug := 'voidborne-delta';
    v_cost := 15;
  ELSIF v_pet.line::text IN ('water', 'fire', 'earth', 'air', 'ice', 'storm', 'light', 'shadow') THEN
    v_slug := v_pet.line::text || '-delta';
    v_cost := 10;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'This element has no configured evolution Delta.');
  END IF;

  SELECT id INTO v_item_id FROM public.item_defs WHERE slug = v_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'The matching evolution Delta is not configured.');
  END IF;

  -- This conditional update also serializes competing charges for different pets.
  UPDATE public.inventory SET qty = qty - v_cost
    WHERE user_id = p_user_id AND item_id = v_item_id AND qty >= v_cost;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Evolution requires %s matching %s items.', v_cost, v_slug));
  END IF;

  v_previous_hp := v_pet.hp_cur;
  v_previous_hp_max := v_pet.hp_max;
  UPDATE public.pets SET stage = 'lowform', name = p_next_name, hp_cur = 1
    WHERE id = p_pet_id AND user_id = p_user_id
    RETURNING * INTO v_pet;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evolution could not be saved';
  END IF;
  -- An exception rolls back the item charge as well as the pet update.
  RETURN jsonb_build_object(
    'success', true,
    'pet', jsonb_build_object(
      'id', v_pet.id, 'name', v_pet.name, 'species', v_pet.species,
      'line', v_pet.line, 'stage', v_pet.stage, 'hp_cur', v_pet.hp_cur,
      'hp_max', v_pet.hp_max, 'xp', v_pet.xp
    ),
    'previous_hp', v_previous_hp, 'previous_hp_max', v_previous_hp_max,
    'consumed_deltas', v_cost, 'delta_slug', v_slug
  );
END;
$$;


ALTER FUNCTION public.commit_resonance_evolution(p_user_id uuid, p_pet_id uuid, p_species text, p_next_name text) OWNER TO postgres;

--
-- Name: complete_pve_instability_run(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.complete_pve_instability_run(p_user_id uuid, p_run_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


ALTER FUNCTION public.complete_pve_instability_run(p_user_id uuid, p_run_id uuid) OWNER TO postgres;

--
-- Name: consume_corrupted_egg(uuid, uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.consume_corrupted_egg(p_user_id uuid, p_egg_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_egg public.pets%ROWTYPE;
BEGIN
  -- Competes with the normal hatch UPDATE on the same pet row. A retry or a
  -- normal hatch that won the race cannot be counted as another loss.
  SELECT * INTO v_egg FROM public.pets
    WHERE id = p_egg_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_egg.stage <> 'egg' OR v_egg.hatch_ends_at IS NULL
    OR v_egg.hatch_ends_at > now()
  THEN RETURN false; END IF;

  INSERT INTO public.trainer_progression (user_id, corrupted_eggs_lost)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET corrupted_eggs_lost = public.trainer_progression.corrupted_eggs_lost + 1,
        updated_at = now();

  UPDATE public.hatchery_slots SET pet_id = NULL
    WHERE user_id = p_user_id AND pet_id = p_egg_id;
  DELETE FROM public.pets WHERE id = p_egg_id AND user_id = p_user_id;
  RETURN true;
END;
$$;


ALTER FUNCTION public.consume_corrupted_egg(p_user_id uuid, p_egg_id uuid) OWNER TO postgres;

--
-- Name: consume_trough(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.consume_trough(p_user_id uuid, p_amount integer) RETURNS TABLE(trough_fill integer, trough_capacity integer)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;

  update public.user_resources ur
  set trough_fill = ur.trough_fill - p_amount,
      updated_at = now()
  where ur.user_id = p_user_id
    and ur.trough_fill >= p_amount
  returning ur.trough_fill, ur.trough_capacity
  into trough_fill, trough_capacity;

  if not found then
    raise exception 'NOT_ENOUGH_TROUGH_FILL';
  end if;

  return next;
end;
$$;


ALTER FUNCTION public.consume_trough(p_user_id uuid, p_amount integer) OWNER TO postgres;

--
-- Name: discard_wildwood_treasure(uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.discard_wildwood_treasure(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_count integer;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  -- Lock rooms before receipts, matching egg hold/transfer and item claims.
  PERFORM room.id FROM public.wildwood_rooms room
    JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE expedition.user_id = p_user_id AND expedition.status = 'active'
    ORDER BY room.id FOR UPDATE OF room;
  UPDATE public.wildwood_treasure_items treasure SET discarded_at = now()
    FROM public.wildwood_rooms room JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE treasure.room_id = room.id AND treasure.user_id = p_user_id
      AND expedition.user_id = p_user_id AND expedition.status = 'active'
      AND treasure.transferred_at IS NULL AND treasure.discarded_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.wildwood_rooms room SET event_payload =
    jsonb_set(CASE WHEN room.event_payload#>>'{eggTreasure,status}' = 'pending'
      THEN jsonb_set(room.event_payload, '{eggTreasure,status}', '"discarded"'::jsonb)
      ELSE room.event_payload END, '{eggTreasureClosed}', 'true'::jsonb),
    item_claimed_at = CASE WHEN room.event_kind = 'flavor' AND room.status = 'resolved'
      THEN coalesce(room.item_claimed_at, now()) ELSE room.item_claimed_at END
    FROM public.wildwood_expeditions expedition
    WHERE expedition.id = room.expedition_id AND expedition.user_id = p_user_id
      AND expedition.status = 'active' AND room.event_payload->'battle' = 'null'::jsonb;
  RETURN jsonb_build_object('success', true, 'discarded', v_count);
END;
$$;


ALTER FUNCTION public.discard_wildwood_treasure(p_user_id uuid) OWNER TO postgres;

--
-- Name: enforce_pet_mutation_capacity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_pet_mutation_capacity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_capacity smallint;
begin
  select mutation_capacity
  into v_capacity
  from public.pets
  where id = new.pet_id;

  if v_capacity is null then
    raise exception 'Cannot assign mutation: pet % does not exist.', new.pet_id;
  end if;

  if new.slot_index > v_capacity then
    raise exception
      'Cannot assign mutation slot %: pet % has a mutation capacity of %.',
      new.slot_index,
      new.pet_id,
      v_capacity;
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.enforce_pet_mutation_capacity() OWNER TO postgres;

--
-- Name: ensure_assanti_food_day(integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.ensure_assanti_food_day(p_delta_day integer) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_slugs text[];
  v_dots integer;
  v_count integer;
BEGIN
  IF p_delta_day IS NULL OR p_delta_day < 0 THEN
    RAISE EXCEPTION 'Invalid Delta day.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.assanti_food_days WHERE delta_day = p_delta_day) THEN RETURN; END IF;
  v_count := 6 + (('x' || substr(md5('assanti:count:' || p_delta_day::text), 1, 7))::bit(28)::integer % 5);
  SELECT array_agg(slug ORDER BY slug) INTO v_slugs FROM (
    SELECT slug FROM public.assanti_food_catalog WHERE permanent
    UNION ALL
    (SELECT slug FROM public.assanti_food_catalog WHERE NOT permanent
      ORDER BY md5('assanti:' || p_delta_day::text || ':' || slug) LIMIT v_count)
  ) selected;
  SELECT minimum_dots + floor(random() * (maximum_dots::bigint - minimum_dots + 1))::integer
    INTO STRICT v_dots FROM public.assanti_food_config WHERE id;
  INSERT INTO public.assanti_food_days VALUES (p_delta_day, v_slugs, v_dots, v_dots)
    ON CONFLICT (delta_day) DO NOTHING;
END;
$$;


ALTER FUNCTION public.ensure_assanti_food_day(p_delta_day integer) OWNER TO postgres;

--
-- Name: ensure_original_starter(uuid, jsonb, jsonb, text[]); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.ensure_original_starter(p_user_id uuid, p_pet jsonb, p_stats jsonb, p_starter_names text[]) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_record public.eggs%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_input public.pets%ROWTYPE;
BEGIN
  -- A durable per-player lock serializes simultaneous first requests.
  SELECT * INTO v_profile FROM public.profiles
    WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile not found'; END IF;

  SELECT * INTO v_record FROM public.eggs
    WHERE user_id = p_user_id AND is_original_starter;
  IF FOUND THEN
    SELECT * INTO v_pet FROM public.pets
      WHERE id = v_record.pet_id AND user_id = p_user_id;
    RETURN jsonb_build_object('existing', true, 'pet', to_jsonb(v_pet),
      'resolved_line', v_record.starter_element);
  END IF;

  -- Existing pets are returned for compatibility, never used to invent history.
  SELECT * INTO v_pet FROM public.pets
    WHERE user_id = p_user_id AND name = ANY(p_starter_names)
    ORDER BY created_at, id LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('existing', true, 'pet', to_jsonb(v_pet),
      'resolved_line', v_pet.line);
  END IF;
  IF v_profile.intro_seen OR v_profile.intro_cutscene_completed
    OR EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.eggs WHERE user_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.user_kith_discoveries WHERE user_id = p_user_id)
  THEN
    RAISE EXCEPTION 'Original starter history unavailable; cannot create a replacement';
  END IF;

  v_input := jsonb_populate_record(NULL::public.pets, p_pet);
  IF v_input.user_id IS DISTINCT FROM p_user_id
    OR v_input.name IS DISTINCT FROM 'Prismatic Egg'
    OR v_input.stage IS DISTINCT FROM 'egg'::public.pet_stage
    OR v_input.species IS NULL OR v_input.line IS NULL
    OR v_input.hatch_ends_at IS NULL
  THEN RAISE EXCEPTION 'Invalid original starter payload'; END IF;

  INSERT INTO public.pets (
    user_id, name, species, rarity, line, stage, energy, hatch_ends_at,
    is_active, location, personality_key, passive_trait_id, passive_trait_key,
    hatch_time_alignment, growth_strong_stats, growth_weak_stat, mutation_capacity
  ) VALUES (
    p_user_id, 'Prismatic Egg', v_input.species, 'epic', v_input.line, 'egg',
    100, v_input.hatch_ends_at, false, 'hatchery', v_input.personality_key,
    v_input.passive_trait_id, v_input.passive_trait_key,
    v_input.hatch_time_alignment, v_input.growth_strong_stats,
    v_input.growth_weak_stat, 1
  ) RETURNING * INTO v_pet;

  INSERT INTO public.pet_stats
    (pet_id, base_hp, base_atk, base_magi, base_def, base_spd, base_mana, base_total)
  VALUES (v_pet.id, (p_stats->>'hp')::integer, (p_stats->>'atk')::integer,
    (p_stats->>'magi')::integer, (p_stats->>'def')::integer,
    (p_stats->>'spd')::integer, (p_stats->>'mana')::integer,
    (p_stats->>'base_total')::integer);

  INSERT INTO public.eggs
    (user_id, starter_element, hatch_ready_at, pet_id, is_original_starter)
  VALUES (p_user_id, v_pet.line, v_pet.hatch_ends_at, v_pet.id, true);

  RETURN jsonb_build_object('existing', false, 'pet', to_jsonb(v_pet),
    'resolved_line', v_pet.line);
END;
$$;


ALTER FUNCTION public.ensure_original_starter(p_user_id uuid, p_pet jsonb, p_stats jsonb, p_starter_names text[]) OWNER TO postgres;

--
-- Name: equip_owned_relic(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.equip_owned_relic(p_user_id uuid, p_pet_id uuid, p_slug text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_item uuid; v_owned integer; v_reserved integer;
BEGIN
  PERFORM 1 FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM 1 FROM public.pets WHERE id=p_pet_id AND user_id=p_user_id AND stage<>'egg' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not own that Kith.'; END IF;
  IF p_slug IS NULL THEN
    DELETE FROM public.pet_relic_equipment WHERE pet_id=p_pet_id AND user_id=p_user_id;
    RETURN jsonb_build_object('ok',true);
  END IF;
  -- Slug is allowlisted against basic_relics.json by the authenticated backend.
  SELECT id INTO v_item FROM public.item_defs WHERE slug=p_slug AND type='equipment';
  IF NOT FOUND THEN RAISE EXCEPTION 'No unequipped copy of that relic is available.'; END IF;
  SELECT qty INTO v_owned FROM public.inventory WHERE user_id=p_user_id AND item_id=v_item FOR UPDATE;
  SELECT count(*) INTO v_reserved FROM public.pet_relic_equipment WHERE user_id=p_user_id AND item_id=v_item AND pet_id<>p_pet_id;
  IF coalesce(v_owned,0)<=v_reserved THEN RAISE EXCEPTION 'No unequipped copy of that relic is available.'; END IF;
  INSERT INTO public.pet_relic_equipment(pet_id,user_id,item_id) VALUES(p_pet_id,p_user_id,v_item)
    ON CONFLICT(pet_id) DO UPDATE SET item_id=EXCLUDED.item_id;
  RETURN jsonb_build_object('ok',true);
END;
$$;


ALTER FUNCTION public.equip_owned_relic(p_user_id uuid, p_pet_id uuid, p_slug text) OWNER TO postgres;

--
-- Name: extract_eastern_date(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.extract_eastern_date(ts timestamp with time zone) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
BEGIN
  RETURN (ts AT TIME ZONE 'America/New_York')::DATE;
END;
$$;


ALTER FUNCTION public.extract_eastern_date(ts timestamp with time zone) OWNER TO postgres;

--
-- Name: generate_aliune_signal_report(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_aliune_signal_report(p_start timestamp with time zone) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  chosen_condition text;
  chosen_signal record;
  roll numeric;
begin
  roll := random();

  if roll < 0.55 then
    chosen_condition := 'stable';
  elsif roll < 0.85 then
    chosen_condition := 'unbalanced';
  else
    chosen_condition := 'unstable';
  end if;

  select
    condition,
    region,
    corruption,
    report_text,
    portal_event,
    irregular_eggs,
    corrupted_egg_bonus
  into chosen_signal
  from public.aliune_signals
  where enabled = true
    and condition = chosen_condition
  order by random()
  limit 1;

  if chosen_signal is null then
    return;
  end if;

  insert into public.aliune_signal_reports (
    enabled,
    condition,
    region,
    corruption,
    report_text,
    starts_at,
    ends_at
  )
  values (
    true,
    chosen_signal.condition,
    chosen_signal.region,
    chosen_signal.corruption,
    chosen_signal.report_text,
    p_start,
    p_start + interval '1 hour'
  );
end;
$$;


ALTER FUNCTION public.generate_aliune_signal_report(p_start timestamp with time zone) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: pve_active_buffs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pve_active_buffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    buff_type text NOT NULL,
    strength numeric DEFAULT 1.0 NOT NULL,
    description text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pve_active_buffs_buff_type_check CHECK ((buff_type = ANY (ARRAY['bonus_xp'::text, 'reduced_decay'::text, 'hatch_speed'::text, 'drop_rate'::text]))),
    CONSTRAINT pve_active_buffs_strength_check CHECK ((strength >= (0)::numeric))
);


ALTER TABLE public.pve_active_buffs OWNER TO postgres;

--
-- Name: get_active_buffs(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_active_buffs(p_user_id uuid DEFAULT NULL::uuid) RETURNS SETOF public.pve_active_buffs
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select *
  from public.pve_active_buffs
  where user_id = v_user_id
    and expires_at > now()
  order by expires_at desc;
end;
$$;


ALTER FUNCTION public.get_active_buffs(p_user_id uuid) OWNER TO postgres;

--
-- Name: pve_instabilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pve_instabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region text DEFAULT 'Kithna'::text NOT NULL,
    condition text NOT NULL,
    corruption_level text NOT NULL,
    description text NOT NULL,
    total_fights integer DEFAULT 3 NOT NULL,
    has_boss boolean DEFAULT false NOT NULL,
    reward_xp integer DEFAULT 100 NOT NULL,
    reward_materials jsonb DEFAULT '[]'::jsonb NOT NULL,
    reward_buffs jsonb DEFAULT '[]'::jsonb NOT NULL,
    spawned_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pve_instabilities_condition_check CHECK ((condition = ANY (ARRAY['minor'::text, 'major'::text, 'critical'::text]))),
    CONSTRAINT pve_instabilities_corruption_level_check CHECK ((corruption_level = ANY (ARRAY['low'::text, 'rising'::text, 'high'::text]))),
    CONSTRAINT pve_instabilities_reward_xp_check CHECK ((reward_xp >= 0)),
    CONSTRAINT pve_instabilities_total_fights_check CHECK (((total_fights >= 1) AND (total_fights <= 5)))
);


ALTER TABLE public.pve_instabilities OWNER TO postgres;

--
-- Name: get_active_instabilities(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_active_instabilities(p_region text DEFAULT 'Kithna'::text) RETURNS SETOF public.pve_instabilities
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select *
  from public.pve_instabilities
  where enabled = true
    and expires_at > now()
    and region = p_region
  order by spawned_at desc
  limit 10;
$$;


ALTER FUNCTION public.get_active_instabilities(p_region text) OWNER TO postgres;

--
-- Name: get_assanti_food_shop(uuid, integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.get_assanti_food_shop(p_user_id uuid, p_delta_day integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_day public.assanti_food_days%ROWTYPE;
  v_catalog jsonb;
  v_last timestamptz;
  v_unlocked boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Player wallet missing.';
  END IF;
  PERFORM public.ensure_assanti_food_day(p_delta_day);
  SELECT * INTO STRICT v_day FROM public.assanti_food_days WHERE delta_day = p_delta_day;
  SELECT jsonb_agg(jsonb_build_object(
    'slug', c.slug, 'name', d.name, 'description', d.description,
    'price', c.price, 'hunger', c.hunger, 'stackLimit', d.stack_limit,
    'permanent', c.permanent, 'available', c.slug = ANY(v_day.slugs)
  ) ORDER BY c.permanent DESC, d.name) INTO v_catalog
  FROM public.assanti_food_catalog c JOIN public.item_defs d ON d.slug = c.slug;
  SELECT last_claimed_at INTO v_last FROM public.assanti_food_claims WHERE user_id = p_user_id;
  SELECT EXISTS (SELECT 1 FROM public.player_quests WHERE user_id = p_user_id
    AND quest_key = 'assanti_food_trouble' AND status = 'completed') INTO v_unlocked;
  RETURN jsonb_build_object('deltaDay', p_delta_day, 'merchantDots', v_day.dots,
    'catalog', v_catalog, 'dailyFood', jsonb_build_object(
      'status', CASE WHEN NOT v_unlocked THEN 'locked'
        WHEN v_last > now() - interval '24 hours' THEN 'claimed' ELSE 'available' END,
      'nextClaimAt', CASE WHEN v_last IS NOT NULL THEN v_last + interval '24 hours' ELSE NULL END));
END;
$$;


ALTER FUNCTION public.get_assanti_food_shop(p_user_id uuid, p_delta_day integer) OWNER TO postgres;

--
-- Name: get_email_by_username(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_email_by_username(p_username text) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select au.email
  from public.profiles p
  join auth.users au
    on au.id = p.user_id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;


ALTER FUNCTION public.get_email_by_username(p_username text) OWNER TO postgres;

--
-- Name: get_kennith_stock(integer, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.get_kennith_stock(p_delta_day integer, p_seed jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_result jsonb;
BEGIN
  -- Same six-hour cycle and 05:00 offset as getKennithDay; use real clock after locks.
  IF p_delta_day IS DISTINCT FROM floor((extract(epoch FROM clock_timestamp()) + 4500) / 21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  PERFORM public.get_kennith_wallet(p_delta_day);
  PERFORM 1 FROM public.kennith_wallet_days WHERE delta_day=p_delta_day FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.kennith_stock_days WHERE delta_day=p_delta_day) THEN
    IF jsonb_typeof(p_seed) IS DISTINCT FROM 'array' OR jsonb_array_length(p_seed) <> 20 THEN
      RAISE EXCEPTION 'Invalid stock seed.';
    END IF;
    IF (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_seed) x) <> 20
      OR EXISTS (SELECT 1 FROM jsonb_to_recordset(p_seed) AS x(slug text,category text,price integer,stock integer)
        WHERE slug IS NULL OR category IS NULL OR price IS NULL OR stock IS NULL
          OR category NOT IN ('clothing','accessories','relics','petCare')
          OR stock NOT BETWEEN CASE category WHEN 'clothing' THEN 5 WHEN 'accessories' THEN 3 WHEN 'relics' THEN 2 ELSE 8 END
            AND CASE category WHEN 'clothing' THEN 12 WHEN 'accessories' THEN 8 WHEN 'relics' THEN 6 ELSE 20 END)
      OR (SELECT count(*) FROM (SELECT x->>'category' FROM jsonb_array_elements(p_seed) x
        GROUP BY x->>'category' HAVING count(*)=5) categories) <> 4 THEN
      RAISE EXCEPTION 'Invalid stock seed.';
    END IF;
    INSERT INTO public.kennith_stock_days VALUES(p_delta_day);
    INSERT INTO public.kennith_stock(delta_day,slug,category,price,quantity)
      SELECT p_delta_day,slug,category,price,stock
      FROM jsonb_to_recordset(p_seed) AS x(slug text,category text,price integer,stock integer);
  END IF;
  -- An initialized day is never reseeded, even when stock reaches zero.
  SELECT jsonb_agg(jsonb_build_object('slug',slug,'category',category,'price',price,'stock',quantity) ORDER BY category,slug)
    INTO v_result FROM public.kennith_stock WHERE delta_day=p_delta_day;
  IF p_delta_day <> floor((extract(epoch FROM clock_timestamp()) + 4500) / 21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  RETURN v_result;
END;
$$;


ALTER FUNCTION public.get_kennith_stock(p_delta_day integer, p_seed jsonb) OWNER TO postgres;

--
-- Name: get_kennith_wallet(integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.get_kennith_wallet(p_delta_day integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_start integer; v_dots integer;
BEGIN
  IF p_delta_day IS NULL OR p_delta_day < 0 THEN
    RAISE EXCEPTION 'Invalid Aliune day.' USING ERRCODE='22023';
  END IF;
  v_start := 1000 + floor(random() * 1001)::integer;
  INSERT INTO public.kennith_wallet_days(delta_day,starting_dots,dots)
    VALUES(p_delta_day,v_start,v_start) ON CONFLICT(delta_day) DO NOTHING;
  SELECT dots INTO STRICT v_dots FROM public.kennith_wallet_days WHERE delta_day=p_delta_day;
  RETURN jsonb_build_object('deltaDay',p_delta_day,'merchantDots',v_dots);
END;
$$;


ALTER FUNCTION public.get_kennith_wallet(p_delta_day integer) OWNER TO postgres;

--
-- Name: get_or_create_kithna_tutorial_signal(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_or_create_kithna_tutorial_signal() RETURNS TABLE(id uuid, enabled boolean, condition text, region text, town text, corruption text, report_text text, report_age_days integer, start_time time without time zone, end_time time without time zone, starts_at timestamp with time zone, ends_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.get_or_create_kithna_tutorial_signal() OWNER TO postgres;

--
-- Name: get_player_equipment(uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.get_player_equipment(p_user_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT jsonb_build_object(
    'wardrobe',coalesce((SELECT jsonb_agg(x.value) FROM public.profiles p,
      jsonb_each_text(coalesce(p.avatar_customization,'{}'::jsonb)) x
      WHERE p.user_id=p_user_id AND x.key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear')
        AND x.value IS NOT NULL AND x.value<>''),'[]'::jsonb),
    'relics',coalesce((SELECT jsonb_agg(jsonb_build_object('petId',e.pet_id,'slug',d.slug))
      FROM public.pet_relic_equipment e JOIN public.item_defs d ON d.id=e.item_id
      WHERE e.user_id=p_user_id),'[]'::jsonb));
$$;


ALTER FUNCTION public.get_player_equipment(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_poe_tay_toe_status(uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.get_poe_tay_toe_status(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE s public.poe_tay_toe_state%ROWTYPE; f public.poe_tay_toe_finds%ROWTYPE;
 v_last timestamptz; v_count bigint;
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO STRICT s FROM public.poe_tay_toe_state WHERE id = 1;
 SELECT max(found_at), count(*) INTO v_last, v_count FROM public.poe_tay_toe_finds WHERE user_id = p_user_id;
 SELECT * INTO f FROM public.poe_tay_toe_finds WHERE id = s.last_discovery_id
 AND user_id = p_user_id AND relocated_at IS NULL;
 RETURN jsonb_build_object('locationKey',s.current_location_key,'version',s.location_version,
 'available',true,'canFind',v_last IS NULL OR v_last + interval '2 hours' <= now(),
 'cooldownEndsAt',CASE WHEN v_last + interval '2 hours' > now() THEN v_last + interval '2 hours' END,
 'findCount',v_count,'awaitingHide',f.id IS NOT NULL,'discoveryId',f.id,
 'effect',CASE WHEN f.id IS NOT NULL THEN jsonb_build_object('key',f.effect_key,'dots',f.dots_awarded,'expiresAt',f.effect_expires_at) END);
END;
$$;


ALTER FUNCTION public.get_poe_tay_toe_status(p_user_id uuid) OWNER TO postgres;

--
-- Name: grant_rescue_egg(uuid, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.grant_rescue_egg(p_user_id uuid, p_egg jsonb, p_base_stats jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_input public.pets%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_slot public.hatchery_slots%ROWTYPE;
BEGIN
  -- Same lock order as hatch completion and storage actions.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile not found.'; END IF;
  PERFORM id FROM public.pets WHERE user_id = p_user_id ORDER BY id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id
    AND NOT coalesce(ran_away, false) AND stage::text = 'egg' AND is_rescue_reroll IS TRUE) THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409,
      'error', 'You already have a rescue egg waiting to hatch.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id
    AND NOT coalesce(ran_away, false) AND stage::text IS DISTINCT FROM 'egg') THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400,
      'error', 'You still have a Delta. The rescue egg is only for when every Delta has run away.');
  END IF;

  SELECT * INTO v_slot FROM public.hatchery_slots
    WHERE user_id = p_user_id AND unlocked IS TRUE AND pet_id IS NULL
    ORDER BY slot_index LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400,
      'error', 'No open hatchery slot is available for a rescue egg.');
  END IF;

  IF jsonb_typeof(p_egg) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_base_stats) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Missing rescue generation data.';
  END IF;
  SELECT * INTO v_input FROM jsonb_populate_record(NULL::public.pets, p_egg);
  -- Only generated identity/traits are accepted; ownership and placement are fixed here.
  INSERT INTO public.pets (
    user_id, name, species, line, stage, energy, hatch_ends_at, is_active, location,
    passive_trait_id, passive_trait_key, hatch_time_alignment,
    growth_strong_stats, growth_weak_stat, mutation_capacity, is_rescue_reroll
  ) VALUES (
    p_user_id, v_input.name, v_input.species, v_input.line, 'egg', 100,
    v_input.hatch_ends_at, false, 'hatchery', v_input.passive_trait_id,
    v_input.passive_trait_key, v_input.hatch_time_alignment,
    v_input.growth_strong_stats, v_input.growth_weak_stat, 1, true
  ) RETURNING * INTO v_pet;
  IF v_pet.species IS DISTINCT FROM v_input.species
    OR v_pet.line IS DISTINCT FROM v_input.line THEN
    RAISE EXCEPTION 'Rescue egg identity was not stored correctly.';
  END IF;

  INSERT INTO public.pet_stats
    (pet_id, base_hp, base_atk, base_def, base_spd, base_magi, base_mana, base_total)
  VALUES (v_pet.id, (p_base_stats->>'hp')::integer, (p_base_stats->>'atk')::integer,
    (p_base_stats->>'def')::integer, (p_base_stats->>'spd')::integer,
    (p_base_stats->>'magi')::integer, (p_base_stats->>'mana')::integer,
    (p_base_stats->>'base_total')::integer)
  ON CONFLICT (pet_id) DO UPDATE SET
    base_hp = EXCLUDED.base_hp, base_atk = EXCLUDED.base_atk,
    base_def = EXCLUDED.base_def, base_spd = EXCLUDED.base_spd,
    base_magi = EXCLUDED.base_magi, base_mana = EXCLUDED.base_mana,
    base_total = EXCLUDED.base_total;

  UPDATE public.hatchery_slots SET pet_id = v_pet.id
    WHERE id = v_slot.id AND user_id = p_user_id AND unlocked IS TRUE AND pet_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hatchery slot is no longer available.'; END IF;
  UPDATE public.pets SET runaway_at = NULL WHERE user_id = p_user_id AND ran_away IS TRUE;

  RETURN jsonb_build_object('success', true, 'pet', to_jsonb(v_pet), 'slot_index', v_slot.slot_index);
END;
$$;


ALTER FUNCTION public.grant_rescue_egg(p_user_id uuid, p_egg jsonb, p_base_stats jsonb) OWNER TO postgres;

--
-- Name: guard_equipped_inventory(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.guard_equipped_inventory() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_reserved integer; v_slug text;
BEGIN
  -- Preserve FK-triggered deletion cascades without reading restricted auth tables.
  -- Ordinary direct inventory deletes still enforce equipped-copy protection.
  IF TG_OP='DELETE' AND pg_trigger_depth()>1 THEN RETURN OLD; END IF;
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR NEW.item_id<>OLD.item_id) THEN
    RAISE EXCEPTION 'Inventory ownership keys cannot be changed.';
  END IF;
  SELECT slug INTO v_slug FROM public.item_defs WHERE id=OLD.item_id;
  SELECT count(*) INTO v_reserved FROM public.profiles p,
    jsonb_each_text(coalesce(p.avatar_customization,'{}'::jsonb)) x
    WHERE p.user_id=OLD.user_id AND x.key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear') AND x.value=v_slug;
  v_reserved := v_reserved + (SELECT count(*) FROM public.pet_relic_equipment WHERE user_id=OLD.user_id AND item_id=OLD.item_id);
  IF (TG_OP='DELETE' AND v_reserved>0) OR (TG_OP='UPDATE' AND NEW.qty<v_reserved) THEN
    RAISE EXCEPTION 'Unequip this item before using or selling its last available copy.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.guard_equipped_inventory() OWNER TO postgres;

--
-- Name: guard_server_care(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.guard_server_care() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Pet creation requires the backend.' USING ERRCODE = '42501';
    END IF;
    IF ROW(NEW.hunger, NEW.clean, NEW.happy, NEW.comfort, NEW.rest, NEW.energy,
           NEW.bond, NEW.neglect_hours, NEW.ran_away, NEW.runaway_at,
           NEW.last_care_decay_at, NEW.cd_feed_ends_at, NEW.cd_clean_ends_at,
           NEW.cd_play_ends_at, NEW.cd_bond_ends_at)
       IS DISTINCT FROM
       ROW(OLD.hunger, OLD.clean, OLD.happy, OLD.comfort, OLD.rest, OLD.energy,
           OLD.bond, OLD.neglect_hours, OLD.ran_away, OLD.runaway_at,
           OLD.last_care_decay_at, OLD.cd_feed_ends_at, OLD.cd_clean_ends_at,
           OLD.cd_play_ends_at, OLD.cd_bond_ends_at) THEN
      RAISE EXCEPTION 'Care updates require the backend.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.guard_server_care() OWNER TO postgres;

--
-- Name: handle_new_user_profile(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
declare
  desired_username text;
  safe_username text;
begin
  desired_username := nullif(new.raw_user_meta_data ->> 'username', '');

  if desired_username is not null and exists (
    select 1 from public.profiles where username = desired_username
  ) then
    safe_username := desired_username || '_' || left(replace(new.id::text, '-', ''), 6);
  else
    safe_username := desired_username;
  end if;

  insert into public.profiles (
    user_id,
    username,
    display_name,
    email
  )
  values (
    new.id,
    safe_username,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      safe_username,
      ''
    ),
    new.email
  )
  on conflict (user_id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
    email = excluded.email,
    updated_at = now();

  insert into public.wallets (user_id, dots, crystals)
  values (new.id, 5000, 0)
  on conflict (user_id) do nothing;

  insert into public.user_resources (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.daily_care (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.daily_login_rewards (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user_profile() OWNER TO postgres;

--
-- Name: pets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text,
    line public.elemental_line NOT NULL,
    stage public.pet_stage DEFAULT 'egg'::public.pet_stage NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    hatched_at timestamp with time zone,
    hunger integer DEFAULT 50 NOT NULL,
    energy integer DEFAULT 100 NOT NULL,
    atk integer DEFAULT 5 NOT NULL,
    def integer DEFAULT 5 NOT NULL,
    spd integer DEFAULT 5 NOT NULL,
    hp_max integer DEFAULT 30 NOT NULL,
    hp_cur integer DEFAULT 30 NOT NULL,
    age public.age_stage DEFAULT 'Baby_sprout'::public.age_stage NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gender public.pet_gender DEFAULT 'null_gender'::public.pet_gender NOT NULL,
    bond integer DEFAULT 0 NOT NULL,
    last_cared_at timestamp with time zone,
    hatch_ends_at timestamp with time zone,
    cd_feed_ends_at timestamp with time zone,
    cd_clean_ends_at timestamp with time zone,
    cd_play_ends_at timestamp with time zone,
    unspent_points integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    last_hunger_decay_at timestamp with time zone DEFAULT now() NOT NULL,
    magi integer DEFAULT 0 NOT NULL,
    personality_id uuid,
    personality_key text,
    mana integer DEFAULT 0 NOT NULL,
    nickname text,
    location text DEFAULT 'storage'::text NOT NULL,
    hatchery_slot_index integer,
    species text,
    description text,
    growth_strong_stats text[],
    growth_weak_stat text,
    hatch_time_alignment text,
    clean integer DEFAULT 50 NOT NULL,
    happy integer DEFAULT 50 NOT NULL,
    comfort integer DEFAULT 50 NOT NULL,
    rest integer DEFAULT 50 NOT NULL,
    neglect_hours integer DEFAULT 0 NOT NULL,
    ran_away boolean DEFAULT false NOT NULL,
    runaway_at timestamp with time zone,
    last_care_decay_at timestamp with time zone,
    last_fed_at timestamp with time zone DEFAULT now() NOT NULL,
    cd_bond_ends_at timestamp with time zone,
    passive_trait_id uuid,
    passive_trait_key text,
    mutation_capacity smallint DEFAULT 4 NOT NULL,
    cd_pet_ends_at timestamp with time zone,
    pending_hatch_minutes integer,
    rarity text,
    is_rescue_reroll boolean DEFAULT false NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    CONSTRAINT pets_clean_check CHECK (((clean >= 0) AND (clean <= 50))),
    CONSTRAINT pets_comfort_check CHECK (((comfort >= 0) AND (comfort <= 50))),
    CONSTRAINT pets_energy_check CHECK (((energy >= 0) AND (energy <= 100))),
    CONSTRAINT pets_happy_check CHECK (((happy >= 0) AND (happy <= 50))),
    CONSTRAINT pets_hatchery_slot_index_check CHECK (((hatchery_slot_index IS NULL) OR ((hatchery_slot_index >= 1) AND (hatchery_slot_index <= 10)))),
    CONSTRAINT pets_hunger_check CHECK (((hunger >= 0) AND (hunger <= 50))),
    CONSTRAINT pets_level_check CHECK (((level >= 0) AND (level <= 30))),
    CONSTRAINT pets_location_valid_check CHECK ((location = ANY (ARRAY['hatchery'::text, 'active'::text, 'storage'::text, 'inventory'::text, 'party'::text]))),
    CONSTRAINT pets_mutation_capacity_check CHECK (((mutation_capacity >= 1) AND (mutation_capacity <= 4))),
    CONSTRAINT pets_neglect_hours_check CHECK ((neglect_hours >= 0)),
    CONSTRAINT pets_nickname_len_check CHECK (((nickname IS NULL) OR (char_length(nickname) <= 24))),
    CONSTRAINT pets_rarity_check CHECK (((rarity IS NULL) OR (rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text])))),
    CONSTRAINT pets_rest_check CHECK (((rest >= 0) AND (rest <= 50))),
    CONSTRAINT pets_unspent_points_nonneg CHECK ((unspent_points >= 0))
);


ALTER TABLE public.pets OWNER TO postgres;

--
-- Name: TABLE pets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pets IS 'CORE: Main Kith table. Active. Do not drop.';


--
-- Name: COLUMN pets.energy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.energy IS 'Energy stat defaults to 50 and is capped at 50 to match care stat balance';


--
-- Name: COLUMN pets.growth_strong_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.growth_strong_stats IS 'Stat strengths rolled from the egg preview and locked in at hatch.';


--
-- Name: COLUMN pets.growth_weak_stat; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.growth_weak_stat IS 'Stat weakness rolled from the egg preview and locked in at hatch.';


--
-- Name: COLUMN pets.clean; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.clean IS 'Pet cleanliness stat (0-100). Decays over time if not cared for.';


--
-- Name: COLUMN pets.happy; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.happy IS 'Pet happiness stat (0-100). Increases with play interactions.';


--
-- Name: COLUMN pets.neglect_hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.neglect_hours IS 'Hours the pet has been neglected. Increments when care stats are critically low.';


--
-- Name: COLUMN pets.ran_away; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.ran_away IS 'Whether the pet has run away due to neglect. Can be recovered through special actions.';


--
-- Name: COLUMN pets.pending_hatch_minutes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.pending_hatch_minutes IS 'Rolled incubation length in minutes for an egg sitting in inventory or storage, not yet started. Cleared once hatch_ends_at is set.';


--
-- Name: COLUMN pets.rarity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pets.rarity IS 'Species rarity: common, uncommon, rare, or epic. Starter species are always epic.';


--
-- Name: CONSTRAINT pets_clean_check ON pets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT pets_clean_check ON public.pets IS 'Care stats cap at 50 to allow balanced decay and future expansion';


--
-- Name: CONSTRAINT pets_happy_check ON pets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT pets_happy_check ON public.pets IS 'Care stats cap at 50 to allow balanced decay and future expansion';


--
-- Name: CONSTRAINT pets_hunger_check ON pets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT pets_hunger_check ON public.pets IS 'Care stats cap at 50 to allow balanced decay and future expansion';


--
-- Name: hatch_pet(uuid, uuid, integer, integer, integer, integer, integer, integer, text, uuid, text, text, text, text[], text, text, public.elemental_line); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line) RETURNS TABLE(pet_row public.pets, success boolean, error_message text)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'Hatch endpoint upgrade required; use the atomic hatch context signature';
END;
$$;


ALTER FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line) OWNER TO postgres;

--
-- Name: hatch_pet(uuid, uuid, integer, integer, integer, integer, integer, integer, text, uuid, text, text, text, text[], text, text, public.elemental_line, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line, p_hatch_context jsonb) RETURNS TABLE(pet_row public.pets, success boolean, error_message text, party_slot_assigned integer, trainer_level integer, active_gameplay_locked boolean)
    LANGUAGE plpgsql
    SET search_path TO ''
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
  v_now timestamptz;
  v_egg public.pets%ROWTYPE;
  v_base jsonb;
  v_delta_id uuid;
  v_slot integer;
  v_has_active boolean;
  v_required_level integer;
BEGIN
  -- Coordinate with storage actions and starter creation. Never write before
  -- ownership, readiness and the one-way egg transition are checked under lock.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile not found'; END IF;
  SELECT * INTO v_egg FROM public.pets
    WHERE id = p_egg_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_egg.stage <> 'egg' THEN
    RETURN QUERY SELECT NULL::public.pets, false, 'Egg not found or already hatched'::text,
      NULL::integer, 1, false;
    RETURN;
  END IF;
  -- Storage actions use the same profile lock, serializing placement changes.
  PERFORM id FROM public.hatchery_slots
    WHERE user_id = p_user_id AND pet_id = p_egg_id AND unlocked IS TRUE
    FOR UPDATE;
  IF NOT FOUND OR v_egg.location::text IS DISTINCT FROM 'hatchery' THEN
    RETURN QUERY SELECT NULL::public.pets, false,
      'Egg must occupy an unlocked Hatchery slot.'::text,
      NULL::integer, 1, false;
    RETURN;
  END IF;
  v_now := clock_timestamp();
  IF v_egg.hatch_ends_at IS NULL OR v_egg.hatch_ends_at > v_now THEN
    RETURN QUERY SELECT NULL::public.pets, false, 'Egg is not ready to hatch'::text,
      NULL::integer, 1, false;
    RETURN;
  END IF;
  v_base := p_hatch_context->'base_stats';
  IF jsonb_typeof(v_base) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Missing hatch base stats';
  END IF;
  v_base_hp := (v_base->>'hp')::integer;
  v_base_atk := (v_base->>'atk')::integer;
  v_base_def := (v_base->>'def')::integer;
  v_base_spd := (v_base->>'spd')::integer;
  v_base_magi := (v_base->>'magi')::integer;
  v_base_mana := (v_base->>'mana')::integer;
  INSERT INTO public.pet_stats
    (pet_id, base_hp, base_atk, base_def, base_spd, base_magi, base_mana, base_total)
  VALUES (p_egg_id, v_base_hp, v_base_atk, v_base_def, v_base_spd,
    v_base_magi, v_base_mana, (v_base->>'base_total')::integer)
  ON CONFLICT (pet_id) DO UPDATE SET
    base_hp = EXCLUDED.base_hp, base_atk = EXCLUDED.base_atk,
    base_def = EXCLUDED.base_def, base_spd = EXCLUDED.base_spd,
    base_magi = EXCLUDED.base_magi, base_mana = EXCLUDED.base_mana,
    base_total = EXCLUDED.base_total;
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
    passive_trait_id = CASE WHEN v_egg.passive_trait_id IS NULL AND v_egg.passive_trait_key IS NULL
      THEN NULLIF(p_hatch_context->>'passive_trait_id', '')::uuid ELSE v_egg.passive_trait_id END,
    passive_trait_key = CASE WHEN v_egg.passive_trait_id IS NULL AND v_egg.passive_trait_key IS NULL
      THEN NULLIF(p_hatch_context->>'passive_trait_key', '') ELSE v_egg.passive_trait_key END,
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
    RAISE EXCEPTION 'Locked egg changed unexpectedly';
  END IF;

  INSERT INTO public.pet_elements (
    pet_id,
    null_element,
    water,
    fire,
    earth,
    air,
    ice,
    storm,
    light,
    shadow
  )
  VALUES (
    p_egg_id,
    0,
    CASE WHEN p_line::text = 'water' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'fire' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'earth' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'air' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'ice' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'storm' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'light' THEN 1 ELSE 0 END,
    CASE WHEN p_line::text = 'shadow' THEN 1 ELSE 0 END
  )
  ON CONFLICT (pet_id) DO UPDATE SET
    water = GREATEST(public.pet_elements.water, EXCLUDED.water),
    fire = GREATEST(public.pet_elements.fire, EXCLUDED.fire),
    earth = GREATEST(public.pet_elements.earth, EXCLUDED.earth),
    air = GREATEST(public.pet_elements.air, EXCLUDED.air),
    ice = GREATEST(public.pet_elements.ice, EXCLUDED.ice),
    storm = GREATEST(public.pet_elements.storm, EXCLUDED.storm),
    light = GREATEST(public.pet_elements.light, EXCLUDED.light),
    shadow = GREATEST(public.pet_elements.shadow, EXCLUDED.shadow);

  -- Existing hatch reward: exactly one native elemental Delta, no balance change.
  IF p_line::text IN ('water', 'fire', 'earth', 'air', 'ice', 'storm', 'light', 'shadow') THEN
    SELECT id INTO v_delta_id FROM public.item_defs WHERE slug = p_line::text || '-delta';
    IF NOT FOUND THEN RAISE EXCEPTION 'Hatch Delta item definition missing'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
      VALUES (p_user_id, v_delta_id, 1)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + 1, updated_at = v_now;
  END IF;
  UPDATE public.hatchery_slots SET pet_id = NULL
    WHERE user_id = p_user_id AND pet_id = p_egg_id;

  trainer_level := 1;
  v_required_level := NULLIF(p_hatch_context->>'required_trainer_level', '')::integer;
  -- Retain the database's existing legendary activation floor as well.
  IF v_egg.species = 'velune' THEN v_required_level := greatest(coalesce(v_required_level, 10), 10); END IF;
  IF v_required_level IS NOT NULL THEN
    SELECT coalesce(tp.trainer_level, 1) INTO trainer_level
      FROM public.trainer_progression tp WHERE user_id = p_user_id;
    trainer_level := coalesce(trainer_level, 1);
  END IF;
  active_gameplay_locked := v_required_level IS NOT NULL AND trainer_level < v_required_level;
  party_slot_assigned := NULL;
  IF NOT active_gameplay_locked THEN
    SELECT ps.slot_index INTO v_slot FROM public.party_slots ps
      WHERE ps.user_id = p_user_id AND ps.pet_id = p_egg_id LIMIT 1;
    IF NOT FOUND THEN
      SELECT available.slot_index INTO v_slot FROM generate_series(1, 4) AS available(slot_index)
      WHERE NOT EXISTS (SELECT 1 FROM public.party_slots ps
        WHERE ps.user_id = p_user_id AND ps.slot_index = available.slot_index)
      ORDER BY available.slot_index LIMIT 1;
      IF v_slot IS NOT NULL THEN
        INSERT INTO public.party_slots (user_id, pet_id, slot_index)
          VALUES (p_user_id, p_egg_id, v_slot);
      END IF;
    END IF;
    IF v_slot IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM public.pets
        WHERE user_id = p_user_id AND is_active AND id <> p_egg_id) INTO v_has_active;
      UPDATE public.pets SET location = 'active', is_active = NOT v_has_active
        WHERE id = p_egg_id AND user_id = p_user_id RETURNING * INTO pet_row;
      party_slot_assigned := v_slot;
    END IF;
  END IF;
  RETURN QUERY SELECT pet_row, true, NULL::text, party_slot_assigned, trainer_level, active_gameplay_locked;
END;

$$;


ALTER FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line, p_hatch_context jsonb) OWNER TO postgres;

--
-- Name: hide_poe_tay_toe(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.hide_poe_tay_toe(p_user_id uuid, p_location_key text) RETURNS boolean
    LANGUAGE sql
    SET search_path TO ''
    AS $$ SELECT false; $$;


ALTER FUNCTION public.hide_poe_tay_toe(p_user_id uuid, p_location_key text) OWNER TO postgres;

--
-- Name: hide_poe_tay_toe_v2(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.hide_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_discovery_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE s public.poe_tay_toe_state%ROWTYPE;
BEGIN
 IF p_user_id IS NULL OR p_discovery_id IS NULL OR p_location_key IS NULL
 OR NOT p_location_key = ANY(public.potato_locations()) THEN RETURN false; END IF;
 SELECT * INTO STRICT s FROM public.poe_tay_toe_state WHERE id = 1 FOR UPDATE;
 IF s.last_discovery_id IS DISTINCT FROM p_discovery_id OR s.current_location_key = p_location_key THEN RETURN false; END IF;
 UPDATE public.poe_tay_toe_finds SET relocated_at = clock_timestamp()
 WHERE id = p_discovery_id AND user_id = p_user_id AND relocated_at IS NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.poe_tay_toe_state SET current_location_key = p_location_key, location_version = gen_random_uuid(),
 last_discovery_id = NULL, hidden_at = clock_timestamp(), hidden_by_user_id = p_user_id,
 updated_at = clock_timestamp() WHERE id = 1;
 RETURN true;
END;
$$;


ALTER FUNCTION public.hide_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_discovery_id uuid) OWNER TO postgres;

--
-- Name: hold_wildwood_egg(uuid, uuid, uuid, jsonb, jsonb, integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.hold_wildwood_egg(p_user_id uuid, p_room_id uuid, p_encounter_id uuid, p_egg jsonb, p_base_stats jsonb, p_xp integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_receipt jsonb;
  v_xp jsonb;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile missing.'; END IF;
  SELECT room.* INTO v_room FROM public.wildwood_rooms room
    JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE room.id = p_room_id AND expedition.user_id = p_user_id AND expedition.status = 'active'
    FOR UPDATE OF room;
  IF NOT FOUND OR v_room.status <> 'resolved'
    OR v_room.event_payload->'battle' IS DISTINCT FROM 'null'::jsonb
    OR v_room.event_payload->>'eggTreasureClosed' = 'true' THEN
    RETURN jsonb_build_object('success', false);
  END IF;
  v_receipt := v_room.event_payload->'eggTreasure';
  IF v_receipt IS NOT NULL THEN
    IF v_receipt->>'encounterId' = p_encounter_id::text AND v_receipt->>'status' = 'pending' THEN
      RETURN jsonb_build_object('success', true, 'held', true, 'encounterId', p_encounter_id,
        'xp_awarded', v_receipt->'xpAwarded');
    END IF;
    RETURN jsonb_build_object('success', false);
  END IF;
  IF p_encounter_id IS NULL OR jsonb_typeof(p_egg) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_base_stats) IS DISTINCT FROM 'object'
    OR p_egg->>'name' IS NULL OR p_egg->>'species' IS NULL OR p_xp IS NULL OR p_xp < 0 THEN
    RAISE EXCEPTION 'Invalid generated egg.';
  END IF;
  -- Same approved find XP, now committed together with the temporary reward.
  v_xp := public.increment_active_pet_xp(p_user_id, p_xp);
  v_receipt := jsonb_build_object('encounterId', p_encounter_id, 'status', 'pending',
    'egg', p_egg, 'baseStats', p_base_stats, 'createdAt', now(),
    'xpAwarded', coalesce((v_xp->>'amount')::integer, 0));
  UPDATE public.wildwood_rooms SET event_payload = jsonb_set(event_payload, '{eggTreasure}', v_receipt)
    WHERE id = p_room_id;
  RETURN jsonb_build_object('success', true, 'held', true, 'encounterId', p_encounter_id,
    'xp_awarded', v_receipt->'xpAwarded');
END;
$$;


ALTER FUNCTION public.hold_wildwood_egg(p_user_id uuid, p_room_id uuid, p_encounter_id uuid, p_egg jsonb, p_base_stats jsonb, p_xp integer) OWNER TO postgres;

--
-- Name: increment_active_pet_xp(uuid, integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.increment_active_pet_xp(p_user_id uuid, p_amount integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Invalid XP amount' USING ERRCODE = '23514';
  END IF;
  IF p_amount = 0 THEN RETURN NULL; END IF;
  BEGIN
    SELECT * INTO STRICT v_pet FROM public.pets
    WHERE user_id = p_user_id AND is_active = true AND ran_away = false
    FOR UPDATE;
  EXCEPTION WHEN NO_DATA_FOUND THEN RETURN NULL;
  END;
  UPDATE public.pets SET xp = xp + p_amount WHERE id = v_pet.id;
  RETURN jsonb_build_object('petId', v_pet.id, 'previousXp', v_pet.xp,
    'xp', v_pet.xp + p_amount, 'amount', p_amount);
END;
$$;


ALTER FUNCTION public.increment_active_pet_xp(p_user_id uuid, p_amount integer) OWNER TO postgres;

--
-- Name: increment_pve_research_stats(uuid, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_pve_research_stats(p_user_id uuid, p_instabilities_cleared integer DEFAULT 0, p_fights_won integer DEFAULT 0, p_bosses_defeated integer DEFAULT 0) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.pve_research_stats (
    user_id,
    total_instabilities_cleared,
    total_fights_won,
    total_bosses_defeated,
    first_clear_at
  )
  values (
    p_user_id,
    p_instabilities_cleared,
    p_fights_won,
    p_bosses_defeated,
    case when p_instabilities_cleared > 0 then now() else null end
  )
  on conflict (user_id) do update set
    total_instabilities_cleared = pve_research_stats.total_instabilities_cleared + p_instabilities_cleared,
    total_fights_won = pve_research_stats.total_fights_won + p_fights_won,
    total_bosses_defeated = pve_research_stats.total_bosses_defeated + p_bosses_defeated,
    first_clear_at = coalesce(pve_research_stats.first_clear_at, case when p_instabilities_cleared > 0 then now() else null end),
    updated_at = now();
end;
$$;


ALTER FUNCTION public.increment_pve_research_stats(p_user_id uuid, p_instabilities_cleared integer, p_fights_won integer, p_bosses_defeated integer) OWNER TO postgres;

--
-- Name: increment_wallet(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_wallet(p_user_id uuid, p_dots integer DEFAULT 0, p_crystals integer DEFAULT 0) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized to increment this wallet';
  end if;

  insert into public.wallets (user_id, dots, crystals)
  values (p_user_id, greatest(p_dots, 0), greatest(p_crystals, 0))
  on conflict (user_id) do update
    set
      dots = public.wallets.dots + greatest(p_dots, 0),
      crystals = public.wallets.crystals + greatest(p_crystals, 0),
      updated_at = now();
end;
$$;


ALTER FUNCTION public.increment_wallet(p_user_id uuid, p_dots integer, p_crystals integer) OWNER TO postgres;

--
-- Name: log_signup_trigger_error(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_signup_trigger_error(p_user_id uuid, p_email text, p_step text, p_error_message text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  insert into public.signup_trigger_errors (user_id, email, step, error_message)
  values (p_user_id, p_email, p_step, p_error_message);
$$;


ALTER FUNCTION public.log_signup_trigger_error(p_user_id uuid, p_email text, p_step text, p_error_message text) OWNER TO postgres;

--
-- Name: perform_owned_care(uuid, uuid, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.perform_owned_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_next public.pets%ROWTYPE;
  v_item_id uuid;
  v_slug text;
  v_category text;
  v_key text;
  v_value jsonb;
  v_cooldown timestamptz;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('feed', 'clean', 'play', 'pet', 'bond')
     OR p_expected IS NULL OR p_patch IS NULL THEN
    RAISE EXCEPTION 'Invalid care action.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_pet.stage = 'egg' THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  IF v_pet.ran_away THEN RAISE EXCEPTION 'CARE_RUNAWAY'; END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_expected) LOOP
    IF v_key IN ('last_care_decay_at', 'runaway_at', 'cd_feed_ends_at',
                 'cd_clean_ends_at', 'cd_play_ends_at', 'cd_bond_ends_at') THEN
      IF ((to_jsonb(v_pet)->>v_key)::timestamptz)
           IS DISTINCT FROM ((p_expected->>v_key)::timestamptz) THEN
        RAISE EXCEPTION 'CARE_STALE';
      END IF;
    ELSIF (to_jsonb(v_pet)->v_key) IS DISTINCT FROM v_value THEN
      RAISE EXCEPTION 'CARE_STALE';
    END IF;
  END LOOP;

  v_cooldown := CASE p_action
    WHEN 'clean' THEN v_pet.cd_clean_ends_at
    WHEN 'play' THEN v_pet.cd_play_ends_at
    WHEN 'bond' THEN v_pet.cd_bond_ends_at ELSE NULL END;
  IF v_cooldown > clock_timestamp() THEN RAISE EXCEPTION 'CARE_COOLDOWN'; END IF;
  v_category := CASE p_action WHEN 'feed' THEN 'food' WHEN 'clean' THEN 'soap'
    WHEN 'play' THEN 'toy' WHEN 'pet' THEN 'bed' ELSE NULL END;
  IF v_category IS NOT NULL THEN
    SELECT i.item_id, d.slug INTO v_item_id, v_slug
    FROM public.inventory i JOIN public.item_defs d ON d.id = i.item_id
    WHERE i.user_id = p_user_id AND i.qty > 0 AND d.type = 'care'
      AND d.effects->>'careCategory' = v_category
    ORDER BY d.slug LIMIT 1 FOR UPDATE OF i;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
    UPDATE public.inventory SET qty = qty - 1, updated_at = now()
    WHERE user_id = p_user_id AND item_id = v_item_id AND qty > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
  END IF;

  v_next := jsonb_populate_record(v_pet, p_patch);
  -- Only approved Assanti foods use their catalog hunger value. Other care is unchanged.
  IF p_action = 'feed' AND EXISTS (SELECT 1 FROM public.assanti_food_catalog WHERE slug = v_slug) THEN
    SELECT greatest(0, least(50, coalesce(v_pet.hunger, 0) + hunger))
      INTO v_next.hunger FROM public.assanti_food_catalog WHERE slug = v_slug;
  END IF;
  UPDATE public.pets SET
    hunger = v_next.hunger, clean = v_next.clean, happy = v_next.happy,
    comfort = v_next.comfort, rest = v_next.rest, energy = v_next.energy,
    bond = v_next.bond, neglect_hours = v_next.neglect_hours,
    ran_away = v_next.ran_away, runaway_at = v_next.runaway_at,
    last_care_decay_at = v_next.last_care_decay_at,
    cd_feed_ends_at = v_next.cd_feed_ends_at, cd_clean_ends_at = v_next.cd_clean_ends_at,
    cd_play_ends_at = v_next.cd_play_ends_at, cd_bond_ends_at = v_next.cd_bond_ends_at
  WHERE id = p_pet_id AND user_id = p_user_id RETURNING * INTO v_next;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  RETURN jsonb_build_object('pet', to_jsonb(v_next), 'consumed_slug', v_slug);
END;
$$;


ALTER FUNCTION public.perform_owned_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb) OWNER TO postgres;

--
-- Name: perform_owned_item_care(uuid, uuid, text, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.perform_owned_item_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb, p_slug text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
  v_next public.pets%ROWTYPE;
  v_item_id uuid;
  v_slug text;
  v_category text;
  v_key text;
  v_value jsonb;
  v_cooldown timestamptz;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('clean', 'play')
     OR p_slug IS NULL OR p_expected IS NULL OR p_patch IS NULL THEN
    RAISE EXCEPTION 'Invalid care action.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_pet.stage = 'egg' THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  IF v_pet.ran_away THEN RAISE EXCEPTION 'CARE_RUNAWAY'; END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_expected) LOOP
    IF v_key IN ('last_care_decay_at', 'runaway_at', 'cd_feed_ends_at',
                 'cd_clean_ends_at', 'cd_play_ends_at', 'cd_bond_ends_at') THEN
      IF ((to_jsonb(v_pet)->>v_key)::timestamptz)
           IS DISTINCT FROM ((p_expected->>v_key)::timestamptz) THEN
        RAISE EXCEPTION 'CARE_STALE';
      END IF;
    ELSIF (to_jsonb(v_pet)->v_key) IS DISTINCT FROM v_value THEN
      RAISE EXCEPTION 'CARE_STALE';
    END IF;
  END LOOP;

  v_cooldown := CASE p_action
    WHEN 'clean' THEN v_pet.cd_clean_ends_at
    WHEN 'play' THEN v_pet.cd_play_ends_at
    WHEN 'bond' THEN v_pet.cd_bond_ends_at ELSE NULL END;
  IF v_cooldown > clock_timestamp() THEN RAISE EXCEPTION 'CARE_COOLDOWN'; END IF;
  v_category := CASE p_action WHEN 'feed' THEN 'food' WHEN 'clean' THEN 'soap'
    WHEN 'play' THEN 'toy' WHEN 'pet' THEN 'bed' ELSE NULL END;
  IF v_category IS NOT NULL THEN
    SELECT i.item_id, d.slug INTO v_item_id, v_slug
    FROM public.inventory i JOIN public.item_defs d ON d.id = i.item_id
    WHERE i.user_id = p_user_id AND i.qty > 0 AND d.type = 'care'
      AND d.slug = p_slug -- Backend allowlists tutorial care and supplies JSON effects.
    ORDER BY d.slug LIMIT 1 FOR UPDATE OF i;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
    UPDATE public.inventory SET qty = qty - 1, updated_at = now()
    WHERE user_id = p_user_id AND item_id = v_item_id AND qty > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_ITEM'; END IF;
  END IF;

  v_next := jsonb_populate_record(v_pet, p_patch);
  UPDATE public.pets SET
    hunger = v_next.hunger, clean = v_next.clean, happy = v_next.happy,
    comfort = v_next.comfort, rest = v_next.rest, energy = v_next.energy,
    bond = v_next.bond, neglect_hours = v_next.neglect_hours,
    ran_away = v_next.ran_away, runaway_at = v_next.runaway_at,
    last_care_decay_at = v_next.last_care_decay_at,
    cd_feed_ends_at = v_next.cd_feed_ends_at, cd_clean_ends_at = v_next.cd_clean_ends_at,
    cd_play_ends_at = v_next.cd_play_ends_at, cd_bond_ends_at = v_next.cd_bond_ends_at
  WHERE id = p_pet_id AND user_id = p_user_id RETURNING * INTO v_next;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARE_NO_PET'; END IF;
  RETURN jsonb_build_object('pet', to_jsonb(v_next), 'consumed_slug', v_slug);
END;
$$;


ALTER FUNCTION public.perform_owned_item_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb, p_slug text) OWNER TO postgres;

--
-- Name: potato_battle_multiplier(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.potato_battle_multiplier(p_user_id uuid, p_reward text, p_at timestamp with time zone DEFAULT now()) RETURNS numeric
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
 SELECT COALESCE((SELECT CASE
 WHEN p_reward = 'xp' AND effect_key = 'potato_power' THEN 1.1
 WHEN p_reward = 'xp' AND effect_key = 'potato_brain' THEN .9
 WHEN p_reward = 'dots' AND effect_key = 'rotten_luck' THEN .9 ELSE 1 END
 FROM public.poe_tay_toe_finds WHERE user_id = p_user_id
 AND found_at <= p_at AND effect_expires_at > p_at
 ORDER BY found_at DESC LIMIT 1), 1);
$$;


ALTER FUNCTION public.potato_battle_multiplier(p_user_id uuid, p_reward text, p_at timestamp with time zone) OWNER TO postgres;

--
-- Name: potato_effect_for_roll(numeric); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.potato_effect_for_roll(p_roll numeric) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
BEGIN
 IF p_roll IS NULL OR p_roll < 0 OR p_roll >= 1 THEN RAISE EXCEPTION 'Invalid effect roll'; END IF;
 RETURN CASE WHEN p_roll < .2 THEN 'potato_power' WHEN p_roll < .4 THEN 'warm_potato'
 WHEN p_roll < .6 THEN 'lucky_spud' WHEN p_roll < .7 THEN 'potato_brain'
 WHEN p_roll < .8 THEN 'rotten_luck' ELSE 'absolutely_nothing' END;
END;
$$;


ALTER FUNCTION public.potato_effect_for_roll(p_roll numeric) OWNER TO postgres;

--
-- Name: potato_locations(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.potato_locations() RETURNS text[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
 SELECT ARRAY['hatchery-back','profile','pet','food-merchant','home','hatchery','thrift-merchant']::text[];
$$;


ALTER FUNCTION public.potato_locations() OWNER TO postgres;

--
-- Name: potato_new_incubation(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.potato_new_incubation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE v_until timestamptz; v_now timestamptz := statement_timestamp();
BEGIN
 IF NEW.stage::text <> 'egg' OR NEW.location::text <> 'hatchery' OR NEW.hatch_ends_at IS NULL THEN RETURN NEW; END IF;
 IF TG_OP = 'UPDATE' THEN
   IF OLD.hatch_ends_at IS NOT NULL AND OLD.location::text = 'hatchery' THEN RETURN NEW; END IF;
 END IF;
 SELECT effect_expires_at INTO v_until FROM public.poe_tay_toe_finds
 WHERE user_id = NEW.user_id AND effect_key = 'warm_potato'
 AND found_at <= v_now AND effect_expires_at > v_now ORDER BY found_at DESC LIMIT 1;
 IF v_until IS NOT NULL THEN
   NEW.hatch_ends_at := public.potato_warm_due(NEW.hatch_ends_at, v_now, v_until);
 END IF;
 RETURN NEW;
END;
$$;


ALTER FUNCTION public.potato_new_incubation() OWNER TO postgres;

--
-- Name: potato_warm_due(timestamp with time zone, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.potato_warm_due(p_due timestamp with time zone, p_start timestamp with time zone, p_until timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
 SELECT CASE WHEN p_due <= p_start OR p_until <= p_start THEN p_due
 WHEN p_due - p_start <= (p_until - p_start) * 1.1
 THEN p_start + (p_due - p_start) / 1.1
 ELSE p_due - (p_until - p_start) * .1 END;
$$;


ALTER FUNCTION public.potato_warm_due(p_due timestamp with time zone, p_start timestamp with time zone, p_until timestamp with time zone) OWNER TO postgres;

--
-- Name: prevent_locked_velune_activation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_locked_velune_activation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_trainer_level integer;
begin
  if new.species = 'velune'
     and (new.is_active is true or new.location::text in ('active', 'party')) then
    select trainer_level
    into v_trainer_level
    from public.trainer_progression
    where user_id = new.user_id;

    if coalesce(v_trainer_level, 1) < 10 then
      raise exception 'Trainer Level 10 required to use Mythical Legendary Kith.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.prevent_locked_velune_activation() OWNER TO postgres;

--
-- Name: prevent_locked_velune_party_assignment(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_locked_velune_party_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_species text;
  v_trainer_level integer;
begin
  select species
  into v_species
  from public.pets
  where id = new.pet_id
    and user_id = new.user_id;

  if v_species = 'velune' then
    select trainer_level
    into v_trainer_level
    from public.trainer_progression
    where user_id = new.user_id;

    if coalesce(v_trainer_level, 1) < 10 then
      raise exception 'Trainer Level 10 required to use Mythical Legendary Kith.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.prevent_locked_velune_party_assignment() OWNER TO postgres;

--
-- Name: prevent_personality_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_personality_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  -- If it was set before, don't allow changing it
  if old.personality_id is not null and new.personality_id is distinct from old.personality_id then
    raise exception 'Personality is permanent and cannot be changed.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.prevent_personality_change() OWNER TO postgres;

--
-- Name: prevent_profile_escalation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_profile_escalation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  -- allow inserts from signup trigger
  if tg_op = 'INSERT' then
    return new;
  end if;

  -- allow service role operations
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- block unauthenticated updates
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- users can only modify their own profile
  if new.user_id <> auth.uid() then
    raise exception 'Cannot modify another user profile';
  end if;

  -- prevent role escalation
  if old.role is distinct from new.role then
    raise exception 'Role escalation denied';
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.prevent_profile_escalation() OWNER TO postgres;

--
-- Name: prevent_role_escalation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_role_escalation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if old.is_admin is distinct from new.is_admin then
    raise exception 'role escalation blocked';
  end if;

  if old.role is distinct from new.role then
    raise exception 'role escalation blocked';
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.prevent_role_escalation() OWNER TO postgres;

--
-- Name: protect_favorite_kith(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.protect_favorite_kith() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_favorite THEN
      RAISE EXCEPTION 'This Kith is favorited and protected. Remove its star before a destructive action.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.is_favorite AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.ran_away OR NEW.runaway_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'This Kith is favorited and protected. Remove its star before a destructive action.';
  END IF;
  IF NEW.is_favorite AND (NEW.ran_away OR NEW.runaway_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Recover this Kith before marking it as a favorite.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.protect_favorite_kith() OWNER TO postgres;

--
-- Name: purchase_kennith_basket(uuid, integer, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.purchase_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
DECLARE v_line record; v_item public.item_defs%ROWTYPE; v_stock public.kennith_stock%ROWTYPE;
  v_owned integer; v_dots integer; v_merchant integer; v_cost bigint := 0;
BEGIN
  IF p_user_id IS NULL OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid purchase basket.'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x
      WHERE jsonb_typeof(x) <> 'object' OR x->>'slug' IS NULL OR x->>'category' IS NULL
        OR coalesce(x->>'quantity','') !~ '^[0-9]+$')
    OR (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_lines) x) <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid purchase basket.';
  END IF;
  -- Same lock order as existing merchants: player wallet, merchant day, inventory.
  SELECT dots INTO v_dots FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.get_kennith_stock(p_delta_day,p_seed);
  SELECT dots INTO STRICT v_merchant FROM public.kennith_wallet_days WHERE delta_day=p_delta_day FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,category text,quantity integer) ORDER BY slug LOOP
    IF v_line.quantity NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid purchase basket.'; END IF;
    SELECT * INTO v_stock FROM public.kennith_stock
      WHERE delta_day=p_delta_day AND slug=v_line.slug AND category=v_line.category FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'That item is not available today.'; END IF;
    IF v_line.quantity > v_stock.quantity THEN RAISE EXCEPTION 'Not enough merchant stock.'; END IF;
    SELECT * INTO v_item FROM public.item_defs WHERE slug=v_line.slug FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item trading is not configured.'; END IF;
    INSERT INTO public.inventory(user_id,item_id,qty) VALUES(p_user_id,v_item.id,0) ON CONFLICT DO NOTHING;
    SELECT qty INTO STRICT v_owned FROM public.inventory WHERE user_id=p_user_id AND item_id=v_item.id FOR UPDATE;
    IF v_owned::bigint+v_line.quantity > v_item.stack_limit THEN RAISE EXCEPTION 'Item stack is full.'; END IF;
    UPDATE public.inventory SET qty=v_owned+v_line.quantity,updated_at=now() WHERE user_id=p_user_id AND item_id=v_item.id;
    UPDATE public.kennith_stock SET quantity=quantity-v_line.quantity WHERE delta_day=p_delta_day AND slug=v_line.slug;
    v_cost := v_cost+v_stock.price::bigint*v_line.quantity;
  END LOOP;
  IF v_dots < v_cost THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
  IF v_merchant::bigint+v_cost > 2147483647 THEN RAISE EXCEPTION 'Wallet capacity exceeded.'; END IF;
  IF p_delta_day <> floor((extract(epoch FROM clock_timestamp()) + 4500) / 21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  UPDATE public.wallets SET dots=(v_dots-v_cost)::integer,updated_at=now() WHERE user_id=p_user_id;
  UPDATE public.kennith_wallet_days SET dots=(v_merchant+v_cost)::integer WHERE delta_day=p_delta_day;
  RETURN jsonb_build_object('ok',true,'cost',v_cost);
END;
$_$;


ALTER FUNCTION public.purchase_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb) OWNER TO postgres;

--
-- Name: record_kith_discovery_from_pet(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_kith_discovery_from_pet() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.stage::text = 'hatchling'
     and new.species is not null
     and (
       tg_op = 'INSERT'
       or old.stage::text is distinct from 'hatchling'
     )
  then
    insert into public.user_kith_discoveries (
      user_id,
      species_key,
      display_name,
      first_hatched_at
    )
    values (
      new.user_id,
      new.species,
      coalesce(nullif(new.name, ''), new.species),
      coalesce(new.hatched_at, now())
    )
    on conflict (user_id, species_key) do nothing;
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.record_kith_discovery_from_pet() OWNER TO postgres;

--
-- Name: recover_runaway_pet_to_party(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recover_runaway_pet_to_party(p_user_id uuid, p_pet_id uuid) RETURNS TABLE(party_slot integer, destination text, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_runaway_at timestamptz;
  v_is_runaway boolean;
  v_slot integer;
  v_now timestamptz := now();
  v_has_active_pet boolean;
begin
  -- Prevent two simultaneous requests from taking the same party slot.
  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text, 0)
  );

  select
    p.runaway_at,
    coalesce(p.ran_away, false)
  into
    v_runaway_at,
    v_is_runaway
  from public.pets p
  where p.id = p_pet_id
    and p.user_id = p_user_id
  for update;

  if not found then
    raise exception 'That Delta was not found.';
  end if;

  if not v_is_runaway or v_runaway_at is null then
    raise exception 'That Delta has not run away.';
  end if;

  if v_now - v_runaway_at >= interval '48 hours' then
    raise exception 'The recovery window for that Delta has expired.';
  end if;

  -- Remove any stale party assignment left behind when it ran away.
  delete from public.party_slots
  where user_id = p_user_id
    and pet_id = p_pet_id;

  -- Restore the same existing pet. Never recreate or duplicate it.
  update public.pets
  set
    ran_away = false,
    runaway_at = null,
    is_active = false,
    location = 'storage',

    hunger = 50,
    clean = 50,
    happy = 50,
    comfort = 50,
    rest = 50,
    energy = 100,
    neglect_hours = 0,

    last_care_decay_at = v_now,
    last_cared_at = v_now,
    last_fed_at = v_now,
    last_hunger_decay_at = v_now,
    updated_at = v_now
  where id = p_pet_id
    and user_id = p_user_id;

  -- Find the first open slot from 1 through 4.
  select available.slot_index
  into v_slot
  from generate_series(1, 4) as available(slot_index)
  where not exists (
    select 1
    from public.party_slots ps
    where ps.user_id = p_user_id
      and ps.slot_index = available.slot_index
  )
  order by available.slot_index
  limit 1;

  -- All four slots are full. Keep the pet in Storage.
  if v_slot is null then
    return query
    select
      null::integer,
      'storage'::text,
      'Pet has returned to storage, stats all care maxed.'::text;

    return;
  end if;

  insert into public.party_slots (
    user_id,
    pet_id,
    slot_index
  )
  values (
    p_user_id,
    p_pet_id,
    v_slot
  );

  -- Do not steal focus from an existing active pet.
  select exists (
    select 1
    from public.party_slots ps
    join public.pets p
      on p.id = ps.pet_id
    where ps.user_id = p_user_id
      and p.id <> p_pet_id
      and p.is_active = true
      and coalesce(p.ran_away, false) = false
      and lower(coalesce(p.stage::text, '')) <> 'egg'
  )
  into v_has_active_pet;

  update public.pets
  set
    location = 'active',
    is_active = not v_has_active_pet,
    updated_at = v_now
  where id = p_pet_id
    and user_id = p_user_id;

  return query
  select
    v_slot,
    'party'::text,
    'Pet has returned home, stats all care maxed.'::text;
end;
$$;


ALTER FUNCTION public.recover_runaway_pet_to_party(p_user_id uuid, p_pet_id uuid) OWNER TO postgres;

--
-- Name: recover_runaway_pet_with_payment(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.recover_runaway_pet_with_payment(p_user_id uuid, p_pet_id uuid, p_dots integer, p_crystals integer) RETURNS TABLE(party_slot integer, destination text, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_recovery record;
  v_spent boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to recover this Delta.';
  END IF;

  IF p_user_id IS NULL OR p_pet_id IS NULL
     OR p_dots IS NULL OR p_crystals IS NULL
     OR p_dots < 0 OR p_crystals < 0
     OR ((p_dots > 0)::integer + (p_crystals > 0)::integer) <> 1 THEN
    RAISE EXCEPTION 'Invalid recovery payment.';
  END IF;

  -- This existing function validates ownership and the 48-hour deadline,
  -- locks the pet, and restores that same Kith to party or storage.
  -- All its changes roll back if the wallet charge below cannot succeed.
  SELECT r.party_slot, r.destination, r.message
  INTO v_recovery
  FROM public.recover_runaway_pet_to_party(p_user_id, p_pet_id) AS r;

  IF NOT FOUND OR v_recovery.destination NOT IN ('party', 'storage') THEN
    RAISE EXCEPTION 'Recovery completed without a destination.';
  END IF;

  SELECT public.spend_wallet(p_user_id, p_dots, p_crystals)
  INTO v_spent;

  IF v_spent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Not enough recovery currency.' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY SELECT v_recovery.party_slot::integer,
                      v_recovery.destination::text,
                      v_recovery.message::text;
END;
$$;


ALTER FUNCTION public.recover_runaway_pet_with_payment(p_user_id uuid, p_pet_id uuid, p_dots integer, p_crystals integer) OWNER TO postgres;

--
-- Name: reset_test_account_game_data(uuid, text, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.reset_test_account_game_data(p_user_id uuid, p_email text, p_confirm text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
DECLARE v_table text; v_pet_ids uuid[];
BEGIN
  IF p_user_id IS NULL OR p_confirm IS DISTINCT FROM 'RESET_MY_TEST_ACCOUNT'
    OR p_email IS NULL OR p_email !~* '^jaydenauthentication6790\+test[0-9]+@gmail\.com$'
  THEN RAISE EXCEPTION 'Invalid test account reset.'; END IF;
  -- Same rows as the old route; locks compete with set_kith_favorite.
  PERFORM 1 FROM public.pets WHERE user_id = p_user_id ORDER BY id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.pets WHERE user_id = p_user_id AND is_favorite) THEN
    RAISE EXCEPTION 'This account has favorited Kith. Remove their stars before resetting it.';
  END IF;
  SELECT array_agg(id) INTO v_pet_ids FROM public.pets WHERE user_id = p_user_id;
  DELETE FROM public.signup_trigger_errors WHERE user_id = p_user_id OR email = p_email;
  DELETE FROM public.battle_run_fights WHERE run_id IN
    (SELECT id FROM public.battle_runs WHERE user_id = p_user_id);
  DELETE FROM public.pve_instability_fights WHERE run_id IN
    (SELECT id FROM public.pve_instability_runs WHERE user_id = p_user_id);
  FOREACH v_table IN ARRAY ARRAY['pet_mutations','pet_awards','pet_element_affinities',
    'pet_elements','pet_skills','pet_stat_allocations','pet_stats'] LOOP
    EXECUTE format('DELETE FROM public.%I WHERE pet_id = ANY($1)', v_table) USING v_pet_ids;
  END LOOP;
  DELETE FROM public.daily_login_rewards WHERE id = p_user_id;
  FOREACH v_table IN ARRAY ARRAY['trainer_awards','hatchery_shelf_slots','hatchery_slots',
    'party_slots','home_objects','inventory','eggs','wallet_ledger','battle_runs',
    'pve_instability_runs','pve_active_buffs','pve_research_stats','daily_care',
    'user_resources','wallets','pets'] LOOP
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', v_table) USING p_user_id;
  END LOOP;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
END;
$_$;


ALTER FUNCTION public.reset_test_account_game_data(p_user_id uuid, p_email text, p_confirm text) OWNER TO postgres;

--
-- Name: resolve_species_skill_equipment(uuid, uuid, text, smallint); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.resolve_species_skill_equipment(p_user_id uuid, p_pet_id uuid, p_milestone_key text, p_slot smallint) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE p public.pets%ROWTYPE; c public.pet_skill_milestone_claims%ROWTYPE; decision text;
BEGIN
  SELECT * INTO p FROM public.pets WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKILL_NOT_FOUND'; END IF;
  IF p.stage = 'egg' OR p.ran_away OR (p_slot IS NOT NULL AND p_slot NOT BETWEEN 1 AND 4)
    THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;
  SELECT * INTO c FROM public.pet_skill_milestone_claims
    WHERE pet_id = p_pet_id AND milestone_key = p_milestone_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'SKILL_INELIGIBLE'; END IF;
  IF EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims pc
    LEFT JOIN public.skill_defs sd ON sd.id = pc.skill_id
    WHERE pc.pet_id = p_pet_id AND (
      sd.id IS NULL OR pc.species_id IS DISTINCT FROM p.species
      OR pc.milestone_key IS DISTINCT FROM ('level-' || sd.required_level)
      OR sd.required_level > p.level
      OR NOT EXISTS (SELECT 1 FROM public.pet_skills owned_skill WHERE owned_skill.pet_id = p_pet_id AND owned_skill.skill_id = pc.skill_id)
      OR (SELECT count(*) FROM public.pet_skills ps JOIN public.skill_defs learned_def ON learned_def.id = ps.skill_id
          WHERE ps.pet_id = p_pet_id AND (ps.skill_id = pc.skill_id
            OR learned_def.requirements->>'milestone_key' = pc.milestone_key)) <> 1
      OR EXISTS (SELECT 1 FROM unnest(ARRAY[2,5,8,11,14,17,20,23,26,30]) AS levels(n)
        WHERE n < sd.required_level AND NOT EXISTS (SELECT 1 FROM public.pet_skill_milestone_claims earlier
          WHERE earlier.pet_id = p_pet_id AND earlier.milestone_key = 'level-' || n))))
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
  decision := CASE WHEN p_slot IS NULL THEN 'declined' ELSE 'replaced' END;
  IF NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND skill_id = c.skill_id)
    THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
  IF c.equipment_decision <> 'pending' THEN
    IF c.equipment_decision IS DISTINCT FROM decision OR c.equipment_decision_slot IS DISTINCT FROM p_slot
      THEN RAISE EXCEPTION 'SKILL_CONFLICT'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id
      AND (equipped IS DISTINCT FROM (equipped_slot IS NOT NULL) OR (skill_id = c.skill_id AND equipped)))
      THEN RAISE EXCEPTION 'SKILL_RECONCILIATION_REQUIRED'; END IF;
    IF p_slot IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.pet_skills WHERE pet_id = p_pet_id AND equipped_slot = p_slot)
        THEN RAISE EXCEPTION 'SKILL_CONFLICT'; END IF;
      UPDATE public.pet_skills SET equipped = false, equipped_slot = NULL
        WHERE pet_id = p_pet_id AND equipped_slot = p_slot;
      UPDATE public.pet_skills SET equipped = true, equipped_slot = p_slot
        WHERE pet_id = p_pet_id AND skill_id = c.skill_id;
    END IF;
    UPDATE public.pet_skill_milestone_claims SET equipment_decision = decision, equipment_decision_slot = p_slot
      WHERE pet_id = p_pet_id AND milestone_key = p_milestone_key;
  END IF;
  RETURN jsonb_build_object('skill_id',c.skill_id,'milestone_key',c.milestone_key,
    'equipment_decision',decision,'equipment_decision_slot',p_slot);
END; $$;


ALTER FUNCTION public.resolve_species_skill_equipment(p_user_id uuid, p_pet_id uuid, p_milestone_key text, p_slot smallint) OWNER TO postgres;

--
-- Name: restore_test_runaway_pets(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.restore_test_runaway_pets(p_confirm_text text DEFAULT 'DRY_RUN'::text) RETURNS TABLE(action text, email text, user_id uuid, pet_id uuid, pet_name text, species text, old_ran_away boolean, old_runaway_at timestamp with time zone, old_is_active boolean, old_location text, new_ran_away boolean, new_runaway_at timestamp with time zone, new_is_active boolean, new_location text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
begin
  if p_confirm_text = 'RESTORE_RUNAWAY_PETS' then
    return query
    with target_users as (
      select u.id as user_id, u.email
      from auth.users u
      where lower(u.email) in (
        lower('jaydentestemail6790@gmail.com'),
        lower('holyfoleyproductions@gmail.com'),
        lower('saitinsangel@hotmail.com'),
        lower('estes_c@hotmail.com')
      )
    ),
    target_pets as (
      select
        tu.email,
        p.id as pet_id,
        p.user_id,
        p.name,
        p.species,
        p.ran_away,
        p.runaway_at,
        p.is_active,
        p.location
      from target_users tu
      join public.pets p on p.user_id = tu.user_id
      where coalesce(p.ran_away, false) = true
         or p.runaway_at is not null
         or p.location = 'runaway'
    ),
    restored as (
      update public.pets p
      set
        ran_away = false,
        runaway_at = null,
        is_active = true,
        location = 'home',
        hunger = greatest(coalesce(p.hunger, 50), 50),
        clean = greatest(coalesce(p.clean, 50), 50),
        happy = greatest(coalesce(p.happy, 50), 50),
        comfort = greatest(coalesce(p.comfort, 50), 50),
        rest = greatest(coalesce(p.rest, 50), 50),
        energy = greatest(coalesce(p.energy, 100), 100),
        updated_at = now()
      from target_pets tp
      where p.id = tp.pet_id
      returning
        tp.email,
        p.user_id,
        p.id as pet_id,
        p.name,
        p.species,
        tp.ran_away as old_ran_away,
        tp.runaway_at as old_runaway_at,
        tp.is_active as old_is_active,
        tp.location as old_location,
        p.ran_away as new_ran_away,
        p.runaway_at as new_runaway_at,
        p.is_active as new_is_active,
        p.location as new_location
    )
    select
      'RESTORED'::text,
      r.email,
      r.user_id,
      r.pet_id,
      r.name,
      r.species,
      r.old_ran_away,
      r.old_runaway_at,
      r.old_is_active,
      r.old_location,
      r.new_ran_away,
      r.new_runaway_at,
      r.new_is_active,
      r.new_location
    from restored r;

    return;
  end if;

  return query
  select
    'DRY_RUN'::text as action,
    u.email,
    p.user_id,
    p.id as pet_id,
    p.name as pet_name,
    p.species,
    p.ran_away as old_ran_away,
    p.runaway_at as old_runaway_at,
    p.is_active as old_is_active,
    p.location as old_location,
    false as new_ran_away,
    null::timestamptz as new_runaway_at,
    true as new_is_active,
    'home'::text as new_location
  from auth.users u
  join public.pets p on p.user_id = u.id
  where lower(u.email) in (
    lower('jaydentestemail6790@gmail.com'),
    lower('holyfoleyproductions@gmail.com'),
    lower('saitinsangel@hotmail.com'),
    lower('estes_c@hotmail.com')
  )
  and (
    coalesce(p.ran_away, false) = true
    or p.runaway_at is not null
    or p.location = 'runaway'
  )
  order by u.email, p.created_at desc;
end;
$$;


ALTER FUNCTION public.restore_test_runaway_pets(p_confirm_text text) OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: roll_velune_encounter(uuid, text, integer, integer, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.roll_velune_encounter(p_user_id uuid, p_location_key text, p_sighting_roll integer, p_egg_roll integer, p_bypass_cooldown boolean DEFAULT false) RETURNS TABLE(attempted boolean, sighted boolean, egg_awarded boolean, reason text, retry_after_ms integer, egg_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_state public.legendary_kith_event_state%rowtype;
  v_now timestamptz := now();
  v_retry_ms integer;
  v_egg_id uuid;
  v_existing_velune_id uuid;
  v_affinity_count integer;
begin
  if p_user_id is null then
    raise exception 'Authenticated user id is required.';
  end if;

  if p_location_key not in (
    '/cities/kithna',
    '/kithna/food',
    '/kithna/health',
    '/kithna/armor',
    '/kithna/weapons',
    '/hatchery',
    '/pet',
    '/gym',
    '/farm',
    '/kithna/farm',
    '/kithna/farm/dungeon'
  ) then
    return query select false, false, false, 'ineligible_location'::text, 0, null::uuid;
    return;
  end if;

  if p_sighting_roll not between 0 and 99 or p_egg_roll not between 0 and 99 then
    raise exception 'Velune rolls must be between 0 and 99.';
  end if;

  insert into public.trainer_progression (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.legendary_kith_event_state (user_id, legendary_key)
  values (p_user_id, 'velune')
  on conflict (user_id, legendary_key) do nothing;

  select *
  into v_state
  from public.legendary_kith_event_state
  where user_id = p_user_id
    and legendary_key = 'velune'
  for update;

  -- Treat any pre-existing Velune egg or hatchling as completion. This closes
  -- the only gap where an account could own Velune before its event-state row
  -- existed (for example, an authorized test grant).
  select id
  into v_existing_velune_id
  from public.pets
  where user_id = p_user_id
    and species = 'velune'
  order by created_at
  limit 1;

  if v_existing_velune_id is not null and v_state.egg_obtained_at is null then
    update public.legendary_kith_event_state
    set egg_obtained_at = v_now,
        egg_pet_id = v_existing_velune_id,
        updated_at = v_now
    where user_id = p_user_id
      and legendary_key = 'velune';

    return query select false, false, false, 'completed'::text, 0, v_existing_velune_id;
    return;
  end if;

  if v_state.egg_obtained_at is not null then
    return query select false, false, false, 'completed'::text, 0, v_state.egg_pet_id;
    return;
  end if;

  if not p_bypass_cooldown
     and v_state.last_attempt_at is not null
     and v_state.last_attempt_at > v_now - interval '60 seconds' then
    v_retry_ms := greatest(
      0,
      ceil(extract(epoch from (
        v_state.last_attempt_at + interval '60 seconds' - v_now
      )) * 1000)::integer
    );

    return query select false, false, false, 'cooldown'::text, v_retry_ms, null::uuid;
    return;
  end if;

  update public.legendary_kith_event_state
  set last_attempt_at = v_now,
      updated_at = v_now
  where user_id = p_user_id
    and legendary_key = 'velune';

  if p_sighting_roll >= 45 then
    return query select true, false, false, 'no_sighting'::text, 0, null::uuid;
    return;
  end if;

  update public.legendary_kith_event_state
  set sighting_count = sighting_count + 1,
      updated_at = v_now
  where user_id = p_user_id
    and legendary_key = 'velune';

  if p_egg_roll >= 5 then
    return query select true, true, false, 'sighting'::text, 0, null::uuid;
    return;
  end if;

  insert into public.pets (
    user_id,
    name,
    species,
    rarity,
    line,
    stage,
    level,
    xp,
    energy,
    hatch_ends_at,
    pending_hatch_minutes,
    is_active,
    location
  ) values (
    p_user_id,
    'Legendary Egg',
    'velune',
    null,
    'air',
    'egg',
    1,
    0,
    100,
    null,
    45,
    false,
    'storage'
  )
  returning id into v_egg_id;

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
    v_egg_id,
    2,
    2,
    3,
    2,
    3,
    2,
    14
  );

  insert into public.pet_element_affinities (
    pet_id,
    element_id,
    affinity,
    updated_at
  )
  select
    v_egg_id,
    element.id,
    5,
    v_now
  from public.element_defs as element
  where element.key in ('light', 'ice', 'air', 'storm');

  select count(*)
  into v_affinity_count
  from public.pet_element_affinities
  where pet_id = v_egg_id;

  if v_affinity_count <> 4 then
    raise exception 'Velune requires Light, Ice, Air, and Storm element definitions.';
  end if;

  update public.legendary_kith_event_state
  set egg_obtained_at = v_now,
      egg_pet_id = v_egg_id,
      updated_at = v_now
  where user_id = p_user_id
    and legendary_key = 'velune';

  return query select true, true, true, 'egg_awarded'::text, 0, v_egg_id;
end;
$$;


ALTER FUNCTION public.roll_velune_encounter(p_user_id uuid, p_location_key text, p_sighting_roll integer, p_egg_roll integer, p_bypass_cooldown boolean) OWNER TO postgres;

--
-- Name: save_owned_appearance(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.save_owned_appearance(p_user_id uuid, p_appearance jsonb, p_target text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_result jsonb; v_line record; v_owned integer;
BEGIN
  IF p_user_id IS NULL OR jsonb_typeof(p_appearance) IS DISTINCT FROM 'object'
    OR p_target IS NULL OR p_target NOT IN ('current','default') THEN RAISE EXCEPTION 'Invalid appearance.'; END IF;
  PERFORM 1 FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  -- Sorted inventory locks serialize equip against every inventory decrement.
  PERFORM 1 FROM public.inventory WHERE user_id=p_user_id ORDER BY item_id FOR UPDATE;
  FOR v_line IN SELECT value AS slug,count(*) AS required FROM jsonb_each_text(p_appearance)
    WHERE key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear') AND value IS NOT NULL
    GROUP BY value LOOP
    SELECT i.qty INTO v_owned FROM public.inventory i JOIN public.item_defs d ON d.id=i.item_id
      WHERE i.user_id=p_user_id AND d.slug=v_line.slug;
    IF coalesce(v_owned,0)<v_line.required THEN
      RAISE EXCEPTION 'You do not own one or more selected wardrobe items.';
    END IF;
  END LOOP;
  INSERT INTO public.profiles(user_id) VALUES(p_user_id) ON CONFLICT(user_id) DO NOTHING;
  IF p_target='current' THEN
    UPDATE public.profiles SET avatar_customization=p_appearance WHERE user_id=p_user_id;
  ELSE
    UPDATE public.profiles SET default_avatar_customization=p_appearance WHERE user_id=p_user_id;
  END IF;
  SELECT jsonb_build_object('avatar_customization',avatar_customization,
    'default_avatar_customization',default_avatar_customization) INTO v_result FROM public.profiles WHERE user_id=p_user_id;
  RETURN v_result;
END;
$$;


ALTER FUNCTION public.save_owned_appearance(p_user_id uuid, p_appearance jsonb, p_target text) OWNER TO postgres;

--
-- Name: set_homepage_alerts_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_homepage_alerts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_homepage_alerts_updated_at() OWNER TO postgres;

--
-- Name: set_kith_favorite(uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.set_kith_favorite(p_user_id uuid, p_pet_id uuid, p_favorite boolean) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_pet public.pets%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_pet_id IS NULL OR p_favorite IS NULL THEN
    RAISE EXCEPTION 'Invalid favorite update.';
  END IF;
  SELECT * INTO v_pet FROM public.pets
    WHERE id = p_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kith not found.'; END IF;
  IF p_favorite AND (v_pet.ran_away OR v_pet.runaway_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Recover this Kith before marking it as a favorite.';
  END IF;
  UPDATE public.pets SET is_favorite = p_favorite
    WHERE id = p_pet_id AND user_id = p_user_id;
  RETURN p_favorite;
END;
$$;


ALTER FUNCTION public.set_kith_favorite(p_user_id uuid, p_pet_id uuid, p_favorite boolean) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: settle_wildwood_victory_xp(uuid, uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_players jsonb;
  v_pet_id uuid;
  v_level integer;
  v_xp integer;
  v_reward jsonb;
  v_rewards jsonb := '[]'::jsonb;
  v_pet_ids uuid[];
  v_count integer;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wildwood room not found' USING ERRCODE = '23514';
  END IF;
  -- Version 2: participants contains only Kith that entered combat.
  -- Reserves must remain outside this array until admitted by the server.
  -- Version 1 continues through the original implementation below.
  IF (v_room.event_payload ->> 'xpRewardVersion') = '2' THEN
    IF v_room.status <> 'resolved'
      OR v_room.event_kind <> 'corrupted_battle'
      OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
      OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
      OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
      OR jsonb_typeof(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 'array'
    THEN
      RAISE EXCEPTION 'No eligible Wildwood party victory' USING ERRCODE = '23514';
    END IF;
    SELECT jsonb_agg(participant) INTO v_players
    FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
    WHERE participant ->> 'side' = 'player';
    v_count := COALESCE(jsonb_array_length(v_players), 0);
    IF v_count NOT BETWEEN 1 AND 4
      OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') <> v_count + 1
      OR (SELECT count(*) FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') p
          WHERE p ->> 'side' = 'enemy') <> 1
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_players) p
          WHERE p ->> 'defeated' = 'false' AND (p ->> 'hpCur')::integer > 0)
    THEN
      RAISE EXCEPTION 'Invalid party victory participants' USING ERRCODE = '23514';
    END IF;
    SELECT array_agg(COALESCE(p ->> 'sourcePetId', p ->> 'id')::uuid
                    ORDER BY COALESCE(p ->> 'sourcePetId', p ->> 'id')::uuid)
    INTO v_pet_ids FROM jsonb_array_elements(v_players) p;
    IF EXISTS (SELECT 1 FROM unnest(v_pet_ids) id WHERE id IS NULL)
      OR (SELECT count(DISTINCT id) FROM unnest(v_pet_ids) id) <> v_count
    THEN
      RAISE EXCEPTION 'Invalid or duplicate party pet IDs' USING ERRCODE = '23514';
    END IF;
    -- Lock all participants in deterministic order before modifying any XP.
    FOREACH v_pet_id IN ARRAY v_pet_ids LOOP
      SELECT * INTO v_pet FROM public.pets
      WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.pet_battle_results
        WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
          AND user_id = p_user_id AND result = 'victory')
      THEN
        RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
      END IF;
    END LOOP;
    IF v_room.event_payload ? 'xpRewards' THEN
      RETURN v_room.event_payload -> 'xpRewards';
    END IF;
    IF v_room.event_payload ? 'xpReward' THEN
      RAISE EXCEPTION 'Mixed reward receipt versions' USING ERRCODE = '23514';
    END IF;
    FOREACH v_pet_id IN ARRAY v_pet_ids LOOP
      SELECT * INTO STRICT v_pet FROM public.pets WHERE id = v_pet_id AND user_id = p_user_id;
      IF v_pet.level IS NULL OR v_pet.xp IS NULL OR v_pet.unspent_points IS NULL
        OR v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0
      THEN
        RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
      END IF;
      v_xp := v_pet.xp + 25;
      v_level := v_pet.level;
      WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1) LOOP
        v_level := v_level + 1;
      END LOOP;
      v_reward := jsonb_build_object(
        'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
        'previousLevel', v_pet.level, 'level', v_level,
        'pointsEarned', v_level - v_pet.level
      );
      UPDATE public.pets SET xp = v_xp, level = v_level,
        unspent_points = unspent_points + (v_level - v_pet.level)
      WHERE id = v_pet_id AND user_id = p_user_id;
      v_rewards := v_rewards || jsonb_build_array(v_reward);
    END LOOP;
    UPDATE public.wildwood_rooms
    SET event_payload = jsonb_set(event_payload, '{xpRewards}', v_rewards)
    WHERE id = p_room_id;
    RETURN v_rewards;
  END IF;
  IF v_room.status <> 'resolved'
    OR v_room.event_kind <> 'corrupted_battle'
    OR (v_room.event_payload ->> 'xpRewardVersion') IS DISTINCT FROM '1'
    OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
    OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
    OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
  THEN
    RAISE EXCEPTION 'No eligible Wildwood victory' USING ERRCODE = '23514';
  END IF;
  SELECT jsonb_agg(participant) INTO v_players
  FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
  WHERE participant ->> 'side' = 'player';
  IF jsonb_array_length(v_players) IS DISTINCT FROM 1
    OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 2
    OR (v_players #>> '{0,defeated}') IS DISTINCT FROM 'false'
    OR COALESCE((v_players #>> '{0,hpCur}')::integer, 0) <= 0
  THEN
    RAISE EXCEPTION 'Expected one living player participant' USING ERRCODE = '23514';
  END IF;
  v_pet_id := COALESCE(v_players #>> '{0,sourcePetId}', v_players #>> '{0,id}')::uuid;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
  END IF;
  IF v_room.event_payload ? 'xpReward' THEN
    RETURN v_room.event_payload -> 'xpReward';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pet_battle_results
    WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
      AND user_id = p_user_id AND result = 'victory'
  ) THEN
    RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
  END IF;
  IF v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0 THEN
    RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
  END IF;
  -- Preserve lifetime XP. Reaching level L costs 100 * (1 + ... + L-1).
  -- Existing higher levels are never reduced and existing XP is never reset.
  v_xp := v_pet.xp + 25;
  v_level := v_pet.level;
  WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1) LOOP
    v_level := v_level + 1;
  END LOOP;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
    'previousLevel', v_pet.level, 'level', v_level,
    'pointsEarned', v_level - v_pet.level
  );
  UPDATE public.pets SET xp = v_xp, level = v_level,
    unspent_points = unspent_points + (v_level - v_pet.level)
  WHERE id = v_pet_id;
  UPDATE public.wildwood_rooms
  SET event_payload = jsonb_set(event_payload, '{xpReward}', v_reward)
  WHERE id = p_room_id;
  RETURN v_reward;
END;
$$;


ALTER FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid) OWNER TO postgres;

--
-- Name: spend_wallet(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.spend_wallet(p_user_id uuid, p_dots integer DEFAULT 0, p_crystals integer DEFAULT 0) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
declare
  v_dots int;
  v_crystals int;
begin
  select dots, crystals into v_dots, v_crystals
  from wallets
  where user_id = p_user_id
  for update;

  if not found then
    return false;
  end if;

  if v_dots < greatest(p_dots, 0) or v_crystals < greatest(p_crystals, 0) then
    return false;
  end if;

  update wallets
  set
    dots = dots - greatest(p_dots, 0),
    crystals = crystals - greatest(p_crystals, 0),
    updated_at = now()
  where user_id = p_user_id;

  return true;
end;
$$;


ALTER FUNCTION public.spend_wallet(p_user_id uuid, p_dots integer, p_crystals integer) OWNER TO postgres;

--
-- Name: stamp_wildwood_item_opportunity(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.stamp_wildwood_item_opportunity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.item_available_at := CASE
      WHEN NEW.sequence_number > 0
        AND NEW.event_kind = 'flavor'
        AND NEW.status = 'resolved'
        AND NEW.event_payload->'battle' = 'null'::jsonb
      THEN clock_timestamp()
      ELSE NULL
    END;
  ELSE
    -- Neither room updates nor reloads can extend or recreate an opportunity.
    NEW.item_available_at := OLD.item_available_at;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.stamp_wildwood_item_opportunity() OWNER TO postgres;

--
-- Name: trade_assanti_basket(uuid, integer, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE v_line record; v_result jsonb; v_cost bigint := 0; v_value bigint := 0;
BEGIN
  IF p_user_id IS NULL OR p_delta_day IS NULL OR p_delta_day < 0
    OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  FOR v_line IN SELECT value AS item FROM jsonb_array_elements(p_lines) LOOP
    IF jsonb_typeof(v_line.item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
    IF jsonb_typeof(v_line.item->'slug') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_line.item->'buy') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_line.item->'sell') IS DISTINCT FROM 'number'
      OR length(v_line.item->>'slug') NOT BETWEEN 1 AND 100
      OR (v_line.item - 'slug' - 'buy' - 'sell') <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
    IF (v_line.item->>'buy')::numeric NOT BETWEEN 0 AND 50
      OR (v_line.item->>'sell')::numeric NOT BETWEEN 0 AND 429496729
      OR trunc((v_line.item->>'buy')::numeric) <> (v_line.item->>'buy')::numeric
      OR trunc((v_line.item->>'sell')::numeric) <> (v_line.item->>'sell')::numeric
      OR (v_line.item->>'buy')::numeric + (v_line.item->>'sell')::numeric = 0 THEN
      RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF (SELECT count(DISTINCT value->>'slug') FROM jsonb_array_elements(p_lines))
    <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid trade basket.' USING ERRCODE='22023';
  END IF;
  -- Match the legacy lock order, once for the entire basket.
  PERFORM 1 FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.ensure_assanti_food_day(p_delta_day);
  PERFORM 1 FROM public.assanti_food_days WHERE delta_day=p_delta_day FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,buy numeric,sell numeric) ORDER BY slug LOOP
    IF v_line.buy > 0 THEN
      v_result := public.trade_assanti_food_on_day(p_user_id,v_line.slug,v_line.buy::integer,'purchase',p_delta_day);
      v_cost := v_cost + (v_result->>'cost')::bigint;
    END IF;
  END LOOP;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(slug text,buy numeric,sell numeric) ORDER BY slug LOOP
    IF v_line.sell > 0 THEN
      v_result := public.trade_assanti_food_on_day(p_user_id,v_line.slug,v_line.sell::integer,'sell',p_delta_day);
      v_value := v_value + (v_result->>'value')::bigint;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'cost',v_cost,'value',v_value);
END;
$$;


ALTER FUNCTION public.trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb) OWNER TO postgres;

--
-- Name: trade_assanti_food(uuid, text, integer, text); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.trade_assanti_food(p_user_id uuid, p_slug text, p_quantity integer, p_direction text) RETURNS jsonb
    LANGUAGE sql
    SET search_path TO ''
    AS $$
  SELECT public.trade_assanti_food_on_day(p_user_id, p_slug, p_quantity, p_direction,
    floor(extract(epoch FROM now()) / 21600)::integer);
$$;


ALTER FUNCTION public.trade_assanti_food(p_user_id uuid, p_slug text, p_quantity integer, p_direction text) OWNER TO postgres;

--
-- Name: trade_assanti_food_on_day(uuid, text, integer, text, integer); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.trade_assanti_food_on_day(p_user_id uuid, p_slug text, p_quantity integer, p_direction text, p_delta_day integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_item_id uuid;
  v_stack_limit integer;
  v_price integer;
  v_quantity integer;
  v_dots integer;
  v_crystals integer;
  v_total bigint;
  v_day public.assanti_food_days%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_slug IS NULL OR p_direction IS NULL
    OR p_direction NOT IN ('purchase', 'sell') OR p_quantity IS NULL
    OR p_quantity < 1 OR p_quantity > 429496729
    OR (p_direction = 'purchase' AND p_quantity > 50) THEN
    RAISE EXCEPTION 'Invalid food trade.' USING ERRCODE = '22023';
  END IF;
  SELECT d.id, d.stack_limit, c.price INTO v_item_id, v_stack_limit, v_price
  FROM public.assanti_food_catalog c JOIN public.item_defs d ON d.slug = c.slug
  WHERE c.slug = p_slug AND d.type = 'care';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid food trade.' USING ERRCODE = '22023'; END IF;
  v_total := p_quantity::bigint * v_price;

  -- Wallet first, then merchant day, then inventory. All changes roll back together.
  SELECT dots, crystals INTO v_dots, v_crystals FROM public.wallets
    WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.ensure_assanti_food_day(p_delta_day);
  SELECT * INTO STRICT v_day FROM public.assanti_food_days WHERE delta_day = p_delta_day FOR UPDATE;
  IF p_direction = 'purchase' THEN
    IF NOT p_slug = ANY(v_day.slugs) THEN RAISE EXCEPTION 'That food is not available today.'; END IF;
    IF v_dots < v_total THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
    IF v_day.dots::bigint + v_total > 2147483647 THEN RAISE EXCEPTION 'Merchant wallet is full.'; END IF;
    IF p_quantity > v_stack_limit THEN RAISE EXCEPTION 'Food stack is full.'; END IF;
    INSERT INTO public.inventory AS owned (user_id, item_id, qty)
    VALUES (p_user_id, v_item_id, p_quantity)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = owned.qty + EXCLUDED.qty, updated_at = now()
    WHERE owned.qty <= v_stack_limit - EXCLUDED.qty RETURNING qty INTO v_quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Food stack is full.'; END IF;
    UPDATE public.wallets SET dots = dots - v_total::integer, updated_at = now()
      WHERE user_id = p_user_id RETURNING dots INTO v_dots;
    UPDATE public.assanti_food_days SET dots = dots + v_total::integer
      WHERE delta_day = p_delta_day RETURNING * INTO v_day;
  ELSE
    IF v_day.dots < v_total THEN RAISE EXCEPTION 'Assanti does not have enough Dots.'; END IF;
    IF v_dots::bigint + v_total > 2147483647 THEN RAISE EXCEPTION 'Player wallet is full.'; END IF;
    UPDATE public.inventory SET qty = qty - p_quantity, updated_at = now()
      WHERE user_id = p_user_id AND item_id = v_item_id AND qty >= p_quantity RETURNING qty INTO v_quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not enough owned food.'; END IF;
    UPDATE public.wallets SET dots = dots + v_total::integer, updated_at = now()
      WHERE user_id = p_user_id RETURNING dots INTO v_dots;
    UPDATE public.assanti_food_days SET dots = dots - v_total::integer
      WHERE delta_day = p_delta_day RETURNING * INTO v_day;
  END IF;
  RETURN jsonb_build_object('ok', true, 'slug', p_slug, 'quantity', p_quantity,
    'cost', CASE WHEN p_direction = 'purchase' THEN v_total ELSE 0 END,
    'value', CASE WHEN p_direction = 'sell' THEN v_total ELSE 0 END,
    'inventoryQuantity', v_quantity, 'merchantDots', v_day.dots, 'deltaDay', p_delta_day,
    'wallet', jsonb_build_object('dots', v_dots, 'crystals', v_crystals));
END;
$$;


ALTER FUNCTION public.trade_assanti_food_on_day(p_user_id uuid, p_slug text, p_quantity integer, p_direction text, p_delta_day integer) OWNER TO postgres;

--
-- Name: trade_kennith_basket(uuid, integer, jsonb, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.trade_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb, p_catalog jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
DECLARE
  v_line record; v_def record; v_item public.item_defs%ROWTYPE;
  v_stock integer; v_owned integer; v_reserved integer; v_relics integer;
  v_dots integer; v_merchant integer; v_cost bigint := 0; v_value bigint := 0;
BEGIN
  IF p_user_id IS NULL OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid trade basket.';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x WHERE jsonb_typeof(x) <> 'object'
      OR x->>'slug' IS NULL OR x->>'category' IS NULL
      OR coalesce(x->>'buy','') !~ '^[0-9]+$' OR coalesce(x->>'sell','') !~ '^[0-9]+$')
    OR (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_lines) x) <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'Invalid trade basket.';
  END IF;
  IF jsonb_typeof(p_catalog) IS DISTINCT FROM 'array' OR jsonb_array_length(p_catalog)=0
    OR (SELECT count(DISTINCT x->>'slug') FROM jsonb_array_elements(p_catalog) x) <> jsonb_array_length(p_catalog) THEN
    RAISE EXCEPTION 'Invalid trade catalog.';
  END IF;
  -- Same wallet -> merchant -> inventory lock order as the existing purchase RPC.
  SELECT dots INTO v_dots FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player wallet missing.'; END IF;
  PERFORM public.get_kennith_stock(p_delta_day,p_seed);
  SELECT dots INTO STRICT v_merchant FROM public.kennith_wallet_days WHERE delta_day=p_delta_day FOR UPDATE;
  -- Serialize wardrobe changes, including the legacy profile update path.
  PERFORM 1 FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines)
      AS x(slug text,category text,buy integer,sell integer) ORDER BY slug LOOP
    IF v_line.buy NOT BETWEEN 0 AND 20 OR v_line.sell NOT BETWEEN 0 AND 199 OR v_line.buy+v_line.sell=0 THEN
      RAISE EXCEPTION 'Invalid trade basket.';
    END IF;
    SELECT * INTO v_def FROM jsonb_to_recordset(p_catalog) AS x(slug text,category text,price integer)
      WHERE slug=v_line.slug AND category=v_line.category;
    IF NOT FOUND OR v_def.price IS NULL OR v_def.price<=0 THEN
      RAISE EXCEPTION 'That item is not available today.';
    END IF;
    SELECT * INTO v_item FROM public.item_defs WHERE slug=v_line.slug FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item trading is not configured.'; END IF;
    SELECT quantity INTO v_stock FROM public.kennith_stock
      WHERE delta_day=p_delta_day AND slug=v_line.slug FOR UPDATE;
    v_stock := coalesce(v_stock,0);
    IF v_line.buy>v_stock THEN RAISE EXCEPTION 'Not enough merchant stock.'; END IF;
    IF v_stock-v_line.buy+v_line.sell>199 THEN RAISE EXCEPTION 'Merchant stock is full.'; END IF;
    INSERT INTO public.inventory(user_id,item_id,qty) VALUES(p_user_id,v_item.id,0) ON CONFLICT DO NOTHING;
    SELECT qty INTO STRICT v_owned FROM public.inventory WHERE user_id=p_user_id AND item_id=v_item.id FOR UPDATE;
    IF v_line.sell>v_owned THEN RAISE EXCEPTION 'Not enough owned items.'; END IF;
    SELECT count(*) INTO v_reserved FROM public.profiles p,
      jsonb_each_text(coalesce(p.avatar_customization,'{}'::jsonb)) x
      WHERE p.user_id=p_user_id AND x.key IN ('upperBodyClothing','lowerBodyClothing','hat','eyewear') AND x.value=v_line.slug;
    -- Equipment migration is additive; wardrobe remains protected without it.
    IF to_regclass('public.pet_relic_equipment') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM public.pet_relic_equipment WHERE user_id=$1 AND item_id=$2'
        INTO v_relics USING p_user_id,v_item.id;
      v_reserved := v_reserved+v_relics;
    END IF;
    IF v_line.sell>greatest(0,v_owned-v_reserved) THEN
      RAISE EXCEPTION 'Unequip this item before using or selling its last available copy.';
    END IF;
    IF v_line.buy>0 AND v_owned::bigint-v_line.sell+v_line.buy>v_item.stack_limit THEN
      RAISE EXCEPTION 'Item stack is full.';
    END IF;
    UPDATE public.inventory SET qty=v_owned-v_line.sell+v_line.buy,updated_at=now()
      WHERE user_id=p_user_id AND item_id=v_item.id;
    INSERT INTO public.kennith_stock(delta_day,slug,category,price,quantity)
      VALUES(p_delta_day,v_line.slug,v_def.category,v_def.price,v_stock-v_line.buy+v_line.sell)
      ON CONFLICT(delta_day,slug) DO UPDATE SET quantity=EXCLUDED.quantity;
    v_cost := v_cost+v_def.price::bigint*v_line.buy;
    v_value := v_value+v_def.price::bigint*v_line.sell;
  END LOOP;
  IF v_dots::bigint-v_cost+v_value<0 THEN RAISE EXCEPTION 'Not enough Dots.'; END IF;
  IF v_merchant::bigint+v_cost-v_value<0 THEN RAISE EXCEPTION 'Kennith does not have enough Dots.'; END IF;
  IF v_dots::bigint-v_cost+v_value>2147483647 OR v_merchant::bigint+v_cost-v_value>2147483647 THEN
    RAISE EXCEPTION 'Wallet capacity exceeded.';
  END IF;
  IF p_delta_day <> floor((extract(epoch FROM clock_timestamp())+4500)/21600)::integer THEN
    RAISE EXCEPTION 'The Aliune day changed. Refresh the shop.';
  END IF;
  UPDATE public.wallets SET dots=(v_dots::bigint-v_cost+v_value)::integer,updated_at=now() WHERE user_id=p_user_id;
  UPDATE public.kennith_wallet_days SET dots=(v_merchant::bigint+v_cost-v_value)::integer WHERE delta_day=p_delta_day;
  RETURN jsonb_build_object('ok',true,'cost',v_cost,'value',v_value);
END;
$_$;


ALTER FUNCTION public.trade_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb, p_catalog jsonb) OWNER TO postgres;

--
-- Name: transfer_wildwood_egg(uuid, uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.transfer_wildwood_egg(p_user_id uuid, p_room_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_input public.pets%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_receipt jsonb;
  v_stats jsonb;
  v_result jsonb;
BEGIN
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player profile missing.'; END IF;
  SELECT room.* INTO v_room FROM public.wildwood_rooms room
    JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
    WHERE room.id = p_room_id AND expedition.user_id = p_user_id AND expedition.status = 'active'
    FOR UPDATE OF room;
  IF NOT FOUND OR v_room.event_payload#>>'{eggTreasure,status}' IS DISTINCT FROM 'pending'
    OR v_room.event_payload->>'eggTreasureClosed' = 'true' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 409, 'error', 'Egg is unavailable or already transferred.');
  END IF;
  v_receipt := v_room.event_payload->'eggTreasure';
  v_stats := v_receipt->'baseStats';
  SELECT * INTO v_input FROM jsonb_populate_record(NULL::public.pets, v_receipt->'egg');
  -- This intermediate inventory row is never committed independently. The
  -- existing storage action applies ownership, locking and capacity rules.
  INSERT INTO public.pets (user_id, name, species, rarity, line, stage, energy,
    hatch_ends_at, pending_hatch_minutes, is_active, location, hatch_time_alignment,
    growth_strong_stats, growth_weak_stat, passive_trait_id, passive_trait_key, mutation_capacity)
  VALUES (p_user_id, v_input.name, v_input.species, v_input.rarity, v_input.line, 'egg', 100,
    NULL, v_input.pending_hatch_minutes, false, 'inventory', v_input.hatch_time_alignment,
    v_input.growth_strong_stats, v_input.growth_weak_stat, v_input.passive_trait_id,
    v_input.passive_trait_key, v_input.mutation_capacity) RETURNING * INTO v_pet;
  INSERT INTO public.pet_stats (pet_id, base_hp, base_atk, base_def, base_spd, base_magi, base_mana, base_total)
  VALUES (v_pet.id, (v_stats->>'hp')::integer, (v_stats->>'atk')::integer,
    (v_stats->>'def')::integer, (v_stats->>'spd')::integer, (v_stats->>'magi')::integer,
    (v_stats->>'mana')::integer, (v_stats->>'base_total')::integer)
  ON CONFLICT (pet_id) DO UPDATE SET base_hp = EXCLUDED.base_hp,
    base_atk = EXCLUDED.base_atk, base_def = EXCLUDED.base_def, base_spd = EXCLUDED.base_spd,
    base_magi = EXCLUDED.base_magi, base_mana = EXCLUDED.base_mana, base_total = EXCLUDED.base_total;
  v_result := public.apply_pet_storage_action(p_user_id, 'store_inventory_egg', v_pet.id);
  IF v_result->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Egg storage was not confirmed.'; END IF;
  UPDATE public.wildwood_rooms SET event_payload = jsonb_set(event_payload, '{eggTreasure}',
    v_receipt || jsonb_build_object('status', 'transferred', 'petId', v_pet.id, 'transferredAt', now()))
    WHERE id = p_room_id;
  RETURN jsonb_build_object('success', true, 'roomId', p_room_id, 'petId', v_pet.id, 'destination', 'storage');
END;
$$;


ALTER FUNCTION public.transfer_wildwood_egg(p_user_id uuid, p_room_id uuid) OWNER TO postgres;

--
-- Name: transfer_wildwood_treasure_item(uuid, uuid); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.transfer_wildwood_treasure_item(p_user_id uuid, p_room_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_treasure public.wildwood_treasure_items%ROWTYPE;
  v_item public.item_defs%ROWTYPE;
  v_qty integer;
BEGIN
  -- Serialize claims, transfers and departure for the same player.
  PERFORM 1 FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  SELECT treasure.*
  INTO v_treasure
  FROM public.wildwood_treasure_items AS treasure
  JOIN public.wildwood_rooms AS room
    ON room.id = treasure.room_id
  JOIN public.wildwood_expeditions AS expedition
    ON expedition.id = room.expedition_id
  WHERE treasure.room_id = p_room_id
    AND treasure.user_id = p_user_id
    AND expedition.user_id = p_user_id
    AND expedition.status = 'active'
    AND treasure.transferred_at IS NULL
    AND treasure.discarded_at IS NULL
  FOR UPDATE OF treasure;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Treasure is unavailable or already claimed.'
    );
  END IF;

  SELECT *
  INTO v_item
  FROM public.item_defs
  WHERE id = v_treasure.item_id
  FOR SHARE;

  IF NOT FOUND OR v_item.stack_limit < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Item definition is unavailable.'
    );
  END IF;

  INSERT INTO public.inventory AS owned (
    user_id,
    item_id,
    qty
  )
  VALUES (
    p_user_id,
    v_item.id,
    1
  )
  ON CONFLICT (user_id, item_id)
  DO UPDATE
    SET qty = owned.qty + 1
    WHERE owned.qty < v_item.stack_limit
  RETURNING qty INTO v_qty;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 409,
      'error', 'Inventory stack is full.'
    );
  END IF;

  UPDATE public.wildwood_treasure_items
  SET transferred_at = now()
  WHERE room_id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'roomId', p_room_id,
    'slug', v_item.slug,
    'qty', v_qty
  );
END;
$$;


ALTER FUNCTION public.transfer_wildwood_treasure_item(p_user_id uuid, p_room_id uuid) OWNER TO postgres;

--
-- Name: validate_wildwood_pet_battle_result(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.validate_wildwood_pet_battle_result() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  saved_payload jsonb;
BEGIN
  SELECT room.event_payload INTO saved_payload
  FROM public.wildwood_rooms AS room
  JOIN public.wildwood_expeditions AS expedition ON expedition.id = room.expedition_id
  WHERE room.battle_id = NEW.battle_id
    AND expedition.user_id = NEW.user_id
    AND room.status = 'resolved'
  FOR SHARE OF room, expedition;

  IF NOT FOUND
    OR (saved_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
    OR (saved_payload #>> '{battle,id}') IS DISTINCT FROM NEW.battle_id::text
    OR (saved_payload #>> '{battle,status}') IS DISTINCT FROM NEW.result
    OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(saved_payload #> '{battle,participants}') AS participant
      WHERE participant ->> 'side' = 'player'
        AND COALESCE(participant ->> 'sourcePetId', participant ->> 'id') = NEW.pet_id::text
    )
  THEN
    RAISE EXCEPTION 'Invalid completed Wildwood battle participant' USING ERRCODE = '23514';
  END IF;

  PERFORM 1 FROM public.pets
  WHERE id = NEW.pet_id AND user_id = NEW.user_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_wildwood_pet_battle_result() OWNER TO postgres;

--
-- Name: wildwood_discovery_catalog(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.wildwood_discovery_catalog() RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $_$
  SELECT $items$[
  {
    "slug": "brookglass-pendant",
    "name": "Brookglass Pendant",
    "description": "A smooth piece of blue brookglass held in woven roots, shaped by the streams of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "emberheart-charm",
    "name": "Emberheart Charm",
    "description": "A warm coal-red stone cradled in charred bark, recovered from an old hearth in Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "rootbound-cairn",
    "name": "Rootbound Cairn",
    "description": "A small stone wrapped in living roots, carrying the steady Earth energy of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "whisperleaf-talisman",
    "name": "Whisperleaf Talisman",
    "description": "A pale leaf preserved within a hollow wooden ring, humming with the breezes of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "frostfern-brooch",
    "name": "Frostfern Brooch",
    "description": "A silver-blue fern impression in cold stone, gathered from a shaded hollow in Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "thunderbough-seal",
    "name": "Thunderbough Seal",
    "description": "A disc cut from a lightning-marked branch, holding the restless Storm energy of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "dawnpetal-locket",
    "name": "Dawnpetal Locket",
    "description": "A golden woodland petal enclosed in clear resin, warmed by dawn in Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "duskroot-amulet",
    "name": "Duskroot Amulet",
    "description": "A dark root polished into a crescent, carrying the quiet Shadow energy of Kithna’s Wildwood.",
    "type": "equipment",
    "category": "relic",
    "rarity": 2,
    "stack_limit": 1,
    "effects": {}
  },
  {
    "slug": "ripple-might-etching",
    "name": "Ripple Might Etching",
    "description": "A water-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "ripple-arcana-etching",
    "name": "Ripple Arcana Etching",
    "description": "A water-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "ember-might-etching",
    "name": "Ember Might Etching",
    "description": "A fire-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "ember-arcana-etching",
    "name": "Ember Arcana Etching",
    "description": "A fire-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "root-might-etching",
    "name": "Root Might Etching",
    "description": "A earth-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "root-arcana-etching",
    "name": "Root Arcana Etching",
    "description": "A earth-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "gale-might-etching",
    "name": "Gale Might Etching",
    "description": "A air-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "gale-arcana-etching",
    "name": "Gale Arcana Etching",
    "description": "A air-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "frost-might-etching",
    "name": "Frost Might Etching",
    "description": "A ice-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "frost-arcana-etching",
    "name": "Frost Arcana Etching",
    "description": "A ice-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "thunder-might-etching",
    "name": "Thunder Might Etching",
    "description": "A storm-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "thunder-arcana-etching",
    "name": "Thunder Arcana Etching",
    "description": "A storm-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dawn-might-etching",
    "name": "Dawn Might Etching",
    "description": "A light-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dawn-arcana-etching",
    "name": "Dawn Arcana Etching",
    "description": "A light-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dusk-might-etching",
    "name": "Dusk Might Etching",
    "description": "A shadow-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Physical Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  },
  {
    "slug": "dusk-arcana-etching",
    "name": "Dusk Arcana Etching",
    "description": "A shadow-aligned inscription from Kithna’s Wildwood, intended to strengthen a matching Relic’s existing Magic Attack capability.",
    "type": "material",
    "category": "etching",
    "rarity": 2,
    "stack_limit": 99,
    "effects": {}
  }
]$items$::jsonb;
$_$;


ALTER FUNCTION public.wildwood_discovery_catalog() OWNER TO postgres;

--
-- Name: wildwood_discovery_readiness(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.wildwood_discovery_readiness() RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.wildwood_discovery_catalog()) AS expected(value)
    LEFT JOIN public.item_defs AS item ON item.slug = expected.value->>'slug'
    WHERE item.id IS NULL OR jsonb_build_object(
      'slug', item.slug, 'name', item.name, 'description', item.description,
      'type', item.type, 'category', expected.value->>'category', 'rarity', item.rarity,
      'stack_limit', item.stack_limit, 'effects', item.effects) IS DISTINCT FROM expected.value
  ) THEN jsonb_build_object('version', 2, 'items', public.wildwood_discovery_catalog())
  ELSE NULL END;
$$;


ALTER FUNCTION public.wildwood_discovery_readiness() OWNER TO postgres;

--
-- Name: eggs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eggs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    starter_element public.elemental_line NOT NULL,
    hatch_ready_at timestamp with time zone NOT NULL,
    hatched_at timestamp with time zone,
    pet_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_original_starter boolean DEFAULT false NOT NULL
);


ALTER TABLE public.eggs OWNER TO postgres;

--
-- Name: TABLE eggs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.eggs IS 'CORE: Egg and hatch tracking. Active. Do not drop.';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    username text,
    display_name text,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    email text,
    alpha_ribbon_awarded boolean DEFAULT false NOT NULL,
    daily_care_completed_at timestamp with time zone,
    timezone text,
    intro_seen boolean DEFAULT false NOT NULL,
    intro_cutscene_completed boolean DEFAULT false NOT NULL,
    hatchery_initialized boolean DEFAULT false NOT NULL,
    active_title text,
    starter_cleanup_affected boolean DEFAULT false NOT NULL,
    starter_cleanup_notice_seen boolean DEFAULT false NOT NULL,
    avatar_customization jsonb,
    default_avatar_customization jsonb,
    CONSTRAINT avatar_customization_object CHECK (((avatar_customization IS NULL) OR (jsonb_typeof(avatar_customization) = 'object'::text))),
    CONSTRAINT default_avatar_customization_object CHECK (((default_avatar_customization IS NULL) OR (jsonb_typeof(default_avatar_customization) = 'object'::text))),
    CONSTRAINT profiles_email_format_check CHECK (((email IS NULL) OR (email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'::text))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.profiles IS 'CORE: User profile table. Active. Do not drop.';


--
-- Name: profiles_with_starter_pet; Type: VIEW; Schema: admin; Owner: postgres
--

CREATE VIEW admin.profiles_with_starter_pet AS
 WITH starter_egg AS (
         SELECT DISTINCT ON (e.user_id) e.user_id,
            e.id AS egg_id,
            e.pet_id,
            e.starter_element,
            e.created_at AS egg_created_at,
            e.hatched_at AS egg_hatched_at
           FROM public.eggs e
          ORDER BY e.user_id, e.created_at
        ), first_pet AS (
         SELECT DISTINCT ON (p.user_id) p.user_id,
            p.id AS pet_id,
            p.name,
            p.nickname,
            p.species,
            p.line,
            p.stage,
            p.created_at,
            p.hatched_at
           FROM public.pets p
          ORDER BY p.user_id, p.created_at
        )
 SELECT pr.user_id,
    pr.username,
    pr.display_name,
    pr.email,
    pr.is_admin,
    pr.role,
    pr.created_at,
    pr.updated_at,
    pr.alpha_ribbon_awarded,
    pr.daily_care_completed_at,
    pr.timezone,
    pr.intro_seen,
    pr.intro_cutscene_completed,
    pr.hatchery_initialized,
    se.egg_id AS starter_egg_id,
    se.pet_id AS starter_egg_pet_id,
    COALESCE(ep.id, fp.pet_id) AS starter_pet_id,
    COALESCE(ep.species, fp.species) AS starter_pet_species,
    COALESCE(ep.nickname, ep.name, fp.nickname, fp.name) AS starter_pet_name,
    COALESCE((ep.line)::text, (fp.line)::text, (se.starter_element)::text) AS starter_pet_element,
    COALESCE((ep.stage)::text, (fp.stage)::text) AS starter_pet_stage,
    (se.starter_element)::text AS starter_egg_element,
    se.egg_hatched_at,
    COALESCE(ep.hatched_at, fp.hatched_at) AS starter_pet_hatched_at,
        CASE
            WHEN ((pr.username IS NULL) AND (pr.display_name IS NULL) AND (pr.email IS NULL)) THEN 'profile_identity_null'::text
            WHEN ((se.user_id IS NULL) AND (fp.pet_id IS NULL)) THEN 'no_egg_no_pet'::text
            WHEN ((se.pet_id IS NULL) AND (fp.pet_id IS NULL)) THEN 'egg_exists_pet_id_null'::text
            WHEN ((se.pet_id IS NOT NULL) AND (ep.id IS NULL)) THEN 'egg_pet_link_broken'::text
            WHEN (COALESCE(ep.species, fp.species) IS NULL) THEN 'pet_exists_species_null'::text
            ELSE 'ok'::text
        END AS starter_pet_status
   FROM (((public.profiles pr
     LEFT JOIN starter_egg se ON ((se.user_id = pr.user_id)))
     LEFT JOIN public.pets ep ON ((ep.id = se.pet_id)))
     LEFT JOIN first_pet fp ON ((fp.user_id = pr.user_id)));


ALTER VIEW admin.profiles_with_starter_pet OWNER TO postgres;

--
-- Name: admin_user_starters; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.admin_user_starters AS
 WITH pet_counts AS (
         SELECT p.user_id,
            (count(*))::integer AS pet_count
           FROM public.pets p
          GROUP BY p.user_id
        ), starter_pets AS (
         SELECT DISTINCT ON (p.user_id) p.id,
            p.user_id,
            p.name,
            p.line,
            p.stage,
            p.level,
            p.xp,
            p.hatched_at,
            p.hunger,
            p.energy,
            p.atk,
            p.def,
            p.spd,
            p.hp_max,
            p.hp_cur,
            p.age,
            p.created_at,
            p.updated_at,
            p.gender,
            p.bond,
            p.last_cared_at,
            p.hatch_ends_at,
            p.cd_feed_ends_at,
            p.cd_clean_ends_at,
            p.cd_play_ends_at,
            p.unspent_points,
            p.is_active,
            p.last_hunger_decay_at,
            p.magi,
            p.personality_id,
            p.personality_key,
            p.mana,
            p.nickname,
            p.location,
            p.hatchery_slot_index,
            p.species,
            p.description,
            p.growth_strong_stats,
            p.growth_weak_stat,
            p.hatch_time_alignment,
            p.clean,
            p.happy,
            p.comfort,
            p.rest,
            p.neglect_hours,
            p.ran_away,
            p.runaway_at,
            p.last_care_decay_at,
            p.last_fed_at,
            p.cd_bond_ends_at,
            p.passive_trait_id,
            p.passive_trait_key,
            p.mutation_capacity,
            p.cd_pet_ends_at
           FROM public.pets p
          ORDER BY p.user_id, p.created_at, p.id
        )
 SELECT u.id AS user_id,
    COALESCE(NULLIF(pr.display_name, ''::text), NULLIF((u.raw_user_meta_data ->> 'display_name'::text), ''::text), NULLIF((u.raw_user_meta_data ->> 'name'::text), ''::text), NULLIF((u.raw_user_meta_data ->> 'username'::text), ''::text), '-'::text) AS display_name,
    COALESCE(NULLIF(pr.email, ''::text), NULLIF((u.email)::text, ''::text), '-'::text) AS email,
    u.created_at AS user_created_at,
    u.last_sign_in_at,
    COALESCE(pc.pet_count, 0) AS pet_count,
    (sp.id IS NOT NULL) AS owns_pet,
    sp.id AS starter_pet_id,
    COALESCE(NULLIF(sp.species, ''::text), '-'::text) AS starter_species_key,
        CASE COALESCE(NULLIF(sp.species, ''::text), ''::text)
            WHEN 'water_starter'::text THEN 'Mizu'::text
            WHEN 'fire_starter'::text THEN 'Kindlekin'::text
            WHEN 'earth_starter'::text THEN 'Twiglet'::text
            WHEN 'air_starter'::text THEN 'Wistpip'::text
            WHEN 'ice_starter'::text THEN 'Cribi'::text
            WHEN 'storm_starter'::text THEN 'Volb'::text
            WHEN 'light_starter'::text THEN 'Solen'::text
            WHEN 'shadow_day_good'::text THEN 'Esperon'::text
            WHEN 'shadow_night_bad'::text THEN 'Esperon'::text
            ELSE COALESCE(NULLIF(sp.species, ''::text),
            CASE
                WHEN (sp.line IS NOT NULL) THEN initcap(replace((sp.line)::text, '_'::text, ' '::text))
                ELSE NULL::text
            END, '-'::text)
        END AS starter_species,
    COALESCE(NULLIF(sp.nickname, ''::text), NULLIF(sp.name, ''::text), '-'::text) AS starter_nickname,
    COALESCE(NULLIF((sp.line)::text, ''::text), '-'::text) AS starter_element,
    COALESCE(NULLIF((sp.stage)::text, ''::text), '-'::text) AS starter_stage,
        CASE
            WHEN ((sp.species = 'water_starter'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Water Egg'::text
            WHEN ((sp.species = 'water_starter'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Mizu'::text
            WHEN ((sp.species = 'water_starter'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Mizule'::text
            WHEN ((sp.species = 'water_starter'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Zulelon'::text
            WHEN ((sp.species = 'water_starter'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Aquilyth'::text
            WHEN ((sp.species = 'fire_starter'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Fire Egg'::text
            WHEN ((sp.species = 'fire_starter'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Kindlekin'::text
            WHEN ((sp.species = 'fire_starter'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Moltikyn'::text
            WHEN ((sp.species = 'fire_starter'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Magnakyn'::text
            WHEN ((sp.species = 'fire_starter'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Lavakyn'::text
            WHEN ((sp.species = 'earth_starter'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Earth Egg'::text
            WHEN ((sp.species = 'earth_starter'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Twiglet'::text
            WHEN ((sp.species = 'earth_starter'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Rootle'::text
            WHEN ((sp.species = 'earth_starter'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Radaroot'::text
            WHEN ((sp.species = 'earth_starter'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Roovine'::text
            WHEN ((sp.species = 'air_starter'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Air Egg'::text
            WHEN ((sp.species = 'air_starter'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Wistpip'::text
            WHEN ((sp.species = 'air_starter'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Zephyx'::text
            WHEN ((sp.species = 'air_starter'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Phyxlion'::text
            WHEN ((sp.species = 'air_starter'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Phyxion'::text
            WHEN ((sp.species = 'ice_starter'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Ice Egg'::text
            WHEN ((sp.species = 'ice_starter'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Cribi'::text
            WHEN ((sp.species = 'ice_starter'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Cribit'::text
            WHEN ((sp.species = 'ice_starter'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Crabbit'::text
            WHEN ((sp.species = 'ice_starter'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Crionyx'::text
            WHEN ((sp.species = 'storm_starter'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Storm Egg'::text
            WHEN ((sp.species = 'storm_starter'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Volb'::text
            WHEN ((sp.species = 'storm_starter'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Voltlet'::text
            WHEN ((sp.species = 'storm_starter'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Tovote'::text
            WHEN ((sp.species = 'storm_starter'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Voltaris'::text
            WHEN ((sp.species = 'light_starter'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Light Egg'::text
            WHEN ((sp.species = 'light_starter'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Solen'::text
            WHEN ((sp.species = 'light_starter'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Solkit'::text
            WHEN ((sp.species = 'light_starter'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Solaryn'::text
            WHEN ((sp.species = 'light_starter'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Angelyx'::text
            WHEN ((sp.species = 'shadow_day_good'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Day Shadow Egg'::text
            WHEN ((sp.species = 'shadow_day_good'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Esperon'::text
            WHEN ((sp.species = 'shadow_day_good'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Flareclaw'::text
            WHEN ((sp.species = 'shadow_day_good'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Shadeclaw'::text
            WHEN ((sp.species = 'shadow_day_good'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Nightvielclaw'::text
            WHEN ((sp.species = 'shadow_night_bad'::text) AND ((sp.stage)::text = 'egg'::text)) THEN 'Night Shadow Egg'::text
            WHEN ((sp.species = 'shadow_night_bad'::text) AND ((sp.stage)::text = 'hatchling'::text)) THEN 'Esperon'::text
            WHEN ((sp.species = 'shadow_night_bad'::text) AND ((sp.stage)::text = 'lowform'::text)) THEN 'Noctimp'::text
            WHEN ((sp.species = 'shadow_night_bad'::text) AND ((sp.stage)::text = 'highform'::text)) THEN 'Nightmareimp'::text
            WHEN ((sp.species = 'shadow_night_bad'::text) AND ((sp.stage)::text = 'legion'::text)) THEN 'Espereonite'::text
            ELSE COALESCE(NULLIF(sp.name, ''::text), NULLIF(sp.nickname, ''::text), '-'::text)
        END AS starter_current_form,
    sp.created_at AS starter_created_at
   FROM (((auth.users u
     LEFT JOIN public.profiles pr ON ((pr.user_id = u.id)))
     LEFT JOIN pet_counts pc ON ((pc.user_id = u.id)))
     LEFT JOIN starter_pets sp ON ((sp.user_id = u.id)));


ALTER VIEW public.admin_user_starters OWNER TO postgres;

--
-- Name: aliune_signal_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.aliune_signal_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    condition text NOT NULL,
    region text NOT NULL,
    corruption text NOT NULL,
    report_text text NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    report_age_days integer,
    town text,
    CONSTRAINT aliune_signal_reports_condition_check CHECK ((condition = ANY (ARRAY['stable'::text, 'unbalanced'::text, 'unstable'::text]))),
    CONSTRAINT aliune_signal_reports_corruption_check CHECK ((corruption = ANY (ARRAY['none'::text, 'low'::text, 'rising'::text, 'high'::text, 'too high'::text]))),
    CONSTRAINT aliune_signal_reports_valid_window CHECK ((ends_at > starts_at))
);


ALTER TABLE public.aliune_signal_reports OWNER TO postgres;

--
-- Name: TABLE aliune_signal_reports; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.aliune_signal_reports IS 'REVIEW: Current Aliune Signal report table if frontend uses this.';


--
-- Name: aliune_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.aliune_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    condition text NOT NULL,
    region text NOT NULL,
    corruption text NOT NULL,
    report_age_days integer DEFAULT 0 NOT NULL,
    report_text text NOT NULL,
    portal_event boolean DEFAULT false NOT NULL,
    irregular_eggs boolean DEFAULT false NOT NULL,
    corrupted_egg_bonus numeric(5,2) DEFAULT 0.10 NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aliune_signals_condition_check CHECK ((condition = ANY (ARRAY['stable'::text, 'unbalanced'::text, 'unstable'::text]))),
    CONSTRAINT aliune_signals_corruption_check CHECK ((corruption = ANY (ARRAY['low'::text, 'rising'::text, 'high'::text, 'too high'::text]))),
    CONSTRAINT aliune_signals_region_check CHECK ((region = ANY (ARRAY['Starweald Rise'::text, 'Ashfall Coast'::text, 'Moonroot Fen'::text, 'Thornmere Hollow'::text]))),
    CONSTRAINT aliune_signals_report_age_days_check CHECK ((report_age_days >= 0)),
    CONSTRAINT aliune_signals_valid_window CHECK ((ends_at > starts_at))
);


ALTER TABLE public.aliune_signals OWNER TO postgres;

--
-- Name: TABLE aliune_signals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.aliune_signals IS 'REVIEW: Possible duplicate/older Aliune Signal table.';


--
-- Name: alpha_systems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alpha_systems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.alpha_systems OWNER TO postgres;

--
-- Name: TABLE alpha_systems; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.alpha_systems IS 'HOMEPAGE: Alpha systems list.';


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    page_scope text DEFAULT 'homepage'::text NOT NULL
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: TABLE announcements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.announcements IS 'HOMEPAGE: Announcement panel content.';


--
-- Name: assanti_food_catalog; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.assanti_food_catalog (
    slug text NOT NULL,
    price integer NOT NULL,
    hunger integer NOT NULL,
    permanent boolean DEFAULT false NOT NULL,
    CONSTRAINT assanti_food_catalog_hunger_check CHECK (((hunger >= 1) AND (hunger <= 50))),
    CONSTRAINT assanti_food_catalog_price_check CHECK (((price >= 1) AND (price <= 100)))
);


ALTER TABLE public.assanti_food_catalog OWNER TO postgres;

--
-- Name: assanti_food_claims; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.assanti_food_claims (
    user_id uuid NOT NULL,
    last_claimed_at timestamp with time zone NOT NULL
);


ALTER TABLE public.assanti_food_claims OWNER TO postgres;

--
-- Name: assanti_food_config; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.assanti_food_config (
    id boolean DEFAULT true NOT NULL,
    minimum_dots integer NOT NULL,
    maximum_dots integer NOT NULL,
    CONSTRAINT assanti_food_config_check CHECK ((maximum_dots >= minimum_dots)),
    CONSTRAINT assanti_food_config_id_check CHECK (id),
    CONSTRAINT assanti_food_config_minimum_dots_check CHECK ((minimum_dots >= 0))
);


ALTER TABLE public.assanti_food_config OWNER TO postgres;

--
-- Name: assanti_food_days; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.assanti_food_days (
    delta_day integer NOT NULL,
    slugs text[] NOT NULL,
    starting_dots integer NOT NULL,
    dots integer NOT NULL,
    CONSTRAINT assanti_food_days_delta_day_check CHECK ((delta_day >= 0)),
    CONSTRAINT assanti_food_days_dots_check CHECK ((dots >= 0)),
    CONSTRAINT assanti_food_days_slugs_check CHECK (((cardinality(slugs) >= 8) AND (cardinality(slugs) <= 12))),
    CONSTRAINT assanti_food_days_starting_dots_check CHECK ((starting_dots >= 0))
);


ALTER TABLE public.assanti_food_days OWNER TO postgres;

--
-- Name: awards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    icon_url text,
    rarity text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT awards_type_check CHECK ((type = ANY (ARRAY['ribbon'::text, 'trophy'::text])))
);


ALTER TABLE public.awards OWNER TO postgres;

--
-- Name: TABLE awards; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.awards IS 'PARKED: Future award/ribbon system.';


--
-- Name: battle_run_fights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.battle_run_fights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    fight_number integer NOT NULL,
    kind public.fight_kind DEFAULT 'normal'::public.fight_kind NOT NULL,
    enemy_level integer DEFAULT 1 NOT NULL,
    enemy_line public.elemental_line,
    result text NOT NULL,
    reward jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT battle_run_fights_fight_number_check CHECK (((fight_number >= 1) AND (fight_number <= 6))),
    CONSTRAINT battle_run_fights_result_check CHECK ((result = ANY (ARRAY['pending'::text, 'won'::text, 'lost'::text])))
);


ALTER TABLE public.battle_run_fights OWNER TO postgres;

--
-- Name: TABLE battle_run_fights; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.battle_run_fights IS 'CORE: Individual battle fights. Active/Alpha.';


--
-- Name: battle_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.battle_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_fight integer DEFAULT 1 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT battle_runs_current_fight_check CHECK (((current_fight >= 1) AND (current_fight <= 6))),
    CONSTRAINT battle_runs_status_check CHECK ((status = ANY (ARRAY['active'::text, 'won'::text, 'lost'::text])))
);


ALTER TABLE public.battle_runs OWNER TO postgres;

--
-- Name: TABLE battle_runs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.battle_runs IS 'CORE: Battle dungeon run tracking. Active/Alpha.';


--
-- Name: daily_care; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_care (
    user_id uuid NOT NULL,
    last_completed_at timestamp with time zone,
    streak integer DEFAULT 0 NOT NULL,
    alpha_ribbon_awarded boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_date_eastern date,
    completed_delta_day integer,
    CONSTRAINT daily_care_streak_nonnegative CHECK ((streak >= 0))
);


ALTER TABLE public.daily_care OWNER TO postgres;

--
-- Name: daily_login_rewards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_login_rewards (
    id uuid NOT NULL,
    streak integer DEFAULT 0 NOT NULL,
    last_claimed_at timestamp with time zone,
    potato_received boolean DEFAULT false NOT NULL
);


ALTER TABLE public.daily_login_rewards OWNER TO postgres;

--
-- Name: element_defs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.element_defs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    display_name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.element_defs OWNER TO postgres;

--
-- Name: TABLE element_defs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.element_defs IS 'PARKED: Normalized element definitions. Future replacement for hardcoded elements.';


--
-- Name: game_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_config (
    key text NOT NULL,
    value jsonb NOT NULL
);


ALTER TABLE public.game_config OWNER TO postgres;

--
-- Name: TABLE game_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.game_config IS 'PARKED: Global config store. Keep for future tuning.';


--
-- Name: hatchery_shelf_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hatchery_shelf_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    slot_index integer NOT NULL,
    unlocked boolean DEFAULT false NOT NULL,
    item_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hatchery_shelf_slots_slot_index_check CHECK (((slot_index >= 1) AND (slot_index <= 10)))
);


ALTER TABLE public.hatchery_shelf_slots OWNER TO postgres;

--
-- Name: TABLE hatchery_shelf_slots; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.hatchery_shelf_slots IS 'PARKED: Possible old/future hatchery shelf slot system.';


--
-- Name: hatchery_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hatchery_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    slot_index integer NOT NULL,
    unlocked boolean DEFAULT false NOT NULL,
    pet_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hatchery_slots_slot_index_check CHECK (((slot_index >= 1) AND (slot_index <= 12)))
);


ALTER TABLE public.hatchery_slots OWNER TO postgres;

--
-- Name: TABLE hatchery_slots; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.hatchery_slots IS 'PARKED: Hatchery slot system. Verify current code before changing.';


--
-- Name: home_objects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.home_objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    x integer DEFAULT 0 NOT NULL,
    y integer DEFAULT 0 NOT NULL,
    rotation integer DEFAULT 0 NOT NULL,
    placed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.home_objects OWNER TO postgres;

--
-- Name: TABLE home_objects; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.home_objects IS 'PARKED: Future room/home placement system.';


--
-- Name: homepage_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homepage_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    alert_color text DEFAULT 'yellow'::text NOT NULL,
    alert_type text DEFAULT 'news'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    cta_label text,
    cta_href text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT homepage_alerts_alert_color_check CHECK ((alert_color = ANY (ARRAY['yellow'::text, 'red'::text, 'blue'::text, 'pink'::text, 'green'::text]))),
    CONSTRAINT homepage_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['news'::text, 'event'::text, 'weather'::text, 'market'::text, 'anomaly'::text, 'funny'::text, 'other'::text])))
);


ALTER TABLE public.homepage_alerts OWNER TO postgres;

--
-- Name: TABLE homepage_alerts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.homepage_alerts IS 'HOMEPAGE: Aliune Signal/banner alerts.';


--
-- Name: homepage_alerts_live; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.homepage_alerts_live WITH (security_invoker='true') AS
 SELECT id,
    message,
    alert_color,
    alert_type,
    cta_label,
    cta_href,
    starts_at,
    ends_at,
    updated_at
   FROM public.homepage_alerts
  WHERE ((is_active = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at >= now())))
  ORDER BY updated_at DESC, created_at DESC;


ALTER VIEW public.homepage_alerts_live OWNER TO postgres;

--
-- Name: homepage_aliune_signal_live; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.homepage_aliune_signal_live WITH (security_invoker='true') AS
 SELECT id,
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
   FROM public.aliune_signal_reports
  WHERE ((enabled = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at >= now())))
  ORDER BY COALESCE(starts_at, created_at) DESC, created_at DESC;


ALTER VIEW public.homepage_aliune_signal_live OWNER TO postgres;

--
-- Name: homepage_alpha_systems_live; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.homepage_alpha_systems_live WITH (security_invoker='true') AS
 SELECT id,
    title,
    description,
    sort_order,
    released_at,
    created_at
   FROM public.alpha_systems
  WHERE (enabled = true)
  ORDER BY sort_order, released_at DESC, created_at DESC;


ALTER VIEW public.homepage_alpha_systems_live OWNER TO postgres;

--
-- Name: homepage_announcements_live; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.homepage_announcements_live WITH (security_invoker='true') AS
 SELECT id,
    title,
    body,
    created_at,
    updated_at
   FROM public.announcements
  WHERE ((is_published = true) AND (page_scope = 'homepage'::text))
  ORDER BY created_at DESC;


ALTER VIEW public.homepage_announcements_live OWNER TO postgres;

--
-- Name: homepage_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homepage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.log_category NOT NULL,
    title text NOT NULL,
    description text,
    display_order integer DEFAULT 0,
    patch_html text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.homepage_logs OWNER TO postgres;

--
-- Name: TABLE homepage_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.homepage_logs IS 'HOMEPAGE: Patch/next log display.';


--
-- Name: patch_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patch_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    title text,
    summary text,
    body text,
    is_published boolean DEFAULT true NOT NULL,
    released_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    new_notes text,
    updated_notes text,
    fixed_notes text,
    notes text
);


ALTER TABLE public.patch_notes OWNER TO postgres;

--
-- Name: TABLE patch_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.patch_notes IS 'HOMEPAGE: Versioned patch notes.';


--
-- Name: homepage_patch_notes_live; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.homepage_patch_notes_live WITH (security_invoker='true') AS
 SELECT id,
    version,
    title,
    summary,
    released_at,
    created_at,
    new_notes,
    updated_notes,
    fixed_notes,
    notes
   FROM public.patch_notes
  WHERE (is_published = true)
  ORDER BY released_at DESC, created_at DESC;


ALTER VIEW public.homepage_patch_notes_live OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    user_id uuid NOT NULL,
    item_id uuid NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pet_id uuid,
    CONSTRAINT inventory_qty_check CHECK ((qty >= 0))
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: TABLE inventory; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.inventory IS 'CORE: User inventory. Active.';


--
-- Name: item_defs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_defs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    type public.item_type NOT NULL,
    description text,
    rarity integer DEFAULT 1 NOT NULL,
    stack_limit integer DEFAULT 999 NOT NULL,
    effects jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT item_defs_rarity_check CHECK (((rarity >= 1) AND (rarity <= 5)))
);


ALTER TABLE public.item_defs OWNER TO postgres;

--
-- Name: TABLE item_defs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.item_defs IS 'CORE: Item definitions. Active.';


--
-- Name: kennith_stock; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.kennith_stock (
    delta_day integer NOT NULL,
    slug text NOT NULL,
    category text NOT NULL,
    price integer NOT NULL,
    quantity integer NOT NULL,
    CONSTRAINT kennith_stock_category_check CHECK ((category = ANY (ARRAY['clothing'::text, 'accessories'::text, 'relics'::text, 'petCare'::text]))),
    CONSTRAINT kennith_stock_check CHECK ((price =
CASE category
    WHEN 'clothing'::text THEN 30
    WHEN 'accessories'::text THEN 25
    WHEN 'relics'::text THEN 40
    WHEN 'petCare'::text THEN 10
    ELSE NULL::integer
END)),
    CONSTRAINT kennith_stock_quantity_check CHECK ((quantity >= 0))
);


ALTER TABLE public.kennith_stock OWNER TO postgres;

--
-- Name: kennith_stock_days; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.kennith_stock_days (
    delta_day integer NOT NULL
);


ALTER TABLE public.kennith_stock_days OWNER TO postgres;

--
-- Name: kennith_wallet_days; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.kennith_wallet_days (
    delta_day integer NOT NULL,
    starting_dots integer NOT NULL,
    dots integer NOT NULL,
    CONSTRAINT kennith_wallet_days_delta_day_check CHECK ((delta_day >= 0)),
    CONSTRAINT kennith_wallet_days_dots_check CHECK ((dots >= 0)),
    CONSTRAINT kennith_wallet_days_starting_dots_check CHECK (((starting_dots >= 1000) AND (starting_dots <= 2000)))
);


ALTER TABLE public.kennith_wallet_days OWNER TO postgres;

--
-- Name: legendary_kith_event_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legendary_kith_event_state (
    user_id uuid NOT NULL,
    legendary_key text NOT NULL,
    last_attempt_at timestamp with time zone,
    sighting_count integer DEFAULT 0 NOT NULL,
    egg_obtained_at timestamp with time zone,
    egg_pet_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legendary_kith_event_state_completion_check CHECK ((((egg_obtained_at IS NULL) AND (egg_pet_id IS NULL)) OR ((egg_obtained_at IS NOT NULL) AND (egg_pet_id IS NOT NULL)))),
    CONSTRAINT legendary_kith_event_state_sighting_count_check CHECK ((sighting_count >= 0)),
    CONSTRAINT legendary_kith_event_state_velune_key_check CHECK ((legendary_key = 'velune'::text))
);


ALTER TABLE public.legendary_kith_event_state OWNER TO postgres;

--
-- Name: TABLE legendary_kith_event_state; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.legendary_kith_event_state IS 'Durable server-owned eligibility and completion state for one-time Legendary Kith events.';


--
-- Name: mutations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    rarity text NOT NULL,
    description text NOT NULL,
    effect_summary text NOT NULL,
    drawback_summary text,
    effects jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mutations_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'legendary'::text])))
);


ALTER TABLE public.mutations OWNER TO postgres;

--
-- Name: party_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.party_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    slot_index integer NOT NULL,
    pet_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT party_slots_slot_index_check CHECK (((slot_index >= 1) AND (slot_index <= 4)))
);


ALTER TABLE public.party_slots OWNER TO postgres;

--
-- Name: TABLE party_slots; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.party_slots IS 'CORE: Active team/party slots. Active. Do not drop.';


--
-- Name: passive_traits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.passive_traits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    stat_key text NOT NULL,
    rarity text NOT NULL,
    description text NOT NULL,
    effect_summary text NOT NULL,
    effects jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT passive_traits_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'legendary'::text]))),
    CONSTRAINT passive_traits_stat_key_check CHECK ((stat_key = ANY (ARRAY['hp'::text, 'atk'::text, 'def'::text, 'spd'::text, 'magi'::text, 'mana'::text])))
);


ALTER TABLE public.passive_traits OWNER TO postgres;

--
-- Name: personalities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personalities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    definition text NOT NULL,
    modifiers jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.personalities OWNER TO postgres;

--
-- Name: TABLE personalities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.personalities IS 'CORE: Pet personality definitions. Active. Do not drop.';


--
-- Name: pet_awards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pet_id uuid NOT NULL,
    award_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.pet_awards OWNER TO postgres;

--
-- Name: TABLE pet_awards; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pet_awards IS 'PARKED: Future earned pet awards.';


--
-- Name: pet_battle_results; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.pet_battle_results (
    battle_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    result text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pet_battle_results_result_check CHECK ((result = ANY (ARRAY['victory'::text, 'defeat'::text])))
);


ALTER TABLE public.pet_battle_results OWNER TO postgres;

--
-- Name: pet_element_affinities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_element_affinities (
    pet_id uuid NOT NULL,
    element_id uuid NOT NULL,
    affinity integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pet_element_affinities_affinity_check CHECK ((affinity >= 0))
);


ALTER TABLE public.pet_element_affinities OWNER TO postgres;

--
-- Name: TABLE pet_element_affinities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pet_element_affinities IS 'PARKED: Normalized element affinities. Possible future replacement for pet_elements.';


--
-- Name: pet_element_deltas; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.pet_element_deltas (
    pet_id uuid NOT NULL,
    null_element integer DEFAULT 0 NOT NULL,
    water integer DEFAULT 0 NOT NULL,
    fire integer DEFAULT 0 NOT NULL,
    earth integer DEFAULT 0 NOT NULL,
    air integer DEFAULT 0 NOT NULL,
    ice integer DEFAULT 0 NOT NULL,
    storm integer DEFAULT 0 NOT NULL,
    light integer DEFAULT 0 NOT NULL,
    shadow integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pet_element_deltas_air_check CHECK ((air >= 0)),
    CONSTRAINT pet_element_deltas_earth_check CHECK ((earth >= 0)),
    CONSTRAINT pet_element_deltas_fire_check CHECK ((fire >= 0)),
    CONSTRAINT pet_element_deltas_ice_check CHECK ((ice >= 0)),
    CONSTRAINT pet_element_deltas_light_check CHECK ((light >= 0)),
    CONSTRAINT pet_element_deltas_null_element_check CHECK ((null_element >= 0)),
    CONSTRAINT pet_element_deltas_shadow_check CHECK ((shadow >= 0)),
    CONSTRAINT pet_element_deltas_storm_check CHECK ((storm >= 0)),
    CONSTRAINT pet_element_deltas_water_check CHECK ((water >= 0))
);


ALTER TABLE public.pet_element_deltas OWNER TO postgres;

--
-- Name: TABLE pet_element_deltas; Type: COMMENT; Schema: public; Owner: supabase_admin
--

COMMENT ON TABLE public.pet_element_deltas IS 'Per-Kith collected elemental Delta objects. Separate from Gym-trained pet_elements.';


--
-- Name: pet_elements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_elements (
    pet_id uuid NOT NULL,
    null_element integer DEFAULT 0 NOT NULL,
    water integer DEFAULT 0 NOT NULL,
    fire integer DEFAULT 0 NOT NULL,
    earth integer DEFAULT 0 NOT NULL,
    air integer DEFAULT 0 NOT NULL,
    ice integer DEFAULT 0 NOT NULL,
    storm integer DEFAULT 0 NOT NULL,
    light integer DEFAULT 0 NOT NULL,
    shadow integer DEFAULT 0 NOT NULL,
    CONSTRAINT pet_elements_check CHECK (((NULL::integer >= 0) AND (water >= 0) AND (fire >= 0) AND (earth >= 0) AND (air >= 0) AND (ice >= 0) AND (storm >= 0) AND (light >= 0) AND (shadow >= 0)))
);


ALTER TABLE public.pet_elements OWNER TO postgres;

--
-- Name: TABLE pet_elements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pet_elements IS 'CORE: Current elemental values. Active. Do not drop.';


--
-- Name: pet_mutations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_mutations (
    pet_id uuid NOT NULL,
    mutation_id uuid,
    has_mutation boolean NOT NULL,
    roll_value double precision NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    slot_index smallint DEFAULT 1 NOT NULL,
    CONSTRAINT pet_mutations_check CHECK ((((has_mutation = true) AND (mutation_id IS NOT NULL)) OR ((has_mutation = false) AND (mutation_id IS NULL)))),
    CONSTRAINT pet_mutations_roll_value_check CHECK (((roll_value >= (0)::double precision) AND (roll_value < (1)::double precision))),
    CONSTRAINT pet_mutations_slot_index_check CHECK (((slot_index >= 1) AND (slot_index <= 4)))
);


ALTER TABLE public.pet_mutations OWNER TO postgres;

--
-- Name: pet_relic_equipment; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.pet_relic_equipment (
    pet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    item_id uuid NOT NULL
);


ALTER TABLE public.pet_relic_equipment OWNER TO postgres;

--
-- Name: pet_skill_milestone_claims; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.pet_skill_milestone_claims (
    pet_id uuid NOT NULL,
    milestone_key text NOT NULL,
    skill_id uuid NOT NULL,
    species_id text NOT NULL,
    config_version text NOT NULL,
    eligible_choices jsonb NOT NULL,
    claimed_at timestamp with time zone DEFAULT now() NOT NULL,
    equipment_decision text DEFAULT 'legacy'::text NOT NULL,
    equipment_decision_slot smallint,
    CONSTRAINT pet_skill_claim_equipment_decision_slot_valid CHECK ((((equipment_decision = ANY (ARRAY['auto_equipped'::text, 'replaced'::text])) AND (equipment_decision_slot IS NOT NULL) AND ((equipment_decision_slot >= 1) AND (equipment_decision_slot <= 4))) OR ((equipment_decision = ANY (ARRAY['legacy'::text, 'pending'::text, 'declined'::text])) AND (equipment_decision_slot IS NULL)))),
    CONSTRAINT pet_skill_claim_equipment_decision_valid CHECK ((equipment_decision = ANY (ARRAY['legacy'::text, 'auto_equipped'::text, 'pending'::text, 'replaced'::text, 'declined'::text]))),
    CONSTRAINT pet_skill_milestone_claims_milestone_key_check CHECK ((milestone_key = ANY (ARRAY['level-2'::text, 'level-5'::text, 'level-8'::text, 'level-11'::text, 'level-14'::text, 'level-17'::text, 'level-20'::text, 'level-23'::text, 'level-26'::text, 'level-30'::text])))
);


ALTER TABLE public.pet_skill_milestone_claims OWNER TO postgres;

--
-- Name: COLUMN pet_skill_milestone_claims.equipment_decision_slot; Type: COMMENT; Schema: public; Owner: supabase_admin
--

COMMENT ON COLUMN public.pet_skill_milestone_claims.equipment_decision_slot IS 'Historical slot selected by the original auto-equip or replacement decision; not the current loadout. Preserve for idempotent retries.';


--
-- Name: pet_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_skills (
    pet_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    equipped boolean DEFAULT false NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    equipped_slot smallint,
    CONSTRAINT pet_skills_equipped_slot_flag CHECK (((equipped_slot IS NULL) OR (equipped = true))),
    CONSTRAINT pet_skills_equipped_slot_range CHECK (((equipped_slot IS NULL) OR ((equipped_slot >= 1) AND (equipped_slot <= 4))))
);


ALTER TABLE public.pet_skills OWNER TO postgres;

--
-- Name: TABLE pet_skills; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pet_skills IS 'CORE: Pet unlocked/equipped skills. Active.';


--
-- Name: COLUMN pet_skills.equipped_slot; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.pet_skills.equipped_slot IS 'Active skill slot 1-4 on this individual pet; null means unequipped or unreconciled legacy equipment. Passive skills must not occupy slots.';


--
-- Name: pet_stat_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_stat_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pet_id uuid NOT NULL,
    level integer NOT NULL,
    hp integer DEFAULT 0 NOT NULL,
    atk integer DEFAULT 0 NOT NULL,
    magi integer DEFAULT 0 NOT NULL,
    def integer DEFAULT 0 NOT NULL,
    spd integer DEFAULT 0 NOT NULL,
    mana integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    CONSTRAINT pet_alloc_non_negative CHECK (((COALESCE(hp, 0) >= 0) AND (COALESCE(atk, 0) >= 0) AND (COALESCE(def, 0) >= 0) AND (COALESCE(spd, 0) >= 0) AND (COALESCE(magi, 0) >= 0) AND (COALESCE(mana, 0) >= 0))),
    CONSTRAINT pet_alloc_points_valid CHECK (((hp >= 0) AND (atk >= 0) AND (magi >= 0) AND (def >= 0) AND (spd >= 0) AND (mana >= 0) AND (((level = 1) AND (((((((hp + atk) + magi) + def) + spd) + mana) >= 0) AND ((((((hp + atk) + magi) + def) + spd) + mana) <= 30))) OR ((level > 1) AND ((((((hp + atk) + magi) + def) + spd) + mana) = 1))))),
    CONSTRAINT pet_stat_allocations_check CHECK (((hp >= 0) AND (atk >= 0) AND (magi >= 0) AND (def >= 0) AND (spd >= 0) AND (mana >= 0))),
    CONSTRAINT pet_stat_allocations_level_check CHECK (((level >= 1) AND (level <= 30)))
);


ALTER TABLE public.pet_stat_allocations OWNER TO postgres;

--
-- Name: TABLE pet_stat_allocations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pet_stat_allocations IS 'CORE: Level/stat allocation history. Active. Do not drop.';


--
-- Name: pet_stat_spend_receipts; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.pet_stat_spend_receipts (
    pet_id uuid NOT NULL,
    request_id uuid NOT NULL,
    allocation jsonb NOT NULL,
    result jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pet_stat_spend_receipts OWNER TO postgres;

--
-- Name: pet_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_stats (
    pet_id uuid NOT NULL,
    base_hp integer NOT NULL,
    base_atk integer NOT NULL,
    base_magi integer NOT NULL,
    base_def integer NOT NULL,
    base_spd integer NOT NULL,
    base_mana integer NOT NULL,
    base_total integer DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pet_stats_birth_caps CHECK (((base_hp >= 0) AND (base_hp <= 10) AND ((base_atk >= 0) AND (base_atk <= 10)) AND ((base_magi >= 0) AND (base_magi <= 10)) AND ((base_def >= 0) AND (base_def <= 10)) AND ((base_spd >= 0) AND (base_spd <= 10)) AND ((base_mana >= 0) AND (base_mana <= 10)))),
    CONSTRAINT pet_stats_birth_sum CHECK (((((((base_hp + base_atk) + base_magi) + base_def) + base_spd) + base_mana) = base_total)),
    CONSTRAINT pet_stats_check CHECK (((base_hp >= 0) AND (base_atk >= 0) AND (base_magi >= 0) AND (base_def >= 0) AND (base_spd >= 0) AND (base_mana >= 0)))
);


ALTER TABLE public.pet_stats OWNER TO postgres;

--
-- Name: TABLE pet_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pet_stats IS 'Base stats for pets. Egg base stats sum to 10, then +7 random points at hatch = 17 total. All stat values must be explicitly provided during pet creation.';


--
-- Name: player_quests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_quests (
    user_id uuid NOT NULL,
    quest_key text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    target integer NOT NULL,
    accepted_at timestamp with time zone,
    completed_at timestamp with time zone,
    reward_claimed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_quests_progress_check CHECK ((progress >= 0)),
    CONSTRAINT player_quests_somethings_afoot_progress_check CHECK (((quest_key <> 'somethings_afoot'::text) OR ((target = 5) AND ((progress >= 0) AND (progress <= 5))))),
    CONSTRAINT player_quests_status_check CHECK ((status = ANY (ARRAY['available'::text, 'active'::text, 'ready_to_turn_in'::text, 'completed'::text]))),
    CONSTRAINT player_quests_target_check CHECK ((target > 0))
);


ALTER TABLE public.player_quests OWNER TO postgres;

--
-- Name: poe_tay_toe_finds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.poe_tay_toe_finds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    location_key text NOT NULL,
    dots_awarded integer NOT NULL,
    item_slug text NOT NULL,
    item_qty integer NOT NULL,
    found_at timestamp with time zone DEFAULT now() NOT NULL,
    effect_key text DEFAULT 'legacy_dots'::text NOT NULL,
    effect_expires_at timestamp with time zone,
    relocated_at timestamp with time zone,
    CONSTRAINT poe_tay_toe_finds_dots_awarded_check CHECK ((dots_awarded >= 0)),
    CONSTRAINT poe_tay_toe_finds_item_qty_check CHECK ((item_qty >= 0)),
    CONSTRAINT potato_effect_key_check CHECK ((effect_key = ANY (ARRAY['legacy_dots'::text, 'potato_power'::text, 'warm_potato'::text, 'lucky_spud'::text, 'potato_brain'::text, 'rotten_luck'::text, 'absolutely_nothing'::text])))
);


ALTER TABLE public.poe_tay_toe_finds OWNER TO postgres;

--
-- Name: poe_tay_toe_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.poe_tay_toe_state (
    id smallint DEFAULT 1 NOT NULL,
    current_location_key text NOT NULL,
    hidden_by_user_id uuid,
    hidden_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_by_user_id uuid,
    claimed_at timestamp with time zone,
    find_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_version uuid DEFAULT gen_random_uuid() NOT NULL,
    last_discovery_id uuid,
    CONSTRAINT poe_tay_toe_state_find_count_check CHECK ((find_count >= 0)),
    CONSTRAINT poe_tay_toe_state_id_check CHECK ((id = 1))
);


ALTER TABLE public.poe_tay_toe_state OWNER TO postgres;

--
-- Name: pve_instability_fights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pve_instability_fights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    fight_number integer NOT NULL,
    enemy_name text NOT NULL,
    enemy_level integer NOT NULL,
    enemy_element text NOT NULL,
    enemy_line text NOT NULL,
    result text,
    rewards jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pve_instability_fights_fight_number_check CHECK ((fight_number > 0)),
    CONSTRAINT pve_instability_fights_result_check CHECK ((result = ANY (ARRAY['victory'::text, 'defeat'::text, 'abandoned'::text])))
);


ALTER TABLE public.pve_instability_fights OWNER TO postgres;

--
-- Name: pve_instability_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pve_instability_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    instability_id uuid NOT NULL,
    pet_id uuid NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    current_fight integer DEFAULT 1 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pve_instability_runs_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])))
);


ALTER TABLE public.pve_instability_runs OWNER TO postgres;

--
-- Name: pve_research_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pve_research_stats (
    user_id uuid NOT NULL,
    total_instabilities_cleared integer DEFAULT 0 NOT NULL,
    total_fights_won integer DEFAULT 0 NOT NULL,
    total_bosses_defeated integer DEFAULT 0 NOT NULL,
    rarest_drop_tier integer DEFAULT 0 NOT NULL,
    first_clear_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pve_research_stats OWNER TO postgres;

--
-- Name: retired_kith_species; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retired_kith_species (
    species_key text NOT NULL,
    display_name text NOT NULL,
    element_key text NOT NULL,
    retirement_group text DEFAULT 'Closed Alpha'::text NOT NULL,
    retirement_note text DEFAULT 'Retired to the void of unused Alpha content.'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.retired_kith_species OWNER TO postgres;

--
-- Name: rune_defs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rune_defs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    rune_number smallint NOT NULL,
    stage_tier text NOT NULL,
    vocabulary_group text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rune_defs_rune_number_check CHECK (((rune_number >= 1) AND (rune_number <= 26))),
    CONSTRAINT rune_defs_stage_tier_check CHECK ((stage_tier = ANY (ARRAY['hatchling'::text, 'lowform'::text, 'highform'::text, 'legion'::text, 'mythical_legendary'::text])))
);


ALTER TABLE public.rune_defs OWNER TO postgres;

--
-- Name: signup_trigger_errors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.signup_trigger_errors (
    id bigint NOT NULL,
    user_id uuid,
    email text,
    step text NOT NULL,
    error_message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.signup_trigger_errors OWNER TO postgres;

--
-- Name: signup_trigger_errors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.signup_trigger_errors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.signup_trigger_errors_id_seq OWNER TO postgres;

--
-- Name: signup_trigger_errors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.signup_trigger_errors_id_seq OWNED BY public.signup_trigger_errors.id;


--
-- Name: skill_defs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_defs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    required_level integer DEFAULT 1 NOT NULL,
    requirements jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.skill_defs OWNER TO postgres;

--
-- Name: TABLE skill_defs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.skill_defs IS 'CORE: Skill definitions. Active.';


--
-- Name: trainer_awards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trainer_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    award_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL,
    context jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.trainer_awards OWNER TO postgres;

--
-- Name: trainer_progression; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trainer_progression (
    user_id uuid NOT NULL,
    trainer_level integer DEFAULT 1 NOT NULL,
    trainer_xp bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    corrupted_eggs_lost integer DEFAULT 0 NOT NULL,
    CONSTRAINT trainer_progression_corrupted_eggs_lost_check CHECK ((corrupted_eggs_lost >= 0)),
    CONSTRAINT trainer_progression_trainer_level_check CHECK ((trainer_level >= 1)),
    CONSTRAINT trainer_progression_trainer_xp_check CHECK ((trainer_xp >= 0))
);


ALTER TABLE public.trainer_progression OWNER TO postgres;

--
-- Name: TABLE trainer_progression; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.trainer_progression IS 'Server-owned player progression. Kith level and elemental training remain separate systems.';


--
-- Name: user_kith_discoveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_kith_discoveries (
    user_id uuid NOT NULL,
    species_key text NOT NULL,
    display_name text NOT NULL,
    first_hatched_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_kith_discoveries OWNER TO postgres;

--
-- Name: user_resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_resources (
    user_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_resources OWNER TO postgres;

--
-- Name: TABLE user_resources; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_resources IS 'PARKED: User resource/trough system.';


--
-- Name: user_retired_kith; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_retired_kith (
    user_id uuid NOT NULL,
    species_key text NOT NULL,
    first_owned_at timestamp with time zone NOT NULL,
    archived_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_retired_kith OWNER TO postgres;

--
-- Name: user_runes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_runes (
    user_id uuid NOT NULL,
    rune_id uuid NOT NULL,
    discovered_at timestamp with time zone DEFAULT now() NOT NULL,
    discovery_context jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.user_runes OWNER TO postgres;

--
-- Name: v_pet_storage_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_pet_storage_stats WITH (security_invoker='true') AS
 SELECT pet_id,
    base_hp AS hp,
    base_atk AS atk,
    base_magi AS magi,
    base_def AS def,
    base_spd AS spd,
    base_mana AS mana,
    base_total
   FROM public.pet_stats s;


ALTER VIEW public.v_pet_storage_stats OWNER TO postgres;

--
-- Name: v_pet_total_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_pet_total_stats WITH (security_invoker='true') AS
 SELECT s.pet_id,
    (s.base_hp + COALESCE(sum(a.hp), (0)::bigint)) AS hp,
    (s.base_atk + COALESCE(sum(a.atk), (0)::bigint)) AS atk,
    (s.base_magi + COALESCE(sum(a.magi), (0)::bigint)) AS magi,
    (s.base_def + COALESCE(sum(a.def), (0)::bigint)) AS def,
    (s.base_spd + COALESCE(sum(a.spd), (0)::bigint)) AS spd,
    (s.base_mana + COALESCE(sum(a.mana), (0)::bigint)) AS mana,
    s.base_total,
    COALESCE(count(a.*), (0)::bigint) AS allocated_levels
   FROM (public.pet_stats s
     LEFT JOIN public.pet_stat_allocations a ON ((a.pet_id = s.pet_id)))
  GROUP BY s.pet_id, s.base_hp, s.base_atk, s.base_magi, s.base_def, s.base_spd, s.base_mana, s.base_total;


ALTER VIEW public.v_pet_total_stats OWNER TO postgres;

--
-- Name: wallet_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    currency public.currency_kind NOT NULL,
    delta integer NOT NULL,
    reason text NOT NULL,
    ref_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallet_ledger OWNER TO postgres;

--
-- Name: TABLE wallet_ledger; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wallet_ledger IS 'CORE: Currency transaction log. Active.';


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    user_id uuid NOT NULL,
    dots integer DEFAULT 5000 NOT NULL,
    gems integer DEFAULT 0 NOT NULL,
    crystals integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_crystals_check CHECK ((crystals >= 0)),
    CONSTRAINT wallets_dots_check CHECK ((dots >= 0)),
    CONSTRAINT wallets_gems_check CHECK ((gems >= 0))
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- Name: TABLE wallets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wallets IS 'CORE: User currencies. Active.';


--
-- Name: wildwood_expeditions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wildwood_expeditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    intro_step integer DEFAULT 0 NOT NULL,
    depth integer DEFAULT 0 NOT NULL,
    rooms_since_corrupted integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wildwood_expeditions_depth_check CHECK ((depth >= 0)),
    CONSTRAINT wildwood_expeditions_intro_step_check CHECK ((intro_step >= 0)),
    CONSTRAINT wildwood_expeditions_rooms_since_corrupted_check CHECK ((rooms_since_corrupted >= 0)),
    CONSTRAINT wildwood_expeditions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'left'::text, 'completed'::text])))
);


ALTER TABLE public.wildwood_expeditions OWNER TO postgres;

--
-- Name: wildwood_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wildwood_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expedition_id uuid NOT NULL,
    sequence_number integer NOT NULL,
    event_kind text NOT NULL,
    event_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'unresolved'::text NOT NULL,
    battle_id uuid,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    item_claimed_at timestamp with time zone,
    item_available_at timestamp with time zone,
    CONSTRAINT wildwood_rooms_event_kind_check CHECK ((event_kind = ANY (ARRAY['flavor'::text, 'quest_clue'::text, 'corrupted_battle'::text]))),
    CONSTRAINT wildwood_rooms_sequence_number_check CHECK ((sequence_number >= 0)),
    CONSTRAINT wildwood_rooms_status_check CHECK ((status = ANY (ARRAY['unresolved'::text, 'resolved'::text, 'left'::text])))
);


ALTER TABLE public.wildwood_rooms OWNER TO postgres;

--
-- Name: wildwood_treasure_items; Type: TABLE; Schema: public; Owner: supabase_admin
--

CREATE TABLE public.wildwood_treasure_items (
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    transferred_at timestamp with time zone,
    discarded_at timestamp with time zone,
    CONSTRAINT wildwood_treasure_one_outcome CHECK ((NOT ((transferred_at IS NOT NULL) AND (discarded_at IS NOT NULL))))
);


ALTER TABLE public.wildwood_treasure_items OWNER TO postgres;

--
-- Name: signup_trigger_errors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signup_trigger_errors ALTER COLUMN id SET DEFAULT nextval('public.signup_trigger_errors_id_seq'::regclass);


--
-- Name: aliune_signal_reports aliune_signal_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aliune_signal_reports
    ADD CONSTRAINT aliune_signal_reports_pkey PRIMARY KEY (id);


--
-- Name: aliune_signals aliune_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aliune_signals
    ADD CONSTRAINT aliune_signals_pkey PRIMARY KEY (id);


--
-- Name: alpha_systems alpha_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alpha_systems
    ADD CONSTRAINT alpha_systems_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: assanti_food_catalog assanti_food_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.assanti_food_catalog
    ADD CONSTRAINT assanti_food_catalog_pkey PRIMARY KEY (slug);


--
-- Name: assanti_food_claims assanti_food_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.assanti_food_claims
    ADD CONSTRAINT assanti_food_claims_pkey PRIMARY KEY (user_id);


--
-- Name: assanti_food_config assanti_food_config_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.assanti_food_config
    ADD CONSTRAINT assanti_food_config_pkey PRIMARY KEY (id);


--
-- Name: assanti_food_days assanti_food_days_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.assanti_food_days
    ADD CONSTRAINT assanti_food_days_pkey PRIMARY KEY (delta_day);


--
-- Name: awards awards_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_key_key UNIQUE (key);


--
-- Name: awards awards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_pkey PRIMARY KEY (id);


--
-- Name: battle_run_fights battle_run_fights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_run_fights
    ADD CONSTRAINT battle_run_fights_pkey PRIMARY KEY (id);


--
-- Name: battle_run_fights battle_run_fights_run_id_fight_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_run_fights
    ADD CONSTRAINT battle_run_fights_run_id_fight_number_key UNIQUE (run_id, fight_number);


--
-- Name: battle_runs battle_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_runs
    ADD CONSTRAINT battle_runs_pkey PRIMARY KEY (id);


--
-- Name: daily_care daily_care_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_care
    ADD CONSTRAINT daily_care_pkey PRIMARY KEY (user_id);


--
-- Name: daily_care daily_care_user_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_care
    ADD CONSTRAINT daily_care_user_date_unique UNIQUE (user_id, completed_date_eastern);


--
-- Name: CONSTRAINT daily_care_user_date_unique ON daily_care; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT daily_care_user_date_unique ON public.daily_care IS 'Prevents race conditions by ensuring a user can only complete daily care once per Eastern calendar day';


--
-- Name: daily_login_rewards daily_login_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_login_rewards
    ADD CONSTRAINT daily_login_rewards_pkey PRIMARY KEY (id);


--
-- Name: eggs eggs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eggs
    ADD CONSTRAINT eggs_pkey PRIMARY KEY (id);


--
-- Name: element_defs element_defs_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.element_defs
    ADD CONSTRAINT element_defs_key_key UNIQUE (key);


--
-- Name: element_defs element_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.element_defs
    ADD CONSTRAINT element_defs_pkey PRIMARY KEY (id);


--
-- Name: game_config game_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_config
    ADD CONSTRAINT game_config_pkey PRIMARY KEY (key);


--
-- Name: hatchery_shelf_slots hatchery_shelf_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hatchery_shelf_slots
    ADD CONSTRAINT hatchery_shelf_slots_pkey PRIMARY KEY (id);


--
-- Name: hatchery_shelf_slots hatchery_shelf_slots_user_id_slot_index_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hatchery_shelf_slots
    ADD CONSTRAINT hatchery_shelf_slots_user_id_slot_index_key UNIQUE (user_id, slot_index);


--
-- Name: hatchery_slots hatchery_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hatchery_slots
    ADD CONSTRAINT hatchery_slots_pkey PRIMARY KEY (id);


--
-- Name: hatchery_slots hatchery_slots_user_id_slot_index_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hatchery_slots
    ADD CONSTRAINT hatchery_slots_user_id_slot_index_key UNIQUE (user_id, slot_index);


--
-- Name: home_objects home_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.home_objects
    ADD CONSTRAINT home_objects_pkey PRIMARY KEY (id);


--
-- Name: homepage_alerts homepage_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homepage_alerts
    ADD CONSTRAINT homepage_alerts_pkey PRIMARY KEY (id);


--
-- Name: homepage_logs homepage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homepage_logs
    ADD CONSTRAINT homepage_logs_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (user_id, item_id);


--
-- Name: item_defs item_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_defs
    ADD CONSTRAINT item_defs_pkey PRIMARY KEY (id);


--
-- Name: item_defs item_defs_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_defs
    ADD CONSTRAINT item_defs_slug_key UNIQUE (slug);


--
-- Name: kennith_stock_days kennith_stock_days_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.kennith_stock_days
    ADD CONSTRAINT kennith_stock_days_pkey PRIMARY KEY (delta_day);


--
-- Name: kennith_stock kennith_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.kennith_stock
    ADD CONSTRAINT kennith_stock_pkey PRIMARY KEY (delta_day, slug);


--
-- Name: kennith_wallet_days kennith_wallet_days_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.kennith_wallet_days
    ADD CONSTRAINT kennith_wallet_days_pkey PRIMARY KEY (delta_day);


--
-- Name: legendary_kith_event_state legendary_kith_event_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legendary_kith_event_state
    ADD CONSTRAINT legendary_kith_event_state_pkey PRIMARY KEY (user_id, legendary_key);


--
-- Name: mutations mutations_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_key_key UNIQUE (key);


--
-- Name: mutations mutations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_pkey PRIMARY KEY (id);


--
-- Name: party_slots party_slots_pet_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_slots
    ADD CONSTRAINT party_slots_pet_id_key UNIQUE (pet_id);


--
-- Name: party_slots party_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_slots
    ADD CONSTRAINT party_slots_pkey PRIMARY KEY (id);


--
-- Name: party_slots party_slots_user_id_slot_index_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_slots
    ADD CONSTRAINT party_slots_user_id_slot_index_key UNIQUE (user_id, slot_index);


--
-- Name: passive_traits passive_traits_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passive_traits
    ADD CONSTRAINT passive_traits_key_key UNIQUE (key);


--
-- Name: passive_traits passive_traits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passive_traits
    ADD CONSTRAINT passive_traits_pkey PRIMARY KEY (id);


--
-- Name: patch_notes patch_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patch_notes
    ADD CONSTRAINT patch_notes_pkey PRIMARY KEY (id);


--
-- Name: patch_notes patch_notes_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patch_notes
    ADD CONSTRAINT patch_notes_version_key UNIQUE (version);


--
-- Name: personalities personalities_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personalities
    ADD CONSTRAINT personalities_key_key UNIQUE (key);


--
-- Name: personalities personalities_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personalities
    ADD CONSTRAINT personalities_key_unique UNIQUE (key);


--
-- Name: personalities personalities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personalities
    ADD CONSTRAINT personalities_pkey PRIMARY KEY (id);


--
-- Name: pet_awards pet_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_awards
    ADD CONSTRAINT pet_awards_pkey PRIMARY KEY (id);


--
-- Name: pet_battle_results pet_battle_results_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_battle_results
    ADD CONSTRAINT pet_battle_results_pkey PRIMARY KEY (battle_id, pet_id);


--
-- Name: pet_element_affinities pet_element_affinities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_element_affinities
    ADD CONSTRAINT pet_element_affinities_pkey PRIMARY KEY (pet_id, element_id);


--
-- Name: pet_element_deltas pet_element_deltas_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_element_deltas
    ADD CONSTRAINT pet_element_deltas_pkey PRIMARY KEY (pet_id);


--
-- Name: pet_elements pet_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_elements
    ADD CONSTRAINT pet_elements_pkey PRIMARY KEY (pet_id);


--
-- Name: pet_mutations pet_mutations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_mutations
    ADD CONSTRAINT pet_mutations_pkey PRIMARY KEY (pet_id, slot_index);


--
-- Name: pet_relic_equipment pet_relic_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_relic_equipment
    ADD CONSTRAINT pet_relic_equipment_pkey PRIMARY KEY (pet_id);


--
-- Name: pet_skill_milestone_claims pet_skill_milestone_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_skill_milestone_claims
    ADD CONSTRAINT pet_skill_milestone_claims_pkey PRIMARY KEY (pet_id, milestone_key);


--
-- Name: pet_skills pet_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_skills
    ADD CONSTRAINT pet_skills_pkey PRIMARY KEY (pet_id, skill_id);


--
-- Name: pet_stat_allocations pet_stat_allocations_pet_id_level_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_stat_allocations
    ADD CONSTRAINT pet_stat_allocations_pet_id_level_key UNIQUE (pet_id, level);


--
-- Name: pet_stat_allocations pet_stat_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_stat_allocations
    ADD CONSTRAINT pet_stat_allocations_pkey PRIMARY KEY (id);


--
-- Name: pet_stat_spend_receipts pet_stat_spend_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_stat_spend_receipts
    ADD CONSTRAINT pet_stat_spend_receipts_pkey PRIMARY KEY (pet_id, request_id);


--
-- Name: pet_stats pet_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_stats
    ADD CONSTRAINT pet_stats_pkey PRIMARY KEY (pet_id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: player_quests player_quests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_quests
    ADD CONSTRAINT player_quests_pkey PRIMARY KEY (user_id, quest_key);


--
-- Name: poe_tay_toe_finds poe_tay_toe_finds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poe_tay_toe_finds
    ADD CONSTRAINT poe_tay_toe_finds_pkey PRIMARY KEY (id);


--
-- Name: poe_tay_toe_state poe_tay_toe_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poe_tay_toe_state
    ADD CONSTRAINT poe_tay_toe_state_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: pve_active_buffs pve_active_buffs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_active_buffs
    ADD CONSTRAINT pve_active_buffs_pkey PRIMARY KEY (id);


--
-- Name: pve_instabilities pve_instabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instabilities
    ADD CONSTRAINT pve_instabilities_pkey PRIMARY KEY (id);


--
-- Name: pve_instability_fights pve_instability_fights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instability_fights
    ADD CONSTRAINT pve_instability_fights_pkey PRIMARY KEY (id);


--
-- Name: pve_instability_fights pve_instability_fights_run_id_fight_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instability_fights
    ADD CONSTRAINT pve_instability_fights_run_id_fight_number_key UNIQUE (run_id, fight_number);


--
-- Name: pve_instability_runs pve_instability_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instability_runs
    ADD CONSTRAINT pve_instability_runs_pkey PRIMARY KEY (id);


--
-- Name: pve_research_stats pve_research_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_research_stats
    ADD CONSTRAINT pve_research_stats_pkey PRIMARY KEY (user_id);


--
-- Name: retired_kith_species retired_kith_species_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retired_kith_species
    ADD CONSTRAINT retired_kith_species_pkey PRIMARY KEY (species_key);


--
-- Name: rune_defs rune_defs_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rune_defs
    ADD CONSTRAINT rune_defs_key_key UNIQUE (key);


--
-- Name: rune_defs rune_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rune_defs
    ADD CONSTRAINT rune_defs_pkey PRIMARY KEY (id);


--
-- Name: rune_defs rune_defs_rune_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rune_defs
    ADD CONSTRAINT rune_defs_rune_number_key UNIQUE (rune_number);


--
-- Name: signup_trigger_errors signup_trigger_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signup_trigger_errors
    ADD CONSTRAINT signup_trigger_errors_pkey PRIMARY KEY (id);


--
-- Name: skill_defs skill_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_defs
    ADD CONSTRAINT skill_defs_pkey PRIMARY KEY (id);


--
-- Name: skill_defs skill_defs_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_defs
    ADD CONSTRAINT skill_defs_slug_key UNIQUE (slug);


--
-- Name: trainer_awards trainer_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_awards
    ADD CONSTRAINT trainer_awards_pkey PRIMARY KEY (id);


--
-- Name: trainer_awards trainer_awards_user_id_award_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_awards
    ADD CONSTRAINT trainer_awards_user_id_award_id_key UNIQUE (user_id, award_id);


--
-- Name: trainer_progression trainer_progression_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_progression
    ADD CONSTRAINT trainer_progression_pkey PRIMARY KEY (user_id);


--
-- Name: user_kith_discoveries user_kith_discoveries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kith_discoveries
    ADD CONSTRAINT user_kith_discoveries_pkey PRIMARY KEY (user_id, species_key);


--
-- Name: user_resources user_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_resources
    ADD CONSTRAINT user_resources_pkey PRIMARY KEY (user_id);


--
-- Name: user_retired_kith user_retired_kith_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_retired_kith
    ADD CONSTRAINT user_retired_kith_pkey PRIMARY KEY (user_id, species_key);


--
-- Name: user_runes user_runes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_runes
    ADD CONSTRAINT user_runes_pkey PRIMARY KEY (user_id, rune_id);


--
-- Name: wallet_ledger wallet_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (user_id);


--
-- Name: wildwood_expeditions wildwood_expeditions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wildwood_expeditions
    ADD CONSTRAINT wildwood_expeditions_pkey PRIMARY KEY (id);


--
-- Name: wildwood_rooms wildwood_rooms_battle_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wildwood_rooms
    ADD CONSTRAINT wildwood_rooms_battle_id_key UNIQUE (battle_id);


--
-- Name: wildwood_rooms wildwood_rooms_expedition_id_sequence_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wildwood_rooms
    ADD CONSTRAINT wildwood_rooms_expedition_id_sequence_number_key UNIQUE (expedition_id, sequence_number);


--
-- Name: wildwood_rooms wildwood_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wildwood_rooms
    ADD CONSTRAINT wildwood_rooms_pkey PRIMARY KEY (id);


--
-- Name: wildwood_treasure_items wildwood_treasure_items_pkey; Type: CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.wildwood_treasure_items
    ADD CONSTRAINT wildwood_treasure_items_pkey PRIMARY KEY (room_id);


--
-- Name: aliune_signal_reports_window_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX aliune_signal_reports_window_idx ON public.aliune_signal_reports USING btree (enabled, starts_at DESC, ends_at DESC);


--
-- Name: aliune_signals_enabled_window_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX aliune_signals_enabled_window_idx ON public.aliune_signals USING btree (enabled, starts_at DESC, ends_at DESC);


--
-- Name: battle_runs_one_active_run_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX battle_runs_one_active_run_per_user ON public.battle_runs USING btree (user_id) WHERE (status = 'active'::text);


--
-- Name: daily_care_user_completed_delta_day_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX daily_care_user_completed_delta_day_idx ON public.daily_care USING btree (user_id, completed_delta_day);


--
-- Name: eggs_hatch_ready_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX eggs_hatch_ready_at_idx ON public.eggs USING btree (hatch_ready_at);


--
-- Name: eggs_one_original_starter_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX eggs_one_original_starter_per_user ON public.eggs USING btree (user_id) WHERE is_original_starter;


--
-- Name: eggs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX eggs_user_id_idx ON public.eggs USING btree (user_id);


--
-- Name: hatchery_shelf_slots_user_slot_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX hatchery_shelf_slots_user_slot_unique ON public.hatchery_shelf_slots USING btree (user_id, slot_index);


--
-- Name: hatchery_slots_user_pet_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX hatchery_slots_user_pet_unique ON public.hatchery_slots USING btree (user_id, pet_id) WHERE (pet_id IS NOT NULL);


--
-- Name: hatchery_slots_user_slot_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX hatchery_slots_user_slot_unique ON public.hatchery_slots USING btree (user_id, slot_index);


--
-- Name: home_objects_one_trough; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX home_objects_one_trough ON public.home_objects USING btree (user_id, kind) WHERE (kind = 'trough'::text);


--
-- Name: home_objects_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX home_objects_user_id_idx ON public.home_objects USING btree (user_id);


--
-- Name: homepage_logs_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX homepage_logs_category_idx ON public.homepage_logs USING btree (category, display_order);


--
-- Name: idx_aliune_signal_reports_enabled_window; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_aliune_signal_reports_enabled_window ON public.aliune_signal_reports USING btree (enabled, starts_at, ends_at, created_at DESC);


--
-- Name: idx_alpha_systems_enabled_sort_release; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alpha_systems_enabled_sort_release ON public.alpha_systems USING btree (enabled, sort_order, released_at DESC);


--
-- Name: idx_announcements_homepage_live; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcements_homepage_live ON public.announcements USING btree (page_scope, is_published, created_at DESC);


--
-- Name: idx_announcements_page_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcements_page_scope ON public.announcements USING btree (page_scope, is_published, created_at DESC);


--
-- Name: idx_battle_run_fights_run_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_battle_run_fights_run_id ON public.battle_run_fights USING btree (run_id);


--
-- Name: idx_battle_runs_pet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_battle_runs_pet_id ON public.battle_runs USING btree (pet_id);


--
-- Name: idx_battle_runs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_battle_runs_user_id ON public.battle_runs USING btree (user_id);


--
-- Name: idx_daily_care_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_care_user_date ON public.daily_care USING btree (user_id, completed_date_eastern);


--
-- Name: idx_daily_care_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_care_user_id ON public.daily_care USING btree (user_id);


--
-- Name: idx_daily_login_rewards_last_claimed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_login_rewards_last_claimed_at ON public.daily_login_rewards USING btree (last_claimed_at);


--
-- Name: idx_eggs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_eggs_user_id ON public.eggs USING btree (user_id);


--
-- Name: idx_element_defs_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_element_defs_key ON public.element_defs USING btree (key);


--
-- Name: idx_hatchery_shelf_slots_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hatchery_shelf_slots_user_id ON public.hatchery_shelf_slots USING btree (user_id);


--
-- Name: idx_hatchery_shelf_slots_user_id_slot_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hatchery_shelf_slots_user_id_slot_index ON public.hatchery_shelf_slots USING btree (user_id, slot_index);


--
-- Name: idx_hatchery_slots_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hatchery_slots_user_id ON public.hatchery_slots USING btree (user_id);


--
-- Name: idx_hatchery_slots_user_id_slot_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hatchery_slots_user_id_slot_index ON public.hatchery_slots USING btree (user_id, slot_index);


--
-- Name: idx_home_objects_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_home_objects_user_id ON public.home_objects USING btree (user_id);


--
-- Name: idx_homepage_alerts_active_window; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_homepage_alerts_active_window ON public.homepage_alerts USING btree (is_active, starts_at, ends_at, updated_at DESC);


--
-- Name: idx_homepage_logs_active_category_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_homepage_logs_active_category_order ON public.homepage_logs USING btree (is_active, category, display_order, created_at DESC);


--
-- Name: idx_inventory_pet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_pet_id ON public.inventory USING btree (pet_id);


--
-- Name: idx_inventory_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_user_id ON public.inventory USING btree (user_id);


--
-- Name: idx_item_defs_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_item_defs_slug ON public.item_defs USING btree (slug);


--
-- Name: idx_mutations_active_rarity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutations_active_rarity ON public.mutations USING btree (is_active, rarity);


--
-- Name: idx_mutations_rarity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutations_rarity ON public.mutations USING btree (rarity);


--
-- Name: idx_party_slots_user_id_slot_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_party_slots_user_id_slot_index ON public.party_slots USING btree (user_id, slot_index);


--
-- Name: idx_passive_traits_rarity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_passive_traits_rarity ON public.passive_traits USING btree (rarity);


--
-- Name: idx_passive_traits_stat_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_passive_traits_stat_key ON public.passive_traits USING btree (stat_key);


--
-- Name: idx_patch_notes_published_release; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patch_notes_published_release ON public.patch_notes USING btree (is_published, released_at DESC);


--
-- Name: idx_personalities_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personalities_key ON public.personalities USING btree (key);


--
-- Name: idx_pet_awards_award_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pet_awards_award_id ON public.pet_awards USING btree (award_id);


--
-- Name: idx_pet_awards_pet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pet_awards_pet_id ON public.pet_awards USING btree (pet_id);


--
-- Name: idx_pet_element_affinities_element_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pet_element_affinities_element_id ON public.pet_element_affinities USING btree (element_id);


--
-- Name: idx_pet_element_affinities_pet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pet_element_affinities_pet_id ON public.pet_element_affinities USING btree (pet_id);


--
-- Name: idx_pet_mutations_mutation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pet_mutations_mutation_id ON public.pet_mutations USING btree (mutation_id);


--
-- Name: idx_pet_mutations_unique_mutation_per_pet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_pet_mutations_unique_mutation_per_pet ON public.pet_mutations USING btree (pet_id, mutation_id) WHERE (mutation_id IS NOT NULL);


--
-- Name: idx_pet_skills_pet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pet_skills_pet_id ON public.pet_skills USING btree (pet_id);


--
-- Name: idx_pet_skills_skill_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pet_skills_skill_id ON public.pet_skills USING btree (skill_id);


--
-- Name: idx_pets_neglect_hours; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_neglect_hours ON public.pets USING btree (neglect_hours) WHERE (neglect_hours > 0);


--
-- Name: idx_pets_personality_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_personality_id ON public.pets USING btree (personality_id);


--
-- Name: idx_pets_ran_away; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_ran_away ON public.pets USING btree (ran_away) WHERE (ran_away = true);


--
-- Name: idx_pets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_user_id ON public.pets USING btree (user_id);


--
-- Name: idx_pets_user_id_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_user_id_is_active ON public.pets USING btree (user_id, is_active);


--
-- Name: idx_pets_user_id_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_user_id_location ON public.pets USING btree (user_id, location);


--
-- Name: idx_pets_user_id_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_user_id_stage ON public.pets USING btree (user_id, stage);


--
-- Name: idx_profiles_email_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_email_lower ON public.profiles USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: idx_profiles_username_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_username_lower ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);


--
-- Name: idx_pve_active_buffs_user_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pve_active_buffs_user_active ON public.pve_active_buffs USING btree (user_id, expires_at DESC);


--
-- Name: idx_pve_instabilities_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pve_instabilities_active ON public.pve_instabilities USING btree (enabled, region, expires_at DESC) WHERE (enabled = true);


--
-- Name: idx_pve_instability_runs_user_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pve_instability_runs_user_status ON public.pve_instability_runs USING btree (user_id, status, created_at DESC);


--
-- Name: idx_rune_defs_active_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rune_defs_active_number ON public.rune_defs USING btree (is_active, rune_number);


--
-- Name: idx_rune_defs_stage_tier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rune_defs_stage_tier ON public.rune_defs USING btree (stage_tier);


--
-- Name: idx_skill_defs_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_skill_defs_slug ON public.skill_defs USING btree (slug);


--
-- Name: idx_user_resources_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_resources_user_id ON public.user_resources USING btree (user_id);


--
-- Name: idx_user_runes_rune_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_runes_rune_id ON public.user_runes USING btree (rune_id);


--
-- Name: idx_user_runes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_runes_user_id ON public.user_runes USING btree (user_id);


--
-- Name: idx_wallet_ledger_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_ledger_user_id ON public.wallet_ledger USING btree (user_id);


--
-- Name: inventory_user_item_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX inventory_user_item_unique ON public.inventory USING btree (user_id, item_id);


--
-- Name: legendary_kith_event_state_egg_pet_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX legendary_kith_event_state_egg_pet_id_key ON public.legendary_kith_event_state USING btree (egg_pet_id) WHERE (egg_pet_id IS NOT NULL);


--
-- Name: party_slots_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX party_slots_user_idx ON public.party_slots USING btree (user_id);


--
-- Name: party_slots_user_pet_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX party_slots_user_pet_unique ON public.party_slots USING btree (user_id, pet_id);


--
-- Name: party_slots_user_slot_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX party_slots_user_slot_unique ON public.party_slots USING btree (user_id, slot_index);


--
-- Name: personalities_key_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX personalities_key_idx ON public.personalities USING btree (key);


--
-- Name: pet_awards_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pet_awards_unique ON public.pet_awards USING btree (pet_id, award_id);


--
-- Name: pet_battle_results_owner_pet_result_idx; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX pet_battle_results_owner_pet_result_idx ON public.pet_battle_results USING btree (user_id, pet_id, result);


--
-- Name: pet_battle_results_pet_idx; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX pet_battle_results_pet_idx ON public.pet_battle_results USING btree (pet_id);


--
-- Name: pet_relic_equipment_owner_item; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX pet_relic_equipment_owner_item ON public.pet_relic_equipment USING btree (user_id, item_id);


--
-- Name: pet_skill_claim_one_pending_equipment_decision; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE UNIQUE INDEX pet_skill_claim_one_pending_equipment_decision ON public.pet_skill_milestone_claims USING btree (pet_id) WHERE (equipment_decision = 'pending'::text);


--
-- Name: pet_skills_one_skill_per_equipped_slot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pet_skills_one_skill_per_equipped_slot ON public.pet_skills USING btree (pet_id, equipped_slot) WHERE (equipped_slot IS NOT NULL);


--
-- Name: pets_cd_bond_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_cd_bond_ends_at_idx ON public.pets USING btree (cd_bond_ends_at);


--
-- Name: pets_cd_clean_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_cd_clean_ends_at_idx ON public.pets USING btree (cd_clean_ends_at);


--
-- Name: pets_cd_feed_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_cd_feed_ends_at_idx ON public.pets USING btree (cd_feed_ends_at);


--
-- Name: pets_cd_pet_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_cd_pet_ends_at_idx ON public.pets USING btree (cd_pet_ends_at);


--
-- Name: pets_cd_play_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_cd_play_ends_at_idx ON public.pets USING btree (cd_play_ends_at);


--
-- Name: pets_hatch_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_hatch_ends_at_idx ON public.pets USING btree (hatch_ends_at);


--
-- Name: pets_last_care_decay_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_last_care_decay_at_idx ON public.pets USING btree (last_care_decay_at);


--
-- Name: pets_last_fed_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_last_fed_at_idx ON public.pets USING btree (last_fed_at);


--
-- Name: pets_last_hunger_decay_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_last_hunger_decay_at_idx ON public.pets USING btree (last_hunger_decay_at);


--
-- Name: pets_one_active_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pets_one_active_per_user ON public.pets USING btree (user_id) WHERE (is_active = true);


--
-- Name: pets_one_active_per_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pets_one_active_per_user_idx ON public.pets USING btree (user_id) WHERE (is_active = true);


--
-- Name: pets_one_active_pet_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pets_one_active_pet_per_user ON public.pets USING btree (user_id) WHERE (is_active = true);


--
-- Name: pets_user_hatchery_slot_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX pets_user_hatchery_slot_unique ON public.pets USING btree (user_id, hatchery_slot_index) WHERE ((stage = 'egg'::public.pet_stage) AND (location = 'hatchery'::text) AND (hatchery_slot_index IS NOT NULL));


--
-- Name: pets_user_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX pets_user_is_active_idx ON public.pets USING btree (user_id, is_active);


--
-- Name: poe_tay_toe_finds_user_found_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX poe_tay_toe_finds_user_found_at_idx ON public.poe_tay_toe_finds USING btree (user_id, found_at DESC);


--
-- Name: profiles_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profiles_email_unique ON public.profiles USING btree (email);


--
-- Name: profiles_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);


--
-- Name: profiles_username_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profiles_username_unique ON public.profiles USING btree (lower(username));


--
-- Name: profiles_username_unique_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profiles_username_unique_lower ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);


--
-- Name: wildwood_one_active_expedition_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX wildwood_one_active_expedition_per_user ON public.wildwood_expeditions USING btree (user_id) WHERE (status = 'active'::text);


--
-- Name: wildwood_treasure_user_pending_idx; Type: INDEX; Schema: public; Owner: supabase_admin
--

CREATE INDEX wildwood_treasure_user_pending_idx ON public.wildwood_treasure_items USING btree (user_id) WHERE ((transferred_at IS NULL) AND (discarded_at IS NULL));


--
-- Name: announcements announcements_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pets guard_server_care; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER guard_server_care BEFORE INSERT OR UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.guard_server_care();


--
-- Name: pets potato_new_incubation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER potato_new_incubation BEFORE INSERT OR UPDATE OF hatch_ends_at, location ON public.pets FOR EACH ROW EXECUTE FUNCTION public.potato_new_incubation();


--
-- Name: pets prevent_locked_velune_activation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER prevent_locked_velune_activation BEFORE INSERT OR UPDATE OF is_active, location, species ON public.pets FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_velune_activation();


--
-- Name: party_slots prevent_locked_velune_party_assignment; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER prevent_locked_velune_party_assignment BEFORE INSERT OR UPDATE OF pet_id, user_id ON public.party_slots FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_velune_party_assignment();


--
-- Name: inventory protect_equipped_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER protect_equipped_inventory BEFORE DELETE OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.guard_equipped_inventory();


--
-- Name: pets protect_favorite_kith; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER protect_favorite_kith BEFORE DELETE OR UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.protect_favorite_kith();


--
-- Name: pets record_kith_discovery_after_hatch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER record_kith_discovery_after_hatch AFTER INSERT OR UPDATE OF stage ON public.pets FOR EACH ROW EXECUTE FUNCTION public.record_kith_discovery_from_pet();


--
-- Name: aliune_signal_reports set_aliune_signal_reports_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_aliune_signal_reports_updated_at BEFORE UPDATE ON public.aliune_signal_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: aliune_signals set_aliune_signals_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_aliune_signals_updated_at BEFORE UPDATE ON public.aliune_signals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: announcements set_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: hatchery_shelf_slots set_hatchery_shelf_slots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_hatchery_shelf_slots_updated_at BEFORE UPDATE ON public.hatchery_shelf_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: hatchery_slots set_hatchery_slots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_hatchery_slots_updated_at BEFORE UPDATE ON public.hatchery_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: home_objects set_home_objects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_home_objects_updated_at BEFORE UPDATE ON public.home_objects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: homepage_alerts set_homepage_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_homepage_alerts_updated_at BEFORE UPDATE ON public.homepage_alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory set_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pet_stats set_pet_stats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pet_stats_updated_at BEFORE UPDATE ON public.pet_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pets set_pets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pve_active_buffs set_pve_active_buffs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pve_active_buffs_updated_at BEFORE UPDATE ON public.pve_active_buffs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pve_instabilities set_pve_instabilities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pve_instabilities_updated_at BEFORE UPDATE ON public.pve_instabilities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pve_instability_fights set_pve_instability_fights_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pve_instability_fights_updated_at BEFORE UPDATE ON public.pve_instability_fights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pve_instability_runs set_pve_instability_runs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pve_instability_runs_updated_at BEFORE UPDATE ON public.pve_instability_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pve_research_stats set_pve_research_stats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pve_research_stats_updated_at BEFORE UPDATE ON public.pve_research_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_resources set_user_resources_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_user_resources_updated_at BEFORE UPDATE ON public.user_resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: wallets set_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: aliune_signals trg_aliune_signals_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_aliune_signals_updated_at BEFORE UPDATE ON public.aliune_signals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pets trg_assign_new_pet_mutation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_assign_new_pet_mutation AFTER INSERT ON public.pets FOR EACH ROW EXECUTE FUNCTION public.assign_new_pet_mutation();


--
-- Name: pets trg_assign_pet_personality; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_assign_pet_personality BEFORE INSERT ON public.pets FOR EACH ROW EXECUTE FUNCTION public.assign_pet_personality();


--
-- Name: daily_care trg_daily_care_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_daily_care_updated_at BEFORE UPDATE ON public.daily_care FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pet_mutations trg_enforce_pet_mutation_capacity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_enforce_pet_mutation_capacity BEFORE INSERT OR UPDATE OF pet_id, slot_index ON public.pet_mutations FOR EACH ROW EXECUTE FUNCTION public.enforce_pet_mutation_capacity();


--
-- Name: hatchery_shelf_slots trg_hatchery_shelf_slots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_hatchery_shelf_slots_updated_at BEFORE UPDATE ON public.hatchery_shelf_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: hatchery_slots trg_hatchery_slots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_hatchery_slots_updated_at BEFORE UPDATE ON public.hatchery_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: homepage_alerts trg_homepage_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_homepage_alerts_updated_at BEFORE UPDATE ON public.homepage_alerts FOR EACH ROW EXECUTE FUNCTION public.set_homepage_alerts_updated_at();


--
-- Name: item_defs trg_item_defs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_item_defs_updated_at BEFORE UPDATE ON public.item_defs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: party_slots trg_party_slots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_party_slots_updated_at BEFORE UPDATE ON public.party_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pet_stats trg_pet_stats_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_pet_stats_updated_at BEFORE UPDATE ON public.pet_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pets trg_pets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pets trg_prevent_personality_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_personality_change BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.prevent_personality_change();


--
-- Name: profiles trg_prevent_role_escalation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pet_battle_results validate_wildwood_pet_battle_result; Type: TRIGGER; Schema: public; Owner: supabase_admin
--

CREATE TRIGGER validate_wildwood_pet_battle_result BEFORE INSERT ON public.pet_battle_results FOR EACH ROW EXECUTE FUNCTION public.validate_wildwood_pet_battle_result();


--
-- Name: wildwood_rooms wildwood_item_opportunity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER wildwood_item_opportunity BEFORE INSERT OR UPDATE ON public.wildwood_rooms FOR EACH ROW EXECUTE FUNCTION public.stamp_wildwood_item_opportunity();


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: assanti_food_catalog assanti_food_catalog_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.assanti_food_catalog
    ADD CONSTRAINT assanti_food_catalog_slug_fkey FOREIGN KEY (slug) REFERENCES public.item_defs(slug);


--
-- Name: assanti_food_claims assanti_food_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.assanti_food_claims
    ADD CONSTRAINT assanti_food_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: battle_run_fights battle_run_fights_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_run_fights
    ADD CONSTRAINT battle_run_fights_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.battle_runs(id) ON DELETE CASCADE;


--
-- Name: battle_runs battle_runs_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_runs
    ADD CONSTRAINT battle_runs_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: battle_runs battle_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.battle_runs
    ADD CONSTRAINT battle_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_care daily_care_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_care
    ADD CONSTRAINT daily_care_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_login_rewards daily_login_rewards_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_login_rewards
    ADD CONSTRAINT daily_login_rewards_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: eggs eggs_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eggs
    ADD CONSTRAINT eggs_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;


--
-- Name: eggs eggs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eggs
    ADD CONSTRAINT eggs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: hatchery_shelf_slots hatchery_shelf_slots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hatchery_shelf_slots
    ADD CONSTRAINT hatchery_shelf_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hatchery_slots hatchery_slots_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hatchery_slots
    ADD CONSTRAINT hatchery_slots_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;


--
-- Name: hatchery_slots hatchery_slots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hatchery_slots
    ADD CONSTRAINT hatchery_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: home_objects home_objects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.home_objects
    ADD CONSTRAINT home_objects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item_defs(id) ON DELETE RESTRICT;


--
-- Name: inventory inventory_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: inventory inventory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: kennith_stock_days kennith_stock_days_delta_day_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.kennith_stock_days
    ADD CONSTRAINT kennith_stock_days_delta_day_fkey FOREIGN KEY (delta_day) REFERENCES public.kennith_wallet_days(delta_day);


--
-- Name: kennith_stock kennith_stock_delta_day_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.kennith_stock
    ADD CONSTRAINT kennith_stock_delta_day_fkey FOREIGN KEY (delta_day) REFERENCES public.kennith_stock_days(delta_day);


--
-- Name: legendary_kith_event_state legendary_kith_event_state_egg_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legendary_kith_event_state
    ADD CONSTRAINT legendary_kith_event_state_egg_pet_id_fkey FOREIGN KEY (egg_pet_id) REFERENCES public.pets(id) ON DELETE RESTRICT;


--
-- Name: legendary_kith_event_state legendary_kith_event_state_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legendary_kith_event_state
    ADD CONSTRAINT legendary_kith_event_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: party_slots party_slots_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_slots
    ADD CONSTRAINT party_slots_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: party_slots party_slots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_slots
    ADD CONSTRAINT party_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pet_awards pet_awards_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_awards
    ADD CONSTRAINT pet_awards_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.awards(id) ON DELETE CASCADE;


--
-- Name: pet_awards pet_awards_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_awards
    ADD CONSTRAINT pet_awards_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_battle_results pet_battle_results_battle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_battle_results
    ADD CONSTRAINT pet_battle_results_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES public.wildwood_rooms(battle_id) ON DELETE CASCADE;


--
-- Name: pet_battle_results pet_battle_results_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_battle_results
    ADD CONSTRAINT pet_battle_results_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_battle_results pet_battle_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_battle_results
    ADD CONSTRAINT pet_battle_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pet_element_affinities pet_element_affinities_element_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_element_affinities
    ADD CONSTRAINT pet_element_affinities_element_id_fkey FOREIGN KEY (element_id) REFERENCES public.element_defs(id) ON DELETE RESTRICT;


--
-- Name: pet_element_affinities pet_element_affinities_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_element_affinities
    ADD CONSTRAINT pet_element_affinities_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_element_deltas pet_element_deltas_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_element_deltas
    ADD CONSTRAINT pet_element_deltas_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_elements pet_elements_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_elements
    ADD CONSTRAINT pet_elements_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_mutations pet_mutations_mutation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_mutations
    ADD CONSTRAINT pet_mutations_mutation_id_fkey FOREIGN KEY (mutation_id) REFERENCES public.mutations(id) ON DELETE SET NULL;


--
-- Name: pet_mutations pet_mutations_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_mutations
    ADD CONSTRAINT pet_mutations_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_relic_equipment pet_relic_equipment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_relic_equipment
    ADD CONSTRAINT pet_relic_equipment_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item_defs(id) ON DELETE RESTRICT;


--
-- Name: pet_relic_equipment pet_relic_equipment_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_relic_equipment
    ADD CONSTRAINT pet_relic_equipment_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_relic_equipment pet_relic_equipment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_relic_equipment
    ADD CONSTRAINT pet_relic_equipment_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pet_skill_milestone_claims pet_skill_milestone_claims_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_skill_milestone_claims
    ADD CONSTRAINT pet_skill_milestone_claims_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_skill_milestone_claims pet_skill_milestone_claims_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_skill_milestone_claims
    ADD CONSTRAINT pet_skill_milestone_claims_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skill_defs(id);


--
-- Name: pet_skills pet_skills_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_skills
    ADD CONSTRAINT pet_skills_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_skills pet_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_skills
    ADD CONSTRAINT pet_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skill_defs(id) ON DELETE RESTRICT;


--
-- Name: pet_stat_allocations pet_stat_allocations_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_stat_allocations
    ADD CONSTRAINT pet_stat_allocations_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_stat_spend_receipts pet_stat_spend_receipts_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.pet_stat_spend_receipts
    ADD CONSTRAINT pet_stat_spend_receipts_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_stats pet_stats_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_stats
    ADD CONSTRAINT pet_stats_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pets pets_passive_trait_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_passive_trait_id_fkey FOREIGN KEY (passive_trait_id) REFERENCES public.passive_traits(id);


--
-- Name: pets pets_personality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_personality_id_fkey FOREIGN KEY (personality_id) REFERENCES public.personalities(id) ON DELETE SET NULL;


--
-- Name: pets pets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: player_quests player_quests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_quests
    ADD CONSTRAINT player_quests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: poe_tay_toe_finds poe_tay_toe_finds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poe_tay_toe_finds
    ADD CONSTRAINT poe_tay_toe_finds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: poe_tay_toe_state poe_tay_toe_state_claimed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poe_tay_toe_state
    ADD CONSTRAINT poe_tay_toe_state_claimed_by_user_id_fkey FOREIGN KEY (claimed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: poe_tay_toe_state poe_tay_toe_state_hidden_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poe_tay_toe_state
    ADD CONSTRAINT poe_tay_toe_state_hidden_by_user_id_fkey FOREIGN KEY (hidden_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: poe_tay_toe_state potato_last_discovery_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poe_tay_toe_state
    ADD CONSTRAINT potato_last_discovery_fk FOREIGN KEY (last_discovery_id) REFERENCES public.poe_tay_toe_finds(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pve_active_buffs pve_active_buffs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_active_buffs
    ADD CONSTRAINT pve_active_buffs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pve_instability_fights pve_instability_fights_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instability_fights
    ADD CONSTRAINT pve_instability_fights_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.pve_instability_runs(id) ON DELETE CASCADE;


--
-- Name: pve_instability_runs pve_instability_runs_instability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instability_runs
    ADD CONSTRAINT pve_instability_runs_instability_id_fkey FOREIGN KEY (instability_id) REFERENCES public.pve_instabilities(id) ON DELETE CASCADE;


--
-- Name: pve_instability_runs pve_instability_runs_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instability_runs
    ADD CONSTRAINT pve_instability_runs_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pve_instability_runs pve_instability_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_instability_runs
    ADD CONSTRAINT pve_instability_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pve_research_stats pve_research_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pve_research_stats
    ADD CONSTRAINT pve_research_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: trainer_awards trainer_awards_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_awards
    ADD CONSTRAINT trainer_awards_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.awards(id) ON DELETE CASCADE;


--
-- Name: trainer_awards trainer_awards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_awards
    ADD CONSTRAINT trainer_awards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: trainer_progression trainer_progression_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trainer_progression
    ADD CONSTRAINT trainer_progression_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_kith_discoveries user_kith_discoveries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kith_discoveries
    ADD CONSTRAINT user_kith_discoveries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_resources user_resources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_resources
    ADD CONSTRAINT user_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_retired_kith user_retired_kith_species_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_retired_kith
    ADD CONSTRAINT user_retired_kith_species_key_fkey FOREIGN KEY (species_key) REFERENCES public.retired_kith_species(species_key) ON DELETE RESTRICT;


--
-- Name: user_retired_kith user_retired_kith_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_retired_kith
    ADD CONSTRAINT user_retired_kith_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_runes user_runes_rune_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_runes
    ADD CONSTRAINT user_runes_rune_id_fkey FOREIGN KEY (rune_id) REFERENCES public.rune_defs(id) ON DELETE CASCADE;


--
-- Name: user_runes user_runes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_runes
    ADD CONSTRAINT user_runes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_ledger wallet_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wildwood_expeditions wildwood_expeditions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wildwood_expeditions
    ADD CONSTRAINT wildwood_expeditions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wildwood_rooms wildwood_rooms_expedition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wildwood_rooms
    ADD CONSTRAINT wildwood_rooms_expedition_id_fkey FOREIGN KEY (expedition_id) REFERENCES public.wildwood_expeditions(id) ON DELETE CASCADE;


--
-- Name: wildwood_treasure_items wildwood_treasure_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.wildwood_treasure_items
    ADD CONSTRAINT wildwood_treasure_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item_defs(id);


--
-- Name: wildwood_treasure_items wildwood_treasure_items_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.wildwood_treasure_items
    ADD CONSTRAINT wildwood_treasure_items_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.wildwood_rooms(id) ON DELETE CASCADE;


--
-- Name: wildwood_treasure_items wildwood_treasure_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supabase_admin
--

ALTER TABLE ONLY public.wildwood_treasure_items
    ADD CONSTRAINT wildwood_treasure_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: alpha_systems Allow public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read" ON public.alpha_systems FOR SELECT USING (true);


--
-- Name: pve_instabilities Anyone can view active instabilities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active instabilities" ON public.pve_instabilities FOR SELECT USING (((enabled = true) AND (expires_at > now())));


--
-- Name: retired_kith_species Authenticated users can read retired Kith species; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read retired Kith species" ON public.retired_kith_species FOR SELECT TO authenticated USING (true);


--
-- Name: legendary_kith_event_state Legendary event state is readable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Legendary event state is readable by owner" ON public.legendary_kith_event_state FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: wildwood_rooms Players can read their own Wildwood rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can read their own Wildwood rooms" ON public.wildwood_rooms FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.wildwood_expeditions expedition
  WHERE ((expedition.id = wildwood_rooms.expedition_id) AND (expedition.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: wildwood_expeditions Players can read their own expeditions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can read their own expeditions" ON public.wildwood_expeditions FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: player_quests Players can read their own quests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Players can read their own quests" ON public.player_quests FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: homepage_alerts Public can read active homepage alerts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can read active homepage alerts" ON public.homepage_alerts FOR SELECT TO authenticated, anon USING (((is_active = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at >= now()))));


--
-- Name: personalities Public can read personalities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can read personalities" ON public.personalities FOR SELECT USING (true);


--
-- Name: patch_notes Public can read published patch notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can read published patch notes" ON public.patch_notes FOR SELECT USING ((is_published = true));


--
-- Name: signup_trigger_errors Service role can view signup trigger errors; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can view signup trigger errors" ON public.signup_trigger_errors FOR SELECT TO service_role USING (true);


--
-- Name: trainer_progression Trainer progression is readable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Trainer progression is readable by owner" ON public.trainer_progression FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_kith_discoveries Users can read their own Kith discoveries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own Kith discoveries" ON public.user_kith_discoveries FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_retired_kith Users can read their own retired Kith ownership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own retired Kith ownership" ON public.user_retired_kith FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_resources Users can update their own resources; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own resources" ON public.user_resources FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: pve_active_buffs Users can view own buffs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own buffs" ON public.pve_active_buffs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: pve_instability_fights Users can view own fights; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own fights" ON public.pve_instability_fights FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.pve_instability_runs
  WHERE ((pve_instability_runs.id = pve_instability_fights.run_id) AND (pve_instability_runs.user_id = auth.uid())))));


--
-- Name: pve_research_stats Users can view own research; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own research" ON public.pve_research_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: pve_instability_runs Users can view own runs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own runs" ON public.pve_instability_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_resources Users can view their own resources; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own resources" ON public.user_resources FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: announcements admins manage announcements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admins manage announcements" ON public.announcements USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.is_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.is_admin = true)))));


--
-- Name: aliune_signal_reports aliune signal reports public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "aliune signal reports public read" ON public.aliune_signal_reports FOR SELECT TO authenticated, anon USING ((enabled = true));


--
-- Name: aliune_signals aliune signals public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "aliune signals public read" ON public.aliune_signals FOR SELECT TO authenticated, anon USING ((enabled = true));


--
-- Name: aliune_signal_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.aliune_signal_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: aliune_signals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.aliune_signals ENABLE ROW LEVEL SECURITY;

--
-- Name: alpha_systems; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.alpha_systems ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory assanti_food_backend_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assanti_food_backend_delete ON public.inventory AS RESTRICTIVE FOR DELETE TO authenticated USING ((NOT (EXISTS ( SELECT 1
   FROM public.item_defs d
  WHERE ((d.id = inventory.item_id) AND (d.slug = ANY (ARRAY['alpha-meat'::text, 'alpha-vegetables'::text])))))));


--
-- Name: inventory assanti_food_backend_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assanti_food_backend_insert ON public.inventory AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM public.item_defs d
  WHERE ((d.id = inventory.item_id) AND (d.slug = ANY (ARRAY['alpha-meat'::text, 'alpha-vegetables'::text])))))));


--
-- Name: inventory assanti_food_backend_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assanti_food_backend_update ON public.inventory AS RESTRICTIVE FOR UPDATE TO authenticated USING ((NOT (EXISTS ( SELECT 1
   FROM public.item_defs d
  WHERE ((d.id = inventory.item_id) AND (d.slug = ANY (ARRAY['alpha-meat'::text, 'alpha-vegetables'::text]))))))) WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM public.item_defs d
  WHERE ((d.id = inventory.item_id) AND (d.slug = ANY (ARRAY['alpha-meat'::text, 'alpha-vegetables'::text])))))));


--
-- Name: assanti_food_catalog; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.assanti_food_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: assanti_food_claims; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.assanti_food_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: assanti_food_claims assanti_food_claims_read_own; Type: POLICY; Schema: public; Owner: supabase_admin
--

CREATE POLICY assanti_food_claims_read_own ON public.assanti_food_claims FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: assanti_food_config; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.assanti_food_config ENABLE ROW LEVEL SECURITY;

--
-- Name: assanti_food_days; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.assanti_food_days ENABLE ROW LEVEL SECURITY;

--
-- Name: awards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

--
-- Name: awards awards_read_authed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY awards_read_authed ON public.awards FOR SELECT TO authenticated USING (true);


--
-- Name: battle_run_fights battle_fights_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY battle_fights_select_own ON public.battle_run_fights FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.battle_runs r
  WHERE ((r.id = battle_run_fights.run_id) AND (r.user_id = auth.uid())))));


--
-- Name: battle_run_fights; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.battle_run_fights ENABLE ROW LEVEL SECURITY;

--
-- Name: battle_run_fights battle_run_fights_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY battle_run_fights_select_own ON public.battle_run_fights FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.battle_runs r
  WHERE ((r.id = battle_run_fights.run_id) AND (r.user_id = auth.uid())))));


--
-- Name: battle_run_fights battle_run_fights_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY battle_run_fights_write_own ON public.battle_run_fights TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.battle_runs r
  WHERE ((r.id = battle_run_fights.run_id) AND (r.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.battle_runs r
  WHERE ((r.id = battle_run_fights.run_id) AND (r.user_id = auth.uid())))));


--
-- Name: battle_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.battle_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: battle_runs battle_runs_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY battle_runs_select_own ON public.battle_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: battle_runs battle_runs_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY battle_runs_write_own ON public.battle_runs TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_care; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_care ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_care daily_care_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY daily_care_insert_own ON public.daily_care FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_care daily_care_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY daily_care_select_own ON public.daily_care FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_care daily_care_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY daily_care_update_own ON public.daily_care FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_login_rewards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_login_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_login_rewards daily_login_rewards_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY daily_login_rewards_select_own ON public.daily_login_rewards FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: daily_login_rewards daily_login_rewards_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY daily_login_rewards_write_own ON public.daily_login_rewards TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: eggs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.eggs ENABLE ROW LEVEL SECURITY;

--
-- Name: eggs eggs_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY eggs_select_own ON public.eggs FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: eggs eggs_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY eggs_write_own ON public.eggs TO authenticated USING (((user_id = auth.uid()) AND (NOT is_original_starter))) WITH CHECK (((user_id = auth.uid()) AND (NOT is_original_starter)));


--
-- Name: element_defs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.element_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: element_defs element_defs_read_authed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY element_defs_read_authed ON public.element_defs FOR SELECT TO authenticated USING (true);


--
-- Name: game_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;

--
-- Name: game_config game_config_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY game_config_read ON public.game_config FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: game_config game_config_read_authed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY game_config_read_authed ON public.game_config FOR SELECT TO authenticated USING (true);


--
-- Name: hatchery_shelf_slots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.hatchery_shelf_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: hatchery_shelf_slots hatchery_shelf_slots_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_shelf_slots_delete_own ON public.hatchery_shelf_slots FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: hatchery_shelf_slots hatchery_shelf_slots_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_shelf_slots_insert_own ON public.hatchery_shelf_slots FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: hatchery_shelf_slots hatchery_shelf_slots_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_shelf_slots_select_own ON public.hatchery_shelf_slots FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: hatchery_shelf_slots hatchery_shelf_slots_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_shelf_slots_update_own ON public.hatchery_shelf_slots FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: hatchery_slots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.hatchery_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: hatchery_slots hatchery_slots_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_slots_delete_own ON public.hatchery_slots FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: hatchery_slots hatchery_slots_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_slots_insert_own ON public.hatchery_slots FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: hatchery_slots hatchery_slots_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_slots_select_own ON public.hatchery_slots FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: hatchery_slots hatchery_slots_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY hatchery_slots_update_own ON public.hatchery_slots FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: home_objects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.home_objects ENABLE ROW LEVEL SECURITY;

--
-- Name: home_objects home_objects_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY home_objects_delete_own ON public.home_objects FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: home_objects home_objects_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY home_objects_insert_own ON public.home_objects FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: home_objects home_objects_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY home_objects_select_own ON public.home_objects FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: home_objects home_objects_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY home_objects_update_own ON public.home_objects FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: homepage_alerts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.homepage_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: homepage_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.homepage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: homepage_logs homepage_logs_public_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY homepage_logs_public_read ON public.homepage_logs FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory inventory_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inventory_select_own ON public.inventory FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: inventory inventory_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inventory_write_own ON public.inventory TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: item_defs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.item_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: item_defs item_defs_read_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY item_defs_read_all ON public.item_defs FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: item_defs item_defs_read_authed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY item_defs_read_authed ON public.item_defs FOR SELECT TO authenticated USING (true);


--
-- Name: kennith_stock; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.kennith_stock ENABLE ROW LEVEL SECURITY;

--
-- Name: kennith_stock_days; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.kennith_stock_days ENABLE ROW LEVEL SECURITY;

--
-- Name: kennith_wallet_days; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.kennith_wallet_days ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_ledger ledger_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ledger_select_own ON public.wallet_ledger FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: legendary_kith_event_state; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.legendary_kith_event_state ENABLE ROW LEVEL SECURITY;

--
-- Name: mutations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mutations ENABLE ROW LEVEL SECURITY;

--
-- Name: mutations mutations_read_active; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mutations_read_active ON public.mutations FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: party_slots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.party_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: party_slots party_slots_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY party_slots_delete_own ON public.party_slots FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: party_slots party_slots_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY party_slots_insert_own ON public.party_slots FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: party_slots party_slots_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY party_slots_select_own ON public.party_slots FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: party_slots party_slots_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY party_slots_update_own ON public.party_slots FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: passive_traits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.passive_traits ENABLE ROW LEVEL SECURITY;

--
-- Name: patch_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.patch_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: personalities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;

--
-- Name: personalities personalities_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY personalities_select_all ON public.personalities FOR SELECT USING (true);


--
-- Name: pet_awards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_awards ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_awards pet_awards_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_awards_crud_own ON public.pet_awards TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_awards.pet_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_awards.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_battle_results; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.pet_battle_results ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_battle_results pet_battle_results_select_own; Type: POLICY; Schema: public; Owner: supabase_admin
--

CREATE POLICY pet_battle_results_select_own ON public.pet_battle_results FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: pet_element_affinities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_element_affinities ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_element_affinities pet_element_affinities_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_element_affinities_select_own ON public.pet_element_affinities FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets
  WHERE ((pets.id = pet_element_affinities.pet_id) AND (pets.user_id = auth.uid())))));


--
-- Name: pet_element_affinities pet_element_affinities_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_element_affinities_write_own ON public.pet_element_affinities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets
  WHERE ((pets.id = pet_element_affinities.pet_id) AND (pets.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets
  WHERE ((pets.id = pet_element_affinities.pet_id) AND (pets.user_id = auth.uid())))));


--
-- Name: pet_element_deltas; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.pet_element_deltas ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_element_deltas pet_element_deltas_select_own; Type: POLICY; Schema: public; Owner: supabase_admin
--

CREATE POLICY pet_element_deltas_select_own ON public.pet_element_deltas FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets
  WHERE ((pets.id = pet_element_deltas.pet_id) AND (pets.user_id = auth.uid())))));


--
-- Name: pet_elements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_elements ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_elements pet_elements_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_elements_own ON public.pet_elements USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_elements.pet_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_elements.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_mutations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_mutations ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_relic_equipment; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.pet_relic_equipment ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_skill_milestone_claims; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.pet_skill_milestone_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_skills; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_skills pet_skills_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_skills_own ON public.pet_skills USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_skills.pet_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_skills.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_skills pet_skills_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_skills_select_own ON public.pet_skills FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_skills.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_skills pet_skills_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_skills_write_own ON public.pet_skills TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_skills.pet_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_skills.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_stat_allocations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_stat_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_stat_allocations pet_stat_allocations_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_stat_allocations_select_own ON public.pet_stat_allocations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_stat_allocations.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_stat_allocations pet_stat_allocations_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_stat_allocations_write_own ON public.pet_stat_allocations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_stat_allocations.pet_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_stat_allocations.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_stat_spend_receipts; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.pet_stat_spend_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_stats pet_stats_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_stats_select_own ON public.pet_stats FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_stats.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pet_stats pet_stats_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pet_stats_write_own ON public.pet_stats TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_stats.pet_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = pet_stats.pet_id) AND (p.user_id = auth.uid())))));


--
-- Name: pets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

--
-- Name: pets pets_crud_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pets_crud_own ON public.pets USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: pets pets_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pets_select_own ON public.pets FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: pets pets_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pets_write_own ON public.pets TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: player_quests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.player_quests ENABLE ROW LEVEL SECURITY;

--
-- Name: poe_tay_toe_finds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.poe_tay_toe_finds ENABLE ROW LEVEL SECURITY;

--
-- Name: poe_tay_toe_state; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.poe_tay_toe_state ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles profiles_select_all_authed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select_all_authed ON public.profiles FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles profiles_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_write_own ON public.profiles TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: pve_active_buffs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pve_active_buffs ENABLE ROW LEVEL SECURITY;

--
-- Name: pve_instabilities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pve_instabilities ENABLE ROW LEVEL SECURITY;

--
-- Name: pve_instability_fights; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pve_instability_fights ENABLE ROW LEVEL SECURITY;

--
-- Name: pve_instability_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pve_instability_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: pve_research_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pve_research_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: announcements read published announcements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read published announcements" ON public.announcements FOR SELECT USING ((is_published = true));


--
-- Name: retired_kith_species; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.retired_kith_species ENABLE ROW LEVEL SECURITY;

--
-- Name: rune_defs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rune_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: rune_defs rune_defs_read_active; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rune_defs_read_active ON public.rune_defs FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: signup_trigger_errors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.signup_trigger_errors ENABLE ROW LEVEL SECURITY;

--
-- Name: skill_defs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.skill_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: skill_defs skill_defs_read_authed; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY skill_defs_read_authed ON public.skill_defs FOR SELECT TO authenticated USING (true);


--
-- Name: skill_defs skills_read_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY skills_read_all ON public.skill_defs FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: trainer_awards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trainer_awards ENABLE ROW LEVEL SECURITY;

--
-- Name: trainer_awards trainer_awards_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY trainer_awards_select_own ON public.trainer_awards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trainer_progression; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trainer_progression ENABLE ROW LEVEL SECURITY;

--
-- Name: user_kith_discoveries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_kith_discoveries ENABLE ROW LEVEL SECURITY;

--
-- Name: user_resources; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: user_resources user_resources_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_resources_select_own ON public.user_resources FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_resources user_resources_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_resources_write_own ON public.user_resources TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_retired_kith; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_retired_kith ENABLE ROW LEVEL SECURITY;

--
-- Name: user_runes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_runes ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_mutations users_read_own_pet_mutations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_read_own_pet_mutations ON public.pet_mutations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pets
  WHERE ((pets.id = pet_mutations.pet_id) AND (pets.user_id = auth.uid())))));


--
-- Name: user_runes users_read_own_runes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_read_own_runes ON public.user_runes FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: wallet_ledger; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_ledger wallet_ledger_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY wallet_ledger_select_own ON public.wallet_ledger FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: wallet_ledger wallet_ledger_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY wallet_ledger_write_own ON public.wallet_ledger TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets wallets_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY wallets_select_own ON public.wallets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wallets wallets_write_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY wallets_write_own ON public.wallets TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: wildwood_expeditions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.wildwood_expeditions ENABLE ROW LEVEL SECURITY;

--
-- Name: wildwood_rooms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.wildwood_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: wildwood_treasure_items; Type: ROW SECURITY; Schema: public; Owner: supabase_admin
--

ALTER TABLE public.wildwood_treasure_items ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION delete_jayden_testing_emails(p_confirm_text text); Type: ACL; Schema: admin; Owner: postgres
--

REVOKE ALL ON FUNCTION admin.delete_jayden_testing_emails(p_confirm_text text) FROM PUBLIC;


--
-- Name: FUNCTION reset_runaway_or_null_pet_users(p_dry_run boolean); Type: ACL; Schema: admin; Owner: postgres
--

REVOKE ALL ON FUNCTION admin.reset_runaway_or_null_pet_users(p_dry_run boolean) FROM PUBLIC;


--
-- Name: FUNCTION allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb) TO postgres;
GRANT ALL ON FUNCTION public.allocate_level2_stats(p_user_id uuid, p_pet_id uuid, p_request_id uuid, p_allocation jsonb) TO service_role;


--
-- Name: FUNCTION apply_hunger_decay(p_pet_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.apply_hunger_decay(p_pet_id uuid) TO anon;
GRANT ALL ON FUNCTION public.apply_hunger_decay(p_pet_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.apply_hunger_decay(p_pet_id uuid) TO service_role;


--
-- Name: FUNCTION apply_pet_care_decay(p_pet_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.apply_pet_care_decay(p_pet_id uuid) TO anon;
GRANT ALL ON FUNCTION public.apply_pet_care_decay(p_pet_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.apply_pet_care_decay(p_pet_id uuid) TO service_role;


--
-- Name: FUNCTION apply_pet_storage_action(p_user_id uuid, p_action text, p_pet_id uuid, p_slot_index integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.apply_pet_storage_action(p_user_id uuid, p_action text, p_pet_id uuid, p_slot_index integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.apply_pet_storage_action(p_user_id uuid, p_action text, p_pet_id uuid, p_slot_index integer) TO postgres;
GRANT ALL ON FUNCTION public.apply_pet_storage_action(p_user_id uuid, p_action text, p_pet_id uuid, p_slot_index integer) TO service_role;


--
-- Name: FUNCTION assign_new_pet_mutation(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.assign_new_pet_mutation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.assign_new_pet_mutation() TO anon;
GRANT ALL ON FUNCTION public.assign_new_pet_mutation() TO authenticated;
GRANT ALL ON FUNCTION public.assign_new_pet_mutation() TO service_role;


--
-- Name: FUNCTION assign_pet_mutation(p_pet_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.assign_pet_mutation(p_pet_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.assign_pet_mutation(p_pet_id uuid) TO anon;
GRANT ALL ON FUNCTION public.assign_pet_mutation(p_pet_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.assign_pet_mutation(p_pet_id uuid) TO service_role;


--
-- Name: FUNCTION assign_pet_personality(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.assign_pet_personality() TO anon;
GRANT ALL ON FUNCTION public.assign_pet_personality() TO authenticated;
GRANT ALL ON FUNCTION public.assign_pet_personality() TO service_role;


--
-- Name: FUNCTION award_pet_element_delta(p_user_id uuid, p_pet_id uuid, p_element text, p_quantity integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.award_pet_element_delta(p_user_id uuid, p_pet_id uuid, p_element text, p_quantity integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.award_pet_element_delta(p_user_id uuid, p_pet_id uuid, p_element text, p_quantity integer) TO postgres;
GRANT ALL ON FUNCTION public.award_pet_element_delta(p_user_id uuid, p_pet_id uuid, p_element text, p_quantity integer) TO service_role;


--
-- Name: FUNCTION claim_assanti_daily_food(p_user_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.claim_assanti_daily_food(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_assanti_daily_food(p_user_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.claim_assanti_daily_food(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION claim_daily_login_reward(p_user_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.claim_daily_login_reward(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_daily_login_reward(p_user_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.claim_daily_login_reward(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text) TO postgres;
GRANT ALL ON FUNCTION public.claim_level2_skill(p_user_id uuid, p_pet_id uuid, p_skill_slug text) TO service_role;


--
-- Name: FUNCTION claim_poe_tay_toe(p_user_id uuid, p_location_key text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.claim_poe_tay_toe(p_user_id uuid, p_location_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_poe_tay_toe(p_user_id uuid, p_location_key text) TO service_role;


--
-- Name: FUNCTION claim_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_version uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.claim_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_version uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_version uuid) TO postgres;
GRANT ALL ON FUNCTION public.claim_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_version uuid) TO service_role;


--
-- Name: FUNCTION claim_species_skill(p_user_id uuid, p_pet_id uuid, p_species text, p_element text, p_level integer, p_skill_slug text, p_choices jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.claim_species_skill(p_user_id uuid, p_pet_id uuid, p_species text, p_element text, p_level integer, p_skill_slug text, p_choices jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_species_skill(p_user_id uuid, p_pet_id uuid, p_species text, p_element text, p_level integer, p_skill_slug text, p_choices jsonb) TO postgres;
GRANT ALL ON FUNCTION public.claim_species_skill(p_user_id uuid, p_pet_id uuid, p_species text, p_element text, p_level integer, p_skill_slug text, p_choices jsonb) TO service_role;


--
-- Name: FUNCTION claim_wildwood_discovery(p_user_id uuid, p_room_id uuid, p_item_slug text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.claim_wildwood_discovery(p_user_id uuid, p_room_id uuid, p_item_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_wildwood_discovery(p_user_id uuid, p_room_id uuid, p_item_slug text) TO postgres;
GRANT ALL ON FUNCTION public.claim_wildwood_discovery(p_user_id uuid, p_room_id uuid, p_item_slug text) TO service_role;


--
-- Name: FUNCTION claim_wildwood_item(p_user_id uuid, p_room_id uuid, p_item_slug text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.claim_wildwood_item(p_user_id uuid, p_room_id uuid, p_item_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_wildwood_item(p_user_id uuid, p_room_id uuid, p_item_slug text) TO service_role;


--
-- Name: FUNCTION commit_resonance_evolution(p_user_id uuid, p_pet_id uuid, p_species text, p_next_name text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.commit_resonance_evolution(p_user_id uuid, p_pet_id uuid, p_species text, p_next_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.commit_resonance_evolution(p_user_id uuid, p_pet_id uuid, p_species text, p_next_name text) TO postgres;
GRANT ALL ON FUNCTION public.commit_resonance_evolution(p_user_id uuid, p_pet_id uuid, p_species text, p_next_name text) TO service_role;


--
-- Name: FUNCTION complete_pve_instability_run(p_user_id uuid, p_run_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.complete_pve_instability_run(p_user_id uuid, p_run_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.complete_pve_instability_run(p_user_id uuid, p_run_id uuid) TO service_role;


--
-- Name: FUNCTION consume_corrupted_egg(p_user_id uuid, p_egg_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.consume_corrupted_egg(p_user_id uuid, p_egg_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.consume_corrupted_egg(p_user_id uuid, p_egg_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.consume_corrupted_egg(p_user_id uuid, p_egg_id uuid) TO service_role;


--
-- Name: FUNCTION consume_trough(p_user_id uuid, p_amount integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.consume_trough(p_user_id uuid, p_amount integer) TO anon;
GRANT ALL ON FUNCTION public.consume_trough(p_user_id uuid, p_amount integer) TO authenticated;
GRANT ALL ON FUNCTION public.consume_trough(p_user_id uuid, p_amount integer) TO service_role;


--
-- Name: FUNCTION discard_wildwood_treasure(p_user_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.discard_wildwood_treasure(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.discard_wildwood_treasure(p_user_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.discard_wildwood_treasure(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION enforce_pet_mutation_capacity(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.enforce_pet_mutation_capacity() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_pet_mutation_capacity() TO anon;
GRANT ALL ON FUNCTION public.enforce_pet_mutation_capacity() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_pet_mutation_capacity() TO service_role;


--
-- Name: FUNCTION ensure_assanti_food_day(p_delta_day integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.ensure_assanti_food_day(p_delta_day integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ensure_assanti_food_day(p_delta_day integer) TO postgres;
GRANT ALL ON FUNCTION public.ensure_assanti_food_day(p_delta_day integer) TO service_role;


--
-- Name: FUNCTION ensure_original_starter(p_user_id uuid, p_pet jsonb, p_stats jsonb, p_starter_names text[]); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.ensure_original_starter(p_user_id uuid, p_pet jsonb, p_stats jsonb, p_starter_names text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ensure_original_starter(p_user_id uuid, p_pet jsonb, p_stats jsonb, p_starter_names text[]) TO postgres;
GRANT ALL ON FUNCTION public.ensure_original_starter(p_user_id uuid, p_pet jsonb, p_stats jsonb, p_starter_names text[]) TO service_role;


--
-- Name: FUNCTION equip_owned_relic(p_user_id uuid, p_pet_id uuid, p_slug text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.equip_owned_relic(p_user_id uuid, p_pet_id uuid, p_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.equip_owned_relic(p_user_id uuid, p_pet_id uuid, p_slug text) TO postgres;
GRANT ALL ON FUNCTION public.equip_owned_relic(p_user_id uuid, p_pet_id uuid, p_slug text) TO service_role;


--
-- Name: FUNCTION extract_eastern_date(ts timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.extract_eastern_date(ts timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.extract_eastern_date(ts timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.extract_eastern_date(ts timestamp with time zone) TO service_role;


--
-- Name: FUNCTION generate_aliune_signal_report(p_start timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_aliune_signal_report(p_start timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.generate_aliune_signal_report(p_start timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.generate_aliune_signal_report(p_start timestamp with time zone) TO service_role;


--
-- Name: TABLE pve_active_buffs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pve_active_buffs TO anon;
GRANT ALL ON TABLE public.pve_active_buffs TO authenticated;
GRANT ALL ON TABLE public.pve_active_buffs TO service_role;


--
-- Name: FUNCTION get_active_buffs(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_active_buffs(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_active_buffs(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_active_buffs(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_active_buffs(p_user_id uuid) TO service_role;


--
-- Name: TABLE pve_instabilities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pve_instabilities TO anon;
GRANT ALL ON TABLE public.pve_instabilities TO authenticated;
GRANT ALL ON TABLE public.pve_instabilities TO service_role;


--
-- Name: FUNCTION get_active_instabilities(p_region text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_active_instabilities(p_region text) TO anon;
GRANT ALL ON FUNCTION public.get_active_instabilities(p_region text) TO authenticated;
GRANT ALL ON FUNCTION public.get_active_instabilities(p_region text) TO service_role;


--
-- Name: FUNCTION get_assanti_food_shop(p_user_id uuid, p_delta_day integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.get_assanti_food_shop(p_user_id uuid, p_delta_day integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_assanti_food_shop(p_user_id uuid, p_delta_day integer) TO postgres;
GRANT ALL ON FUNCTION public.get_assanti_food_shop(p_user_id uuid, p_delta_day integer) TO service_role;


--
-- Name: FUNCTION get_email_by_username(p_username text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_email_by_username(p_username text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_email_by_username(p_username text) TO service_role;


--
-- Name: FUNCTION get_kennith_stock(p_delta_day integer, p_seed jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.get_kennith_stock(p_delta_day integer, p_seed jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_kennith_stock(p_delta_day integer, p_seed jsonb) TO postgres;
GRANT ALL ON FUNCTION public.get_kennith_stock(p_delta_day integer, p_seed jsonb) TO service_role;


--
-- Name: FUNCTION get_kennith_wallet(p_delta_day integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.get_kennith_wallet(p_delta_day integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_kennith_wallet(p_delta_day integer) TO postgres;
GRANT ALL ON FUNCTION public.get_kennith_wallet(p_delta_day integer) TO service_role;


--
-- Name: FUNCTION get_or_create_kithna_tutorial_signal(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_or_create_kithna_tutorial_signal() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_or_create_kithna_tutorial_signal() TO anon;
GRANT ALL ON FUNCTION public.get_or_create_kithna_tutorial_signal() TO authenticated;
GRANT ALL ON FUNCTION public.get_or_create_kithna_tutorial_signal() TO service_role;


--
-- Name: FUNCTION get_player_equipment(p_user_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.get_player_equipment(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_player_equipment(p_user_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.get_player_equipment(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_poe_tay_toe_status(p_user_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.get_poe_tay_toe_status(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_poe_tay_toe_status(p_user_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.get_poe_tay_toe_status(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION grant_rescue_egg(p_user_id uuid, p_egg jsonb, p_base_stats jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.grant_rescue_egg(p_user_id uuid, p_egg jsonb, p_base_stats jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.grant_rescue_egg(p_user_id uuid, p_egg jsonb, p_base_stats jsonb) TO postgres;
GRANT ALL ON FUNCTION public.grant_rescue_egg(p_user_id uuid, p_egg jsonb, p_base_stats jsonb) TO service_role;


--
-- Name: FUNCTION guard_equipped_inventory(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.guard_equipped_inventory() FROM PUBLIC;
GRANT ALL ON FUNCTION public.guard_equipped_inventory() TO postgres;
GRANT ALL ON FUNCTION public.guard_equipped_inventory() TO service_role;


--
-- Name: FUNCTION guard_server_care(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.guard_server_care() FROM PUBLIC;
GRANT ALL ON FUNCTION public.guard_server_care() TO postgres;
GRANT ALL ON FUNCTION public.guard_server_care() TO service_role;


--
-- Name: FUNCTION handle_new_user_profile(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user_profile() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user_profile() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user_profile() TO service_role;


--
-- Name: TABLE pets; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.pets TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.pets TO authenticated;
GRANT ALL ON TABLE public.pets TO service_role;


--
-- Name: FUNCTION hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line) TO service_role;


--
-- Name: FUNCTION hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line, p_hatch_context jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line, p_hatch_context jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line, p_hatch_context jsonb) TO postgres;
GRANT ALL ON FUNCTION public.hatch_pet(p_user_id uuid, p_egg_id uuid, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spd integer, p_iv_magi integer, p_iv_mana integer, p_gender text, p_personality_id uuid, p_personality_key text, p_hatchling_name text, p_description text, p_growth_strong_stats text[], p_growth_weak_stat text, p_hatch_time_alignment text, p_line public.elemental_line, p_hatch_context jsonb) TO service_role;


--
-- Name: FUNCTION hide_poe_tay_toe(p_user_id uuid, p_location_key text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.hide_poe_tay_toe(p_user_id uuid, p_location_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hide_poe_tay_toe(p_user_id uuid, p_location_key text) TO service_role;


--
-- Name: FUNCTION hide_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_discovery_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.hide_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_discovery_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hide_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_discovery_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.hide_poe_tay_toe_v2(p_user_id uuid, p_location_key text, p_discovery_id uuid) TO service_role;


--
-- Name: FUNCTION hold_wildwood_egg(p_user_id uuid, p_room_id uuid, p_encounter_id uuid, p_egg jsonb, p_base_stats jsonb, p_xp integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.hold_wildwood_egg(p_user_id uuid, p_room_id uuid, p_encounter_id uuid, p_egg jsonb, p_base_stats jsonb, p_xp integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.hold_wildwood_egg(p_user_id uuid, p_room_id uuid, p_encounter_id uuid, p_egg jsonb, p_base_stats jsonb, p_xp integer) TO postgres;
GRANT ALL ON FUNCTION public.hold_wildwood_egg(p_user_id uuid, p_room_id uuid, p_encounter_id uuid, p_egg jsonb, p_base_stats jsonb, p_xp integer) TO service_role;


--
-- Name: FUNCTION increment_active_pet_xp(p_user_id uuid, p_amount integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.increment_active_pet_xp(p_user_id uuid, p_amount integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.increment_active_pet_xp(p_user_id uuid, p_amount integer) TO postgres;
GRANT ALL ON FUNCTION public.increment_active_pet_xp(p_user_id uuid, p_amount integer) TO service_role;


--
-- Name: FUNCTION increment_pve_research_stats(p_user_id uuid, p_instabilities_cleared integer, p_fights_won integer, p_bosses_defeated integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.increment_pve_research_stats(p_user_id uuid, p_instabilities_cleared integer, p_fights_won integer, p_bosses_defeated integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.increment_pve_research_stats(p_user_id uuid, p_instabilities_cleared integer, p_fights_won integer, p_bosses_defeated integer) TO service_role;


--
-- Name: FUNCTION increment_wallet(p_user_id uuid, p_dots integer, p_crystals integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.increment_wallet(p_user_id uuid, p_dots integer, p_crystals integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.increment_wallet(p_user_id uuid, p_dots integer, p_crystals integer) TO anon;
GRANT ALL ON FUNCTION public.increment_wallet(p_user_id uuid, p_dots integer, p_crystals integer) TO authenticated;
GRANT ALL ON FUNCTION public.increment_wallet(p_user_id uuid, p_dots integer, p_crystals integer) TO service_role;


--
-- Name: FUNCTION log_signup_trigger_error(p_user_id uuid, p_email text, p_step text, p_error_message text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.log_signup_trigger_error(p_user_id uuid, p_email text, p_step text, p_error_message text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_signup_trigger_error(p_user_id uuid, p_email text, p_step text, p_error_message text) TO anon;
GRANT ALL ON FUNCTION public.log_signup_trigger_error(p_user_id uuid, p_email text, p_step text, p_error_message text) TO authenticated;
GRANT ALL ON FUNCTION public.log_signup_trigger_error(p_user_id uuid, p_email text, p_step text, p_error_message text) TO service_role;


--
-- Name: FUNCTION perform_owned_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.perform_owned_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.perform_owned_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb) TO postgres;
GRANT ALL ON FUNCTION public.perform_owned_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb) TO service_role;


--
-- Name: FUNCTION perform_owned_item_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb, p_slug text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.perform_owned_item_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb, p_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.perform_owned_item_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb, p_slug text) TO postgres;
GRANT ALL ON FUNCTION public.perform_owned_item_care(p_user_id uuid, p_pet_id uuid, p_action text, p_expected jsonb, p_patch jsonb, p_slug text) TO service_role;


--
-- Name: FUNCTION potato_battle_multiplier(p_user_id uuid, p_reward text, p_at timestamp with time zone); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.potato_battle_multiplier(p_user_id uuid, p_reward text, p_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.potato_battle_multiplier(p_user_id uuid, p_reward text, p_at timestamp with time zone) TO postgres;
GRANT ALL ON FUNCTION public.potato_battle_multiplier(p_user_id uuid, p_reward text, p_at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION potato_effect_for_roll(p_roll numeric); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.potato_effect_for_roll(p_roll numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.potato_effect_for_roll(p_roll numeric) TO postgres;
GRANT ALL ON FUNCTION public.potato_effect_for_roll(p_roll numeric) TO service_role;


--
-- Name: FUNCTION potato_locations(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.potato_locations() FROM PUBLIC;
GRANT ALL ON FUNCTION public.potato_locations() TO postgres;
GRANT ALL ON FUNCTION public.potato_locations() TO service_role;


--
-- Name: FUNCTION potato_new_incubation(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.potato_new_incubation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.potato_new_incubation() TO postgres;
GRANT ALL ON FUNCTION public.potato_new_incubation() TO service_role;


--
-- Name: FUNCTION potato_warm_due(p_due timestamp with time zone, p_start timestamp with time zone, p_until timestamp with time zone); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.potato_warm_due(p_due timestamp with time zone, p_start timestamp with time zone, p_until timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.potato_warm_due(p_due timestamp with time zone, p_start timestamp with time zone, p_until timestamp with time zone) TO postgres;
GRANT ALL ON FUNCTION public.potato_warm_due(p_due timestamp with time zone, p_start timestamp with time zone, p_until timestamp with time zone) TO service_role;


--
-- Name: FUNCTION prevent_locked_velune_activation(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.prevent_locked_velune_activation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prevent_locked_velune_activation() TO anon;
GRANT ALL ON FUNCTION public.prevent_locked_velune_activation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_locked_velune_activation() TO service_role;


--
-- Name: FUNCTION prevent_locked_velune_party_assignment(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.prevent_locked_velune_party_assignment() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prevent_locked_velune_party_assignment() TO anon;
GRANT ALL ON FUNCTION public.prevent_locked_velune_party_assignment() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_locked_velune_party_assignment() TO service_role;


--
-- Name: FUNCTION prevent_personality_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_personality_change() TO anon;
GRANT ALL ON FUNCTION public.prevent_personality_change() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_personality_change() TO service_role;


--
-- Name: FUNCTION prevent_profile_escalation(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.prevent_profile_escalation() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prevent_profile_escalation() TO anon;
GRANT ALL ON FUNCTION public.prevent_profile_escalation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_profile_escalation() TO service_role;


--
-- Name: FUNCTION prevent_role_escalation(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_role_escalation() TO anon;
GRANT ALL ON FUNCTION public.prevent_role_escalation() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_role_escalation() TO service_role;


--
-- Name: FUNCTION protect_favorite_kith(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.protect_favorite_kith() FROM PUBLIC;
GRANT ALL ON FUNCTION public.protect_favorite_kith() TO postgres;
GRANT ALL ON FUNCTION public.protect_favorite_kith() TO service_role;


--
-- Name: FUNCTION purchase_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.purchase_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.purchase_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb) TO postgres;
GRANT ALL ON FUNCTION public.purchase_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb) TO service_role;


--
-- Name: FUNCTION record_kith_discovery_from_pet(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_kith_discovery_from_pet() TO anon;
GRANT ALL ON FUNCTION public.record_kith_discovery_from_pet() TO authenticated;
GRANT ALL ON FUNCTION public.record_kith_discovery_from_pet() TO service_role;


--
-- Name: FUNCTION recover_runaway_pet_to_party(p_user_id uuid, p_pet_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.recover_runaway_pet_to_party(p_user_id uuid, p_pet_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.recover_runaway_pet_to_party(p_user_id uuid, p_pet_id uuid) TO anon;
GRANT ALL ON FUNCTION public.recover_runaway_pet_to_party(p_user_id uuid, p_pet_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.recover_runaway_pet_to_party(p_user_id uuid, p_pet_id uuid) TO service_role;


--
-- Name: FUNCTION recover_runaway_pet_with_payment(p_user_id uuid, p_pet_id uuid, p_dots integer, p_crystals integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.recover_runaway_pet_with_payment(p_user_id uuid, p_pet_id uuid, p_dots integer, p_crystals integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.recover_runaway_pet_with_payment(p_user_id uuid, p_pet_id uuid, p_dots integer, p_crystals integer) TO postgres;
GRANT ALL ON FUNCTION public.recover_runaway_pet_with_payment(p_user_id uuid, p_pet_id uuid, p_dots integer, p_crystals integer) TO service_role;


--
-- Name: FUNCTION reset_test_account_game_data(p_user_id uuid, p_email text, p_confirm text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.reset_test_account_game_data(p_user_id uuid, p_email text, p_confirm text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reset_test_account_game_data(p_user_id uuid, p_email text, p_confirm text) TO postgres;
GRANT ALL ON FUNCTION public.reset_test_account_game_data(p_user_id uuid, p_email text, p_confirm text) TO service_role;


--
-- Name: FUNCTION resolve_species_skill_equipment(p_user_id uuid, p_pet_id uuid, p_milestone_key text, p_slot smallint); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.resolve_species_skill_equipment(p_user_id uuid, p_pet_id uuid, p_milestone_key text, p_slot smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_species_skill_equipment(p_user_id uuid, p_pet_id uuid, p_milestone_key text, p_slot smallint) TO postgres;
GRANT ALL ON FUNCTION public.resolve_species_skill_equipment(p_user_id uuid, p_pet_id uuid, p_milestone_key text, p_slot smallint) TO service_role;


--
-- Name: FUNCTION restore_test_runaway_pets(p_confirm_text text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.restore_test_runaway_pets(p_confirm_text text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.restore_test_runaway_pets(p_confirm_text text) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION roll_velune_encounter(p_user_id uuid, p_location_key text, p_sighting_roll integer, p_egg_roll integer, p_bypass_cooldown boolean); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.roll_velune_encounter(p_user_id uuid, p_location_key text, p_sighting_roll integer, p_egg_roll integer, p_bypass_cooldown boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.roll_velune_encounter(p_user_id uuid, p_location_key text, p_sighting_roll integer, p_egg_roll integer, p_bypass_cooldown boolean) TO anon;
GRANT ALL ON FUNCTION public.roll_velune_encounter(p_user_id uuid, p_location_key text, p_sighting_roll integer, p_egg_roll integer, p_bypass_cooldown boolean) TO authenticated;
GRANT ALL ON FUNCTION public.roll_velune_encounter(p_user_id uuid, p_location_key text, p_sighting_roll integer, p_egg_roll integer, p_bypass_cooldown boolean) TO service_role;


--
-- Name: FUNCTION save_owned_appearance(p_user_id uuid, p_appearance jsonb, p_target text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.save_owned_appearance(p_user_id uuid, p_appearance jsonb, p_target text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_owned_appearance(p_user_id uuid, p_appearance jsonb, p_target text) TO postgres;
GRANT ALL ON FUNCTION public.save_owned_appearance(p_user_id uuid, p_appearance jsonb, p_target text) TO service_role;


--
-- Name: FUNCTION set_homepage_alerts_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_homepage_alerts_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_homepage_alerts_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_homepage_alerts_updated_at() TO service_role;


--
-- Name: FUNCTION set_kith_favorite(p_user_id uuid, p_pet_id uuid, p_favorite boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.set_kith_favorite(p_user_id uuid, p_pet_id uuid, p_favorite boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_kith_favorite(p_user_id uuid, p_pet_id uuid, p_favorite boolean) TO postgres;
GRANT ALL ON FUNCTION public.set_kith_favorite(p_user_id uuid, p_pet_id uuid, p_favorite boolean) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid) TO service_role;


--
-- Name: FUNCTION spend_wallet(p_user_id uuid, p_dots integer, p_crystals integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.spend_wallet(p_user_id uuid, p_dots integer, p_crystals integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.spend_wallet(p_user_id uuid, p_dots integer, p_crystals integer) TO service_role;


--
-- Name: FUNCTION stamp_wildwood_item_opportunity(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.stamp_wildwood_item_opportunity() FROM PUBLIC;
GRANT ALL ON FUNCTION public.stamp_wildwood_item_opportunity() TO postgres;
GRANT ALL ON FUNCTION public.stamp_wildwood_item_opportunity() TO service_role;


--
-- Name: FUNCTION trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb) TO postgres;
GRANT ALL ON FUNCTION public.trade_assanti_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb) TO service_role;


--
-- Name: FUNCTION trade_assanti_food(p_user_id uuid, p_slug text, p_quantity integer, p_direction text); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.trade_assanti_food(p_user_id uuid, p_slug text, p_quantity integer, p_direction text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.trade_assanti_food(p_user_id uuid, p_slug text, p_quantity integer, p_direction text) TO postgres;
GRANT ALL ON FUNCTION public.trade_assanti_food(p_user_id uuid, p_slug text, p_quantity integer, p_direction text) TO service_role;


--
-- Name: FUNCTION trade_assanti_food_on_day(p_user_id uuid, p_slug text, p_quantity integer, p_direction text, p_delta_day integer); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.trade_assanti_food_on_day(p_user_id uuid, p_slug text, p_quantity integer, p_direction text, p_delta_day integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.trade_assanti_food_on_day(p_user_id uuid, p_slug text, p_quantity integer, p_direction text, p_delta_day integer) TO postgres;
GRANT ALL ON FUNCTION public.trade_assanti_food_on_day(p_user_id uuid, p_slug text, p_quantity integer, p_direction text, p_delta_day integer) TO service_role;


--
-- Name: FUNCTION trade_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb, p_catalog jsonb); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.trade_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb, p_catalog jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.trade_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb, p_catalog jsonb) TO postgres;
GRANT ALL ON FUNCTION public.trade_kennith_basket(p_user_id uuid, p_delta_day integer, p_lines jsonb, p_seed jsonb, p_catalog jsonb) TO service_role;


--
-- Name: FUNCTION transfer_wildwood_egg(p_user_id uuid, p_room_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.transfer_wildwood_egg(p_user_id uuid, p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transfer_wildwood_egg(p_user_id uuid, p_room_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.transfer_wildwood_egg(p_user_id uuid, p_room_id uuid) TO service_role;


--
-- Name: FUNCTION transfer_wildwood_treasure_item(p_user_id uuid, p_room_id uuid); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.transfer_wildwood_treasure_item(p_user_id uuid, p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.transfer_wildwood_treasure_item(p_user_id uuid, p_room_id uuid) TO postgres;
GRANT ALL ON FUNCTION public.transfer_wildwood_treasure_item(p_user_id uuid, p_room_id uuid) TO service_role;


--
-- Name: FUNCTION validate_wildwood_pet_battle_result(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.validate_wildwood_pet_battle_result() FROM PUBLIC;
GRANT ALL ON FUNCTION public.validate_wildwood_pet_battle_result() TO postgres;
GRANT ALL ON FUNCTION public.validate_wildwood_pet_battle_result() TO service_role;


--
-- Name: FUNCTION wildwood_discovery_catalog(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.wildwood_discovery_catalog() FROM PUBLIC;
GRANT ALL ON FUNCTION public.wildwood_discovery_catalog() TO postgres;
GRANT ALL ON FUNCTION public.wildwood_discovery_catalog() TO service_role;


--
-- Name: FUNCTION wildwood_discovery_readiness(); Type: ACL; Schema: public; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION public.wildwood_discovery_readiness() FROM PUBLIC;
GRANT ALL ON FUNCTION public.wildwood_discovery_readiness() TO postgres;
GRANT ALL ON FUNCTION public.wildwood_discovery_readiness() TO service_role;


--
-- Name: TABLE eggs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.eggs TO anon;
GRANT ALL ON TABLE public.eggs TO authenticated;
GRANT ALL ON TABLE public.eggs TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE admin_user_starters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_user_starters TO anon;
GRANT ALL ON TABLE public.admin_user_starters TO authenticated;
GRANT ALL ON TABLE public.admin_user_starters TO service_role;


--
-- Name: TABLE aliune_signal_reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.aliune_signal_reports TO anon;
GRANT ALL ON TABLE public.aliune_signal_reports TO authenticated;
GRANT ALL ON TABLE public.aliune_signal_reports TO service_role;


--
-- Name: TABLE aliune_signals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.aliune_signals TO anon;
GRANT ALL ON TABLE public.aliune_signals TO authenticated;
GRANT ALL ON TABLE public.aliune_signals TO service_role;


--
-- Name: TABLE alpha_systems; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.alpha_systems TO anon;
GRANT ALL ON TABLE public.alpha_systems TO authenticated;
GRANT ALL ON TABLE public.alpha_systems TO service_role;


--
-- Name: TABLE announcements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.announcements TO anon;
GRANT ALL ON TABLE public.announcements TO authenticated;
GRANT ALL ON TABLE public.announcements TO service_role;


--
-- Name: TABLE assanti_food_catalog; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.assanti_food_catalog TO postgres;
GRANT ALL ON TABLE public.assanti_food_catalog TO service_role;


--
-- Name: TABLE assanti_food_claims; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.assanti_food_claims TO postgres;
GRANT ALL ON TABLE public.assanti_food_claims TO service_role;
GRANT SELECT ON TABLE public.assanti_food_claims TO authenticated;


--
-- Name: TABLE assanti_food_config; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.assanti_food_config TO postgres;
GRANT ALL ON TABLE public.assanti_food_config TO service_role;


--
-- Name: TABLE assanti_food_days; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.assanti_food_days TO postgres;
GRANT ALL ON TABLE public.assanti_food_days TO service_role;


--
-- Name: TABLE awards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.awards TO anon;
GRANT ALL ON TABLE public.awards TO authenticated;
GRANT ALL ON TABLE public.awards TO service_role;


--
-- Name: TABLE battle_run_fights; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.battle_run_fights TO anon;
GRANT ALL ON TABLE public.battle_run_fights TO authenticated;
GRANT ALL ON TABLE public.battle_run_fights TO service_role;


--
-- Name: TABLE battle_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.battle_runs TO anon;
GRANT ALL ON TABLE public.battle_runs TO authenticated;
GRANT ALL ON TABLE public.battle_runs TO service_role;


--
-- Name: TABLE daily_care; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.daily_care TO anon;
GRANT ALL ON TABLE public.daily_care TO authenticated;
GRANT ALL ON TABLE public.daily_care TO service_role;


--
-- Name: TABLE daily_login_rewards; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.daily_login_rewards TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.daily_login_rewards TO authenticated;
GRANT ALL ON TABLE public.daily_login_rewards TO service_role;


--
-- Name: TABLE element_defs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.element_defs TO anon;
GRANT ALL ON TABLE public.element_defs TO authenticated;
GRANT ALL ON TABLE public.element_defs TO service_role;


--
-- Name: TABLE game_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.game_config TO anon;
GRANT ALL ON TABLE public.game_config TO authenticated;
GRANT ALL ON TABLE public.game_config TO service_role;


--
-- Name: TABLE hatchery_shelf_slots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.hatchery_shelf_slots TO anon;
GRANT ALL ON TABLE public.hatchery_shelf_slots TO authenticated;
GRANT ALL ON TABLE public.hatchery_shelf_slots TO service_role;


--
-- Name: TABLE hatchery_slots; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.hatchery_slots TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.hatchery_slots TO authenticated;
GRANT ALL ON TABLE public.hatchery_slots TO service_role;


--
-- Name: TABLE home_objects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.home_objects TO anon;
GRANT ALL ON TABLE public.home_objects TO authenticated;
GRANT ALL ON TABLE public.home_objects TO service_role;


--
-- Name: TABLE homepage_alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.homepage_alerts TO anon;
GRANT ALL ON TABLE public.homepage_alerts TO authenticated;
GRANT ALL ON TABLE public.homepage_alerts TO service_role;


--
-- Name: TABLE homepage_alerts_live; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.homepage_alerts_live TO anon;
GRANT ALL ON TABLE public.homepage_alerts_live TO authenticated;
GRANT ALL ON TABLE public.homepage_alerts_live TO service_role;


--
-- Name: TABLE homepage_aliune_signal_live; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.homepage_aliune_signal_live TO anon;
GRANT ALL ON TABLE public.homepage_aliune_signal_live TO authenticated;
GRANT ALL ON TABLE public.homepage_aliune_signal_live TO service_role;


--
-- Name: TABLE homepage_alpha_systems_live; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.homepage_alpha_systems_live TO anon;
GRANT ALL ON TABLE public.homepage_alpha_systems_live TO authenticated;
GRANT ALL ON TABLE public.homepage_alpha_systems_live TO service_role;


--
-- Name: TABLE homepage_announcements_live; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.homepage_announcements_live TO anon;
GRANT ALL ON TABLE public.homepage_announcements_live TO authenticated;
GRANT ALL ON TABLE public.homepage_announcements_live TO service_role;


--
-- Name: TABLE homepage_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.homepage_logs TO anon;
GRANT ALL ON TABLE public.homepage_logs TO authenticated;
GRANT ALL ON TABLE public.homepage_logs TO service_role;


--
-- Name: TABLE patch_notes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.patch_notes TO anon;
GRANT ALL ON TABLE public.patch_notes TO authenticated;
GRANT ALL ON TABLE public.patch_notes TO service_role;


--
-- Name: TABLE homepage_patch_notes_live; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.homepage_patch_notes_live TO anon;
GRANT ALL ON TABLE public.homepage_patch_notes_live TO authenticated;
GRANT ALL ON TABLE public.homepage_patch_notes_live TO service_role;


--
-- Name: TABLE inventory; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.inventory TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.inventory TO authenticated;
GRANT ALL ON TABLE public.inventory TO service_role;


--
-- Name: TABLE item_defs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.item_defs TO anon;
GRANT ALL ON TABLE public.item_defs TO authenticated;
GRANT ALL ON TABLE public.item_defs TO service_role;


--
-- Name: TABLE kennith_stock; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.kennith_stock TO postgres;
GRANT ALL ON TABLE public.kennith_stock TO service_role;


--
-- Name: TABLE kennith_stock_days; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.kennith_stock_days TO postgres;
GRANT ALL ON TABLE public.kennith_stock_days TO service_role;


--
-- Name: TABLE kennith_wallet_days; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.kennith_wallet_days TO postgres;
GRANT ALL ON TABLE public.kennith_wallet_days TO service_role;


--
-- Name: TABLE legendary_kith_event_state; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.legendary_kith_event_state TO anon;
GRANT ALL ON TABLE public.legendary_kith_event_state TO authenticated;
GRANT ALL ON TABLE public.legendary_kith_event_state TO service_role;


--
-- Name: TABLE mutations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mutations TO anon;
GRANT ALL ON TABLE public.mutations TO authenticated;
GRANT ALL ON TABLE public.mutations TO service_role;


--
-- Name: TABLE party_slots; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.party_slots TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.party_slots TO authenticated;
GRANT ALL ON TABLE public.party_slots TO service_role;


--
-- Name: TABLE passive_traits; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.passive_traits TO anon;
GRANT ALL ON TABLE public.passive_traits TO authenticated;
GRANT ALL ON TABLE public.passive_traits TO service_role;


--
-- Name: TABLE personalities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.personalities TO anon;
GRANT ALL ON TABLE public.personalities TO authenticated;
GRANT ALL ON TABLE public.personalities TO service_role;


--
-- Name: TABLE pet_awards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pet_awards TO anon;
GRANT ALL ON TABLE public.pet_awards TO authenticated;
GRANT ALL ON TABLE public.pet_awards TO service_role;


--
-- Name: TABLE pet_battle_results; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.pet_battle_results TO postgres;
GRANT SELECT ON TABLE public.pet_battle_results TO authenticated;
GRANT SELECT,INSERT ON TABLE public.pet_battle_results TO service_role;


--
-- Name: TABLE pet_element_affinities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pet_element_affinities TO anon;
GRANT ALL ON TABLE public.pet_element_affinities TO authenticated;
GRANT ALL ON TABLE public.pet_element_affinities TO service_role;


--
-- Name: TABLE pet_element_deltas; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.pet_element_deltas TO postgres;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.pet_element_deltas TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.pet_element_deltas TO authenticated;
GRANT ALL ON TABLE public.pet_element_deltas TO service_role;


--
-- Name: TABLE pet_elements; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.pet_elements TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.pet_elements TO authenticated;
GRANT ALL ON TABLE public.pet_elements TO service_role;


--
-- Name: TABLE pet_mutations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pet_mutations TO anon;
GRANT ALL ON TABLE public.pet_mutations TO authenticated;
GRANT ALL ON TABLE public.pet_mutations TO service_role;


--
-- Name: TABLE pet_relic_equipment; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.pet_relic_equipment TO postgres;
GRANT ALL ON TABLE public.pet_relic_equipment TO service_role;


--
-- Name: TABLE pet_skill_milestone_claims; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.pet_skill_milestone_claims TO postgres;
GRANT ALL ON TABLE public.pet_skill_milestone_claims TO service_role;


--
-- Name: TABLE pet_skills; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.pet_skills TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.pet_skills TO authenticated;
GRANT ALL ON TABLE public.pet_skills TO service_role;


--
-- Name: TABLE pet_stat_allocations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.pet_stat_allocations TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.pet_stat_allocations TO authenticated;
GRANT ALL ON TABLE public.pet_stat_allocations TO service_role;


--
-- Name: TABLE pet_stat_spend_receipts; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.pet_stat_spend_receipts TO postgres;
GRANT ALL ON TABLE public.pet_stat_spend_receipts TO service_role;


--
-- Name: TABLE pet_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.pet_stats TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.pet_stats TO authenticated;
GRANT ALL ON TABLE public.pet_stats TO service_role;


--
-- Name: TABLE player_quests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.player_quests TO anon;
GRANT ALL ON TABLE public.player_quests TO authenticated;
GRANT ALL ON TABLE public.player_quests TO service_role;


--
-- Name: TABLE poe_tay_toe_finds; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.poe_tay_toe_finds TO anon;
GRANT ALL ON TABLE public.poe_tay_toe_finds TO authenticated;
GRANT ALL ON TABLE public.poe_tay_toe_finds TO service_role;


--
-- Name: TABLE poe_tay_toe_state; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.poe_tay_toe_state TO anon;
GRANT ALL ON TABLE public.poe_tay_toe_state TO authenticated;
GRANT ALL ON TABLE public.poe_tay_toe_state TO service_role;


--
-- Name: TABLE pve_instability_fights; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pve_instability_fights TO anon;
GRANT ALL ON TABLE public.pve_instability_fights TO authenticated;
GRANT ALL ON TABLE public.pve_instability_fights TO service_role;


--
-- Name: TABLE pve_instability_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pve_instability_runs TO anon;
GRANT ALL ON TABLE public.pve_instability_runs TO authenticated;
GRANT ALL ON TABLE public.pve_instability_runs TO service_role;


--
-- Name: TABLE pve_research_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pve_research_stats TO anon;
GRANT ALL ON TABLE public.pve_research_stats TO authenticated;
GRANT ALL ON TABLE public.pve_research_stats TO service_role;


--
-- Name: TABLE retired_kith_species; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.retired_kith_species TO anon;
GRANT ALL ON TABLE public.retired_kith_species TO authenticated;
GRANT ALL ON TABLE public.retired_kith_species TO service_role;


--
-- Name: TABLE rune_defs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rune_defs TO anon;
GRANT ALL ON TABLE public.rune_defs TO authenticated;
GRANT ALL ON TABLE public.rune_defs TO service_role;


--
-- Name: TABLE signup_trigger_errors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.signup_trigger_errors TO anon;
GRANT ALL ON TABLE public.signup_trigger_errors TO authenticated;
GRANT ALL ON TABLE public.signup_trigger_errors TO service_role;


--
-- Name: SEQUENCE signup_trigger_errors_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.signup_trigger_errors_id_seq TO anon;
GRANT ALL ON SEQUENCE public.signup_trigger_errors_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.signup_trigger_errors_id_seq TO service_role;


--
-- Name: TABLE skill_defs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.skill_defs TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.skill_defs TO authenticated;
GRANT ALL ON TABLE public.skill_defs TO service_role;


--
-- Name: TABLE trainer_awards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trainer_awards TO anon;
GRANT ALL ON TABLE public.trainer_awards TO authenticated;
GRANT ALL ON TABLE public.trainer_awards TO service_role;


--
-- Name: TABLE trainer_progression; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trainer_progression TO anon;
GRANT ALL ON TABLE public.trainer_progression TO authenticated;
GRANT ALL ON TABLE public.trainer_progression TO service_role;


--
-- Name: TABLE user_kith_discoveries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_kith_discoveries TO anon;
GRANT ALL ON TABLE public.user_kith_discoveries TO authenticated;
GRANT ALL ON TABLE public.user_kith_discoveries TO service_role;


--
-- Name: TABLE user_resources; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_resources TO anon;
GRANT ALL ON TABLE public.user_resources TO authenticated;
GRANT ALL ON TABLE public.user_resources TO service_role;


--
-- Name: TABLE user_retired_kith; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_retired_kith TO anon;
GRANT ALL ON TABLE public.user_retired_kith TO authenticated;
GRANT ALL ON TABLE public.user_retired_kith TO service_role;


--
-- Name: TABLE user_runes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_runes TO anon;
GRANT ALL ON TABLE public.user_runes TO authenticated;
GRANT ALL ON TABLE public.user_runes TO service_role;


--
-- Name: TABLE v_pet_storage_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_pet_storage_stats TO anon;
GRANT ALL ON TABLE public.v_pet_storage_stats TO authenticated;
GRANT ALL ON TABLE public.v_pet_storage_stats TO service_role;


--
-- Name: TABLE v_pet_total_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_pet_total_stats TO anon;
GRANT ALL ON TABLE public.v_pet_total_stats TO authenticated;
GRANT ALL ON TABLE public.v_pet_total_stats TO service_role;


--
-- Name: TABLE wallet_ledger; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.wallet_ledger TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.wallet_ledger TO authenticated;
GRANT ALL ON TABLE public.wallet_ledger TO service_role;


--
-- Name: TABLE wallets; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.wallets TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.wallets TO authenticated;
GRANT ALL ON TABLE public.wallets TO service_role;


--
-- Name: TABLE wildwood_expeditions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wildwood_expeditions TO anon;
GRANT ALL ON TABLE public.wildwood_expeditions TO authenticated;
GRANT ALL ON TABLE public.wildwood_expeditions TO service_role;


--
-- Name: TABLE wildwood_rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wildwood_rooms TO anon;
GRANT ALL ON TABLE public.wildwood_rooms TO authenticated;
GRANT ALL ON TABLE public.wildwood_rooms TO service_role;


--
-- Name: TABLE wildwood_treasure_items; Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON TABLE public.wildwood_treasure_items TO postgres;
GRANT ALL ON TABLE public.wildwood_treasure_items TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

--
-- PostgreSQL database dump complete
--



SET search_path = public, pg_catalog;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();
SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict risWNvg6H0p69jxGcm14kCpboVahkXFSszWQFv4gHORw9uwIemgUxdeOpNQgghS

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: alpha_systems; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."alpha_systems" ("id", "title", "description", "enabled", "sort_order", "created_at", "released_at") VALUES
	('3402499f-aff4-4363-b196-563d1c6c6b48', 'Aliune Signal Active!', 'The Aliune Signal is now active on the homepage, giving players a live look at world stability, regional conditions, and corruption levels across Aliune. This system will continue to grow as world events and environmental changes are introduced.  (The current info on the Aliune Signal is fallback data)', false, 1, '2026-04-12 18:37:43.855867+00', '2026-04-12 18:37:33+00'),
	('e1784bce-51f6-4700-a66d-d2410d24a008', 'Welcome to the Closed Alpha!', 'The Aliune Signal is live.

DeltaPets is entering Closed Alpha testing and this version is not finished yet, but the main testing flow is ready enough for the Closed Alpha Team to start breaking things in a useful way.

Please test the core player journey:

* Create an account
* Start the intro flow
* Receive and hatch your first egg
* View your pet
* Use care actions
* Check your party/team display
* Open skills, inventory, and related panels
* Report any visual bugs, broken buttons, missing data, or confusing screens

This alpha build is focused on stability, usability, and catching bugs before wider testing. Some content, balance, art, and polish are still placeholder or unfinished.

If something breaks, please submit a bug ticket with a screenshot and a short explanation of what happened.

Happy hunting, Alpha Team.
', false, 0, '2026-07-02 16:02:56+00', '2026-07-02 16:04:54+00'),
	('f551c8a0-303c-41f9-9476-daf9172f98c0', 'Homepage is complete!', 'I had some redesign on the Homepage that took a month to fix. I like the outcome a lot better than my previous version of Deltapets', false, 0, '2026-04-04 16:11:16+00', '2026-04-04 16:12:00+00'),
	('57426b55-f02c-4c00-a834-c91f30e21e56', 'Mobile Setup Pass', 'DeltaPets is currently focused on mobile layout improvements. The homepage, navigation, popups, panels, buttons, and core testing flow are being checked so alpha testers can use the game more comfortably on phones and smaller screens.', true, 0, '2026-07-03 13:57:13.842151+00', '2026-07-03 12:00:00+00'),
	('47a36c82-1893-4e61-94e5-78d31dc72be2', 'Closed Alpha Testing', 'Closed Alpha testing is active. Please continue testing the main player journey: create an account, start the intro flow, receive and hatch your first egg, view your pet, use care actions, check your party/team display, and open skills, inventory, armory, and related panels.', true, 1, '2026-07-03 13:57:13.842151+00', '2026-07-03 12:00:00+00'),
	('51ff5dcd-1088-4cda-bf40-3d4bbbbd6a62', 'Homepage Stability', 'The homepage is being updated to better show announcements, patch notes, current alpha status, version information, and warning banners. Some visual polish is still in progress, but stability and usability come first.', true, 2, '2026-07-03 13:57:13.842151+00', '2026-07-03 12:00:00+00'),
	('bc4ccc42-399f-4341-be97-25f76e6e00b2', 'Kithna Roaming Eggs', 'Day eggs and night eggs are being wired into Kithna exploration. These eggs use a non-starter Kithna species pool so starter pets stay separate from wild city discoveries.', true, 0, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00'),
	('fd21110b-a95c-4c0e-8592-cb62dcd90b72', 'Random Enemy Battle Setup', 'The next gameplay focus is random enemy encounters and a working battle flow. This will help testers begin fighting enemies that appear around Kithna.', true, 1, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00'),
	('aab5e7b6-4d4d-4b7b-8e53-50dce1ed7feb', 'Aliune Signal Lore Pass', 'Lore updates are being prepared to explain why enemies are attacking Kithna and why some eggs are affected by corruption during unstable Aliune Signal events.', true, 2, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00'),
	('f7ec6025-9cf4-42b0-abc5-b799886ef0a4', 'Food Merchant - Kithna', 'Care items available for purchase using Dots. Trough upgrades unlocked. Visit Kithna to access.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-07-21 00:00:00+00'),
	('d324354c-40bc-481f-b3ad-1eb917a1a189', 'Kithna Roam Encounters', 'Random day and night egg encounters are live in Kithna. Wild eggs use a separate species pool from starters.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-07-05 00:00:00+00'),
	('e457ad97-7a53-4c22-b256-c604c1c72a28', 'Kith Team Party System', 'Up to 4 pets in your active team. Hatchlings automatically fill the next open slot. Full party sends new pets to storage.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-07-01 00:00:00+00'),
	('19b4dd9d-8168-4d60-a5b3-c68eb5039e92', 'Care Loop', 'Feed, clean, play, and comfort your Delta daily. Care stats decay over time. Bond grows with consistent care.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-06-15 00:00:00+00'),
	('7ad3e220-72be-40f8-9552-11b723806e52', 'Egg Hatching', 'Starter eggs and Kithna eggs can be incubated and hatched. Stats, personality, and traits are rolled at hatch.', true, 0, '2026-07-21 13:58:43.193521+00', '2026-06-01 00:00:00+00');


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."announcements" ("id", "title", "body", "is_published", "created_at", "updated_at", "created_by", "page_scope") VALUES
	('43e8d20d-1186-4e0b-b87c-566e716553ea', 'Homepage is getting a glow up!', 'I am taking a look back at my Homepage and creating something that looks nice and works great. With nice code.', true, '2026-03-25 17:33:25.75859+00', '2026-03-25 17:33:25.75859+00', NULL, 'homepage'),
	('7bf42d4c-e5a1-432b-a320-0bbbcc13c5df', 'Good Morning', 'Hello Deltapets!  
I have made a lot of progress and updates to my web apps home page!  Look around, and make sure to upload any bugs or problem with speed!  Thank you/1', true, '2026-04-04 14:02:51+00', '2026-04-04 14:03:00.46873+00', NULL, 'homepage'),
	('abcc4b01-091a-428e-b69f-7de9fdccf63d', 'Good Morning, Users!', 'Welcome to Aliune.

The world has been quieter than usual… but not for long.

Recent system updates have improved how information travels across regions, and the Signal is becoming clearer with each passing cycle. You may begin to notice changes....not everything is as stable as it seems.

Keep an eye on your surroundings, and report anything unusual.

This is only the beginning.', true, '2026-04-12 18:33:34+00', '2026-04-12 18:33:44.273576+00', NULL, 'homepage'),
	('52138ec5-0578-469a-b924-e579ffe23778', 'WELCOME TO THE CLOSE ALPHA!', 'The Aliune Signal is live.

DeltaPets is entering Closed Alpha testing this week. This version is not finished yet, but the main testing flow is ready enough for the Closed Alpha Team to start testing.

Please test the core player journey:

Create an account.
Start the intro flow.
Receive and hatch your first egg.
View your pet.
Use care actions.
Check your party/team display.
Open skills, inventory, armory, and related panels.
Report any visual bugs, broken buttons, missing data, or confusing screens.

This alpha build is focused on stability, usability, and catching bugs before wider testing. Some content, balance, art, and polish are still placeholder or unfinished.

If something breaks, please submit a bug ticket with a screenshot and a short explanation of what happened.

Happy hunting, Alpha Team.', true, '2026-07-02 16:06:35+00', '2026-07-02 16:09:32.700039+00', NULL, 'homepage'),
	('924feb01-4510-4791-b5c4-44e16fb95115', 'MOBILE SETUP PASS HAS STARTED!', 'DeltaPets is now in the Mobile Setup Pass for Closed Alpha. The main goal right now is making the homepage, menus, popups, panels, buttons, and core player flow work better on smaller screens. Please test the site on mobile and desktop if you can. Focus on signup, login, intro flow, hatching your first egg, viewing your pet, using care actions, opening panels, and checking that buttons are easy to tap. If something breaks, overlaps, disappears, or looks suspicious, please submit a bug ticket with a screenshot and a short explanation. Happy testing, Alpha Team.', true, '2026-07-03 13:42:01+00', '2026-07-03 14:29:02.480447+00', NULL, 'homepage'),
	('c9b90d31-2add-4d6e-b15e-2613040073f9', 'Deploy Day: Kithna Eggs + Battle Prep', 'Deploys and fixes will be going out throughout the day. Closed alpha testers are welcome to keep testing while updates land. If something looks weird, refresh and report what happened in Discord.', true, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00', NULL, 'homepage'),
	('1d2d4469-0543-4b80-99d2-d15ad2969ca6', 'Kithna Journey Systems Are Starting', 'Today''s focus is random day and night eggs in Kithna, then random enemy battle setup. This begins the journey where players explore Kithna, discover why enemies are attacking, and learn why eggs sometimes become corrupted.', true, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00', NULL, 'homepage'),
	('02519530-e3d7-47f1-a084-10ec8ee09362', 'Kithna Journey Systems Are Starting', 'Today''s closed alpha deploy starts Kithna roaming eggs and prepares the next battle and lore systems. A separate Kithna non-starter species pool is being used so wild eggs do not mix with starter pets.', true, '2026-07-05 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage'),
	('c9cee5e8-011a-4e4c-99a9-688992378b18', 'What to Look Forward to on August 1', 'The next major deploy targets August 1. Planned for launch: the full battle dungeon loop, pet self-awareness conversations, evolution stage one for closed alpha pets, and the Bond system going live. Testers who are active now will have a head start.', true, '2026-07-21 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage'),
	('679180ab-752d-4ec1-bd67-db65d86c781b', 'Closed Alpha Progress Report', 'Since launch: egg hatching is live, Kithna roam encounters are working, the Food Merchant is open, care loops are stable, and the Kith Team party system is being hardened. Bug reports from testers have been critical. Thank you for staying in.', true, '2026-07-18 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage'),
	('b1944adc-0247-4f8f-8884-acb4f589b684', 'Mobile Setup Pass Has Started', 'The layout team is actively working through mobile screen fixes. Panels, popups, buttons, and small screen layouts may shift during testing. Report anything that looks broken.', true, '2026-07-03 12:00:00+00', '2026-07-21 13:58:24.653691+00', NULL, 'homepage');


--
-- Data for Name: awards; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."awards" ("id", "key", "name", "type", "icon_url", "rarity", "description", "created_at") VALUES
	('5b013d26-680b-4d5c-8a22-0138b58e9cc7', 'alpha_tester', 'Alpha Tester', 'ribbon', NULL, 'special', 'Awarded for participating in the Alpha deployment testing.', '2026-02-12 14:16:06.366851+00');


--
-- Data for Name: element_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."element_defs" ("id", "key", "display_name", "sort_order", "created_at") VALUES
	('5ebe8f00-0f15-4cf2-9ff5-bdf20e22bd3a', 'null', 'Null', 0, '2026-01-22 18:05:11.100664+00'),
	('2d5592a8-e636-43f3-8108-4972046464f0', 'water', 'Water', 1, '2026-01-22 18:05:11.100664+00'),
	('5d0cdd94-d38c-46df-9901-a20cf1f6b2df', 'fire', 'Fire', 2, '2026-01-22 18:05:11.100664+00'),
	('8ca03d5d-1157-4a75-b067-7a1eaa3a0712', 'earth', 'Earth', 3, '2026-01-22 18:05:11.100664+00'),
	('d3ba1a77-feed-40f7-9a7d-aa379f4cefc0', 'air', 'Air', 4, '2026-01-22 18:05:11.100664+00'),
	('78542868-889f-4e6c-8a61-237062f43a76', 'ice', 'Ice', 5, '2026-01-22 18:05:11.100664+00'),
	('3b6d6d3c-8abd-4993-b024-2847e44fd924', 'storm', 'Storm', 6, '2026-01-22 18:05:11.100664+00'),
	('0512f58a-c239-4301-ac16-eeb7b2e22499', 'light', 'Light', 7, '2026-01-22 18:05:11.100664+00'),
	('b39a05e4-88d0-4cb7-a925-b2223d3ee974', 'shadow', 'Shadow', 8, '2026-01-22 18:05:11.100664+00');


--
-- Data for Name: game_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."game_config" ("key", "value") VALUES
	('stat_rules', '{"max_level": 100, "base_total": 10, "points_per_level": 1}');


--
-- Data for Name: homepage_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."homepage_alerts" ("id", "message", "alert_color", "alert_type", "is_active", "starts_at", "ends_at", "cta_label", "cta_href", "created_at", "updated_at") VALUES
	('1dbaec9c-7737-40cc-b5f2-365499c4da1c', '"Hello Users! It''s a beautiful Day in the world of Aliune.  Just one cautious thing Id like to mention... dont go swimming in the fountain today, some votlet decided it top be there bath.  It''s very electrifying, dont go in until they leave." - Jay', 'green', 'news', false, NULL, NULL, NULL, NULL, '2026-04-06 01:54:51+00', '2026-07-03 14:29:02.480447+00'),
	('c35ea315-0df2-4e36-aa3d-c3c1c8d8c854', 'Caution: Luna found the mobile menu and pressed every button at once. Nothing is on fire, but the layout team is watching her closely. || Mobile Setup Pass is active. Panels, popups, buttons, and tiny-screen layouts may be a little wiggly while testing continues.', 'yellow', 'funny', false, '2026-07-03 00:00:00+00', NULL, NULL, NULL, '2026-07-03 14:29:02.480447+00', '2026-07-30 20:49:33.462481+00'),
	('ddcd992f-fa4d-4c13-aeef-dddaf0df4548', 'The Food Merchant is now open in Kithna. Stock up on care items for your Delta. || Fresh supply available daily. Visit the Food Merchant to feed and care for your team. || Kithna Market is active. Trough capacity upgrades now available. || Your Delta needs you. Care items are waiting at the Kithna Food Merchant.', 'green', 'market', false, NULL, NULL, 'Visit Kithna', '/cities/kithna', '2026-07-21 13:55:13.690189+00', '2026-07-30 20:49:33.462481+00'),
	('2bea0172-44bf-4c06-8149-f11b8d782fad', 'The Food Merchant is now open in Kithna. Stock up on care items for your Delta. || Fresh supply available daily. Visit the Food Merchant to feed and care for your team. || Kithna Market is active. Trough capacity upgrades now available. || Your Delta needs you. Care items are waiting at the Kithna Food Merchant.', 'green', 'market', false, NULL, NULL, 'Visit Kithna', '/cities/kithna', '2026-07-21 13:56:15.43811+00', '2026-07-30 20:49:33.462481+00'),
	('12b38782-60ac-4ce1-bf7b-4642e88a0b17', 'The Food Merchant is now open in Kithna. Stock up on care items for your Delta. || Visit the Food Merchant in Kithna to keep your Delta fed and happy. || The Food Merchant has everything your Delta needs. Come find it in Kithna.', 'green', 'market', false, NULL, NULL, 'Visit Kithna', '/cities/kithna', '2026-07-21 13:58:05.012697+00', '2026-07-30 20:49:33.462481+00'),
	('785b972c-8393-4333-a38c-76121d21106b', 'Assanti has opened his doors in Kithna! Visit Kithna''s first merchant and see what''s in stock.', 'green', 'market', true, '2026-07-30 20:49:33.462481+00', NULL, NULL, NULL, '2026-07-30 20:49:33.462481+00', '2026-07-30 20:49:33.462481+00');


--
-- Data for Name: item_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."item_defs" ("id", "slug", "name", "type", "description", "rarity", "stack_limit", "effects", "created_at", "updated_at") VALUES
	('c6cf0952-06e6-4a0c-8909-6ebefa221d02', 'starter_equipment', 'Starter Equipment', 'equipment', 'A basic equipment bundle awarded from the weekly reward track.', 2, 99, '{}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('101a0357-8203-4a8a-b79b-77ae70b01d6b', 'potion_small', 'Small Potion', 'battle_food', 'A small restorative potion awarded from the weekly reward track.', 1, 99, '{}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('f574dfa2-9db9-4f7f-8f8b-e2a85f114b02', 'kithna-food-pack', 'Kithna Food Pack', 'care', 'A simple meal for restoring hunger.', 1, 99, '{"careCategory": "food"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('b64cb741-a6f5-4229-b2d2-b34e26ef64e8', 'soft-cleaning-brush', 'Soft Cleaning Brush', 'care', 'A gentle brush for restoring clean.', 1, 99, '{"careCategory": "soap"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('7691a9ee-46ed-4378-9c91-06db493e0466', 'spark-jingle-toy', 'Spark Jingle Toy', 'care', 'A tiny toy for restoring mood.', 1, 99, '{"careCategory": "toy"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('b9f5e14f-9f81-4547-8de3-b7b92d0b690e', 'moon-nap-pillow', 'Moon Nap Pillow', 'care', 'A soft pillow for restoring comfort.', 1, 99, '{"careCategory": "bed"}', '2026-07-10 14:57:12.094886+00', '2026-07-11 12:38:14.320661+00'),
	('b311f35e-b2c0-4449-a528-e4fb5d157cc8', 'closed-alpha-care-package', 'Closed Alpha Care Package', 'care', 'A thank-you package for DeltaPets alpha testers.', 3, 1, '{"rewardKind": "care_package"}', '2026-07-25 14:50:57.029856+00', '2026-07-27 16:03:56.768325+00'),
	('068994cf-e20a-41b1-8db4-08487d111f25', 'potato', 'Potato', 'care', 'Just a potato.', 1, 1, '{}', '2026-08-08 17:02:51.052316+00', '2026-08-08 17:02:51.052316+00'),
	('6da47ca6-fa2a-4774-83a4-8e159aa32913', 'haiku_scroll_50', 'Haiku Scroll #50', 'material', 'A tiny ribbon-bound scroll containing a piece of Aliune lore.', 2, 99, '{"haiku": ["Twin moons cross the mist", "Old roads hum beneath starlight", "Aliune listens"], "collection": "haiku", "scrollNumber": 50}', '2026-08-13 17:01:51.109701+00', '2026-08-14 14:52:58.123756+00'),
	('b6ad229e-8748-41aa-b1d6-3965aa9d0086', 'water-delta', 'Water Delta', 'material', 'A Delta symbol infused with Water energy. Used for Water evolution.', 1, 999, '{"element": "water"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('6857bf8f-bce7-400b-86bd-249f4a1bb81f', 'fire-delta', 'Fire Delta', 'material', 'A Delta symbol infused with Fire energy. Used for Fire evolution.', 1, 999, '{"element": "fire"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('c0673429-423b-4c4f-a8d6-58df86a11a02', 'earth-delta', 'Earth Delta', 'material', 'A Delta symbol infused with Earth energy. Used for Earth evolution.', 1, 999, '{"element": "earth"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('1e93f485-236e-4e44-80c6-0212e7b5c3a4', 'air-delta', 'Air Delta', 'material', 'A Delta symbol infused with Air energy. Used for Air evolution.', 1, 999, '{"element": "air"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('0eb85ccc-17f3-434f-9306-bae62c7276ca', 'ice-delta', 'Ice Delta', 'material', 'A Delta symbol infused with Ice energy. Used for Ice evolution.', 1, 999, '{"element": "ice"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('c324521e-fb92-4925-a167-f92a8f01322f', 'storm-delta', 'Storm Delta', 'material', 'A Delta symbol infused with Storm energy. Used for Storm evolution.', 1, 999, '{"element": "storm"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('caab1ab8-9831-4785-af3d-bf82f5298b9d', 'light-delta', 'Light Delta', 'material', 'A Delta symbol infused with Light energy. Used for Light evolution.', 1, 999, '{"element": "light"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00'),
	('b9b1de53-c72c-4c3d-ab95-42e4e118c49b', 'shadow-delta', 'Shadow Delta', 'material', 'A Delta symbol infused with Shadow energy. Used for Shadow evolution.', 1, 999, '{"element": "shadow"}', '2026-09-07 17:17:17.492884+00', '2026-09-07 17:17:17.492884+00');


--
-- Data for Name: mutations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."mutations" ("id", "key", "name", "rarity", "description", "effect_summary", "drawback_summary", "effects", "is_active", "created_at") VALUES
	('555c2363-19d2-4f29-b0c5-f7a7ea757c04', 'sturdy_frame', 'Sturdy Frame', 'common', 'This Kith developed a broader frame and greater natural endurance.', '+5% maximum HP', '-3% Speed', '{"stat_percent": {"spd": -3, "hp_max": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('7a6b00f3-a905-4f1d-a441-b3fa4ece3005', 'light_bones', 'Light Bones', 'common', 'A lighter skeletal structure lets this Kith move more quickly.', '+5% Speed', '-3% Defense', '{"stat_percent": {"def": -3, "spd": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('9e7dd34d-a226-4c3d-b5b3-06382ddb04df', 'sharp_claws', 'Sharp Claws', 'common', 'Naturally sharpened claws improve physical attacks.', '+5% Attack', '-3% Magi', '{"stat_percent": {"atk": 5, "magi": -3}}', true, '2026-06-19 14:41:21.698314+00'),
	('186a43bc-5d8d-44f5-b9d5-ba2be70d0991', 'luminous_core', 'Luminous Core', 'common', 'A small inner glow strengthens this Kith’s magical output.', '+5% Magi', '-3% Attack', '{"stat_percent": {"atk": -3, "magi": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('c4d07c16-6575-445d-a106-97e4c012856b', 'deep_lungs', 'Deep Lungs', 'common', 'Expanded lungs help this Kith maintain a deeper mana reserve.', '+5% maximum Mana', '-3% Speed', '{"stat_percent": {"spd": -3, "mana_max": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('e825d802-6268-4664-b16c-2ea87267cf97', 'dense_hide', 'Dense Hide', 'common', 'Thicker skin provides extra protection from direct attacks.', '+5% Defense', '-3% maximum Mana', '{"stat_percent": {"def": 5, "mana_max": -3}}', true, '2026-06-19 14:41:21.698314+00'),
	('01daa681-f52a-41d5-b495-f57f56bf4697', 'keen_eyes', 'Keen Eyes', 'common', 'Unusually sharp eyesight helps this Kith place attacks carefully.', '+3% Accuracy', '-2% Evasion', '{"battle_percent": {"evasion": -2, "accuracy": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('f0ee3a6f-7f3b-4a33-90d7-49d682047b82', 'flexible_spine', 'Flexible Spine', 'common', 'An unusually flexible spine makes sudden evasive movement easier.', '+3% Evasion', '-2% Accuracy', '{"battle_percent": {"evasion": 3, "accuracy": -2}}', true, '2026-06-19 14:41:21.698314+00'),
	('9e30d85f-67c5-441e-aa98-bf72e4772f85', 'warm_blood', 'Warm Blood', 'common', 'A warmer body temperature helps healing effects take hold.', '+5% healing received', '-3% Ice resistance', '{"battle_percent": {"healing_received": 5}, "element_resistance_percent": {"ice": -3}}', true, '2026-06-19 14:41:21.698314+00'),
	('2db88724-e3b3-4902-806a-8f9a09eec98c', 'cool_blood', 'Cool Blood', 'common', 'A cooler body temperature improves resistance to heat.', '+5% Fire resistance', '-3% healing received', '{"battle_percent": {"healing_received": -3}, "element_resistance_percent": {"fire": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('d04cc494-f168-4c36-b711-262d849b03ac', 'static_fur', 'Static Fur', 'common', 'Charged fur occasionally bites back when touched.', '3% chance to deal minor retaliatory damage', '-2% Defense', '{"stat_percent": {"def": -2}, "chance_percent": {"minor_retaliation": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('3c890052-0270-4d7e-bade-5a7b923a13c7', 'resonant_voice', 'Resonant Voice', 'common', 'A naturally resonant call makes status skills slightly more reliable.', '+3% status-effect accuracy', '-2% physical Accuracy', '{"battle_percent": {"accuracy": -2, "status_accuracy": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('ca470783-05fc-44ee-ba10-7156aeb08283', 'elemental_veins', 'Elemental Veins', 'uncommon', 'Elemental energy runs visibly beneath this Kith’s skin.', '+8% damage with native-element skills', '-5% resistance to the element this Kith is weak against', '{"battle_percent": {"native_element_damage": 8, "weak_element_resistance": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('9c6006fb-cab6-4797-bea5-5d01caa9fa6a', 'regenerative_tissue', 'Regenerative Tissue', 'uncommon', 'Damaged tissue slowly repairs itself after combat.', 'Restore 3% maximum HP after a battle', '-5% maximum Mana', '{"stat_percent": {"mana_max": -5}, "after_battle_percent": {"restore_hp_max": 3}}', true, '2026-06-19 14:41:21.698314+00'),
	('8aaf8908-830a-42e6-bd34-60f519ff1a8c', 'predators_focus', 'Predator’s Focus', 'uncommon', 'This Kith becomes intensely focused when it sees an opening.', '+6% critical-hit chance', '-5% healing received', '{"battle_percent": {"critical_chance": 6, "healing_received": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('c30456b1-3f0e-47e9-85b2-6822f43ad019', 'guardians_crest', 'Guardian’s Crest', 'uncommon', 'A protective crest radiates a faint defensive field around allies.', 'Allies take 4% less damage while this Kith is active', '-5% Speed', '{"aura_percent": {"ally_damage_reduction": 4}, "stat_percent": {"spd": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('fbf74093-881b-4d08-8cd2-209ed59b162d', 'mana_overflow', 'Mana Overflow', 'uncommon', 'Excess mana constantly presses against this Kith’s physical defenses.', '+10% maximum Mana', '-5% Defense', '{"stat_percent": {"def": -5, "mana_max": 10}}', true, '2026-06-19 14:41:21.698314+00'),
	('c4294c15-62ef-4c5a-ab6e-e44a1894fec8', 'glass_cannon', 'Glass Cannon', 'uncommon', 'This Kith produces exceptional force but has a fragile defense.', '+8% Attack and +8% Magi', '-8% Defense', '{"stat_percent": {"atk": 8, "def": -8, "magi": 8}}', true, '2026-06-19 14:41:21.698314+00'),
	('994c4da3-a771-4df5-bce6-d858d8a870d3', 'adrenal_glands', 'Adrenal Glands', 'uncommon', 'Specialized glands flood this Kith with energy when it is wounded.', '+8% Speed while below 50% HP', '-3% Accuracy while above 50% HP', '{"conditional_percent": {"above_50_hp": {"accuracy": -3}, "below_50_hp": {"spd": 8}}}', true, '2026-06-19 14:41:21.698314+00'),
	('cf5302bc-f138-46c1-b3d6-eeba0cf1300b', 'reactive_scales', 'Reactive Scales', 'uncommon', 'These scales harden immediately after receiving a direct hit.', '+6% Defense after being hit until the end of the next turn', '-5% first-turn Attack', '{"triggered_percent": {"after_hit_def": 6}, "conditional_percent": {"first_turn": {"atk": -5}}}', true, '2026-06-19 14:41:21.698314+00'),
	('9ce272cb-12ad-4588-b190-b2b40d9d2789', 'twin_core', 'Twin Core', 'uncommon', 'Two smaller energy cores share the work of powering this Kith.', '+5% Attack and +5% Magi', '-5% maximum HP', '{"stat_percent": {"atk": 5, "magi": 5, "hp_max": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('9edf049b-408a-4881-9778-73675543ebb3', 'phoenix_marrow', 'Phoenix Marrow', 'rare', 'Fiery marrow refuses to let this Kith fall without resistance.', 'Once per battle, survive a fatal hit with 1 HP', '-8% maximum HP', '{"stat_percent": {"hp_max": -8}, "once_per_battle": {"survive_fatal_hit_hp": 1}}', true, '2026-06-19 14:41:21.698314+00'),
	('4b6eec99-11e2-4470-a214-762c416ba8d3', 'prismatic_blood', 'Prismatic Blood', 'rare', 'Rainbow-colored blood responds to every elemental current.', '+6% damage with all elemental skills', '+5% damage received from super-effective attacks', '{"battle_percent": {"all_element_damage": 6, "super_effective_damage_received": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('d410a7c0-5247-430f-8516-d444a2fa5f60', 'void_scar', 'Void Scar', 'rare', 'A dark scar disrupts hostile effects before they can fully settle.', '15% chance to resist a negative status effect', '-10% healing received', '{"battle_percent": {"healing_received": -10}, "chance_percent": {"resist_negative_status": 15}}', true, '2026-06-19 14:41:21.698314+00'),
	('6ada57bb-0e83-42f2-a826-b0214beae72d', 'titan_growth', 'Titan Growth', 'rare', 'Ancient growth patterns produced a much larger and tougher body.', '+12% maximum HP and +8% Defense', '-10% Speed', '{"stat_percent": {"def": 8, "spd": -10, "hp_max": 12}}', true, '2026-06-19 14:41:21.698314+00'),
	('61e325b0-0314-4176-b925-06c9f6b73b54', 'arcane_synapses', 'Arcane Synapses', 'rare', 'Magical signals travel through this Kith’s mind with unnatural speed.', '+12% Magi and 5% lower skill Mana costs', '-8% Attack', '{"stat_percent": {"atk": -8, "magi": 12}, "battle_percent": {"mana_cost": -5}}', true, '2026-06-19 14:41:21.698314+00'),
	('7c87e304-d9ab-49e7-a9ac-6c11e13d3db3', 'berserker_pulse', 'Berserker Pulse', 'rare', 'Pain triggers a violent pulse of battle energy.', '+15% damage while below 35% HP', '+8% damage received while below 35% HP', '{"conditional_percent": {"below_35_hp": {"damage": 15, "damage_received": 8}}}', true, '2026-06-19 14:41:21.698314+00'),
	('5a90eea6-f2f9-4c82-8211-b05bec0d0e7c', 'delta_heart', 'Delta Heart', 'legendary', 'A tiny rainbow Delta beats at the center of this Kith’s life force.', '+7% maximum HP, Mana, Attack, Defense, Speed, and Magi', '-10% healing received', '{"stat_percent": {"atk": 7, "def": 7, "spd": 7, "magi": 7, "hp_max": 7, "mana_max": 7}, "battle_percent": {"healing_received": -10}}', true, '2026-06-19 14:41:21.698314+00'),
	('d9db179c-ce2e-4f91-9bf3-1a1122de767b', 'chrono_nerves', 'Chrono Nerves', 'legendary', 'This Kith’s nerves occasionally move a fraction of a moment ahead of time.', '10% chance once per battle to immediately take one extra turn', '-10% maximum HP', '{"stat_percent": {"hp_max": -10}, "once_per_battle_chance_percent": {"extra_turn": 10}}', true, '2026-06-19 14:41:21.698314+00'),
	('0df05674-b06c-4ade-9d79-b7b676529ef7', 'aliunes_echo', 'Aliune’s Echo', 'legendary', 'A distant echo of Aliune amplifies every elemental current within this Kith.', '+15% elemental damage and 10% chance for a skill to cost no Mana', '+8% damage received', '{"battle_percent": {"damage_received": 8, "all_element_damage": 15}, "chance_percent": {"zero_mana_cost": 10}}', true, '2026-06-19 14:41:21.698314+00'),
	('353ef834-1b79-4e74-9968-678de5ac2567', 'worldroot_soul', 'Worldroot Soul', 'legendary', 'Ancient roots of living energy have intertwined with this Kith’s life force.', 'Restore 5% maximum HP at the end of each third turn', '-12% Speed', '{"stat_percent": {"spd": -12}, "turn_interval_percent": {"interval": 3, "restore_hp_max": 5}}', true, '2026-06-19 14:41:21.698314+00'),
	('c71d495e-0c1a-414c-b8d2-5b83234c1fb6', 'celestial_mirror', 'Celestial Mirror', 'legendary', 'A reflective celestial pattern occasionally turns hostile magic back toward its source.', '15% chance to reflect a negative status effect back to its source', '-10% Defense', '{"stat_percent": {"def": -10}, "chance_percent": {"reflect_negative_status": 15}}', true, '2026-06-19 14:41:21.698314+00'),
	('8ad58308-2645-46bc-940f-ebd3006db183', 'fatebreaker', 'Fatebreaker', 'legendary', 'This Kith can tear through the edge of an otherwise certain defeat.', 'Once per battle, remove all negative status effects when falling below 25% HP', '-10% maximum Mana', '{"stat_percent": {"mana_max": -10}, "once_per_battle": {"cleanse_below_hp_percent": 25}}', true, '2026-06-19 14:41:21.698314+00'),
	('32cce2e1-2084-43a1-b989-656461dba609', 'everstorm_crown', 'Everstorm Crown', 'legendary', 'A permanent crown of charged energy surrounds this Kith’s elemental core.', '+12% Speed and +12% critical-hit damage', '-10% maximum HP', '{"stat_percent": {"spd": 12, "hp_max": -10}, "battle_percent": {"critical_damage": 12}}', true, '2026-06-19 14:41:21.698314+00'),
	('9c5d3b33-b205-41f4-ae99-a65dab20c4eb', 'genesis_spark', 'Genesis Spark', 'legendary', 'A fragment of creation energy continuously shifts between physical and magical power.', 'At battle start, increase either Attack or Magi by 18%, choosing the higher stat', 'Reduce the lower offensive stat by 10%', '{"battle_start_percent": {"decrease_lower_offense": -10, "increase_higher_offense": 18}}', true, '2026-06-19 14:41:21.698314+00');


--
-- Data for Name: passive_traits; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."passive_traits" ("id", "key", "name", "stat_key", "rarity", "description", "effect_summary", "effects", "is_active", "created_at") VALUES
	('0f070cfe-b203-405c-89f7-db252333c190', 'iron_lungs', 'Iron Lungs', 'hp', 'common', 'This Kith was born with a sturdy life force.', '+1 HP', '{"hp": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('e1cc7655-4f9b-4483-8b2a-e1bceaee4ad2', 'thick_hide', 'Thick Hide', 'hp', 'uncommon', 'This Kith can take a hit better than most.', '+2 HP', '{"hp": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('fba01793-d4e0-460d-93d8-a207390b9a98', 'ancient_vitality', 'Ancient Vitality', 'hp', 'rare', 'Old life energy pulses through this Kith.', '+3 HP', '{"hp": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('0f47b04d-8051-4b6d-b6a4-6e173d5f38f4', 'sharp_instinct', 'Sharp Instinct', 'atk', 'common', 'This Kith strikes with natural confidence.', '+1 Attack', '{"atk": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('67f9c2ce-fdfd-43b5-8106-7e1bed249cce', 'battleborn', 'Battleborn', 'atk', 'uncommon', 'This Kith seems eager for combat.', '+2 Attack', '{"atk": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('e24fe0c3-0cf9-482b-bee9-02c3cce90c6a', 'titan_fang', 'Titan Fang', 'atk', 'rare', 'A powerful offensive instinct sleeps within this Kith.', '+3 Attack', '{"atk": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('711d6463-61e2-4925-8dbf-16a9cd6ea0bf', 'steady_shell', 'Steady Shell', 'def', 'common', 'This Kith has naturally firm defenses.', '+1 Defense', '{"def": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('cea1a42b-86ca-44df-9307-07736dbe9f88', 'stoneblood', 'Stoneblood', 'def', 'uncommon', 'The strength of stone flows through this Kith.', '+2 Defense', '{"def": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('99e79114-4fc4-44d2-9574-ad266fcefaee', 'crystal_hide', 'Crystal Hide', 'def', 'rare', 'This Kith was born with reinforced crystalline skin.', '+3 Defense', '{"def": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('66244c12-9caf-41a4-8a5e-662bd541bd3a', 'quickstep', 'Quickstep', 'spd', 'common', 'This Kith moves with surprising agility.', '+1 Speed', '{"spd": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('28aa4166-e769-482c-ad11-13827e6a23db', 'wind_runner', 'Wind Runner', 'spd', 'uncommon', 'This Kith reacts faster than most.', '+2 Speed', '{"spd": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('e27adb0a-3624-4563-93f8-689f38b75400', 'storm_soul', 'Storm Soul', 'spd', 'rare', 'Lightning energy crackles beneath the surface.', '+3 Speed', '{"spd": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('28630e7a-910d-44c9-afb0-b72447baca9a', 'mana_spark', 'Mana Spark', 'mana', 'common', 'A faint magical current flows through this Kith.', '+1 Mana', '{"mana": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('fb78d926-ab88-4c09-859d-81949b3dd7c6', 'deep_reservoir', 'Deep Reservoir', 'mana', 'uncommon', 'This Kith holds extra magical reserves.', '+2 Mana', '{"mana": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('99aca764-7056-49d0-a538-4c15b2601ad7', 'eternal_well', 'Eternal Well', 'mana', 'rare', 'A deep source of mana rests within this Kith.', '+3 Mana', '{"mana": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('0c909a53-9d21-4257-b0bb-f2ab099c7c71', 'arcane_pulse', 'Arcane Pulse', 'magi', 'common', 'This Kith has a small but steady magical pulse.', '+1 Magi', '{"magi": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('45cae76c-5d38-46ce-a576-0c1a30ca08cd', 'spellheart', 'Spellheart', 'magi', 'uncommon', 'Magic gathers naturally around this Kith.', '+2 Magi', '{"magi": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('30738e8c-8162-4060-a15d-8ff07055c97a', 'arcane_heart', 'Arcane Heart', 'magi', 'rare', 'A powerful magical core rests within this Kith.', '+3 Magi', '{"magi": 3}', true, '2026-06-04 14:48:26.82765+00'),
	('1be00423-94e0-4b21-a414-e6886e893221', 'ancient_bloodline', 'Ancient Bloodline', 'hp', 'legendary', 'A forgotten lineage awakens within this Kith.', '+1 to strongest stat calculation later', '{"legendary": true}', true, '2026-06-04 14:48:26.82765+00'),
	('fba7f551-435e-4c97-acea-081e27906c3f', 'wild_heart', 'Wild Heart', 'hp', 'common', 'This Kith has a lively survival instinct.', '+1 HP', '{"hp": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('9e5e5d1e-369f-46ac-a5c5-4f76c354304e', 'warm_blood', 'Warm Blood', 'hp', 'uncommon', 'This Kith recovers from strain with steady endurance.', '+2 HP', '{"hp": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('25f56ee8-0e20-493e-8671-209969e3ae85', 'giant_core', 'Giant Core', 'hp', 'legendary', 'This Kith carries the impossible vitality of ancient giants.', '+4 HP', '{"hp": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('2091c41c-02b1-48e2-b629-809f42a07941', 'snap_strike', 'Snap Strike', 'atk', 'common', 'This Kith reacts with sharp attacking instinct.', '+1 Attack', '{"atk": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('4b983f61-cd19-4a7b-9bec-f171db906850', 'feral_edge', 'Feral Edge', 'atk', 'uncommon', 'This Kith has a fierce natural bite.', '+2 Attack', '{"atk": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('eb604ffa-2a23-4dc2-aac1-8d7b274877cc', 'solar_claw', 'Solar Claw', 'atk', 'legendary', 'This Kith attacks with radiant force burning beneath its claws.', '+4 Attack', '{"atk": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('682abb63-0213-4d7c-aade-72538f63fbfd', 'guarded_stance', 'Guarded Stance', 'def', 'common', 'This Kith naturally braces before danger.', '+1 Defense', '{"def": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('ad917c7b-feea-4a9b-8ecc-070525a08a78', 'iron_bark', 'Iron Bark', 'def', 'uncommon', 'This Kith has a hardened outer resilience.', '+2 Defense', '{"def": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('9302a60d-badb-4a6d-a45e-2da21f0818a6', 'diamond_bone', 'Diamond Bone', 'def', 'legendary', 'This Kith was born with nearly unbreakable inner structure.', '+4 Defense', '{"def": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('fe567820-2ad8-4c71-8a52-0dfd89a18fec', 'light_feet', 'Light Feet', 'spd', 'common', 'This Kith steps lightly and moves with ease.', '+1 Speed', '{"spd": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('251e64b3-ac65-4f48-9b17-19e42984f3e6', 'blur_dash', 'Blur Dash', 'spd', 'uncommon', 'This Kith can burst forward with sudden speed.', '+2 Speed', '{"spd": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('f6344f5b-7441-4735-b5f5-9cb2e580adf7', 'thunder_step', 'Thunder Step', 'spd', 'legendary', 'This Kith moves like a crack of thunder across the ground.', '+4 Speed', '{"spd": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('67f7cf8c-8209-4235-89c0-e6d52c4b517d', 'mana_thread', 'Mana Thread', 'mana', 'common', 'A small thread of mana runs through this Kith.', '+1 Mana', '{"mana": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('89e48156-2247-4ce5-a0d3-67e390eda234', 'moon_reservoir', 'Moon Reservoir', 'mana', 'uncommon', 'This Kith stores mana like moonlight caught in water.', '+2 Mana', '{"mana": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('ce0bc8df-f8dc-45ac-bfba-dbff1e6d341a', 'infinite_font', 'Infinite Font', 'mana', 'legendary', 'This Kith carries a mana source that feels impossibly deep.', '+4 Mana', '{"mana": 4}', true, '2026-06-04 14:48:26.82765+00'),
	('3021c2c7-0c31-4c8d-9ceb-a9d701bdcd34', 'spark_mind', 'Spark Mind', 'magi', 'common', 'This Kith understands magic with unusual instinct.', '+1 Magi', '{"magi": 1}', true, '2026-06-04 14:48:26.82765+00'),
	('7aa5c807-8a90-45ba-9db5-ceda88fd5ab3', 'rune_touched', 'Rune Touched', 'magi', 'uncommon', 'A faint ancient mark strengthens this Kith’s magic.', '+2 Magi', '{"magi": 2}', true, '2026-06-04 14:48:26.82765+00'),
	('3bd21cec-2f34-4f1c-b3dd-018992e07a8a', 'starborn_mind', 'Starborn Mind', 'magi', 'legendary', 'This Kith’s magic feels connected to something far above Aliune.', '+4 Magi', '{"magi": 4}', true, '2026-06-04 14:48:26.82765+00');


--
-- Data for Name: patch_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."patch_notes" ("id", "version", "title", "summary", "body", "is_published", "released_at", "created_at", "new_notes", "updated_notes", "fixed_notes", "notes") VALUES
	('73b12399-51f4-4050-b0fd-28e51f6b1c49', 'ALPHAv0.0.1-alpha.1', 'Homepage Signal and Alpha Systems Update', 'Aliune Signal and Current Alpha Systems received UI cleanup, patch support direction, and layout improvements.', 'Aliune continues to evolve.

Over the past development cycle, DeltaPets has received major improvements to its core homepage systems and interface presentation. The Aliune Signal has been refined for better clarity, patch note support has been introduced, and system panels have been cleaned up to feel more readable and player-facing.

Additional care interface improvements are also in progress, helping shape a stronger foundation for bonding, upkeep, and future pet interaction systems.

These updates continue to move DeltaPets toward a more immersive alpha experience.', true, '2026-04-04 17:07:05.923701+00', '2026-04-04 17:07:05.923701+00', '- Added support direction for a dedicated patch notes flow using the Supabase patch_notes table.
- Added a cleaner plan for patch sections using New, Updated, Fixed, and Notes.', '- Removed Report Age from Aliune Signal.
- Updated Current Alpha Systems title styling to glow green and pulse.
- Planned View Patches button move into the Current Alpha Systems header on the right side.
- Centered date values in the Current Alpha Systems panel.', '- Cleaned unnecessary Aliune Signal display clutter.
- Improved readability and visual structure for homepage system information.
- Reduced UI confusion around where patch viewing should live.', '- Patch notes are now being structured more like player-facing updates instead of raw dev logs.
- Supabase patch_notes will be used as the source for published patch entries.'),
	('3f92255b-c9fe-49d5-918f-50b3d02b07e3', 'v0.0.1-alpha.2', 'Kithna Roam + Battle Prep', 'Today''s closed alpha deploy pass starts Kithna roaming eggs and prepares the next battle/lore systems.', NULL, true, '2026-07-05 18:38:12.579054+00', '2026-07-05 18:38:12.579054+00', 'Kithna day/night roaming egg work started. A separate Kithna non-starter species pool is being used so wild eggs do not mix with starter pets.', 'Alpha Current and Announcements now explain the active deploy focus: Kithna eggs, random enemy battles, lore, and Aliune Signal cleanup.', 'Prepared the hatch flow so non-starter Kithna eggs can hatch without being treated like starter eggs.', 'Deploys may continue throughout the day. Testers should refresh after updates and report bugs with the page, device, and what they were doing.'),
	('70afa1cf-82e6-447f-b654-5b7b2c30bcd4', 'ALPHAv0.0.1-alpha.2', 'Aliune Systems Expansion & UI Overhaul', 'Core world systems and UI across DeltaPets have been expanded and refined. The Aliune Signal, homepage systems, and care interface are now more stable, readable, and built for future gameplay features.', 'Aliune continues to evolve.

This update focuses on strengthening the core systems that power DeltaPets. The Aliune Signal has been refined to better represent world conditions, while homepage systems have been cleaned up and improved for clarity and usability.

Patch note support is now live, allowing players to track changes across the world in a structured and readable way.

These improvements lay the foundation for future features, including dynamic events, deeper pet interaction systems, and a more immersive experience overall.

Stay alert, Aliune is only just beginning to wake up.', true, '2026-04-12 18:23:15.801093+00', '2026-04-12 18:23:15.801093+00', '- Added structured Patch Notes system using Supabase
- Introduced dedicated sections for New, Updated, Fixed, and Notes
- Implemented foundation for tracking world updates and system changes
- Began expansion of the Care system for future bonding and interaction features', '- Refined Aliune Signal display for improved clarity and readability
- Updated homepage layout including News, Alpha Systems, and Signal panels
- Enhanced UI styling for a more cohesive DeltaPets visual experience
- Improved Care interface layout with better stat prioritization', '- Cleaned up unnecessary Aliune Signal display clutter
- Improved readability and structure across homepage system panels
- Reduced confusion around patch note viewing location
- Fixed spacing and overflow issues across multiple UI sections', '- Patch notes are now structured to be more player-friendly instead of raw development logs
- Future updates will begin introducing world events and dynamic changes across Aliune
- Additional Care features and pet interaction systems are currently in development
- The Aliune Signal may begin reflecting more unusual activity soon'),
	('0291f572-5eb5-49bb-80b0-da7428d6f4cd', 'Alpha v0.1.2', 'Mobile Setup Pass', 'This patch starts the Mobile Setup Pass for Closed Alpha. The current focus is mobile usability: readable panels, tappable buttons, cleaner popup behavior, and making sure the core testing flow works across smaller screens.', 'This patch starts the Mobile Setup Pass for Closed Alpha. Homepage content has been refreshed with updated announcements, alpha status, patch notes, and version information. The current focus is mobile usability: readable panels, tappable buttons, cleaner popup behavior, and making sure the core testing flow works across smaller screens. Some content, balance, art, and polish are still unfinished. Please report layout bugs, overlapping panels, missing buttons, broken text, or anything that makes the site hard to use on mobile.', true, '2026-07-03 12:00:00+00', '2026-07-03 14:29:02.480447+00', '- Mobile Setup Pass has started.
- Homepage content has been refreshed for the current Closed Alpha focus.
- Alpha Current now reflects mobile layout testing and homepage stability work.', '- Announcements, Alpha Current, Patch Notes, and version information were updated for the current alpha build.
- Mobile usability is now the main testing focus.
- Popups, panels, buttons, navigation, and core testing flow are being checked on smaller screens.', '- No gameplay bugfixes are included in this content update.
- Mobile layout issues are being tracked and should be reported with screenshots.', '- Some content, balance, art, and polish are still unfinished.
- Please report overlapping panels, missing buttons, broken text, cramped layouts, or anything that makes the site hard to use on mobile.'),
	('3288c0fd-5c17-42bf-800d-19878512dfb4', 'v0.0.5-closed-Alpha', 'Kithna Roam + Battle Prep', 'Today''s closed alpha deploy pass starts Kithna roaming eggs and prepares the next battle and lore systems.', NULL, true, '2026-07-21 00:00:00+00', '2026-07-21 13:58:35.387205+00', 'Kithna day and night roaming egg work started. A separate Kithna non-starter species pool is being used so wild eggs do not mix with starter pets. Food Merchant is open in Kithna. Progress panel added to pet page.', 'Alpha Current and Announcements now explain the active deploy focus. Hatch slot flow corrected so pets land in the right party slot. Layout pass applied across all pages for 1440 alignment.', 'Prepared the hatch flow so non-starter Kithna eggs can hatch without being treated like starter eggs. Fixed duplicate pet appearing in both Storage and Kith Team. Fixed banner content alignment.', 'Deploys may continue throughout the day. Testers should refresh after updates and report bugs with the page, device, and what they were doing.');


--
-- Data for Name: personalities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."personalities" ("id", "key", "name", "definition", "modifiers", "created_at") VALUES
	('62e23ec9-026d-4f03-aa5d-40777818d49c', 'brightspark', 'Brightspark', 'Curious and energetic. Loves discovering new things and experimenting. Bonds through novelty and exploration.', '{"loot_find_pct": 0.02, "mood_decay_pct": 0.02, "training_gain_pct": 0.03}', '2026-02-11 15:38:54.383445+00'),
	('9f169b66-6d36-48dc-9ecf-ca9c437c3d6b', 'stoic', 'Stoic', 'Calm under pressure. Rarely panics, rarely overreacts. Reliable even when neglected briefly.', '{"def_pct": 0.05, "spd_pct": -0.01, "mood_decay_pct": -0.03}', '2026-02-11 15:38:54.383445+00'),
	('0fc7800b-dcd2-40eb-9fe7-d374dbf15627', 'gremlin', 'Gremlin', 'Mischief incarnate. Gets into everything, rearranges your stuff, and somehow makes it endearing.', '{"spd_pct": 0.03, "bond_gain_pct": 0.01, "loot_find_pct": 0.03, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('da26d1f9-c02e-43a7-92e2-b55ecce22251', 'gentle', 'Gentle', 'Soft-hearted and affectionate. Thrives on care and routine. Doesn’t love conflict.', '{"hp_pct": 0.02, "atk_pct": -0.02, "bond_gain_pct": 0.05}', '2026-02-11 15:38:54.383445+00'),
	('d02fe132-191b-41c2-a3cd-5adb96be1461', 'blazeborn', 'Blazeborn', 'Competitive and bold. Wants challenges and attention. Loves the Gym; hates being ignored.', '{"atk_pct": 0.05, "bond_gain_pct": 0.01, "mood_decay_pct": 0.03}', '2026-02-11 15:38:54.383445+00'),
	('8728234d-f5dd-4004-824a-0eddf9f76ea5', 'drifter', 'Drifter', 'Independent and low-maintenance. Doesn’t demand much, but bonds slowly and honestly.', '{"bond_gain_pct": -0.01, "mood_decay_pct": -0.02, "training_gain_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('4724adc0-114a-40a4-b644-7a5b953c8cda', 'guardian', 'Guardian', 'Protective and vigilant. Steps in first, shields others, and takes responsibility seriously.', '{"hp_pct": 0.03, "def_pct": 0.05, "spd_pct": -0.02}', '2026-02-11 15:38:54.383445+00'),
	('90b37c13-245c-4297-ac4e-4ab1f2bfb6ae', 'dreamer', 'Dreamer', 'Head in the clouds. Sometimes misses cues, sometimes finds weird hidden truths. Pure vibe creature.', '{"magi_pct": 0.04, "loot_find_pct": 0.02, "mood_decay_pct": -0.01, "training_gain_pct": -0.01}', '2026-02-11 15:38:54.383445+00'),
	('1ebcd85a-11be-4c7c-be51-41801850126a', 'sprinter', 'Sprinter', 'Restless and hyper. Loves movement and action. Gets cranky when stuck idle.', '{"spd_pct": 0.05, "mood_decay_pct": 0.02, "hunger_decay_pct": 0.03}', '2026-02-11 15:38:54.383445+00'),
	('310d67d1-e5f7-4aa5-aefb-039752cbdc15', 'scholar', 'Scholar', 'Analytical and focused. Learns efficiently and prefers structured improvement.', '{"magi_pct": 0.03, "bond_gain_pct": -0.01, "training_gain_pct": 0.04}', '2026-02-11 15:38:54.383445+00'),
	('8aa964ba-75cc-4ec7-a93e-8e8bbd228c5b', 'glutton', 'Glutton', 'Food-motivated and always hungry. Feeding gives big bond gains… but the hunger drain is real.', '{"hp_pct": 0.03, "bond_gain_pct": 0.02, "hunger_decay_pct": 0.05}', '2026-02-11 15:38:54.383445+00'),
	('630766e1-f056-40e4-b5cc-9de22b25ba46', 'prankster', 'Prankster', 'Playful trickster. Turns care into games. Chaos increases happiness—until it doesn’t.', '{"spd_pct": 0.02, "bond_gain_pct": 0.02, "loot_find_pct": 0.01, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('2d9d9e86-46d8-41d7-a564-f4a6f7821abd', 'loyalist', 'Loyalist', 'Deeply attached. Once bonded, becomes your ride-or-die. Hates inconsistent routines.', '{"def_pct": 0.02, "bond_gain_pct": 0.06, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('4ccdbc88-9277-4268-876d-c5f544ffee5c', 'anxious', 'Anxious', 'Needs reassurance. Strong bond potential, but neglect hits harder. Big feelings, tiny creature.', '{"def_pct": 0.02, "bond_gain_pct": 0.03, "mood_decay_pct": 0.06}', '2026-02-11 15:38:54.383445+00'),
	('43c71d87-98cd-4d50-9305-c21c84353ff4', 'radiant', 'Radiant', 'Upbeat and warm. Spreads good vibes. Stable, friendly, and surprisingly resilient.', '{"hp_pct": 0.02, "bond_gain_pct": 0.02, "mood_decay_pct": -0.03}', '2026-02-11 15:38:54.383445+00'),
	('7f489d5e-dacb-4132-bf1f-61659e755563', 'shadowed', 'Shadowed', 'Quiet observer. Hard to read. Doesn’t show affection loudly, but notices everything.', '{"def_pct": 0.03, "magi_pct": 0.02, "bond_gain_pct": -0.01, "mood_decay_pct": -0.01}', '2026-02-11 15:38:54.383445+00'),
	('5401f14d-e8fa-4ce6-b7eb-4d44723a2c5a', 'wildheart', 'Wildheart', 'Instinct-driven and free. Thrives when given variety. Dislikes strict schedules.', '{"atk_pct": 0.03, "spd_pct": 0.02, "mood_decay_pct": 0.03, "training_gain_pct": 0.01}', '2026-02-11 15:38:54.383445+00'),
	('bc0feb4e-c91f-4914-979d-0f688c1c38e7', 'tinker', 'Tinker', 'Obsessed with items and gear. Gets excited by upgrades and inventory interactions.', '{"atk_pct": -0.01, "loot_find_pct": 0.05, "training_gain_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('eeae3159-a98d-4c25-af60-07a072f5e08b', 'royal', 'Royal', 'Proud and picky. Demands quality care. When satisfied, performs like a champ.', '{"atk_pct": 0.03, "def_pct": 0.03, "bond_gain_pct": -0.01, "mood_decay_pct": 0.02}', '2026-02-11 15:38:54.383445+00'),
	('c8ff92c1-76b3-4b43-9bf3-32c661dd1d70', 'feral', 'Feral', 'Untamed and intense. Harder to bond early, but hits like a truck once stabilized.', '{"atk_pct": 0.06, "def_pct": -0.01, "bond_gain_pct": -0.02, "mood_decay_pct": 0.04}', '2026-02-11 15:38:54.383445+00'),
	('0d6a6b66-e8b0-4ad8-bdf5-de560f325b50', 'friendly', 'Friendly', 'Warm and easy to bond with. Enjoys company and responds well to kind care.', '{}', '2026-04-14 19:05:44.517181+00'),
	('70fa9830-a99c-4e63-8fd1-c2e8d03c4ba4', 'honest', 'Honest', 'Straightforward and sincere. Rarely hides intent and builds trust steadily.', '{}', '2026-04-14 19:05:44.517181+00'),
	('cc2a6fd8-e69c-49bd-961b-ca9fcff40d26', 'deceiver', 'Deceiver', 'Clever and misleading. Hard to read, with motives that are not always clear.', '{}', '2026-04-14 19:05:44.517181+00'),
	('e7e10bf6-e24a-43b6-af75-ce78c121c9fd', 'loyal', 'Loyal', 'Forms deep attachments and stays committed once trust is earned.', '{}', '2026-04-14 19:05:44.517181+00'),
	('16235e76-78e9-4e82-bcb3-964a10117969', 'cowardly', 'Cowardly', 'Easily startled and cautious under pressure. Prefers safety over risk.', '{}', '2026-04-14 19:05:44.517181+00'),
	('f51f0481-bec4-4274-b2b3-bd25b9983812', 'brave', 'Brave', 'Bold in danger and willing to face threats head-on.', '{}', '2026-04-14 19:05:44.517181+00'),
	('bd33227d-37e9-42c5-8486-d1a006a351fb', 'vengeful', 'Vengeful', 'Holds grudges and remembers slights. Pushes hard when wronged.', '{}', '2026-04-14 19:05:44.517181+00'),
	('edd59953-d733-4b4c-9401-c9724838947f', 'impulsive', 'Impulsive', 'Acts quickly without much hesitation. Fast to move, fast to react.', '{}', '2026-04-14 19:05:44.517181+00'),
	('259964b9-5c33-4638-a3fc-c2e86ba6d28e', 'reasonable', 'Reasonable', 'Balanced and level-headed. Makes steady choices without extremes.', '{}', '2026-04-14 19:05:44.517181+00'),
	('b85b695f-fabe-431b-a4f1-2e01bb7c054b', 'lazy', 'Lazy', 'Prefers comfort and low effort. Conserves energy whenever possible.', '{}', '2026-04-14 19:05:44.517181+00'),
	('87f75ba8-25a9-4f00-86b6-df1e6dd2b65a', 'diligent', 'Diligent', 'Hardworking and consistent. Responds well to routine and structure.', '{}', '2026-04-14 19:05:44.517181+00'),
	('6199c210-df6d-430b-b2a5-9eaeaa60cf00', 'naive', 'Naive', 'Trusting and innocent. May overlook danger or hidden motives.', '{}', '2026-04-14 19:05:44.517181+00'),
	('d74658e4-898e-4287-b05a-c352b2200e83', 'cruel', 'Cruel', 'Harsh and unfeeling. Can be difficult to bond with through normal care.', '{}', '2026-04-14 19:05:44.517181+00'),
	('86a5d752-a540-43ef-b24d-9f8ea8ffbce0', 'optimistic', 'Optimistic', 'Looks for the bright side. Keeps morale high even when things go wrong.', '{}', '2026-04-14 19:05:44.517181+00'),
	('de098307-7803-486c-b5f8-53432f6a1e94', 'pessimistic', 'Pessimistic', 'Expects setbacks and disappointment. Harder to reassure once upset.', '{}', '2026-04-14 19:05:44.517181+00'),
	('d8fdd13c-cb4f-4a36-9057-6dfa13848cb3', 'arrogant', 'Arrogant', 'Proud and self-assured. Dislikes weakness and demands respect.', '{}', '2026-04-14 19:05:44.517181+00'),
	('6cd14d82-2875-4ca2-9ae2-973b7837bcbe', 'humble', 'Humble', 'Quiet and grounded. Does not seek attention and adapts easily.', '{}', '2026-04-14 19:05:44.517181+00'),
	('a2a54935-2c20-4100-a936-6e85c280d203', 'snob', 'Snob', 'Picky and refined. Responds better to high-quality treatment.', '{}', '2026-04-14 19:05:44.517181+00'),
	('130189ff-b14a-4d59-a023-161027ade44a', 'respectful', 'Respectful', 'Polite and disciplined. Works well with steady, proper care.', '{}', '2026-04-14 19:05:44.517181+00'),
	('b36e5561-f87b-4688-98a2-aa6c2e9d22f0', 'greedy', 'Greedy', 'Always wants more. Strongly motivated by food, items, or rewards.', '{}', '2026-04-14 19:05:44.517181+00'),
	('a77873d8-0a63-4702-8026-37f6ed2ee7dd', 'generous', 'Generous', 'Freely gives and responds well to shared affection and support.', '{}', '2026-04-14 19:05:44.517181+00'),
	('f9b0867f-edb7-4c44-8f3e-3e489581808e', 'kind', 'Kind', 'Gentle and compassionate. Easy to comfort and pleasant to raise.', '{}', '2026-04-14 19:05:44.517181+00');


--
-- Data for Name: retired_kith_species; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."retired_kith_species" ("species_key", "display_name", "element_key", "retirement_group", "retirement_note", "created_at") VALUES
	('kithna_day_pet_01', 'Ripplin', 'water', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_day_pet_02', 'Peblin', 'earth', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_day_pet_03', 'Glimmet', 'light', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_night_pet_01', 'Frilo', 'ice', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00'),
	('kithna_night_pet_03', 'Murklin', 'shadow', 'Closed Alpha', 'Retired to the void of unused Alpha content.', '2026-08-07 19:04:53.268984+00');


--
-- Data for Name: rune_defs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."rune_defs" ("id", "key", "name", "description", "rune_number", "stage_tier", "vocabulary_group", "is_active", "created_at", "updated_at") VALUES
	('696d7885-5584-41d5-992c-cc6508fae03e', 'rune_of_feeling', 'Rune of Feeling', 'Reveals emotions and physical states in Hatchling speech.', 1, 'hatchling', 'feeling', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('f81567d8-e91b-4898-a822-f77ceee3318d', 'rune_of_need', 'Rune of Need', 'Reveals basic needs such as food, sleep, play, cleanliness, and help.', 2, 'hatchling', 'need', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('57532897-6857-4180-81a7-85949f192eac', 'rune_of_recognition', 'Rune of Recognition', 'Reveals words connected to identity, names, friendship, home, and return.', 3, 'hatchling', 'recognition', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('2c4b1c2b-1e0c-431b-8a9c-6ce944c8d235', 'rune_of_motion', 'Rune of Motion', 'Reveals simple actions and commands such as come, go, stay, give, and stop.', 4, 'hatchling', 'motion', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('10c49b53-eff1-46fd-9b63-ab55e56b46e5', 'rune_of_first_speech', 'Rune of First Speech', 'Completes the player''s understanding of ordinary Hatchling speech.', 5, 'hatchling', 'hatchling_fluency', true, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('a1cd80ee-cf29-49c8-a097-4cc6904fa0d1', 'rune_of_preference', 'Rune of Preference', 'Reveals how a Lowform expresses likes, dislikes, favorites, and avoidance.', 6, 'lowform', 'preference', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('fc74e0f5-8dec-4370-93c3-6c8064c4c11e', 'rune_of_memory', 'Rune of Memory', 'Reveals words connected to previous events, remembrance, and passing time.', 7, 'lowform', 'memory', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('1959dc2a-4f42-45a2-9504-ade4cb33465a', 'rune_of_questioning', 'Rune of Questioning', 'Reveals questions involving why, where, when, and how.', 8, 'lowform', 'questioning', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('83b69bd9-dd66-4b52-8632-6211388caad0', 'rune_of_intention', 'Rune of Intention', 'Reveals plans, choices, requests, and deliberate actions.', 9, 'lowform', 'intention', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('12e41147-7448-4b09-85e1-8b74dea09f1a', 'rune_of_growing_speech', 'Rune of Growing Speech', 'Completes the player''s understanding of ordinary Lowform speech.', 10, 'lowform', 'lowform_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('4411f88e-8dbc-4465-8d52-97f42a7a89f3', 'rune_of_trust', 'Rune of Trust', 'Reveals language concerning trust, doubt, loyalty, and betrayal.', 11, 'highform', 'trust', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('2e5616c4-2e9e-432a-9bd3-6aebfb059a43', 'rune_of_reflection', 'Rune of Reflection', 'Reveals thoughts about identity, growth, and previous forms.', 12, 'highform', 'reflection', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('65071a4e-13ec-4519-9f1a-3c9bf4ed0fb8', 'rune_of_contradiction', 'Rune of Contradiction', 'Reveals mixed emotions and thoughts that appear to conflict.', 13, 'highform', 'contradiction', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('31bc099c-37c2-4b6f-8f15-d24d1a091ac5', 'rune_of_instinct', 'Rune of Instinct', 'Reveals how passive traits, mutations, and natural impulses are experienced.', 14, 'highform', 'instinct', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('30956414-79ac-4aee-8cde-a4ffa85053ff', 'rune_of_knowing_speech', 'Rune of Knowing Speech', 'Completes the player''s understanding of ordinary Highform speech.', 15, 'highform', 'highform_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('bea33557-e25f-4b73-b070-1e2b4df59751', 'rune_of_resonance', 'Rune of Resonance', 'Reveals elemental sensations and the way a Legion experiences its element.', 16, 'legion', 'resonance', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('6fc4e76a-3d13-4084-b434-cb2c04809589', 'rune_of_echoes', 'Rune of Echoes', 'Reveals ancestral impressions and memories that do not belong to one lifetime.', 17, 'legion', 'echoes', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('7fe12e04-8d04-43d1-9ffb-58ca593a3405', 'rune_of_corruption', 'Rune of Corruption', 'Reveals language used to describe corruption and unstable energy.', 18, 'legion', 'corruption', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('3e54690c-84c0-405d-9dcb-0d7da7e72e0a', 'rune_of_many_thoughts', 'Rune of Many Thoughts', 'Reveals layered emotions and several connected thoughts expressed together.', 19, 'legion', 'many_thoughts', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('5a64b5a4-e749-4fe6-a375-97a4a042383c', 'rune_of_aliune', 'Rune of Aliune', 'Reveals ancient concepts tied to Aliune, its people, and its history.', 20, 'legion', 'aliune', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('1073f927-b18d-4ca4-9db2-7dbe78a82438', 'rune_of_legion_speech', 'Rune of Legion Speech', 'Completes the player''s understanding of ordinary Legion speech.', 21, 'legion', 'legion_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('5f67f124-1b7c-464b-bbfa-b5e386ee8a5b', 'rune_of_distance', 'Rune of Distance', 'Reveals awareness of places and presences beyond the pet''s immediate world.', 22, 'mythical_legendary', 'distance', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('9d5f29f5-9e7e-498b-9234-ef8a05d90a53', 'rune_of_continuance', 'Rune of Continuance', 'Reveals memories and identity carried through every evolved form.', 23, 'mythical_legendary', 'continuance', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('6d69ade2-468b-4a65-a7b5-b6f8d8cb1450', 'rune_of_true_names', 'Rune of True Names', 'Reveals language connected to deep identity, origin, and true names.', 24, 'mythical_legendary', 'true_names', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('15439787-3e31-4e71-a80e-e02811c062c8', 'rune_of_the_other_side', 'Rune of the Other Side', 'Reveals a Mythical Legendary pet''s awareness of the player beyond Aliune.', 25, 'mythical_legendary', 'other_side', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00'),
	('ff276cfb-8c4c-46bc-8dac-b5f543ae6710', 'rune_of_understanding', 'Rune of Understanding', 'Completes the player''s understanding of Delta language across every form.', 26, 'mythical_legendary', 'complete_fluency', false, '2026-08-02 16:12:54.53987+00', '2026-08-02 16:12:54.53987+00');


--
-- Name: signup_trigger_errors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."signup_trigger_errors_id_seq"', 22, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict risWNvg6H0p69jxGcm14kCpboVahkXFSszWQFv4gHORw9uwIemgUxdeOpNQgghS

RESET ALL;

-- Clean initial Poe Tay Toe runtime state.
INSERT INTO public.poe_tay_toe_state (
  id,
  current_location_key,
  hidden_by_user_id,
  claimed_by_user_id,
  claimed_at,
  find_count,
  updated_at
)
VALUES (
  1,
  'hatchery-back',
  NULL,
  NULL,
  NULL,
  0,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Source: 20260925150258_resonance_evolution_delta_cost.sql
INSERT INTO public.item_defs (slug, name, type, description, rarity, effects)
VALUES (
  'voidborne-delta',
  'Voidborne Delta',
  'material',
  'A Delta symbol infused with Voidborne energy. Used for Voidborne evolution.',
  3,
  '{"element": "null_element"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Source: 20260928201548_secure_assanti_food_trades.sql
INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects)
VALUES
  ('alpha-meat', 'Meat', 'care', 'Fresh cuts harvested from Kithna''s meat tree.', 1, 99, '{"careCategory":"food"}'::jsonb),
  ('alpha-vegetables', 'Vegetables', 'care', 'Simple vegetables grown in Kithna''s garden.', 1, 99, '{"careCategory":"food"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Source: 20260928203312_server_authoritative_care.sql
INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects)
VALUES
  ('kithna-food-pack', 'Kithna Food Pack', 'care', 'A simple meal for restoring hunger.', 1, 99, '{"careCategory":"food"}'),
  ('soft-cleaning-brush', 'Soft Cleaning Brush', 'care', 'A gentle brush for restoring clean.', 1, 99, '{"careCategory":"soap"}'),
  ('spark-jingle-toy', 'Spark Jingle Toy', 'care', 'A tiny toy for restoring mood.', 1, 99, '{"careCategory":"toy"}'),
  ('moon-nap-pillow', 'Moon Nap Pillow', 'care', 'A soft pillow for restoring comfort.', 1, 99, '{"careCategory":"bed"}')
ON CONFLICT (slug) DO NOTHING;

-- Source: 20261005171844_retire_closed_alpha_care_package.sql
DELETE FROM public.item_defs
WHERE slug = 'closed-alpha-care-package';

-- Source: 20261017001518_assanti_daily_food_shop.sql
INSERT INTO public.assanti_food_config VALUES (true, 1000, 2000);

-- Source: 20261017001518_assanti_daily_food_shop.sql
INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects) VALUES
  ('alpha-meat', 'Basic Meat', 'care', 'Fresh cuts harvested from Assanti''s meat trees.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('alpha-vegetables', 'Basic Vegetables', 'care', 'Simple vegetables grown on Assanti''s farm.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('carrot', 'Carrot', 'care', 'A crunchy root vegetable and simple snack.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('potato', 'Potato', 'care', 'A filling staple vegetable.', 1, 99, '{"careCategory":"food","hunger":12}'::jsonb),
  ('tomato', 'Tomato', 'care', 'A juicy red vegetable with a fresh bite.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('corn', 'Corn', 'care', 'Sweet kernels that make an easy everyday meal.', 1, 99, '{"careCategory":"food","hunger":11}'::jsonb),
  ('lettuce', 'Lettuce', 'care', 'Fresh leafy greens for a light snack.', 1, 99, '{"careCategory":"food","hunger":7}'::jsonb),
  ('broccoli', 'Broccoli', 'care', 'A healthy green vegetable.', 1, 99, '{"careCategory":"food","hunger":10}'::jsonb),
  ('green-peas', 'Green Peas', 'care', 'A small serving of fresh green peas.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('green-beans', 'Green Beans', 'care', 'Crisp green beans with a mild flavor.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('pumpkin', 'Pumpkin', 'care', 'A thick slice of sweet, filling pumpkin.', 1, 99, '{"careCategory":"food","hunger":13}'::jsonb),
  ('mushroom', 'Mushroom', 'care', 'A simple earthy mushroom.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('cucumber', 'Cucumber', 'care', 'A cool and refreshing vegetable snack.', 1, 99, '{"careCategory":"food","hunger":7}'::jsonb),
  ('bell-pepper', 'Bell Pepper', 'care', 'A crunchy, colorful pepper with a sweet bite.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('sweet-potato', 'Sweet Potato', 'care', 'A naturally sweet and filling root vegetable.', 1, 99, '{"careCategory":"food","hunger":14}'::jsonb),
  ('raw-beef', 'Raw Beef', 'care', 'A basic cut of beef sold as inexpensive pet food.', 1, 99, '{"careCategory":"food","hunger":16}'::jsonb),
  ('raw-chicken', 'Raw Chicken', 'care', 'A basic portion of chicken sold as inexpensive pet food.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('raw-fish', 'Raw Fish', 'care', 'A fresh whole fish for hungry Kith.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('turkey', 'Turkey', 'care', 'A basic portion of turkey meat.', 1, 99, '{"careCategory":"food","hunger":15}'::jsonb),
  ('pork', 'Pork', 'care', 'A basic cut of pork.', 1, 99, '{"careCategory":"food","hunger":16}'::jsonb),
  ('egg', 'Egg', 'care', 'A simple egg that makes a quick snack.', 1, 99, '{"careCategory":"food","hunger":9}'::jsonb),
  ('apple', 'Apple', 'care', 'A crisp everyday fruit that fills a little hunger.', 1, 99, '{"careCategory":"food","hunger":10}'::jsonb),
  ('wild-berries', 'Wild Berries', 'care', 'A small handful of sweet berries.', 1, 99, '{"careCategory":"food","hunger":8}'::jsonb),
  ('rice', 'Rice', 'care', 'A plain bowl of cooked rice.', 1, 99, '{"careCategory":"food","hunger":13}'::jsonb),
  ('bread', 'Bread', 'care', 'A simple loaf slice that settles hunger.', 1, 99, '{"careCategory":"food","hunger":12}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name,
  effects = public.item_defs.effects || EXCLUDED.effects, updated_at = now()
WHERE public.item_defs.type = 'care';

-- Source: 20261017001518_assanti_daily_food_shop.sql
INSERT INTO public.assanti_food_catalog (slug, price, hunger, permanent) VALUES
  ('alpha-meat', 5, 15, true),
  ('alpha-vegetables', 5, 15, true),
  ('carrot', 3, 9, false),
  ('potato', 4, 12, false),
  ('tomato', 3, 8, false),
  ('corn', 4, 11, false),
  ('lettuce', 3, 7, false),
  ('broccoli', 4, 10, false),
  ('green-peas', 3, 9, false),
  ('green-beans', 3, 9, false),
  ('pumpkin', 5, 13, false),
  ('mushroom', 3, 8, false),
  ('cucumber', 3, 7, false),
  ('bell-pepper', 3, 8, false),
  ('sweet-potato', 5, 14, false),
  ('raw-beef', 6, 16, false),
  ('raw-chicken', 5, 15, false),
  ('raw-fish', 5, 15, false),
  ('turkey', 5, 15, false),
  ('pork', 6, 16, false),
  ('egg', 3, 9, false),
  ('apple', 4, 10, false),
  ('wild-berries', 3, 8, false),
  ('rice', 5, 13, false),
  ('bread', 4, 12, false);

-- Source: 20261031015143_kennith_purchase_proposal.sql
INSERT INTO public.item_defs(slug,name,type,description) VALUES
('battered-shirt-cream','Cream Battered Shirt','equipment','Cream battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-shirt-muted-blue','Muted Blue Battered Shirt','equipment','Muted blue battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-shirt-dusty-green','Dusty Green Battered Shirt','equipment','Dusty green battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-shirt-faded-plum','Faded Plum Battered Shirt','equipment','Faded plum battered short-sleeve shirt with frayed edges, small tears, and sewn patches'),
('battered-trousers-dark-brown','Dark Brown Battered Trousers','equipment','Dark brown worn trousers with frayed cuffs and patches'),
('battered-trousers-slate-gray','Slate Gray Battered Trousers','equipment','Slate gray worn trousers with frayed cuffs and patches'),
('battered-trousers-faded-olive','Faded Olive Battered Trousers','equipment','Faded olive worn trousers with frayed cuffs and patches'),
('battered-skirt-muted-purple','Muted Purple Battered Skirt','equipment','Muted purple battered wrap skirt with worn hems and sewn patches'),
('battered-skirt-dusty-blue','Dusty Blue Battered Skirt','equipment','Dusty blue battered wrap skirt with worn hems and sewn patches'),
('battered-skirt-moss-green','Moss Green Battered Skirt','equipment','Moss green battered wrap skirt with worn hems and sewn patches'),
('battered-side-cap-brown','Battered Side-Cap (Brown)','equipment','Worn brown side-cap with stitched Delta triangle emblem'),
('battered-travel-cap-blue','Battered Travel Cap (Blue)','equipment','Worn blue travel cap with a Delta triangle emblem'),
('battered-menders-cap-olive','Battered Mender''s Cap (Olive)','equipment','Patched olive mender''s cap with stitched Delta triangle emblem'),
('round-glasses-dark-metal','Round Glasses (Dark Metal)','equipment','Round dark metal frames'),
('round-glasses-bronze','Round Glasses (Bronze)','equipment','Round bronze frames'),
('square-glasses-dark-metal','Square Glasses (Dark Metal)','equipment','Square dark metal frames'),
('square-glasses-blue-gray','Square Glasses (Blue-Gray)','equipment','Square blue-gray frames'),
('brass-monocle','Brass Monocle','equipment','Brass monocle with chain'),
('smooth-river-stone','Smooth River Stone','equipment','Rounded blue-gray stone'),
('carved-wooden-token','Carved Wooden Token','equipment','Wooden disc with a simple spiral'),
('copper-keepsake','Copper Keepsake','equipment','Tarnished copper charm'),
('woven-cord-charm','Woven Cord Charm','equipment','Knotted cord around a wooden bead'),
('clay-medallion','Clay Medallion','equipment','Small clay pendant with a leaf imprint'),
('polished-shell','Polished Shell','equipment','Cream shell with a soft pink interior'),
('chipped-stone-pendant','Chipped Stone Pendant','equipment','Plain stone pendant with a chipped edge'),
('old-brass-bell','Old Brass Bell','equipment','Small, weathered brass bell')
ON CONFLICT(slug) DO NOTHING;

-- Source: 20261031015143_kennith_purchase_proposal.sql
INSERT INTO public.item_defs(slug,name,type,description,rarity,stack_limit,effects) VALUES
('soft-cleaning-brush','Soft Cleaning Brush','care','A soft brush used to clean a Delta.',1,99,'{"clean": 25}'::jsonb),
('gentle-grooming-brush','Gentle Grooming Brush','care','A gentle brush that removes dust and loose fur.',1,99,'{"clean": 28}'::jsonb),
('mini-care-brush','Mini Care Brush','care','A compact grooming brush made for smaller Kith.',1,99,'{"clean": 22}'::jsonb),
('soft-cloth-pad','Soft Cloth Pad','care','A soft cleaning pad for delicate fur, scales, and feathers.',1,99,'{"clean": 24}'::jsonb),
('care-sponge','Care Sponge','care','A soft sponge that makes cleanup quick and easy.',1,99,'{"clean": 26}'::jsonb),
('bouncy-ball','Bouncy Ball','care','A simple ball that bounces unpredictably and keeps a Kith busy.',1,99,'{"happy": 24}'::jsonb),
('rope-toy','Rope Toy','care','A sturdy rope toy made for tugging and chewing.',1,99,'{"happy": 28}'::jsonb),
('feather-wand','Feather Wand','care','A lightweight wand with fluttering feathers for playful chasing.',1,99,'{"happy": 27}'::jsonb),
('soft-plush-kith','Soft Plush Kith','care','A cuddly plush toy shaped like a tiny Kith.',1,99,'{"happy": 30}'::jsonb),
('chew-ring','Chew Ring','care','A durable ring made for chewing and playful tossing.',1,99,'{"happy": 29}'::jsonb)
ON CONFLICT(slug) DO NOTHING;

-- Source: 20261111184310_wildwood_kithna_discovery_catalog.sql
INSERT INTO public.item_defs (slug, name, type, description, rarity, stack_limit, effects)
SELECT slug, name, type::public.item_type, description, rarity, stack_limit, effects
FROM jsonb_to_recordset(public.wildwood_discovery_catalog()) AS item(
  slug text, name text, type text, description text, rarity integer, stack_limit integer, effects jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-angelic-ward','Angelic Ward','Solen gathers Light energy into a guarding stance with the Angelic Ward technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-gleam-jab','Gleam Jab','Solen delivers a light-themed physical strike with the Gleam Jab technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-mending-light','Mending Light','Solen channels gentle restorative Light energy with the Mending Light technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('solen-radiant-bolt','Radiant Bolt','Solen projects Light magic in a radiant pattern with the Radiant Bolt technique. Exact effects remain undecided.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"light","species_ids":["light_starter"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-stormfeather-guard','Stormfeather Guard','Clodion raises its feathers against incoming attacks.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-thunder-talon','Thunder Talon','Clodion delivers a swift electrically charged talon strike.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-gentle-updraft','Gentle Updraft','Clodion channels restorative Storm energy through a soft current.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

-- Source: 20261116161401_level2_skill_learning_and_allocation.sql
INSERT INTO public.skill_defs(slug,name,description,required_level,requirements) VALUES ('clodion-static-gust','Static Gust','Clodion releases a concentrated gust of electrically charged wind.',2,'{"config_version":"level-2-v1","milestone_key":"level-2","combat_enabled":true,"element":"storm","species_ids":["kithna_clodian"],"prerequisite_slugs":[]}'::jsonb) ON CONFLICT (slug) DO NOTHING;

SET session_replication_role=origin;
-- Derived from independent repository reconstruction; correct replay ownership explicitly.
SET search_path=public,pg_catalog;
ALTER FUNCTION prevent_role_escalation() OWNER TO "postgres";
REVOKE ALL ON FUNCTION prevent_role_escalation() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION prevent_role_escalation() TO PUBLIC;
GRANT EXECUTE ON FUNCTION prevent_role_escalation() TO "postgres";
GRANT EXECUTE ON FUNCTION prevent_role_escalation() TO "anon";
GRANT EXECUTE ON FUNCTION prevent_role_escalation() TO "authenticated";
GRANT EXECUTE ON FUNCTION prevent_role_escalation() TO "service_role";
ALTER FUNCTION get_active_instabilities(text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_active_instabilities(text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_active_instabilities(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_active_instabilities(text) TO "postgres";
GRANT EXECUTE ON FUNCTION get_active_instabilities(text) TO "anon";
GRANT EXECUTE ON FUNCTION get_active_instabilities(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION get_active_instabilities(text) TO "service_role";
ALTER FUNCTION get_or_create_kithna_tutorial_signal() OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_or_create_kithna_tutorial_signal() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_or_create_kithna_tutorial_signal() TO "postgres";
GRANT EXECUTE ON FUNCTION get_or_create_kithna_tutorial_signal() TO "authenticated";
GRANT EXECUTE ON FUNCTION get_or_create_kithna_tutorial_signal() TO "service_role";
ALTER FUNCTION hide_poe_tay_toe(uuid,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION hide_poe_tay_toe(uuid,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION hide_poe_tay_toe(uuid,text) TO "postgres";
GRANT EXECUTE ON FUNCTION hide_poe_tay_toe(uuid,text) TO "service_role";
ALTER FUNCTION get_active_buffs(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_active_buffs(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_active_buffs(uuid) TO "postgres";
GRANT EXECUTE ON FUNCTION get_active_buffs(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION get_active_buffs(uuid) TO "service_role";
ALTER FUNCTION get_email_by_username(text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_email_by_username(text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_email_by_username(text) TO "postgres";
GRANT EXECUTE ON FUNCTION get_email_by_username(text) TO "service_role";
ALTER FUNCTION admin.delete_jayden_testing_emails(text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION admin.delete_jayden_testing_emails(text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION admin.delete_jayden_testing_emails(text) TO "postgres";
ALTER FUNCTION admin.reset_runaway_or_null_pet_users(boolean) OWNER TO "postgres";
REVOKE ALL ON FUNCTION admin.reset_runaway_or_null_pet_users(boolean) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION admin.reset_runaway_or_null_pet_users(boolean) TO "postgres";
ALTER FUNCTION assign_pet_mutation(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION assign_pet_mutation(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION assign_pet_mutation(uuid) TO "postgres";
GRANT EXECUTE ON FUNCTION assign_pet_mutation(uuid) TO "service_role";
ALTER FUNCTION assign_new_pet_mutation() OWNER TO "postgres";
REVOKE ALL ON FUNCTION assign_new_pet_mutation() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION assign_new_pet_mutation() TO "postgres";
GRANT EXECUTE ON FUNCTION assign_new_pet_mutation() TO "service_role";
ALTER FUNCTION prevent_locked_velune_party_assignment() OWNER TO "postgres";
REVOKE ALL ON FUNCTION prevent_locked_velune_party_assignment() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION prevent_locked_velune_party_assignment() TO "postgres";
GRANT EXECUTE ON FUNCTION prevent_locked_velune_party_assignment() TO "service_role";
ALTER FUNCTION prevent_personality_change() OWNER TO "postgres";
REVOKE ALL ON FUNCTION prevent_personality_change() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION prevent_personality_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION prevent_personality_change() TO "postgres";
GRANT EXECUTE ON FUNCTION prevent_personality_change() TO "anon";
GRANT EXECUTE ON FUNCTION prevent_personality_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION prevent_personality_change() TO "service_role";
ALTER FUNCTION apply_hunger_decay(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION apply_hunger_decay(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION apply_hunger_decay(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION apply_hunger_decay(uuid) TO "postgres";
GRANT EXECUTE ON FUNCTION apply_hunger_decay(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION apply_hunger_decay(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION apply_hunger_decay(uuid) TO "service_role";
ALTER FUNCTION assign_pet_personality() OWNER TO "postgres";
REVOKE ALL ON FUNCTION assign_pet_personality() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION assign_pet_personality() TO PUBLIC;
GRANT EXECUTE ON FUNCTION assign_pet_personality() TO "postgres";
GRANT EXECUTE ON FUNCTION assign_pet_personality() TO "anon";
GRANT EXECUTE ON FUNCTION assign_pet_personality() TO "authenticated";
GRANT EXECUTE ON FUNCTION assign_pet_personality() TO "service_role";
ALTER FUNCTION enforce_pet_mutation_capacity() OWNER TO "postgres";
REVOKE ALL ON FUNCTION enforce_pet_mutation_capacity() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION enforce_pet_mutation_capacity() TO "postgres";
GRANT EXECUTE ON FUNCTION enforce_pet_mutation_capacity() TO "service_role";
ALTER FUNCTION consume_trough(uuid,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION consume_trough(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION consume_trough(uuid,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION consume_trough(uuid,integer) TO "postgres";
GRANT EXECUTE ON FUNCTION consume_trough(uuid,integer) TO "anon";
GRANT EXECUTE ON FUNCTION consume_trough(uuid,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION consume_trough(uuid,integer) TO "service_role";
ALTER FUNCTION extract_eastern_date(timestamp with time zone) OWNER TO "postgres";
REVOKE ALL ON FUNCTION extract_eastern_date(timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION extract_eastern_date(timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION extract_eastern_date(timestamp with time zone) TO "postgres";
GRANT EXECUTE ON FUNCTION extract_eastern_date(timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION extract_eastern_date(timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION extract_eastern_date(timestamp with time zone) TO "service_role";
ALTER FUNCTION log_signup_trigger_error(uuid,text,text,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION log_signup_trigger_error(uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION log_signup_trigger_error(uuid,text,text,text) TO "postgres";
GRANT EXECUTE ON FUNCTION log_signup_trigger_error(uuid,text,text,text) TO "service_role";
ALTER FUNCTION prevent_locked_velune_activation() OWNER TO "postgres";
REVOKE ALL ON FUNCTION prevent_locked_velune_activation() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION prevent_locked_velune_activation() TO "postgres";
GRANT EXECUTE ON FUNCTION prevent_locked_velune_activation() TO "service_role";
ALTER FUNCTION increment_wallet(uuid,integer,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION increment_wallet(uuid,integer,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION increment_wallet(uuid,integer,integer) TO "postgres";
GRANT EXECUTE ON FUNCTION increment_wallet(uuid,integer,integer) TO "service_role";
ALTER FUNCTION record_kith_discovery_from_pet() OWNER TO "postgres";
REVOKE ALL ON FUNCTION record_kith_discovery_from_pet() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION record_kith_discovery_from_pet() TO PUBLIC;
GRANT EXECUTE ON FUNCTION record_kith_discovery_from_pet() TO "postgres";
GRANT EXECUTE ON FUNCTION record_kith_discovery_from_pet() TO "anon";
GRANT EXECUTE ON FUNCTION record_kith_discovery_from_pet() TO "authenticated";
GRANT EXECUTE ON FUNCTION record_kith_discovery_from_pet() TO "service_role";
ALTER FUNCTION consume_corrupted_egg(uuid,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION consume_corrupted_egg(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION consume_corrupted_egg(uuid,uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION consume_corrupted_egg(uuid,uuid) TO "service_role";
ALTER FUNCTION get_poe_tay_toe_status(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_poe_tay_toe_status(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_poe_tay_toe_status(uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION get_poe_tay_toe_status(uuid) TO "service_role";
ALTER FUNCTION claim_poe_tay_toe_v2(uuid,text,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION claim_poe_tay_toe_v2(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION claim_poe_tay_toe_v2(uuid,text,uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION claim_poe_tay_toe_v2(uuid,text,uuid) TO "service_role";
ALTER FUNCTION roll_velune_encounter(uuid,text,integer,integer,boolean) OWNER TO "postgres";
REVOKE ALL ON FUNCTION roll_velune_encounter(uuid,text,integer,integer,boolean) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION roll_velune_encounter(uuid,text,integer,integer,boolean) TO "postgres";
GRANT EXECUTE ON FUNCTION roll_velune_encounter(uuid,text,integer,integer,boolean) TO "service_role";
ALTER FUNCTION rls_auto_enable() OWNER TO "postgres";
REVOKE ALL ON FUNCTION rls_auto_enable() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION rls_auto_enable() TO "postgres";
GRANT EXECUTE ON FUNCTION rls_auto_enable() TO "service_role";
ALTER FUNCTION set_homepage_alerts_updated_at() OWNER TO "postgres";
REVOKE ALL ON FUNCTION set_homepage_alerts_updated_at() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION set_homepage_alerts_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION set_homepage_alerts_updated_at() TO "postgres";
GRANT EXECUTE ON FUNCTION set_homepage_alerts_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION set_homepage_alerts_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION set_homepage_alerts_updated_at() TO "service_role";
ALTER FUNCTION set_updated_at() OWNER TO "postgres";
REVOKE ALL ON FUNCTION set_updated_at() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION set_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION set_updated_at() TO "postgres";
GRANT EXECUTE ON FUNCTION set_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION set_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION set_updated_at() TO "service_role";
ALTER FUNCTION apply_pet_care_decay(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION apply_pet_care_decay(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION apply_pet_care_decay(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION apply_pet_care_decay(uuid) TO "postgres";
GRANT EXECUTE ON FUNCTION apply_pet_care_decay(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION apply_pet_care_decay(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION apply_pet_care_decay(uuid) TO "service_role";
ALTER FUNCTION generate_aliune_signal_report(timestamp with time zone) OWNER TO "postgres";
REVOKE ALL ON FUNCTION generate_aliune_signal_report(timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION generate_aliune_signal_report(timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION generate_aliune_signal_report(timestamp with time zone) TO "postgres";
GRANT EXECUTE ON FUNCTION generate_aliune_signal_report(timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION generate_aliune_signal_report(timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION generate_aliune_signal_report(timestamp with time zone) TO "service_role";
ALTER FUNCTION claim_daily_login_reward(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION claim_daily_login_reward(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION claim_daily_login_reward(uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION claim_daily_login_reward(uuid) TO "service_role";
ALTER FUNCTION handle_new_user_profile() OWNER TO "postgres";
REVOKE ALL ON FUNCTION handle_new_user_profile() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION handle_new_user_profile() TO "postgres";
GRANT EXECUTE ON FUNCTION handle_new_user_profile() TO "service_role";
ALTER FUNCTION prevent_profile_escalation() OWNER TO "postgres";
REVOKE ALL ON FUNCTION prevent_profile_escalation() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION prevent_profile_escalation() TO "postgres";
GRANT EXECUTE ON FUNCTION prevent_profile_escalation() TO "service_role";
ALTER FUNCTION apply_pet_storage_action(uuid,text,uuid,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION apply_pet_storage_action(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION apply_pet_storage_action(uuid,text,uuid,integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION apply_pet_storage_action(uuid,text,uuid,integer) TO "service_role";
ALTER FUNCTION recover_runaway_pet_to_party(uuid,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION recover_runaway_pet_to_party(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION recover_runaway_pet_to_party(uuid,uuid) TO "postgres";
GRANT EXECUTE ON FUNCTION recover_runaway_pet_to_party(uuid,uuid) TO "service_role";
ALTER FUNCTION trade_kennith_basket(uuid,integer,jsonb,jsonb,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION trade_kennith_basket(uuid,integer,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION trade_kennith_basket(uuid,integer,jsonb,jsonb,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION trade_kennith_basket(uuid,integer,jsonb,jsonb,jsonb) TO "service_role";
ALTER FUNCTION restore_test_runaway_pets(text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION restore_test_runaway_pets(text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION restore_test_runaway_pets(text) TO "postgres";
GRANT EXECUTE ON FUNCTION restore_test_runaway_pets(text) TO "service_role";
ALTER FUNCTION ensure_original_starter(uuid,jsonb,jsonb,text[]) OWNER TO "postgres";
REVOKE ALL ON FUNCTION ensure_original_starter(uuid,jsonb,jsonb,text[]) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION ensure_original_starter(uuid,jsonb,jsonb,text[]) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION ensure_original_starter(uuid,jsonb,jsonb,text[]) TO "service_role";
ALTER FUNCTION commit_resonance_evolution(uuid,uuid,text,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION commit_resonance_evolution(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION commit_resonance_evolution(uuid,uuid,text,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION commit_resonance_evolution(uuid,uuid,text,text) TO "service_role";
ALTER FUNCTION spend_wallet(uuid,integer,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION spend_wallet(uuid,integer,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION spend_wallet(uuid,integer,integer) TO "postgres";
GRANT EXECUTE ON FUNCTION spend_wallet(uuid,integer,integer) TO "service_role";
ALTER FUNCTION guard_server_care() OWNER TO "postgres";
REVOKE ALL ON FUNCTION guard_server_care() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION guard_server_care() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION guard_server_care() TO "service_role";
ALTER FUNCTION trade_assanti_food(uuid,text,integer,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION trade_assanti_food(uuid,text,integer,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION trade_assanti_food(uuid,text,integer,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION trade_assanti_food(uuid,text,integer,text) TO "service_role";
ALTER FUNCTION perform_owned_care(uuid,uuid,text,jsonb,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION perform_owned_care(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION perform_owned_care(uuid,uuid,text,jsonb,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION perform_owned_care(uuid,uuid,text,jsonb,jsonb) TO "service_role";
ALTER FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line) OWNER TO "postgres";
REVOKE ALL ON FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line) TO "postgres";
GRANT EXECUTE ON FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line) TO "service_role";
ALTER FUNCTION claim_poe_tay_toe(uuid,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION claim_poe_tay_toe(uuid,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION claim_poe_tay_toe(uuid,text) TO "postgres";
GRANT EXECUTE ON FUNCTION claim_poe_tay_toe(uuid,text) TO "service_role";
ALTER FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION hatch_pet(uuid,uuid,integer,integer,integer,integer,integer,integer,text,uuid,text,text,text,text[],text,text,elemental_line,jsonb) TO "service_role";
ALTER FUNCTION increment_pve_research_stats(uuid,integer,integer,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION increment_pve_research_stats(uuid,integer,integer,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION increment_pve_research_stats(uuid,integer,integer,integer) TO "postgres";
GRANT EXECUTE ON FUNCTION increment_pve_research_stats(uuid,integer,integer,integer) TO "service_role";
ALTER FUNCTION hide_poe_tay_toe_v2(uuid,text,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION hide_poe_tay_toe_v2(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION hide_poe_tay_toe_v2(uuid,text,uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION hide_poe_tay_toe_v2(uuid,text,uuid) TO "service_role";
ALTER FUNCTION award_pet_element_delta(uuid,uuid,text,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION award_pet_element_delta(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION award_pet_element_delta(uuid,uuid,text,integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION award_pet_element_delta(uuid,uuid,text,integer) TO "service_role";
ALTER FUNCTION complete_pve_instability_run(uuid,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION complete_pve_instability_run(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION complete_pve_instability_run(uuid,uuid) TO "service_role";
ALTER FUNCTION validate_wildwood_pet_battle_result() OWNER TO "postgres";
REVOKE ALL ON FUNCTION validate_wildwood_pet_battle_result() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION validate_wildwood_pet_battle_result() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION validate_wildwood_pet_battle_result() TO "service_role";
ALTER FUNCTION claim_assanti_daily_food(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION claim_assanti_daily_food(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION claim_assanti_daily_food(uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION claim_assanti_daily_food(uuid) TO "service_role";
ALTER FUNCTION ensure_assanti_food_day(integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION ensure_assanti_food_day(integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION ensure_assanti_food_day(integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION ensure_assanti_food_day(integer) TO "service_role";
ALTER FUNCTION get_assanti_food_shop(uuid,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_assanti_food_shop(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_assanti_food_shop(uuid,integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION get_assanti_food_shop(uuid,integer) TO "service_role";
ALTER FUNCTION reset_test_account_game_data(uuid,text,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION reset_test_account_game_data(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION reset_test_account_game_data(uuid,text,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION reset_test_account_game_data(uuid,text,text) TO "service_role";
ALTER FUNCTION trade_assanti_food_on_day(uuid,text,integer,text,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION trade_assanti_food_on_day(uuid,text,integer,text,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION trade_assanti_food_on_day(uuid,text,integer,text,integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION trade_assanti_food_on_day(uuid,text,integer,text,integer) TO "service_role";
ALTER FUNCTION get_kennith_wallet(integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_kennith_wallet(integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_kennith_wallet(integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION get_kennith_wallet(integer) TO "service_role";
ALTER FUNCTION get_kennith_stock(integer,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_kennith_stock(integer,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_kennith_stock(integer,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION get_kennith_stock(integer,jsonb) TO "service_role";
ALTER FUNCTION purchase_kennith_basket(uuid,integer,jsonb,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION purchase_kennith_basket(uuid,integer,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION purchase_kennith_basket(uuid,integer,jsonb,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION purchase_kennith_basket(uuid,integer,jsonb,jsonb) TO "service_role";
ALTER FUNCTION get_player_equipment(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION get_player_equipment(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION get_player_equipment(uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION get_player_equipment(uuid) TO "service_role";
ALTER FUNCTION stamp_wildwood_item_opportunity() OWNER TO "postgres";
REVOKE ALL ON FUNCTION stamp_wildwood_item_opportunity() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION stamp_wildwood_item_opportunity() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION stamp_wildwood_item_opportunity() TO "service_role";
ALTER FUNCTION claim_wildwood_discovery(uuid,uuid,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION claim_wildwood_discovery(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION claim_wildwood_discovery(uuid,uuid,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION claim_wildwood_discovery(uuid,uuid,text) TO "service_role";
ALTER FUNCTION potato_effect_for_roll(numeric) OWNER TO "postgres";
REVOKE ALL ON FUNCTION potato_effect_for_roll(numeric) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION potato_effect_for_roll(numeric) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION potato_effect_for_roll(numeric) TO "service_role";
ALTER FUNCTION potato_locations() OWNER TO "postgres";
REVOKE ALL ON FUNCTION potato_locations() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION potato_locations() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION potato_locations() TO "service_role";
ALTER FUNCTION potato_warm_due(timestamp with time zone,timestamp with time zone,timestamp with time zone) OWNER TO "postgres";
REVOKE ALL ON FUNCTION potato_warm_due(timestamp with time zone,timestamp with time zone,timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION potato_warm_due(timestamp with time zone,timestamp with time zone,timestamp with time zone) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION potato_warm_due(timestamp with time zone,timestamp with time zone,timestamp with time zone) TO "service_role";
ALTER FUNCTION potato_battle_multiplier(uuid,text,timestamp with time zone) OWNER TO "postgres";
REVOKE ALL ON FUNCTION potato_battle_multiplier(uuid,text,timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION potato_battle_multiplier(uuid,text,timestamp with time zone) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION potato_battle_multiplier(uuid,text,timestamp with time zone) TO "service_role";
ALTER FUNCTION potato_new_incubation() OWNER TO "postgres";
REVOKE ALL ON FUNCTION potato_new_incubation() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION potato_new_incubation() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION potato_new_incubation() TO "service_role";
ALTER FUNCTION claim_species_skill(uuid,uuid,text,text,integer,text,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION claim_species_skill(uuid,uuid,text,text,integer,text,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION claim_species_skill(uuid,uuid,text,text,integer,text,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION claim_species_skill(uuid,uuid,text,text,integer,text,jsonb) TO "service_role";
ALTER FUNCTION guard_equipped_inventory() OWNER TO "postgres";
REVOKE ALL ON FUNCTION guard_equipped_inventory() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION guard_equipped_inventory() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION guard_equipped_inventory() TO "service_role";
ALTER FUNCTION save_owned_appearance(uuid,jsonb,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION save_owned_appearance(uuid,jsonb,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION save_owned_appearance(uuid,jsonb,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION save_owned_appearance(uuid,jsonb,text) TO "service_role";
ALTER FUNCTION equip_owned_relic(uuid,uuid,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION equip_owned_relic(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION equip_owned_relic(uuid,uuid,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION equip_owned_relic(uuid,uuid,text) TO "service_role";
ALTER FUNCTION perform_owned_item_care(uuid,uuid,text,jsonb,jsonb,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION perform_owned_item_care(uuid,uuid,text,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION perform_owned_item_care(uuid,uuid,text,jsonb,jsonb,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION perform_owned_item_care(uuid,uuid,text,jsonb,jsonb,text) TO "service_role";
ALTER FUNCTION recover_runaway_pet_with_payment(uuid,uuid,integer,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION recover_runaway_pet_with_payment(uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION recover_runaway_pet_with_payment(uuid,uuid,integer,integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION recover_runaway_pet_with_payment(uuid,uuid,integer,integer) TO "service_role";
ALTER FUNCTION protect_favorite_kith() OWNER TO "postgres";
REVOKE ALL ON FUNCTION protect_favorite_kith() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION protect_favorite_kith() TO "supabase_admin";
ALTER FUNCTION set_kith_favorite(uuid,uuid,boolean) OWNER TO "postgres";
REVOKE ALL ON FUNCTION set_kith_favorite(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION set_kith_favorite(uuid,uuid,boolean) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION set_kith_favorite(uuid,uuid,boolean) TO "service_role";
ALTER FUNCTION settle_wildwood_victory_xp(uuid,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION settle_wildwood_victory_xp(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION settle_wildwood_victory_xp(uuid,uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION settle_wildwood_victory_xp(uuid,uuid) TO "service_role";
ALTER FUNCTION increment_active_pet_xp(uuid,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION increment_active_pet_xp(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION increment_active_pet_xp(uuid,integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION increment_active_pet_xp(uuid,integer) TO "service_role";
ALTER FUNCTION wildwood_discovery_catalog() OWNER TO "postgres";
REVOKE ALL ON FUNCTION wildwood_discovery_catalog() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION wildwood_discovery_catalog() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION wildwood_discovery_catalog() TO "service_role";
ALTER FUNCTION wildwood_discovery_readiness() OWNER TO "postgres";
REVOKE ALL ON FUNCTION wildwood_discovery_readiness() FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION wildwood_discovery_readiness() TO "supabase_admin";
GRANT EXECUTE ON FUNCTION wildwood_discovery_readiness() TO "service_role";
ALTER FUNCTION transfer_wildwood_treasure_item(uuid,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION transfer_wildwood_treasure_item(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION transfer_wildwood_treasure_item(uuid,uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION transfer_wildwood_treasure_item(uuid,uuid) TO "service_role";
ALTER FUNCTION discard_wildwood_treasure(uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION discard_wildwood_treasure(uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION discard_wildwood_treasure(uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION discard_wildwood_treasure(uuid) TO "service_role";
ALTER FUNCTION hold_wildwood_egg(uuid,uuid,uuid,jsonb,jsonb,integer) OWNER TO "postgres";
REVOKE ALL ON FUNCTION hold_wildwood_egg(uuid,uuid,uuid,jsonb,jsonb,integer) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION hold_wildwood_egg(uuid,uuid,uuid,jsonb,jsonb,integer) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION hold_wildwood_egg(uuid,uuid,uuid,jsonb,jsonb,integer) TO "service_role";
ALTER FUNCTION transfer_wildwood_egg(uuid,uuid) OWNER TO "postgres";
REVOKE ALL ON FUNCTION transfer_wildwood_egg(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION transfer_wildwood_egg(uuid,uuid) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION transfer_wildwood_egg(uuid,uuid) TO "service_role";
ALTER FUNCTION grant_rescue_egg(uuid,jsonb,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION grant_rescue_egg(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION grant_rescue_egg(uuid,jsonb,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION grant_rescue_egg(uuid,jsonb,jsonb) TO "service_role";
ALTER FUNCTION trade_assanti_basket(uuid,integer,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION trade_assanti_basket(uuid,integer,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION trade_assanti_basket(uuid,integer,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION trade_assanti_basket(uuid,integer,jsonb) TO "service_role";
ALTER FUNCTION claim_level2_skill(uuid,uuid,text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION claim_level2_skill(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION claim_level2_skill(uuid,uuid,text) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION claim_level2_skill(uuid,uuid,text) TO "service_role";
ALTER FUNCTION allocate_level2_stats(uuid,uuid,uuid,jsonb) OWNER TO "postgres";
REVOKE ALL ON FUNCTION allocate_level2_stats(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION allocate_level2_stats(uuid,uuid,uuid,jsonb) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION allocate_level2_stats(uuid,uuid,uuid,jsonb) TO "service_role";
ALTER FUNCTION resolve_species_skill_equipment(uuid,uuid,text,smallint) OWNER TO "postgres";
REVOKE ALL ON FUNCTION resolve_species_skill_equipment(uuid,uuid,text,smallint) FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT EXECUTE ON FUNCTION resolve_species_skill_equipment(uuid,uuid,text,smallint) TO "supabase_admin";
GRANT EXECUTE ON FUNCTION resolve_species_skill_equipment(uuid,uuid,text,smallint) TO "service_role";
ALTER TABLE public.announcements OWNER TO "postgres";
REVOKE ALL ON TABLE public.announcements FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.announcements TO "postgres";
GRANT SELECT ON TABLE public.announcements TO "postgres";
GRANT UPDATE ON TABLE public.announcements TO "postgres";
GRANT DELETE ON TABLE public.announcements TO "postgres";
GRANT TRUNCATE ON TABLE public.announcements TO "postgres";
GRANT REFERENCES ON TABLE public.announcements TO "postgres";
GRANT TRIGGER ON TABLE public.announcements TO "postgres";
GRANT MAINTAIN ON TABLE public.announcements TO "postgres";
GRANT INSERT ON TABLE public.announcements TO "anon";
GRANT SELECT ON TABLE public.announcements TO "anon";
GRANT UPDATE ON TABLE public.announcements TO "anon";
GRANT DELETE ON TABLE public.announcements TO "anon";
GRANT TRUNCATE ON TABLE public.announcements TO "anon";
GRANT REFERENCES ON TABLE public.announcements TO "anon";
GRANT TRIGGER ON TABLE public.announcements TO "anon";
GRANT MAINTAIN ON TABLE public.announcements TO "anon";
GRANT INSERT ON TABLE public.announcements TO "authenticated";
GRANT SELECT ON TABLE public.announcements TO "authenticated";
GRANT UPDATE ON TABLE public.announcements TO "authenticated";
GRANT DELETE ON TABLE public.announcements TO "authenticated";
GRANT TRUNCATE ON TABLE public.announcements TO "authenticated";
GRANT REFERENCES ON TABLE public.announcements TO "authenticated";
GRANT TRIGGER ON TABLE public.announcements TO "authenticated";
GRANT MAINTAIN ON TABLE public.announcements TO "authenticated";
GRANT INSERT ON TABLE public.announcements TO "service_role";
GRANT SELECT ON TABLE public.announcements TO "service_role";
GRANT UPDATE ON TABLE public.announcements TO "service_role";
GRANT DELETE ON TABLE public.announcements TO "service_role";
GRANT TRUNCATE ON TABLE public.announcements TO "service_role";
GRANT REFERENCES ON TABLE public.announcements TO "service_role";
GRANT TRIGGER ON TABLE public.announcements TO "service_role";
GRANT MAINTAIN ON TABLE public.announcements TO "service_role";
ALTER TABLE public.pve_active_buffs OWNER TO "postgres";
REVOKE ALL ON TABLE public.pve_active_buffs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pve_active_buffs TO "postgres";
GRANT SELECT ON TABLE public.pve_active_buffs TO "postgres";
GRANT UPDATE ON TABLE public.pve_active_buffs TO "postgres";
GRANT DELETE ON TABLE public.pve_active_buffs TO "postgres";
GRANT TRUNCATE ON TABLE public.pve_active_buffs TO "postgres";
GRANT REFERENCES ON TABLE public.pve_active_buffs TO "postgres";
GRANT TRIGGER ON TABLE public.pve_active_buffs TO "postgres";
GRANT MAINTAIN ON TABLE public.pve_active_buffs TO "postgres";
GRANT INSERT ON TABLE public.pve_active_buffs TO "anon";
GRANT SELECT ON TABLE public.pve_active_buffs TO "anon";
GRANT UPDATE ON TABLE public.pve_active_buffs TO "anon";
GRANT DELETE ON TABLE public.pve_active_buffs TO "anon";
GRANT TRUNCATE ON TABLE public.pve_active_buffs TO "anon";
GRANT REFERENCES ON TABLE public.pve_active_buffs TO "anon";
GRANT TRIGGER ON TABLE public.pve_active_buffs TO "anon";
GRANT MAINTAIN ON TABLE public.pve_active_buffs TO "anon";
GRANT INSERT ON TABLE public.pve_active_buffs TO "authenticated";
GRANT SELECT ON TABLE public.pve_active_buffs TO "authenticated";
GRANT UPDATE ON TABLE public.pve_active_buffs TO "authenticated";
GRANT DELETE ON TABLE public.pve_active_buffs TO "authenticated";
GRANT TRUNCATE ON TABLE public.pve_active_buffs TO "authenticated";
GRANT REFERENCES ON TABLE public.pve_active_buffs TO "authenticated";
GRANT TRIGGER ON TABLE public.pve_active_buffs TO "authenticated";
GRANT MAINTAIN ON TABLE public.pve_active_buffs TO "authenticated";
GRANT INSERT ON TABLE public.pve_active_buffs TO "service_role";
GRANT SELECT ON TABLE public.pve_active_buffs TO "service_role";
GRANT UPDATE ON TABLE public.pve_active_buffs TO "service_role";
GRANT DELETE ON TABLE public.pve_active_buffs TO "service_role";
GRANT TRUNCATE ON TABLE public.pve_active_buffs TO "service_role";
GRANT REFERENCES ON TABLE public.pve_active_buffs TO "service_role";
GRANT TRIGGER ON TABLE public.pve_active_buffs TO "service_role";
GRANT MAINTAIN ON TABLE public.pve_active_buffs TO "service_role";
ALTER TABLE public.admin_user_starters OWNER TO "postgres";
REVOKE ALL ON TABLE public.admin_user_starters FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.admin_user_starters TO "postgres";
GRANT SELECT ON TABLE public.admin_user_starters TO "postgres";
GRANT UPDATE ON TABLE public.admin_user_starters TO "postgres";
GRANT DELETE ON TABLE public.admin_user_starters TO "postgres";
GRANT TRUNCATE ON TABLE public.admin_user_starters TO "postgres";
GRANT REFERENCES ON TABLE public.admin_user_starters TO "postgres";
GRANT TRIGGER ON TABLE public.admin_user_starters TO "postgres";
GRANT MAINTAIN ON TABLE public.admin_user_starters TO "postgres";
GRANT INSERT ON TABLE public.admin_user_starters TO "service_role";
GRANT SELECT ON TABLE public.admin_user_starters TO "service_role";
GRANT UPDATE ON TABLE public.admin_user_starters TO "service_role";
GRANT DELETE ON TABLE public.admin_user_starters TO "service_role";
GRANT TRUNCATE ON TABLE public.admin_user_starters TO "service_role";
GRANT REFERENCES ON TABLE public.admin_user_starters TO "service_role";
GRANT TRIGGER ON TABLE public.admin_user_starters TO "service_role";
GRANT MAINTAIN ON TABLE public.admin_user_starters TO "service_role";
ALTER TABLE public.battle_run_fights OWNER TO "postgres";
REVOKE ALL ON TABLE public.battle_run_fights FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.battle_run_fights TO "postgres";
GRANT SELECT ON TABLE public.battle_run_fights TO "postgres";
GRANT UPDATE ON TABLE public.battle_run_fights TO "postgres";
GRANT DELETE ON TABLE public.battle_run_fights TO "postgres";
GRANT TRUNCATE ON TABLE public.battle_run_fights TO "postgres";
GRANT REFERENCES ON TABLE public.battle_run_fights TO "postgres";
GRANT TRIGGER ON TABLE public.battle_run_fights TO "postgres";
GRANT MAINTAIN ON TABLE public.battle_run_fights TO "postgres";
GRANT INSERT ON TABLE public.battle_run_fights TO "anon";
GRANT SELECT ON TABLE public.battle_run_fights TO "anon";
GRANT UPDATE ON TABLE public.battle_run_fights TO "anon";
GRANT DELETE ON TABLE public.battle_run_fights TO "anon";
GRANT TRUNCATE ON TABLE public.battle_run_fights TO "anon";
GRANT REFERENCES ON TABLE public.battle_run_fights TO "anon";
GRANT TRIGGER ON TABLE public.battle_run_fights TO "anon";
GRANT MAINTAIN ON TABLE public.battle_run_fights TO "anon";
GRANT INSERT ON TABLE public.battle_run_fights TO "authenticated";
GRANT SELECT ON TABLE public.battle_run_fights TO "authenticated";
GRANT UPDATE ON TABLE public.battle_run_fights TO "authenticated";
GRANT DELETE ON TABLE public.battle_run_fights TO "authenticated";
GRANT TRUNCATE ON TABLE public.battle_run_fights TO "authenticated";
GRANT REFERENCES ON TABLE public.battle_run_fights TO "authenticated";
GRANT TRIGGER ON TABLE public.battle_run_fights TO "authenticated";
GRANT MAINTAIN ON TABLE public.battle_run_fights TO "authenticated";
GRANT INSERT ON TABLE public.battle_run_fights TO "service_role";
GRANT SELECT ON TABLE public.battle_run_fights TO "service_role";
GRANT UPDATE ON TABLE public.battle_run_fights TO "service_role";
GRANT DELETE ON TABLE public.battle_run_fights TO "service_role";
GRANT TRUNCATE ON TABLE public.battle_run_fights TO "service_role";
GRANT REFERENCES ON TABLE public.battle_run_fights TO "service_role";
GRANT TRIGGER ON TABLE public.battle_run_fights TO "service_role";
GRANT MAINTAIN ON TABLE public.battle_run_fights TO "service_role";
ALTER TABLE admin.profiles_with_starter_pet OWNER TO "postgres";
REVOKE ALL ON TABLE admin.profiles_with_starter_pet FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE admin.profiles_with_starter_pet TO "postgres";
GRANT SELECT ON TABLE admin.profiles_with_starter_pet TO "postgres";
GRANT UPDATE ON TABLE admin.profiles_with_starter_pet TO "postgres";
GRANT DELETE ON TABLE admin.profiles_with_starter_pet TO "postgres";
GRANT TRUNCATE ON TABLE admin.profiles_with_starter_pet TO "postgres";
GRANT REFERENCES ON TABLE admin.profiles_with_starter_pet TO "postgres";
GRANT TRIGGER ON TABLE admin.profiles_with_starter_pet TO "postgres";
GRANT MAINTAIN ON TABLE admin.profiles_with_starter_pet TO "postgres";
ALTER TABLE public.aliune_signal_reports OWNER TO "postgres";
REVOKE ALL ON TABLE public.aliune_signal_reports FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.aliune_signal_reports TO "postgres";
GRANT SELECT ON TABLE public.aliune_signal_reports TO "postgres";
GRANT UPDATE ON TABLE public.aliune_signal_reports TO "postgres";
GRANT DELETE ON TABLE public.aliune_signal_reports TO "postgres";
GRANT TRUNCATE ON TABLE public.aliune_signal_reports TO "postgres";
GRANT REFERENCES ON TABLE public.aliune_signal_reports TO "postgres";
GRANT TRIGGER ON TABLE public.aliune_signal_reports TO "postgres";
GRANT MAINTAIN ON TABLE public.aliune_signal_reports TO "postgres";
GRANT INSERT ON TABLE public.aliune_signal_reports TO "anon";
GRANT SELECT ON TABLE public.aliune_signal_reports TO "anon";
GRANT UPDATE ON TABLE public.aliune_signal_reports TO "anon";
GRANT DELETE ON TABLE public.aliune_signal_reports TO "anon";
GRANT TRUNCATE ON TABLE public.aliune_signal_reports TO "anon";
GRANT REFERENCES ON TABLE public.aliune_signal_reports TO "anon";
GRANT TRIGGER ON TABLE public.aliune_signal_reports TO "anon";
GRANT MAINTAIN ON TABLE public.aliune_signal_reports TO "anon";
GRANT INSERT ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT SELECT ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT UPDATE ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT DELETE ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT TRUNCATE ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT REFERENCES ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT TRIGGER ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT MAINTAIN ON TABLE public.aliune_signal_reports TO "authenticated";
GRANT INSERT ON TABLE public.aliune_signal_reports TO "service_role";
GRANT SELECT ON TABLE public.aliune_signal_reports TO "service_role";
GRANT UPDATE ON TABLE public.aliune_signal_reports TO "service_role";
GRANT DELETE ON TABLE public.aliune_signal_reports TO "service_role";
GRANT TRUNCATE ON TABLE public.aliune_signal_reports TO "service_role";
GRANT REFERENCES ON TABLE public.aliune_signal_reports TO "service_role";
GRANT TRIGGER ON TABLE public.aliune_signal_reports TO "service_role";
GRANT MAINTAIN ON TABLE public.aliune_signal_reports TO "service_role";
ALTER TABLE public.pets OWNER TO "postgres";
REVOKE ALL ON TABLE public.pets FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pets TO "postgres";
GRANT SELECT ON TABLE public.pets TO "postgres";
GRANT UPDATE ON TABLE public.pets TO "postgres";
GRANT DELETE ON TABLE public.pets TO "postgres";
GRANT TRUNCATE ON TABLE public.pets TO "postgres";
GRANT REFERENCES ON TABLE public.pets TO "postgres";
GRANT TRIGGER ON TABLE public.pets TO "postgres";
GRANT MAINTAIN ON TABLE public.pets TO "postgres";
GRANT SELECT ON TABLE public.pets TO "anon";
GRANT MAINTAIN ON TABLE public.pets TO "anon";
GRANT SELECT ON TABLE public.pets TO "authenticated";
GRANT MAINTAIN ON TABLE public.pets TO "authenticated";
GRANT INSERT ON TABLE public.pets TO "service_role";
GRANT SELECT ON TABLE public.pets TO "service_role";
GRANT UPDATE ON TABLE public.pets TO "service_role";
GRANT DELETE ON TABLE public.pets TO "service_role";
GRANT TRUNCATE ON TABLE public.pets TO "service_role";
GRANT REFERENCES ON TABLE public.pets TO "service_role";
GRANT TRIGGER ON TABLE public.pets TO "service_role";
GRANT MAINTAIN ON TABLE public.pets TO "service_role";
ALTER TABLE public.aliune_signals OWNER TO "postgres";
REVOKE ALL ON TABLE public.aliune_signals FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.aliune_signals TO "postgres";
GRANT SELECT ON TABLE public.aliune_signals TO "postgres";
GRANT UPDATE ON TABLE public.aliune_signals TO "postgres";
GRANT DELETE ON TABLE public.aliune_signals TO "postgres";
GRANT TRUNCATE ON TABLE public.aliune_signals TO "postgres";
GRANT REFERENCES ON TABLE public.aliune_signals TO "postgres";
GRANT TRIGGER ON TABLE public.aliune_signals TO "postgres";
GRANT MAINTAIN ON TABLE public.aliune_signals TO "postgres";
GRANT INSERT ON TABLE public.aliune_signals TO "anon";
GRANT SELECT ON TABLE public.aliune_signals TO "anon";
GRANT UPDATE ON TABLE public.aliune_signals TO "anon";
GRANT DELETE ON TABLE public.aliune_signals TO "anon";
GRANT TRUNCATE ON TABLE public.aliune_signals TO "anon";
GRANT REFERENCES ON TABLE public.aliune_signals TO "anon";
GRANT TRIGGER ON TABLE public.aliune_signals TO "anon";
GRANT MAINTAIN ON TABLE public.aliune_signals TO "anon";
GRANT INSERT ON TABLE public.aliune_signals TO "authenticated";
GRANT SELECT ON TABLE public.aliune_signals TO "authenticated";
GRANT UPDATE ON TABLE public.aliune_signals TO "authenticated";
GRANT DELETE ON TABLE public.aliune_signals TO "authenticated";
GRANT TRUNCATE ON TABLE public.aliune_signals TO "authenticated";
GRANT REFERENCES ON TABLE public.aliune_signals TO "authenticated";
GRANT TRIGGER ON TABLE public.aliune_signals TO "authenticated";
GRANT MAINTAIN ON TABLE public.aliune_signals TO "authenticated";
GRANT INSERT ON TABLE public.aliune_signals TO "service_role";
GRANT SELECT ON TABLE public.aliune_signals TO "service_role";
GRANT UPDATE ON TABLE public.aliune_signals TO "service_role";
GRANT DELETE ON TABLE public.aliune_signals TO "service_role";
GRANT TRUNCATE ON TABLE public.aliune_signals TO "service_role";
GRANT REFERENCES ON TABLE public.aliune_signals TO "service_role";
GRANT TRIGGER ON TABLE public.aliune_signals TO "service_role";
GRANT MAINTAIN ON TABLE public.aliune_signals TO "service_role";
ALTER TABLE public.hatchery_shelf_slots OWNER TO "postgres";
REVOKE ALL ON TABLE public.hatchery_shelf_slots FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT SELECT ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT UPDATE ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT DELETE ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT TRUNCATE ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT REFERENCES ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT TRIGGER ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT MAINTAIN ON TABLE public.hatchery_shelf_slots TO "postgres";
GRANT INSERT ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT SELECT ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT UPDATE ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT DELETE ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT TRUNCATE ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT REFERENCES ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT TRIGGER ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT MAINTAIN ON TABLE public.hatchery_shelf_slots TO "anon";
GRANT INSERT ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT SELECT ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT UPDATE ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT DELETE ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT TRUNCATE ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT REFERENCES ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT TRIGGER ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT MAINTAIN ON TABLE public.hatchery_shelf_slots TO "authenticated";
GRANT INSERT ON TABLE public.hatchery_shelf_slots TO "service_role";
GRANT SELECT ON TABLE public.hatchery_shelf_slots TO "service_role";
GRANT UPDATE ON TABLE public.hatchery_shelf_slots TO "service_role";
GRANT DELETE ON TABLE public.hatchery_shelf_slots TO "service_role";
GRANT TRUNCATE ON TABLE public.hatchery_shelf_slots TO "service_role";
GRANT REFERENCES ON TABLE public.hatchery_shelf_slots TO "service_role";
GRANT TRIGGER ON TABLE public.hatchery_shelf_slots TO "service_role";
GRANT MAINTAIN ON TABLE public.hatchery_shelf_slots TO "service_role";
ALTER TABLE public.legendary_kith_event_state OWNER TO "postgres";
REVOKE ALL ON TABLE public.legendary_kith_event_state FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT SELECT ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT UPDATE ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT DELETE ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT TRUNCATE ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT REFERENCES ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT TRIGGER ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT MAINTAIN ON TABLE public.legendary_kith_event_state TO "postgres";
GRANT INSERT ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT SELECT ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT UPDATE ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT DELETE ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT TRUNCATE ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT REFERENCES ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT TRIGGER ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT MAINTAIN ON TABLE public.legendary_kith_event_state TO "service_role";
GRANT SELECT ON TABLE public.legendary_kith_event_state TO "authenticated";
ALTER TABLE public.daily_login_rewards OWNER TO "postgres";
REVOKE ALL ON TABLE public.daily_login_rewards FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.daily_login_rewards TO "postgres";
GRANT SELECT ON TABLE public.daily_login_rewards TO "postgres";
GRANT UPDATE ON TABLE public.daily_login_rewards TO "postgres";
GRANT DELETE ON TABLE public.daily_login_rewards TO "postgres";
GRANT TRUNCATE ON TABLE public.daily_login_rewards TO "postgres";
GRANT REFERENCES ON TABLE public.daily_login_rewards TO "postgres";
GRANT TRIGGER ON TABLE public.daily_login_rewards TO "postgres";
GRANT MAINTAIN ON TABLE public.daily_login_rewards TO "postgres";
GRANT SELECT ON TABLE public.daily_login_rewards TO "anon";
GRANT MAINTAIN ON TABLE public.daily_login_rewards TO "anon";
GRANT SELECT ON TABLE public.daily_login_rewards TO "authenticated";
GRANT MAINTAIN ON TABLE public.daily_login_rewards TO "authenticated";
GRANT INSERT ON TABLE public.daily_login_rewards TO "service_role";
GRANT SELECT ON TABLE public.daily_login_rewards TO "service_role";
GRANT UPDATE ON TABLE public.daily_login_rewards TO "service_role";
GRANT DELETE ON TABLE public.daily_login_rewards TO "service_role";
GRANT TRUNCATE ON TABLE public.daily_login_rewards TO "service_role";
GRANT REFERENCES ON TABLE public.daily_login_rewards TO "service_role";
GRANT TRIGGER ON TABLE public.daily_login_rewards TO "service_role";
GRANT MAINTAIN ON TABLE public.daily_login_rewards TO "service_role";
ALTER TABLE public.homepage_patch_notes_live OWNER TO "postgres";
REVOKE ALL ON TABLE public.homepage_patch_notes_live FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT SELECT ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT UPDATE ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT DELETE ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT TRUNCATE ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT REFERENCES ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT TRIGGER ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT MAINTAIN ON TABLE public.homepage_patch_notes_live TO "postgres";
GRANT INSERT ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT SELECT ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT UPDATE ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT DELETE ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT TRUNCATE ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT REFERENCES ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT TRIGGER ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT MAINTAIN ON TABLE public.homepage_patch_notes_live TO "anon";
GRANT INSERT ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT SELECT ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT UPDATE ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT DELETE ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT TRUNCATE ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT REFERENCES ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT TRIGGER ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT MAINTAIN ON TABLE public.homepage_patch_notes_live TO "authenticated";
GRANT INSERT ON TABLE public.homepage_patch_notes_live TO "service_role";
GRANT SELECT ON TABLE public.homepage_patch_notes_live TO "service_role";
GRANT UPDATE ON TABLE public.homepage_patch_notes_live TO "service_role";
GRANT DELETE ON TABLE public.homepage_patch_notes_live TO "service_role";
GRANT TRUNCATE ON TABLE public.homepage_patch_notes_live TO "service_role";
GRANT REFERENCES ON TABLE public.homepage_patch_notes_live TO "service_role";
GRANT TRIGGER ON TABLE public.homepage_patch_notes_live TO "service_role";
GRANT MAINTAIN ON TABLE public.homepage_patch_notes_live TO "service_role";
ALTER TABLE public.homepage_alerts OWNER TO "postgres";
REVOKE ALL ON TABLE public.homepage_alerts FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.homepage_alerts TO "postgres";
GRANT SELECT ON TABLE public.homepage_alerts TO "postgres";
GRANT UPDATE ON TABLE public.homepage_alerts TO "postgres";
GRANT DELETE ON TABLE public.homepage_alerts TO "postgres";
GRANT TRUNCATE ON TABLE public.homepage_alerts TO "postgres";
GRANT REFERENCES ON TABLE public.homepage_alerts TO "postgres";
GRANT TRIGGER ON TABLE public.homepage_alerts TO "postgres";
GRANT MAINTAIN ON TABLE public.homepage_alerts TO "postgres";
GRANT INSERT ON TABLE public.homepage_alerts TO "anon";
GRANT SELECT ON TABLE public.homepage_alerts TO "anon";
GRANT UPDATE ON TABLE public.homepage_alerts TO "anon";
GRANT DELETE ON TABLE public.homepage_alerts TO "anon";
GRANT TRUNCATE ON TABLE public.homepage_alerts TO "anon";
GRANT REFERENCES ON TABLE public.homepage_alerts TO "anon";
GRANT TRIGGER ON TABLE public.homepage_alerts TO "anon";
GRANT MAINTAIN ON TABLE public.homepage_alerts TO "anon";
GRANT INSERT ON TABLE public.homepage_alerts TO "authenticated";
GRANT SELECT ON TABLE public.homepage_alerts TO "authenticated";
GRANT UPDATE ON TABLE public.homepage_alerts TO "authenticated";
GRANT DELETE ON TABLE public.homepage_alerts TO "authenticated";
GRANT TRUNCATE ON TABLE public.homepage_alerts TO "authenticated";
GRANT REFERENCES ON TABLE public.homepage_alerts TO "authenticated";
GRANT TRIGGER ON TABLE public.homepage_alerts TO "authenticated";
GRANT MAINTAIN ON TABLE public.homepage_alerts TO "authenticated";
GRANT INSERT ON TABLE public.homepage_alerts TO "service_role";
GRANT SELECT ON TABLE public.homepage_alerts TO "service_role";
GRANT UPDATE ON TABLE public.homepage_alerts TO "service_role";
GRANT DELETE ON TABLE public.homepage_alerts TO "service_role";
GRANT TRUNCATE ON TABLE public.homepage_alerts TO "service_role";
GRANT REFERENCES ON TABLE public.homepage_alerts TO "service_role";
GRANT TRIGGER ON TABLE public.homepage_alerts TO "service_role";
GRANT MAINTAIN ON TABLE public.homepage_alerts TO "service_role";
ALTER TABLE public.patch_notes OWNER TO "postgres";
REVOKE ALL ON TABLE public.patch_notes FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.patch_notes TO "postgres";
GRANT SELECT ON TABLE public.patch_notes TO "postgres";
GRANT UPDATE ON TABLE public.patch_notes TO "postgres";
GRANT DELETE ON TABLE public.patch_notes TO "postgres";
GRANT TRUNCATE ON TABLE public.patch_notes TO "postgres";
GRANT REFERENCES ON TABLE public.patch_notes TO "postgres";
GRANT TRIGGER ON TABLE public.patch_notes TO "postgres";
GRANT MAINTAIN ON TABLE public.patch_notes TO "postgres";
GRANT INSERT ON TABLE public.patch_notes TO "anon";
GRANT SELECT ON TABLE public.patch_notes TO "anon";
GRANT UPDATE ON TABLE public.patch_notes TO "anon";
GRANT DELETE ON TABLE public.patch_notes TO "anon";
GRANT TRUNCATE ON TABLE public.patch_notes TO "anon";
GRANT REFERENCES ON TABLE public.patch_notes TO "anon";
GRANT TRIGGER ON TABLE public.patch_notes TO "anon";
GRANT MAINTAIN ON TABLE public.patch_notes TO "anon";
GRANT INSERT ON TABLE public.patch_notes TO "authenticated";
GRANT SELECT ON TABLE public.patch_notes TO "authenticated";
GRANT UPDATE ON TABLE public.patch_notes TO "authenticated";
GRANT DELETE ON TABLE public.patch_notes TO "authenticated";
GRANT TRUNCATE ON TABLE public.patch_notes TO "authenticated";
GRANT REFERENCES ON TABLE public.patch_notes TO "authenticated";
GRANT TRIGGER ON TABLE public.patch_notes TO "authenticated";
GRANT MAINTAIN ON TABLE public.patch_notes TO "authenticated";
GRANT INSERT ON TABLE public.patch_notes TO "service_role";
GRANT SELECT ON TABLE public.patch_notes TO "service_role";
GRANT UPDATE ON TABLE public.patch_notes TO "service_role";
GRANT DELETE ON TABLE public.patch_notes TO "service_role";
GRANT TRUNCATE ON TABLE public.patch_notes TO "service_role";
GRANT REFERENCES ON TABLE public.patch_notes TO "service_role";
GRANT TRIGGER ON TABLE public.patch_notes TO "service_role";
GRANT MAINTAIN ON TABLE public.patch_notes TO "service_role";
ALTER TABLE public.homepage_alerts_live OWNER TO "postgres";
REVOKE ALL ON TABLE public.homepage_alerts_live FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.homepage_alerts_live TO "postgres";
GRANT SELECT ON TABLE public.homepage_alerts_live TO "postgres";
GRANT UPDATE ON TABLE public.homepage_alerts_live TO "postgres";
GRANT DELETE ON TABLE public.homepage_alerts_live TO "postgres";
GRANT TRUNCATE ON TABLE public.homepage_alerts_live TO "postgres";
GRANT REFERENCES ON TABLE public.homepage_alerts_live TO "postgres";
GRANT TRIGGER ON TABLE public.homepage_alerts_live TO "postgres";
GRANT MAINTAIN ON TABLE public.homepage_alerts_live TO "postgres";
GRANT INSERT ON TABLE public.homepage_alerts_live TO "anon";
GRANT SELECT ON TABLE public.homepage_alerts_live TO "anon";
GRANT UPDATE ON TABLE public.homepage_alerts_live TO "anon";
GRANT DELETE ON TABLE public.homepage_alerts_live TO "anon";
GRANT TRUNCATE ON TABLE public.homepage_alerts_live TO "anon";
GRANT REFERENCES ON TABLE public.homepage_alerts_live TO "anon";
GRANT TRIGGER ON TABLE public.homepage_alerts_live TO "anon";
GRANT MAINTAIN ON TABLE public.homepage_alerts_live TO "anon";
GRANT INSERT ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT SELECT ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT UPDATE ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT DELETE ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT TRUNCATE ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT REFERENCES ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT TRIGGER ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT MAINTAIN ON TABLE public.homepage_alerts_live TO "authenticated";
GRANT INSERT ON TABLE public.homepage_alerts_live TO "service_role";
GRANT SELECT ON TABLE public.homepage_alerts_live TO "service_role";
GRANT UPDATE ON TABLE public.homepage_alerts_live TO "service_role";
GRANT DELETE ON TABLE public.homepage_alerts_live TO "service_role";
GRANT TRUNCATE ON TABLE public.homepage_alerts_live TO "service_role";
GRANT REFERENCES ON TABLE public.homepage_alerts_live TO "service_role";
GRANT TRIGGER ON TABLE public.homepage_alerts_live TO "service_role";
GRANT MAINTAIN ON TABLE public.homepage_alerts_live TO "service_role";
ALTER TABLE public.mutations OWNER TO "postgres";
REVOKE ALL ON TABLE public.mutations FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.mutations TO "postgres";
GRANT SELECT ON TABLE public.mutations TO "postgres";
GRANT UPDATE ON TABLE public.mutations TO "postgres";
GRANT DELETE ON TABLE public.mutations TO "postgres";
GRANT TRUNCATE ON TABLE public.mutations TO "postgres";
GRANT REFERENCES ON TABLE public.mutations TO "postgres";
GRANT TRIGGER ON TABLE public.mutations TO "postgres";
GRANT MAINTAIN ON TABLE public.mutations TO "postgres";
GRANT SELECT ON TABLE public.mutations TO "anon";
GRANT MAINTAIN ON TABLE public.mutations TO "anon";
GRANT SELECT ON TABLE public.mutations TO "authenticated";
GRANT MAINTAIN ON TABLE public.mutations TO "authenticated";
GRANT INSERT ON TABLE public.mutations TO "service_role";
GRANT SELECT ON TABLE public.mutations TO "service_role";
GRANT UPDATE ON TABLE public.mutations TO "service_role";
GRANT DELETE ON TABLE public.mutations TO "service_role";
GRANT TRUNCATE ON TABLE public.mutations TO "service_role";
GRANT REFERENCES ON TABLE public.mutations TO "service_role";
GRANT TRIGGER ON TABLE public.mutations TO "service_role";
GRANT MAINTAIN ON TABLE public.mutations TO "service_role";
ALTER TABLE public.homepage_aliune_signal_live OWNER TO "postgres";
REVOKE ALL ON TABLE public.homepage_aliune_signal_live FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT SELECT ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT UPDATE ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT DELETE ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT TRUNCATE ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT REFERENCES ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT TRIGGER ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT MAINTAIN ON TABLE public.homepage_aliune_signal_live TO "postgres";
GRANT INSERT ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT SELECT ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT UPDATE ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT DELETE ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT TRUNCATE ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT REFERENCES ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT TRIGGER ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT MAINTAIN ON TABLE public.homepage_aliune_signal_live TO "anon";
GRANT INSERT ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT SELECT ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT UPDATE ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT DELETE ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT TRUNCATE ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT REFERENCES ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT TRIGGER ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT MAINTAIN ON TABLE public.homepage_aliune_signal_live TO "authenticated";
GRANT INSERT ON TABLE public.homepage_aliune_signal_live TO "service_role";
GRANT SELECT ON TABLE public.homepage_aliune_signal_live TO "service_role";
GRANT UPDATE ON TABLE public.homepage_aliune_signal_live TO "service_role";
GRANT DELETE ON TABLE public.homepage_aliune_signal_live TO "service_role";
GRANT TRUNCATE ON TABLE public.homepage_aliune_signal_live TO "service_role";
GRANT REFERENCES ON TABLE public.homepage_aliune_signal_live TO "service_role";
GRANT TRIGGER ON TABLE public.homepage_aliune_signal_live TO "service_role";
GRANT MAINTAIN ON TABLE public.homepage_aliune_signal_live TO "service_role";
ALTER TABLE public.item_defs OWNER TO "postgres";
REVOKE ALL ON TABLE public.item_defs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.item_defs TO "postgres";
GRANT SELECT ON TABLE public.item_defs TO "postgres";
GRANT UPDATE ON TABLE public.item_defs TO "postgres";
GRANT DELETE ON TABLE public.item_defs TO "postgres";
GRANT TRUNCATE ON TABLE public.item_defs TO "postgres";
GRANT REFERENCES ON TABLE public.item_defs TO "postgres";
GRANT TRIGGER ON TABLE public.item_defs TO "postgres";
GRANT MAINTAIN ON TABLE public.item_defs TO "postgres";
GRANT INSERT ON TABLE public.item_defs TO "anon";
GRANT SELECT ON TABLE public.item_defs TO "anon";
GRANT UPDATE ON TABLE public.item_defs TO "anon";
GRANT DELETE ON TABLE public.item_defs TO "anon";
GRANT TRUNCATE ON TABLE public.item_defs TO "anon";
GRANT REFERENCES ON TABLE public.item_defs TO "anon";
GRANT TRIGGER ON TABLE public.item_defs TO "anon";
GRANT MAINTAIN ON TABLE public.item_defs TO "anon";
GRANT INSERT ON TABLE public.item_defs TO "authenticated";
GRANT SELECT ON TABLE public.item_defs TO "authenticated";
GRANT UPDATE ON TABLE public.item_defs TO "authenticated";
GRANT DELETE ON TABLE public.item_defs TO "authenticated";
GRANT TRUNCATE ON TABLE public.item_defs TO "authenticated";
GRANT REFERENCES ON TABLE public.item_defs TO "authenticated";
GRANT TRIGGER ON TABLE public.item_defs TO "authenticated";
GRANT MAINTAIN ON TABLE public.item_defs TO "authenticated";
GRANT INSERT ON TABLE public.item_defs TO "service_role";
GRANT SELECT ON TABLE public.item_defs TO "service_role";
GRANT UPDATE ON TABLE public.item_defs TO "service_role";
GRANT DELETE ON TABLE public.item_defs TO "service_role";
GRANT TRUNCATE ON TABLE public.item_defs TO "service_role";
GRANT REFERENCES ON TABLE public.item_defs TO "service_role";
GRANT TRIGGER ON TABLE public.item_defs TO "service_role";
GRANT MAINTAIN ON TABLE public.item_defs TO "service_role";
ALTER TABLE public.homepage_announcements_live OWNER TO "postgres";
REVOKE ALL ON TABLE public.homepage_announcements_live FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.homepage_announcements_live TO "postgres";
GRANT SELECT ON TABLE public.homepage_announcements_live TO "postgres";
GRANT UPDATE ON TABLE public.homepage_announcements_live TO "postgres";
GRANT DELETE ON TABLE public.homepage_announcements_live TO "postgres";
GRANT TRUNCATE ON TABLE public.homepage_announcements_live TO "postgres";
GRANT REFERENCES ON TABLE public.homepage_announcements_live TO "postgres";
GRANT TRIGGER ON TABLE public.homepage_announcements_live TO "postgres";
GRANT MAINTAIN ON TABLE public.homepage_announcements_live TO "postgres";
GRANT INSERT ON TABLE public.homepage_announcements_live TO "anon";
GRANT SELECT ON TABLE public.homepage_announcements_live TO "anon";
GRANT UPDATE ON TABLE public.homepage_announcements_live TO "anon";
GRANT DELETE ON TABLE public.homepage_announcements_live TO "anon";
GRANT TRUNCATE ON TABLE public.homepage_announcements_live TO "anon";
GRANT REFERENCES ON TABLE public.homepage_announcements_live TO "anon";
GRANT TRIGGER ON TABLE public.homepage_announcements_live TO "anon";
GRANT MAINTAIN ON TABLE public.homepage_announcements_live TO "anon";
GRANT INSERT ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT SELECT ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT UPDATE ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT DELETE ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT TRUNCATE ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT REFERENCES ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT TRIGGER ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT MAINTAIN ON TABLE public.homepage_announcements_live TO "authenticated";
GRANT INSERT ON TABLE public.homepage_announcements_live TO "service_role";
GRANT SELECT ON TABLE public.homepage_announcements_live TO "service_role";
GRANT UPDATE ON TABLE public.homepage_announcements_live TO "service_role";
GRANT DELETE ON TABLE public.homepage_announcements_live TO "service_role";
GRANT TRUNCATE ON TABLE public.homepage_announcements_live TO "service_role";
GRANT REFERENCES ON TABLE public.homepage_announcements_live TO "service_role";
GRANT TRIGGER ON TABLE public.homepage_announcements_live TO "service_role";
GRANT MAINTAIN ON TABLE public.homepage_announcements_live TO "service_role";
ALTER TABLE public.hatchery_slots OWNER TO "postgres";
REVOKE ALL ON TABLE public.hatchery_slots FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.hatchery_slots TO "postgres";
GRANT SELECT ON TABLE public.hatchery_slots TO "postgres";
GRANT UPDATE ON TABLE public.hatchery_slots TO "postgres";
GRANT DELETE ON TABLE public.hatchery_slots TO "postgres";
GRANT TRUNCATE ON TABLE public.hatchery_slots TO "postgres";
GRANT REFERENCES ON TABLE public.hatchery_slots TO "postgres";
GRANT TRIGGER ON TABLE public.hatchery_slots TO "postgres";
GRANT MAINTAIN ON TABLE public.hatchery_slots TO "postgres";
GRANT SELECT ON TABLE public.hatchery_slots TO "anon";
GRANT MAINTAIN ON TABLE public.hatchery_slots TO "anon";
GRANT SELECT ON TABLE public.hatchery_slots TO "authenticated";
GRANT MAINTAIN ON TABLE public.hatchery_slots TO "authenticated";
GRANT INSERT ON TABLE public.hatchery_slots TO "service_role";
GRANT SELECT ON TABLE public.hatchery_slots TO "service_role";
GRANT UPDATE ON TABLE public.hatchery_slots TO "service_role";
GRANT DELETE ON TABLE public.hatchery_slots TO "service_role";
GRANT TRUNCATE ON TABLE public.hatchery_slots TO "service_role";
GRANT REFERENCES ON TABLE public.hatchery_slots TO "service_role";
GRANT TRIGGER ON TABLE public.hatchery_slots TO "service_role";
GRANT MAINTAIN ON TABLE public.hatchery_slots TO "service_role";
ALTER TABLE public.element_defs OWNER TO "postgres";
REVOKE ALL ON TABLE public.element_defs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.element_defs TO "postgres";
GRANT SELECT ON TABLE public.element_defs TO "postgres";
GRANT UPDATE ON TABLE public.element_defs TO "postgres";
GRANT DELETE ON TABLE public.element_defs TO "postgres";
GRANT TRUNCATE ON TABLE public.element_defs TO "postgres";
GRANT REFERENCES ON TABLE public.element_defs TO "postgres";
GRANT TRIGGER ON TABLE public.element_defs TO "postgres";
GRANT MAINTAIN ON TABLE public.element_defs TO "postgres";
GRANT INSERT ON TABLE public.element_defs TO "anon";
GRANT SELECT ON TABLE public.element_defs TO "anon";
GRANT UPDATE ON TABLE public.element_defs TO "anon";
GRANT DELETE ON TABLE public.element_defs TO "anon";
GRANT TRUNCATE ON TABLE public.element_defs TO "anon";
GRANT REFERENCES ON TABLE public.element_defs TO "anon";
GRANT TRIGGER ON TABLE public.element_defs TO "anon";
GRANT MAINTAIN ON TABLE public.element_defs TO "anon";
GRANT INSERT ON TABLE public.element_defs TO "authenticated";
GRANT SELECT ON TABLE public.element_defs TO "authenticated";
GRANT UPDATE ON TABLE public.element_defs TO "authenticated";
GRANT DELETE ON TABLE public.element_defs TO "authenticated";
GRANT TRUNCATE ON TABLE public.element_defs TO "authenticated";
GRANT REFERENCES ON TABLE public.element_defs TO "authenticated";
GRANT TRIGGER ON TABLE public.element_defs TO "authenticated";
GRANT MAINTAIN ON TABLE public.element_defs TO "authenticated";
GRANT INSERT ON TABLE public.element_defs TO "service_role";
GRANT SELECT ON TABLE public.element_defs TO "service_role";
GRANT UPDATE ON TABLE public.element_defs TO "service_role";
GRANT DELETE ON TABLE public.element_defs TO "service_role";
GRANT TRUNCATE ON TABLE public.element_defs TO "service_role";
GRANT REFERENCES ON TABLE public.element_defs TO "service_role";
GRANT TRIGGER ON TABLE public.element_defs TO "service_role";
GRANT MAINTAIN ON TABLE public.element_defs TO "service_role";
ALTER TABLE public.battle_runs OWNER TO "postgres";
REVOKE ALL ON TABLE public.battle_runs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.battle_runs TO "postgres";
GRANT SELECT ON TABLE public.battle_runs TO "postgres";
GRANT UPDATE ON TABLE public.battle_runs TO "postgres";
GRANT DELETE ON TABLE public.battle_runs TO "postgres";
GRANT TRUNCATE ON TABLE public.battle_runs TO "postgres";
GRANT REFERENCES ON TABLE public.battle_runs TO "postgres";
GRANT TRIGGER ON TABLE public.battle_runs TO "postgres";
GRANT MAINTAIN ON TABLE public.battle_runs TO "postgres";
GRANT INSERT ON TABLE public.battle_runs TO "anon";
GRANT SELECT ON TABLE public.battle_runs TO "anon";
GRANT UPDATE ON TABLE public.battle_runs TO "anon";
GRANT DELETE ON TABLE public.battle_runs TO "anon";
GRANT TRUNCATE ON TABLE public.battle_runs TO "anon";
GRANT REFERENCES ON TABLE public.battle_runs TO "anon";
GRANT TRIGGER ON TABLE public.battle_runs TO "anon";
GRANT MAINTAIN ON TABLE public.battle_runs TO "anon";
GRANT INSERT ON TABLE public.battle_runs TO "authenticated";
GRANT SELECT ON TABLE public.battle_runs TO "authenticated";
GRANT UPDATE ON TABLE public.battle_runs TO "authenticated";
GRANT DELETE ON TABLE public.battle_runs TO "authenticated";
GRANT TRUNCATE ON TABLE public.battle_runs TO "authenticated";
GRANT REFERENCES ON TABLE public.battle_runs TO "authenticated";
GRANT TRIGGER ON TABLE public.battle_runs TO "authenticated";
GRANT MAINTAIN ON TABLE public.battle_runs TO "authenticated";
GRANT INSERT ON TABLE public.battle_runs TO "service_role";
GRANT SELECT ON TABLE public.battle_runs TO "service_role";
GRANT UPDATE ON TABLE public.battle_runs TO "service_role";
GRANT DELETE ON TABLE public.battle_runs TO "service_role";
GRANT TRUNCATE ON TABLE public.battle_runs TO "service_role";
GRANT REFERENCES ON TABLE public.battle_runs TO "service_role";
GRANT TRIGGER ON TABLE public.battle_runs TO "service_role";
GRANT MAINTAIN ON TABLE public.battle_runs TO "service_role";
ALTER TABLE public.pve_research_stats OWNER TO "postgres";
REVOKE ALL ON TABLE public.pve_research_stats FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pve_research_stats TO "postgres";
GRANT SELECT ON TABLE public.pve_research_stats TO "postgres";
GRANT UPDATE ON TABLE public.pve_research_stats TO "postgres";
GRANT DELETE ON TABLE public.pve_research_stats TO "postgres";
GRANT TRUNCATE ON TABLE public.pve_research_stats TO "postgres";
GRANT REFERENCES ON TABLE public.pve_research_stats TO "postgres";
GRANT TRIGGER ON TABLE public.pve_research_stats TO "postgres";
GRANT MAINTAIN ON TABLE public.pve_research_stats TO "postgres";
GRANT INSERT ON TABLE public.pve_research_stats TO "anon";
GRANT SELECT ON TABLE public.pve_research_stats TO "anon";
GRANT UPDATE ON TABLE public.pve_research_stats TO "anon";
GRANT DELETE ON TABLE public.pve_research_stats TO "anon";
GRANT TRUNCATE ON TABLE public.pve_research_stats TO "anon";
GRANT REFERENCES ON TABLE public.pve_research_stats TO "anon";
GRANT TRIGGER ON TABLE public.pve_research_stats TO "anon";
GRANT MAINTAIN ON TABLE public.pve_research_stats TO "anon";
GRANT INSERT ON TABLE public.pve_research_stats TO "authenticated";
GRANT SELECT ON TABLE public.pve_research_stats TO "authenticated";
GRANT UPDATE ON TABLE public.pve_research_stats TO "authenticated";
GRANT DELETE ON TABLE public.pve_research_stats TO "authenticated";
GRANT TRUNCATE ON TABLE public.pve_research_stats TO "authenticated";
GRANT REFERENCES ON TABLE public.pve_research_stats TO "authenticated";
GRANT TRIGGER ON TABLE public.pve_research_stats TO "authenticated";
GRANT MAINTAIN ON TABLE public.pve_research_stats TO "authenticated";
GRANT INSERT ON TABLE public.pve_research_stats TO "service_role";
GRANT SELECT ON TABLE public.pve_research_stats TO "service_role";
GRANT UPDATE ON TABLE public.pve_research_stats TO "service_role";
GRANT DELETE ON TABLE public.pve_research_stats TO "service_role";
GRANT TRUNCATE ON TABLE public.pve_research_stats TO "service_role";
GRANT REFERENCES ON TABLE public.pve_research_stats TO "service_role";
GRANT TRIGGER ON TABLE public.pve_research_stats TO "service_role";
GRANT MAINTAIN ON TABLE public.pve_research_stats TO "service_role";
ALTER TABLE public.pet_mutations OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_mutations FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_mutations TO "postgres";
GRANT SELECT ON TABLE public.pet_mutations TO "postgres";
GRANT UPDATE ON TABLE public.pet_mutations TO "postgres";
GRANT DELETE ON TABLE public.pet_mutations TO "postgres";
GRANT TRUNCATE ON TABLE public.pet_mutations TO "postgres";
GRANT REFERENCES ON TABLE public.pet_mutations TO "postgres";
GRANT TRIGGER ON TABLE public.pet_mutations TO "postgres";
GRANT MAINTAIN ON TABLE public.pet_mutations TO "postgres";
GRANT SELECT ON TABLE public.pet_mutations TO "anon";
GRANT MAINTAIN ON TABLE public.pet_mutations TO "anon";
GRANT SELECT ON TABLE public.pet_mutations TO "authenticated";
GRANT MAINTAIN ON TABLE public.pet_mutations TO "authenticated";
GRANT INSERT ON TABLE public.pet_mutations TO "service_role";
GRANT SELECT ON TABLE public.pet_mutations TO "service_role";
GRANT UPDATE ON TABLE public.pet_mutations TO "service_role";
GRANT DELETE ON TABLE public.pet_mutations TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_mutations TO "service_role";
GRANT REFERENCES ON TABLE public.pet_mutations TO "service_role";
GRANT TRIGGER ON TABLE public.pet_mutations TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_mutations TO "service_role";
ALTER TABLE public.pet_skills OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_skills FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_skills TO "postgres";
GRANT SELECT ON TABLE public.pet_skills TO "postgres";
GRANT UPDATE ON TABLE public.pet_skills TO "postgres";
GRANT DELETE ON TABLE public.pet_skills TO "postgres";
GRANT TRUNCATE ON TABLE public.pet_skills TO "postgres";
GRANT REFERENCES ON TABLE public.pet_skills TO "postgres";
GRANT TRIGGER ON TABLE public.pet_skills TO "postgres";
GRANT MAINTAIN ON TABLE public.pet_skills TO "postgres";
GRANT SELECT ON TABLE public.pet_skills TO "anon";
GRANT MAINTAIN ON TABLE public.pet_skills TO "anon";
GRANT SELECT ON TABLE public.pet_skills TO "authenticated";
GRANT MAINTAIN ON TABLE public.pet_skills TO "authenticated";
GRANT INSERT ON TABLE public.pet_skills TO "service_role";
GRANT SELECT ON TABLE public.pet_skills TO "service_role";
GRANT UPDATE ON TABLE public.pet_skills TO "service_role";
GRANT DELETE ON TABLE public.pet_skills TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_skills TO "service_role";
GRANT REFERENCES ON TABLE public.pet_skills TO "service_role";
GRANT TRIGGER ON TABLE public.pet_skills TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_skills TO "service_role";
ALTER TABLE public.player_quests OWNER TO "postgres";
REVOKE ALL ON TABLE public.player_quests FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.player_quests TO "postgres";
GRANT SELECT ON TABLE public.player_quests TO "postgres";
GRANT UPDATE ON TABLE public.player_quests TO "postgres";
GRANT DELETE ON TABLE public.player_quests TO "postgres";
GRANT TRUNCATE ON TABLE public.player_quests TO "postgres";
GRANT REFERENCES ON TABLE public.player_quests TO "postgres";
GRANT TRIGGER ON TABLE public.player_quests TO "postgres";
GRANT MAINTAIN ON TABLE public.player_quests TO "postgres";
GRANT SELECT ON TABLE public.player_quests TO "anon";
GRANT TRUNCATE ON TABLE public.player_quests TO "anon";
GRANT REFERENCES ON TABLE public.player_quests TO "anon";
GRANT TRIGGER ON TABLE public.player_quests TO "anon";
GRANT MAINTAIN ON TABLE public.player_quests TO "anon";
GRANT SELECT ON TABLE public.player_quests TO "authenticated";
GRANT TRUNCATE ON TABLE public.player_quests TO "authenticated";
GRANT REFERENCES ON TABLE public.player_quests TO "authenticated";
GRANT TRIGGER ON TABLE public.player_quests TO "authenticated";
GRANT MAINTAIN ON TABLE public.player_quests TO "authenticated";
GRANT INSERT ON TABLE public.player_quests TO "service_role";
GRANT SELECT ON TABLE public.player_quests TO "service_role";
GRANT UPDATE ON TABLE public.player_quests TO "service_role";
GRANT DELETE ON TABLE public.player_quests TO "service_role";
GRANT TRUNCATE ON TABLE public.player_quests TO "service_role";
GRANT REFERENCES ON TABLE public.player_quests TO "service_role";
GRANT TRIGGER ON TABLE public.player_quests TO "service_role";
GRANT MAINTAIN ON TABLE public.player_quests TO "service_role";
ALTER TABLE public.pve_instability_runs OWNER TO "postgres";
REVOKE ALL ON TABLE public.pve_instability_runs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pve_instability_runs TO "postgres";
GRANT SELECT ON TABLE public.pve_instability_runs TO "postgres";
GRANT UPDATE ON TABLE public.pve_instability_runs TO "postgres";
GRANT DELETE ON TABLE public.pve_instability_runs TO "postgres";
GRANT TRUNCATE ON TABLE public.pve_instability_runs TO "postgres";
GRANT REFERENCES ON TABLE public.pve_instability_runs TO "postgres";
GRANT TRIGGER ON TABLE public.pve_instability_runs TO "postgres";
GRANT MAINTAIN ON TABLE public.pve_instability_runs TO "postgres";
GRANT INSERT ON TABLE public.pve_instability_runs TO "anon";
GRANT SELECT ON TABLE public.pve_instability_runs TO "anon";
GRANT UPDATE ON TABLE public.pve_instability_runs TO "anon";
GRANT DELETE ON TABLE public.pve_instability_runs TO "anon";
GRANT TRUNCATE ON TABLE public.pve_instability_runs TO "anon";
GRANT REFERENCES ON TABLE public.pve_instability_runs TO "anon";
GRANT TRIGGER ON TABLE public.pve_instability_runs TO "anon";
GRANT MAINTAIN ON TABLE public.pve_instability_runs TO "anon";
GRANT INSERT ON TABLE public.pve_instability_runs TO "authenticated";
GRANT SELECT ON TABLE public.pve_instability_runs TO "authenticated";
GRANT UPDATE ON TABLE public.pve_instability_runs TO "authenticated";
GRANT DELETE ON TABLE public.pve_instability_runs TO "authenticated";
GRANT TRUNCATE ON TABLE public.pve_instability_runs TO "authenticated";
GRANT REFERENCES ON TABLE public.pve_instability_runs TO "authenticated";
GRANT TRIGGER ON TABLE public.pve_instability_runs TO "authenticated";
GRANT MAINTAIN ON TABLE public.pve_instability_runs TO "authenticated";
GRANT INSERT ON TABLE public.pve_instability_runs TO "service_role";
GRANT SELECT ON TABLE public.pve_instability_runs TO "service_role";
GRANT UPDATE ON TABLE public.pve_instability_runs TO "service_role";
GRANT DELETE ON TABLE public.pve_instability_runs TO "service_role";
GRANT TRUNCATE ON TABLE public.pve_instability_runs TO "service_role";
GRANT REFERENCES ON TABLE public.pve_instability_runs TO "service_role";
GRANT TRIGGER ON TABLE public.pve_instability_runs TO "service_role";
GRANT MAINTAIN ON TABLE public.pve_instability_runs TO "service_role";
ALTER TABLE public.pet_element_affinities OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_element_affinities FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_element_affinities TO "postgres";
GRANT SELECT ON TABLE public.pet_element_affinities TO "postgres";
GRANT UPDATE ON TABLE public.pet_element_affinities TO "postgres";
GRANT DELETE ON TABLE public.pet_element_affinities TO "postgres";
GRANT TRUNCATE ON TABLE public.pet_element_affinities TO "postgres";
GRANT REFERENCES ON TABLE public.pet_element_affinities TO "postgres";
GRANT TRIGGER ON TABLE public.pet_element_affinities TO "postgres";
GRANT MAINTAIN ON TABLE public.pet_element_affinities TO "postgres";
GRANT INSERT ON TABLE public.pet_element_affinities TO "anon";
GRANT SELECT ON TABLE public.pet_element_affinities TO "anon";
GRANT UPDATE ON TABLE public.pet_element_affinities TO "anon";
GRANT DELETE ON TABLE public.pet_element_affinities TO "anon";
GRANT TRUNCATE ON TABLE public.pet_element_affinities TO "anon";
GRANT REFERENCES ON TABLE public.pet_element_affinities TO "anon";
GRANT TRIGGER ON TABLE public.pet_element_affinities TO "anon";
GRANT MAINTAIN ON TABLE public.pet_element_affinities TO "anon";
GRANT INSERT ON TABLE public.pet_element_affinities TO "authenticated";
GRANT SELECT ON TABLE public.pet_element_affinities TO "authenticated";
GRANT UPDATE ON TABLE public.pet_element_affinities TO "authenticated";
GRANT DELETE ON TABLE public.pet_element_affinities TO "authenticated";
GRANT TRUNCATE ON TABLE public.pet_element_affinities TO "authenticated";
GRANT REFERENCES ON TABLE public.pet_element_affinities TO "authenticated";
GRANT TRIGGER ON TABLE public.pet_element_affinities TO "authenticated";
GRANT MAINTAIN ON TABLE public.pet_element_affinities TO "authenticated";
GRANT INSERT ON TABLE public.pet_element_affinities TO "service_role";
GRANT SELECT ON TABLE public.pet_element_affinities TO "service_role";
GRANT UPDATE ON TABLE public.pet_element_affinities TO "service_role";
GRANT DELETE ON TABLE public.pet_element_affinities TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_element_affinities TO "service_role";
GRANT REFERENCES ON TABLE public.pet_element_affinities TO "service_role";
GRANT TRIGGER ON TABLE public.pet_element_affinities TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_element_affinities TO "service_role";
ALTER TABLE public.rune_defs OWNER TO "postgres";
REVOKE ALL ON TABLE public.rune_defs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.rune_defs TO "postgres";
GRANT SELECT ON TABLE public.rune_defs TO "postgres";
GRANT UPDATE ON TABLE public.rune_defs TO "postgres";
GRANT DELETE ON TABLE public.rune_defs TO "postgres";
GRANT TRUNCATE ON TABLE public.rune_defs TO "postgres";
GRANT REFERENCES ON TABLE public.rune_defs TO "postgres";
GRANT TRIGGER ON TABLE public.rune_defs TO "postgres";
GRANT MAINTAIN ON TABLE public.rune_defs TO "postgres";
GRANT INSERT ON TABLE public.rune_defs TO "anon";
GRANT SELECT ON TABLE public.rune_defs TO "anon";
GRANT UPDATE ON TABLE public.rune_defs TO "anon";
GRANT DELETE ON TABLE public.rune_defs TO "anon";
GRANT TRUNCATE ON TABLE public.rune_defs TO "anon";
GRANT REFERENCES ON TABLE public.rune_defs TO "anon";
GRANT TRIGGER ON TABLE public.rune_defs TO "anon";
GRANT MAINTAIN ON TABLE public.rune_defs TO "anon";
GRANT INSERT ON TABLE public.rune_defs TO "authenticated";
GRANT SELECT ON TABLE public.rune_defs TO "authenticated";
GRANT UPDATE ON TABLE public.rune_defs TO "authenticated";
GRANT DELETE ON TABLE public.rune_defs TO "authenticated";
GRANT TRUNCATE ON TABLE public.rune_defs TO "authenticated";
GRANT REFERENCES ON TABLE public.rune_defs TO "authenticated";
GRANT TRIGGER ON TABLE public.rune_defs TO "authenticated";
GRANT MAINTAIN ON TABLE public.rune_defs TO "authenticated";
GRANT INSERT ON TABLE public.rune_defs TO "service_role";
GRANT SELECT ON TABLE public.rune_defs TO "service_role";
GRANT UPDATE ON TABLE public.rune_defs TO "service_role";
GRANT DELETE ON TABLE public.rune_defs TO "service_role";
GRANT TRUNCATE ON TABLE public.rune_defs TO "service_role";
GRANT REFERENCES ON TABLE public.rune_defs TO "service_role";
GRANT TRIGGER ON TABLE public.rune_defs TO "service_role";
GRANT MAINTAIN ON TABLE public.rune_defs TO "service_role";
ALTER TABLE public.pet_awards OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_awards FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_awards TO "postgres";
GRANT SELECT ON TABLE public.pet_awards TO "postgres";
GRANT UPDATE ON TABLE public.pet_awards TO "postgres";
GRANT DELETE ON TABLE public.pet_awards TO "postgres";
GRANT TRUNCATE ON TABLE public.pet_awards TO "postgres";
GRANT REFERENCES ON TABLE public.pet_awards TO "postgres";
GRANT TRIGGER ON TABLE public.pet_awards TO "postgres";
GRANT MAINTAIN ON TABLE public.pet_awards TO "postgres";
GRANT INSERT ON TABLE public.pet_awards TO "anon";
GRANT SELECT ON TABLE public.pet_awards TO "anon";
GRANT UPDATE ON TABLE public.pet_awards TO "anon";
GRANT DELETE ON TABLE public.pet_awards TO "anon";
GRANT TRUNCATE ON TABLE public.pet_awards TO "anon";
GRANT REFERENCES ON TABLE public.pet_awards TO "anon";
GRANT TRIGGER ON TABLE public.pet_awards TO "anon";
GRANT MAINTAIN ON TABLE public.pet_awards TO "anon";
GRANT INSERT ON TABLE public.pet_awards TO "authenticated";
GRANT SELECT ON TABLE public.pet_awards TO "authenticated";
GRANT UPDATE ON TABLE public.pet_awards TO "authenticated";
GRANT DELETE ON TABLE public.pet_awards TO "authenticated";
GRANT TRUNCATE ON TABLE public.pet_awards TO "authenticated";
GRANT REFERENCES ON TABLE public.pet_awards TO "authenticated";
GRANT TRIGGER ON TABLE public.pet_awards TO "authenticated";
GRANT MAINTAIN ON TABLE public.pet_awards TO "authenticated";
GRANT INSERT ON TABLE public.pet_awards TO "service_role";
GRANT SELECT ON TABLE public.pet_awards TO "service_role";
GRANT UPDATE ON TABLE public.pet_awards TO "service_role";
GRANT DELETE ON TABLE public.pet_awards TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_awards TO "service_role";
GRANT REFERENCES ON TABLE public.pet_awards TO "service_role";
GRANT TRIGGER ON TABLE public.pet_awards TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_awards TO "service_role";
ALTER TABLE public.signup_trigger_errors OWNER TO "postgres";
REVOKE ALL ON TABLE public.signup_trigger_errors FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.signup_trigger_errors TO "postgres";
GRANT SELECT ON TABLE public.signup_trigger_errors TO "postgres";
GRANT UPDATE ON TABLE public.signup_trigger_errors TO "postgres";
GRANT DELETE ON TABLE public.signup_trigger_errors TO "postgres";
GRANT TRUNCATE ON TABLE public.signup_trigger_errors TO "postgres";
GRANT REFERENCES ON TABLE public.signup_trigger_errors TO "postgres";
GRANT TRIGGER ON TABLE public.signup_trigger_errors TO "postgres";
GRANT MAINTAIN ON TABLE public.signup_trigger_errors TO "postgres";
GRANT INSERT ON TABLE public.signup_trigger_errors TO "anon";
GRANT SELECT ON TABLE public.signup_trigger_errors TO "anon";
GRANT UPDATE ON TABLE public.signup_trigger_errors TO "anon";
GRANT DELETE ON TABLE public.signup_trigger_errors TO "anon";
GRANT TRUNCATE ON TABLE public.signup_trigger_errors TO "anon";
GRANT REFERENCES ON TABLE public.signup_trigger_errors TO "anon";
GRANT TRIGGER ON TABLE public.signup_trigger_errors TO "anon";
GRANT MAINTAIN ON TABLE public.signup_trigger_errors TO "anon";
GRANT INSERT ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT SELECT ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT UPDATE ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT DELETE ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT TRUNCATE ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT REFERENCES ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT TRIGGER ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT MAINTAIN ON TABLE public.signup_trigger_errors TO "authenticated";
GRANT INSERT ON TABLE public.signup_trigger_errors TO "service_role";
GRANT SELECT ON TABLE public.signup_trigger_errors TO "service_role";
GRANT UPDATE ON TABLE public.signup_trigger_errors TO "service_role";
GRANT DELETE ON TABLE public.signup_trigger_errors TO "service_role";
GRANT TRUNCATE ON TABLE public.signup_trigger_errors TO "service_role";
GRANT REFERENCES ON TABLE public.signup_trigger_errors TO "service_role";
GRANT TRIGGER ON TABLE public.signup_trigger_errors TO "service_role";
GRANT MAINTAIN ON TABLE public.signup_trigger_errors TO "service_role";
ALTER TABLE public.party_slots OWNER TO "postgres";
REVOKE ALL ON TABLE public.party_slots FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.party_slots TO "postgres";
GRANT SELECT ON TABLE public.party_slots TO "postgres";
GRANT UPDATE ON TABLE public.party_slots TO "postgres";
GRANT DELETE ON TABLE public.party_slots TO "postgres";
GRANT TRUNCATE ON TABLE public.party_slots TO "postgres";
GRANT REFERENCES ON TABLE public.party_slots TO "postgres";
GRANT TRIGGER ON TABLE public.party_slots TO "postgres";
GRANT MAINTAIN ON TABLE public.party_slots TO "postgres";
GRANT SELECT ON TABLE public.party_slots TO "anon";
GRANT MAINTAIN ON TABLE public.party_slots TO "anon";
GRANT SELECT ON TABLE public.party_slots TO "authenticated";
GRANT MAINTAIN ON TABLE public.party_slots TO "authenticated";
GRANT INSERT ON TABLE public.party_slots TO "service_role";
GRANT SELECT ON TABLE public.party_slots TO "service_role";
GRANT UPDATE ON TABLE public.party_slots TO "service_role";
GRANT DELETE ON TABLE public.party_slots TO "service_role";
GRANT TRUNCATE ON TABLE public.party_slots TO "service_role";
GRANT REFERENCES ON TABLE public.party_slots TO "service_role";
GRANT TRIGGER ON TABLE public.party_slots TO "service_role";
GRANT MAINTAIN ON TABLE public.party_slots TO "service_role";
ALTER TABLE public.passive_traits OWNER TO "postgres";
REVOKE ALL ON TABLE public.passive_traits FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.passive_traits TO "postgres";
GRANT SELECT ON TABLE public.passive_traits TO "postgres";
GRANT UPDATE ON TABLE public.passive_traits TO "postgres";
GRANT DELETE ON TABLE public.passive_traits TO "postgres";
GRANT TRUNCATE ON TABLE public.passive_traits TO "postgres";
GRANT REFERENCES ON TABLE public.passive_traits TO "postgres";
GRANT TRIGGER ON TABLE public.passive_traits TO "postgres";
GRANT MAINTAIN ON TABLE public.passive_traits TO "postgres";
GRANT INSERT ON TABLE public.passive_traits TO "anon";
GRANT SELECT ON TABLE public.passive_traits TO "anon";
GRANT UPDATE ON TABLE public.passive_traits TO "anon";
GRANT DELETE ON TABLE public.passive_traits TO "anon";
GRANT TRUNCATE ON TABLE public.passive_traits TO "anon";
GRANT REFERENCES ON TABLE public.passive_traits TO "anon";
GRANT TRIGGER ON TABLE public.passive_traits TO "anon";
GRANT MAINTAIN ON TABLE public.passive_traits TO "anon";
GRANT INSERT ON TABLE public.passive_traits TO "authenticated";
GRANT SELECT ON TABLE public.passive_traits TO "authenticated";
GRANT UPDATE ON TABLE public.passive_traits TO "authenticated";
GRANT DELETE ON TABLE public.passive_traits TO "authenticated";
GRANT TRUNCATE ON TABLE public.passive_traits TO "authenticated";
GRANT REFERENCES ON TABLE public.passive_traits TO "authenticated";
GRANT TRIGGER ON TABLE public.passive_traits TO "authenticated";
GRANT MAINTAIN ON TABLE public.passive_traits TO "authenticated";
GRANT INSERT ON TABLE public.passive_traits TO "service_role";
GRANT SELECT ON TABLE public.passive_traits TO "service_role";
GRANT UPDATE ON TABLE public.passive_traits TO "service_role";
GRANT DELETE ON TABLE public.passive_traits TO "service_role";
GRANT TRUNCATE ON TABLE public.passive_traits TO "service_role";
GRANT REFERENCES ON TABLE public.passive_traits TO "service_role";
GRANT TRIGGER ON TABLE public.passive_traits TO "service_role";
GRANT MAINTAIN ON TABLE public.passive_traits TO "service_role";
ALTER TABLE public.wallet_ledger OWNER TO "postgres";
REVOKE ALL ON TABLE public.wallet_ledger FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.wallet_ledger TO "postgres";
GRANT SELECT ON TABLE public.wallet_ledger TO "postgres";
GRANT UPDATE ON TABLE public.wallet_ledger TO "postgres";
GRANT DELETE ON TABLE public.wallet_ledger TO "postgres";
GRANT TRUNCATE ON TABLE public.wallet_ledger TO "postgres";
GRANT REFERENCES ON TABLE public.wallet_ledger TO "postgres";
GRANT TRIGGER ON TABLE public.wallet_ledger TO "postgres";
GRANT MAINTAIN ON TABLE public.wallet_ledger TO "postgres";
GRANT SELECT ON TABLE public.wallet_ledger TO "anon";
GRANT MAINTAIN ON TABLE public.wallet_ledger TO "anon";
GRANT SELECT ON TABLE public.wallet_ledger TO "authenticated";
GRANT MAINTAIN ON TABLE public.wallet_ledger TO "authenticated";
GRANT INSERT ON TABLE public.wallet_ledger TO "service_role";
GRANT SELECT ON TABLE public.wallet_ledger TO "service_role";
GRANT UPDATE ON TABLE public.wallet_ledger TO "service_role";
GRANT DELETE ON TABLE public.wallet_ledger TO "service_role";
GRANT TRUNCATE ON TABLE public.wallet_ledger TO "service_role";
GRANT REFERENCES ON TABLE public.wallet_ledger TO "service_role";
GRANT TRIGGER ON TABLE public.wallet_ledger TO "service_role";
GRANT MAINTAIN ON TABLE public.wallet_ledger TO "service_role";
ALTER TABLE public.user_runes OWNER TO "postgres";
REVOKE ALL ON TABLE public.user_runes FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.user_runes TO "postgres";
GRANT SELECT ON TABLE public.user_runes TO "postgres";
GRANT UPDATE ON TABLE public.user_runes TO "postgres";
GRANT DELETE ON TABLE public.user_runes TO "postgres";
GRANT TRUNCATE ON TABLE public.user_runes TO "postgres";
GRANT REFERENCES ON TABLE public.user_runes TO "postgres";
GRANT TRIGGER ON TABLE public.user_runes TO "postgres";
GRANT MAINTAIN ON TABLE public.user_runes TO "postgres";
GRANT INSERT ON TABLE public.user_runes TO "anon";
GRANT SELECT ON TABLE public.user_runes TO "anon";
GRANT UPDATE ON TABLE public.user_runes TO "anon";
GRANT DELETE ON TABLE public.user_runes TO "anon";
GRANT TRUNCATE ON TABLE public.user_runes TO "anon";
GRANT REFERENCES ON TABLE public.user_runes TO "anon";
GRANT TRIGGER ON TABLE public.user_runes TO "anon";
GRANT MAINTAIN ON TABLE public.user_runes TO "anon";
GRANT INSERT ON TABLE public.user_runes TO "authenticated";
GRANT SELECT ON TABLE public.user_runes TO "authenticated";
GRANT UPDATE ON TABLE public.user_runes TO "authenticated";
GRANT DELETE ON TABLE public.user_runes TO "authenticated";
GRANT TRUNCATE ON TABLE public.user_runes TO "authenticated";
GRANT REFERENCES ON TABLE public.user_runes TO "authenticated";
GRANT TRIGGER ON TABLE public.user_runes TO "authenticated";
GRANT MAINTAIN ON TABLE public.user_runes TO "authenticated";
GRANT INSERT ON TABLE public.user_runes TO "service_role";
GRANT SELECT ON TABLE public.user_runes TO "service_role";
GRANT UPDATE ON TABLE public.user_runes TO "service_role";
GRANT DELETE ON TABLE public.user_runes TO "service_role";
GRANT TRUNCATE ON TABLE public.user_runes TO "service_role";
GRANT REFERENCES ON TABLE public.user_runes TO "service_role";
GRANT TRIGGER ON TABLE public.user_runes TO "service_role";
GRANT MAINTAIN ON TABLE public.user_runes TO "service_role";
ALTER TABLE public.v_pet_storage_stats OWNER TO "postgres";
REVOKE ALL ON TABLE public.v_pet_storage_stats FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT SELECT ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT UPDATE ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT DELETE ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT TRUNCATE ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT REFERENCES ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT TRIGGER ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT MAINTAIN ON TABLE public.v_pet_storage_stats TO "postgres";
GRANT INSERT ON TABLE public.v_pet_storage_stats TO "anon";
GRANT SELECT ON TABLE public.v_pet_storage_stats TO "anon";
GRANT UPDATE ON TABLE public.v_pet_storage_stats TO "anon";
GRANT DELETE ON TABLE public.v_pet_storage_stats TO "anon";
GRANT TRUNCATE ON TABLE public.v_pet_storage_stats TO "anon";
GRANT REFERENCES ON TABLE public.v_pet_storage_stats TO "anon";
GRANT TRIGGER ON TABLE public.v_pet_storage_stats TO "anon";
GRANT MAINTAIN ON TABLE public.v_pet_storage_stats TO "anon";
GRANT INSERT ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT SELECT ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT UPDATE ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT DELETE ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT TRUNCATE ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT REFERENCES ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT TRIGGER ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT MAINTAIN ON TABLE public.v_pet_storage_stats TO "authenticated";
GRANT INSERT ON TABLE public.v_pet_storage_stats TO "service_role";
GRANT SELECT ON TABLE public.v_pet_storage_stats TO "service_role";
GRANT UPDATE ON TABLE public.v_pet_storage_stats TO "service_role";
GRANT DELETE ON TABLE public.v_pet_storage_stats TO "service_role";
GRANT TRUNCATE ON TABLE public.v_pet_storage_stats TO "service_role";
GRANT REFERENCES ON TABLE public.v_pet_storage_stats TO "service_role";
GRANT TRIGGER ON TABLE public.v_pet_storage_stats TO "service_role";
GRANT MAINTAIN ON TABLE public.v_pet_storage_stats TO "service_role";
ALTER TABLE public.wildwood_rooms OWNER TO "postgres";
REVOKE ALL ON TABLE public.wildwood_rooms FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.wildwood_rooms TO "postgres";
GRANT SELECT ON TABLE public.wildwood_rooms TO "postgres";
GRANT UPDATE ON TABLE public.wildwood_rooms TO "postgres";
GRANT DELETE ON TABLE public.wildwood_rooms TO "postgres";
GRANT TRUNCATE ON TABLE public.wildwood_rooms TO "postgres";
GRANT REFERENCES ON TABLE public.wildwood_rooms TO "postgres";
GRANT TRIGGER ON TABLE public.wildwood_rooms TO "postgres";
GRANT MAINTAIN ON TABLE public.wildwood_rooms TO "postgres";
GRANT SELECT ON TABLE public.wildwood_rooms TO "anon";
GRANT TRUNCATE ON TABLE public.wildwood_rooms TO "anon";
GRANT REFERENCES ON TABLE public.wildwood_rooms TO "anon";
GRANT TRIGGER ON TABLE public.wildwood_rooms TO "anon";
GRANT MAINTAIN ON TABLE public.wildwood_rooms TO "anon";
GRANT SELECT ON TABLE public.wildwood_rooms TO "authenticated";
GRANT TRUNCATE ON TABLE public.wildwood_rooms TO "authenticated";
GRANT REFERENCES ON TABLE public.wildwood_rooms TO "authenticated";
GRANT TRIGGER ON TABLE public.wildwood_rooms TO "authenticated";
GRANT MAINTAIN ON TABLE public.wildwood_rooms TO "authenticated";
GRANT INSERT ON TABLE public.wildwood_rooms TO "service_role";
GRANT SELECT ON TABLE public.wildwood_rooms TO "service_role";
GRANT UPDATE ON TABLE public.wildwood_rooms TO "service_role";
GRANT DELETE ON TABLE public.wildwood_rooms TO "service_role";
GRANT TRUNCATE ON TABLE public.wildwood_rooms TO "service_role";
GRANT REFERENCES ON TABLE public.wildwood_rooms TO "service_role";
GRANT TRIGGER ON TABLE public.wildwood_rooms TO "service_role";
GRANT MAINTAIN ON TABLE public.wildwood_rooms TO "service_role";
ALTER TABLE public.skill_defs OWNER TO "postgres";
REVOKE ALL ON TABLE public.skill_defs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.skill_defs TO "postgres";
GRANT SELECT ON TABLE public.skill_defs TO "postgres";
GRANT UPDATE ON TABLE public.skill_defs TO "postgres";
GRANT DELETE ON TABLE public.skill_defs TO "postgres";
GRANT TRUNCATE ON TABLE public.skill_defs TO "postgres";
GRANT REFERENCES ON TABLE public.skill_defs TO "postgres";
GRANT TRIGGER ON TABLE public.skill_defs TO "postgres";
GRANT MAINTAIN ON TABLE public.skill_defs TO "postgres";
GRANT SELECT ON TABLE public.skill_defs TO "anon";
GRANT MAINTAIN ON TABLE public.skill_defs TO "anon";
GRANT SELECT ON TABLE public.skill_defs TO "authenticated";
GRANT MAINTAIN ON TABLE public.skill_defs TO "authenticated";
GRANT INSERT ON TABLE public.skill_defs TO "service_role";
GRANT SELECT ON TABLE public.skill_defs TO "service_role";
GRANT UPDATE ON TABLE public.skill_defs TO "service_role";
GRANT DELETE ON TABLE public.skill_defs TO "service_role";
GRANT TRUNCATE ON TABLE public.skill_defs TO "service_role";
GRANT REFERENCES ON TABLE public.skill_defs TO "service_role";
GRANT TRIGGER ON TABLE public.skill_defs TO "service_role";
GRANT MAINTAIN ON TABLE public.skill_defs TO "service_role";
ALTER TABLE public.wildwood_expeditions OWNER TO "postgres";
REVOKE ALL ON TABLE public.wildwood_expeditions FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.wildwood_expeditions TO "postgres";
GRANT SELECT ON TABLE public.wildwood_expeditions TO "postgres";
GRANT UPDATE ON TABLE public.wildwood_expeditions TO "postgres";
GRANT DELETE ON TABLE public.wildwood_expeditions TO "postgres";
GRANT TRUNCATE ON TABLE public.wildwood_expeditions TO "postgres";
GRANT REFERENCES ON TABLE public.wildwood_expeditions TO "postgres";
GRANT TRIGGER ON TABLE public.wildwood_expeditions TO "postgres";
GRANT MAINTAIN ON TABLE public.wildwood_expeditions TO "postgres";
GRANT SELECT ON TABLE public.wildwood_expeditions TO "anon";
GRANT TRUNCATE ON TABLE public.wildwood_expeditions TO "anon";
GRANT REFERENCES ON TABLE public.wildwood_expeditions TO "anon";
GRANT TRIGGER ON TABLE public.wildwood_expeditions TO "anon";
GRANT MAINTAIN ON TABLE public.wildwood_expeditions TO "anon";
GRANT SELECT ON TABLE public.wildwood_expeditions TO "authenticated";
GRANT TRUNCATE ON TABLE public.wildwood_expeditions TO "authenticated";
GRANT REFERENCES ON TABLE public.wildwood_expeditions TO "authenticated";
GRANT TRIGGER ON TABLE public.wildwood_expeditions TO "authenticated";
GRANT MAINTAIN ON TABLE public.wildwood_expeditions TO "authenticated";
GRANT INSERT ON TABLE public.wildwood_expeditions TO "service_role";
GRANT SELECT ON TABLE public.wildwood_expeditions TO "service_role";
GRANT UPDATE ON TABLE public.wildwood_expeditions TO "service_role";
GRANT DELETE ON TABLE public.wildwood_expeditions TO "service_role";
GRANT TRUNCATE ON TABLE public.wildwood_expeditions TO "service_role";
GRANT REFERENCES ON TABLE public.wildwood_expeditions TO "service_role";
GRANT TRIGGER ON TABLE public.wildwood_expeditions TO "service_role";
GRANT MAINTAIN ON TABLE public.wildwood_expeditions TO "service_role";
ALTER TABLE public.user_kith_discoveries OWNER TO "postgres";
REVOKE ALL ON TABLE public.user_kith_discoveries FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.user_kith_discoveries TO "postgres";
GRANT SELECT ON TABLE public.user_kith_discoveries TO "postgres";
GRANT UPDATE ON TABLE public.user_kith_discoveries TO "postgres";
GRANT DELETE ON TABLE public.user_kith_discoveries TO "postgres";
GRANT TRUNCATE ON TABLE public.user_kith_discoveries TO "postgres";
GRANT REFERENCES ON TABLE public.user_kith_discoveries TO "postgres";
GRANT TRIGGER ON TABLE public.user_kith_discoveries TO "postgres";
GRANT MAINTAIN ON TABLE public.user_kith_discoveries TO "postgres";
GRANT INSERT ON TABLE public.user_kith_discoveries TO "anon";
GRANT SELECT ON TABLE public.user_kith_discoveries TO "anon";
GRANT UPDATE ON TABLE public.user_kith_discoveries TO "anon";
GRANT DELETE ON TABLE public.user_kith_discoveries TO "anon";
GRANT TRUNCATE ON TABLE public.user_kith_discoveries TO "anon";
GRANT REFERENCES ON TABLE public.user_kith_discoveries TO "anon";
GRANT TRIGGER ON TABLE public.user_kith_discoveries TO "anon";
GRANT MAINTAIN ON TABLE public.user_kith_discoveries TO "anon";
GRANT SELECT ON TABLE public.user_kith_discoveries TO "authenticated";
GRANT TRUNCATE ON TABLE public.user_kith_discoveries TO "authenticated";
GRANT REFERENCES ON TABLE public.user_kith_discoveries TO "authenticated";
GRANT TRIGGER ON TABLE public.user_kith_discoveries TO "authenticated";
GRANT MAINTAIN ON TABLE public.user_kith_discoveries TO "authenticated";
GRANT INSERT ON TABLE public.user_kith_discoveries TO "service_role";
GRANT SELECT ON TABLE public.user_kith_discoveries TO "service_role";
GRANT UPDATE ON TABLE public.user_kith_discoveries TO "service_role";
GRANT DELETE ON TABLE public.user_kith_discoveries TO "service_role";
GRANT TRUNCATE ON TABLE public.user_kith_discoveries TO "service_role";
GRANT REFERENCES ON TABLE public.user_kith_discoveries TO "service_role";
GRANT TRIGGER ON TABLE public.user_kith_discoveries TO "service_role";
GRANT MAINTAIN ON TABLE public.user_kith_discoveries TO "service_role";
ALTER TABLE public.eggs OWNER TO "postgres";
REVOKE ALL ON TABLE public.eggs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.eggs TO "postgres";
GRANT SELECT ON TABLE public.eggs TO "postgres";
GRANT UPDATE ON TABLE public.eggs TO "postgres";
GRANT DELETE ON TABLE public.eggs TO "postgres";
GRANT TRUNCATE ON TABLE public.eggs TO "postgres";
GRANT REFERENCES ON TABLE public.eggs TO "postgres";
GRANT TRIGGER ON TABLE public.eggs TO "postgres";
GRANT MAINTAIN ON TABLE public.eggs TO "postgres";
GRANT INSERT ON TABLE public.eggs TO "anon";
GRANT SELECT ON TABLE public.eggs TO "anon";
GRANT UPDATE ON TABLE public.eggs TO "anon";
GRANT DELETE ON TABLE public.eggs TO "anon";
GRANT TRUNCATE ON TABLE public.eggs TO "anon";
GRANT REFERENCES ON TABLE public.eggs TO "anon";
GRANT TRIGGER ON TABLE public.eggs TO "anon";
GRANT MAINTAIN ON TABLE public.eggs TO "anon";
GRANT INSERT ON TABLE public.eggs TO "authenticated";
GRANT SELECT ON TABLE public.eggs TO "authenticated";
GRANT UPDATE ON TABLE public.eggs TO "authenticated";
GRANT DELETE ON TABLE public.eggs TO "authenticated";
GRANT TRUNCATE ON TABLE public.eggs TO "authenticated";
GRANT REFERENCES ON TABLE public.eggs TO "authenticated";
GRANT TRIGGER ON TABLE public.eggs TO "authenticated";
GRANT MAINTAIN ON TABLE public.eggs TO "authenticated";
GRANT INSERT ON TABLE public.eggs TO "service_role";
GRANT SELECT ON TABLE public.eggs TO "service_role";
GRANT UPDATE ON TABLE public.eggs TO "service_role";
GRANT DELETE ON TABLE public.eggs TO "service_role";
GRANT TRUNCATE ON TABLE public.eggs TO "service_role";
GRANT REFERENCES ON TABLE public.eggs TO "service_role";
GRANT TRIGGER ON TABLE public.eggs TO "service_role";
GRANT MAINTAIN ON TABLE public.eggs TO "service_role";
ALTER TABLE public.pve_instabilities OWNER TO "postgres";
REVOKE ALL ON TABLE public.pve_instabilities FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pve_instabilities TO "postgres";
GRANT SELECT ON TABLE public.pve_instabilities TO "postgres";
GRANT UPDATE ON TABLE public.pve_instabilities TO "postgres";
GRANT DELETE ON TABLE public.pve_instabilities TO "postgres";
GRANT TRUNCATE ON TABLE public.pve_instabilities TO "postgres";
GRANT REFERENCES ON TABLE public.pve_instabilities TO "postgres";
GRANT TRIGGER ON TABLE public.pve_instabilities TO "postgres";
GRANT MAINTAIN ON TABLE public.pve_instabilities TO "postgres";
GRANT INSERT ON TABLE public.pve_instabilities TO "anon";
GRANT SELECT ON TABLE public.pve_instabilities TO "anon";
GRANT UPDATE ON TABLE public.pve_instabilities TO "anon";
GRANT DELETE ON TABLE public.pve_instabilities TO "anon";
GRANT TRUNCATE ON TABLE public.pve_instabilities TO "anon";
GRANT REFERENCES ON TABLE public.pve_instabilities TO "anon";
GRANT TRIGGER ON TABLE public.pve_instabilities TO "anon";
GRANT MAINTAIN ON TABLE public.pve_instabilities TO "anon";
GRANT INSERT ON TABLE public.pve_instabilities TO "authenticated";
GRANT SELECT ON TABLE public.pve_instabilities TO "authenticated";
GRANT UPDATE ON TABLE public.pve_instabilities TO "authenticated";
GRANT DELETE ON TABLE public.pve_instabilities TO "authenticated";
GRANT TRUNCATE ON TABLE public.pve_instabilities TO "authenticated";
GRANT REFERENCES ON TABLE public.pve_instabilities TO "authenticated";
GRANT TRIGGER ON TABLE public.pve_instabilities TO "authenticated";
GRANT MAINTAIN ON TABLE public.pve_instabilities TO "authenticated";
GRANT INSERT ON TABLE public.pve_instabilities TO "service_role";
GRANT SELECT ON TABLE public.pve_instabilities TO "service_role";
GRANT UPDATE ON TABLE public.pve_instabilities TO "service_role";
GRANT DELETE ON TABLE public.pve_instabilities TO "service_role";
GRANT TRUNCATE ON TABLE public.pve_instabilities TO "service_role";
GRANT REFERENCES ON TABLE public.pve_instabilities TO "service_role";
GRANT TRIGGER ON TABLE public.pve_instabilities TO "service_role";
GRANT MAINTAIN ON TABLE public.pve_instabilities TO "service_role";
ALTER TABLE public.game_config OWNER TO "postgres";
REVOKE ALL ON TABLE public.game_config FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.game_config TO "postgres";
GRANT SELECT ON TABLE public.game_config TO "postgres";
GRANT UPDATE ON TABLE public.game_config TO "postgres";
GRANT DELETE ON TABLE public.game_config TO "postgres";
GRANT TRUNCATE ON TABLE public.game_config TO "postgres";
GRANT REFERENCES ON TABLE public.game_config TO "postgres";
GRANT TRIGGER ON TABLE public.game_config TO "postgres";
GRANT MAINTAIN ON TABLE public.game_config TO "postgres";
GRANT INSERT ON TABLE public.game_config TO "anon";
GRANT SELECT ON TABLE public.game_config TO "anon";
GRANT UPDATE ON TABLE public.game_config TO "anon";
GRANT DELETE ON TABLE public.game_config TO "anon";
GRANT TRUNCATE ON TABLE public.game_config TO "anon";
GRANT REFERENCES ON TABLE public.game_config TO "anon";
GRANT TRIGGER ON TABLE public.game_config TO "anon";
GRANT MAINTAIN ON TABLE public.game_config TO "anon";
GRANT INSERT ON TABLE public.game_config TO "authenticated";
GRANT SELECT ON TABLE public.game_config TO "authenticated";
GRANT UPDATE ON TABLE public.game_config TO "authenticated";
GRANT DELETE ON TABLE public.game_config TO "authenticated";
GRANT TRUNCATE ON TABLE public.game_config TO "authenticated";
GRANT REFERENCES ON TABLE public.game_config TO "authenticated";
GRANT TRIGGER ON TABLE public.game_config TO "authenticated";
GRANT MAINTAIN ON TABLE public.game_config TO "authenticated";
GRANT INSERT ON TABLE public.game_config TO "service_role";
GRANT SELECT ON TABLE public.game_config TO "service_role";
GRANT UPDATE ON TABLE public.game_config TO "service_role";
GRANT DELETE ON TABLE public.game_config TO "service_role";
GRANT TRUNCATE ON TABLE public.game_config TO "service_role";
GRANT REFERENCES ON TABLE public.game_config TO "service_role";
GRANT TRIGGER ON TABLE public.game_config TO "service_role";
GRANT MAINTAIN ON TABLE public.game_config TO "service_role";
ALTER TABLE public.inventory OWNER TO "postgres";
REVOKE ALL ON TABLE public.inventory FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.inventory TO "postgres";
GRANT SELECT ON TABLE public.inventory TO "postgres";
GRANT UPDATE ON TABLE public.inventory TO "postgres";
GRANT DELETE ON TABLE public.inventory TO "postgres";
GRANT TRUNCATE ON TABLE public.inventory TO "postgres";
GRANT REFERENCES ON TABLE public.inventory TO "postgres";
GRANT TRIGGER ON TABLE public.inventory TO "postgres";
GRANT MAINTAIN ON TABLE public.inventory TO "postgres";
GRANT SELECT ON TABLE public.inventory TO "anon";
GRANT MAINTAIN ON TABLE public.inventory TO "anon";
GRANT SELECT ON TABLE public.inventory TO "authenticated";
GRANT MAINTAIN ON TABLE public.inventory TO "authenticated";
GRANT INSERT ON TABLE public.inventory TO "service_role";
GRANT SELECT ON TABLE public.inventory TO "service_role";
GRANT UPDATE ON TABLE public.inventory TO "service_role";
GRANT DELETE ON TABLE public.inventory TO "service_role";
GRANT TRUNCATE ON TABLE public.inventory TO "service_role";
GRANT REFERENCES ON TABLE public.inventory TO "service_role";
GRANT TRIGGER ON TABLE public.inventory TO "service_role";
GRANT MAINTAIN ON TABLE public.inventory TO "service_role";
ALTER TABLE public.alpha_systems OWNER TO "postgres";
REVOKE ALL ON TABLE public.alpha_systems FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.alpha_systems TO "postgres";
GRANT SELECT ON TABLE public.alpha_systems TO "postgres";
GRANT UPDATE ON TABLE public.alpha_systems TO "postgres";
GRANT DELETE ON TABLE public.alpha_systems TO "postgres";
GRANT TRUNCATE ON TABLE public.alpha_systems TO "postgres";
GRANT REFERENCES ON TABLE public.alpha_systems TO "postgres";
GRANT TRIGGER ON TABLE public.alpha_systems TO "postgres";
GRANT MAINTAIN ON TABLE public.alpha_systems TO "postgres";
GRANT INSERT ON TABLE public.alpha_systems TO "anon";
GRANT SELECT ON TABLE public.alpha_systems TO "anon";
GRANT UPDATE ON TABLE public.alpha_systems TO "anon";
GRANT DELETE ON TABLE public.alpha_systems TO "anon";
GRANT TRUNCATE ON TABLE public.alpha_systems TO "anon";
GRANT REFERENCES ON TABLE public.alpha_systems TO "anon";
GRANT TRIGGER ON TABLE public.alpha_systems TO "anon";
GRANT MAINTAIN ON TABLE public.alpha_systems TO "anon";
GRANT INSERT ON TABLE public.alpha_systems TO "authenticated";
GRANT SELECT ON TABLE public.alpha_systems TO "authenticated";
GRANT UPDATE ON TABLE public.alpha_systems TO "authenticated";
GRANT DELETE ON TABLE public.alpha_systems TO "authenticated";
GRANT TRUNCATE ON TABLE public.alpha_systems TO "authenticated";
GRANT REFERENCES ON TABLE public.alpha_systems TO "authenticated";
GRANT TRIGGER ON TABLE public.alpha_systems TO "authenticated";
GRANT MAINTAIN ON TABLE public.alpha_systems TO "authenticated";
GRANT INSERT ON TABLE public.alpha_systems TO "service_role";
GRANT SELECT ON TABLE public.alpha_systems TO "service_role";
GRANT UPDATE ON TABLE public.alpha_systems TO "service_role";
GRANT DELETE ON TABLE public.alpha_systems TO "service_role";
GRANT TRUNCATE ON TABLE public.alpha_systems TO "service_role";
GRANT REFERENCES ON TABLE public.alpha_systems TO "service_role";
GRANT TRIGGER ON TABLE public.alpha_systems TO "service_role";
GRANT MAINTAIN ON TABLE public.alpha_systems TO "service_role";
ALTER TABLE public.daily_care OWNER TO "postgres";
REVOKE ALL ON TABLE public.daily_care FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.daily_care TO "postgres";
GRANT SELECT ON TABLE public.daily_care TO "postgres";
GRANT UPDATE ON TABLE public.daily_care TO "postgres";
GRANT DELETE ON TABLE public.daily_care TO "postgres";
GRANT TRUNCATE ON TABLE public.daily_care TO "postgres";
GRANT REFERENCES ON TABLE public.daily_care TO "postgres";
GRANT TRIGGER ON TABLE public.daily_care TO "postgres";
GRANT MAINTAIN ON TABLE public.daily_care TO "postgres";
GRANT INSERT ON TABLE public.daily_care TO "anon";
GRANT SELECT ON TABLE public.daily_care TO "anon";
GRANT UPDATE ON TABLE public.daily_care TO "anon";
GRANT DELETE ON TABLE public.daily_care TO "anon";
GRANT TRUNCATE ON TABLE public.daily_care TO "anon";
GRANT REFERENCES ON TABLE public.daily_care TO "anon";
GRANT TRIGGER ON TABLE public.daily_care TO "anon";
GRANT MAINTAIN ON TABLE public.daily_care TO "anon";
GRANT INSERT ON TABLE public.daily_care TO "authenticated";
GRANT SELECT ON TABLE public.daily_care TO "authenticated";
GRANT UPDATE ON TABLE public.daily_care TO "authenticated";
GRANT DELETE ON TABLE public.daily_care TO "authenticated";
GRANT TRUNCATE ON TABLE public.daily_care TO "authenticated";
GRANT REFERENCES ON TABLE public.daily_care TO "authenticated";
GRANT TRIGGER ON TABLE public.daily_care TO "authenticated";
GRANT MAINTAIN ON TABLE public.daily_care TO "authenticated";
GRANT INSERT ON TABLE public.daily_care TO "service_role";
GRANT SELECT ON TABLE public.daily_care TO "service_role";
GRANT UPDATE ON TABLE public.daily_care TO "service_role";
GRANT DELETE ON TABLE public.daily_care TO "service_role";
GRANT TRUNCATE ON TABLE public.daily_care TO "service_role";
GRANT REFERENCES ON TABLE public.daily_care TO "service_role";
GRANT TRIGGER ON TABLE public.daily_care TO "service_role";
GRANT MAINTAIN ON TABLE public.daily_care TO "service_role";
ALTER TABLE public.awards OWNER TO "postgres";
REVOKE ALL ON TABLE public.awards FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.awards TO "postgres";
GRANT SELECT ON TABLE public.awards TO "postgres";
GRANT UPDATE ON TABLE public.awards TO "postgres";
GRANT DELETE ON TABLE public.awards TO "postgres";
GRANT TRUNCATE ON TABLE public.awards TO "postgres";
GRANT REFERENCES ON TABLE public.awards TO "postgres";
GRANT TRIGGER ON TABLE public.awards TO "postgres";
GRANT MAINTAIN ON TABLE public.awards TO "postgres";
GRANT INSERT ON TABLE public.awards TO "anon";
GRANT SELECT ON TABLE public.awards TO "anon";
GRANT UPDATE ON TABLE public.awards TO "anon";
GRANT DELETE ON TABLE public.awards TO "anon";
GRANT TRUNCATE ON TABLE public.awards TO "anon";
GRANT REFERENCES ON TABLE public.awards TO "anon";
GRANT TRIGGER ON TABLE public.awards TO "anon";
GRANT MAINTAIN ON TABLE public.awards TO "anon";
GRANT INSERT ON TABLE public.awards TO "authenticated";
GRANT SELECT ON TABLE public.awards TO "authenticated";
GRANT UPDATE ON TABLE public.awards TO "authenticated";
GRANT DELETE ON TABLE public.awards TO "authenticated";
GRANT TRUNCATE ON TABLE public.awards TO "authenticated";
GRANT REFERENCES ON TABLE public.awards TO "authenticated";
GRANT TRIGGER ON TABLE public.awards TO "authenticated";
GRANT MAINTAIN ON TABLE public.awards TO "authenticated";
GRANT INSERT ON TABLE public.awards TO "service_role";
GRANT SELECT ON TABLE public.awards TO "service_role";
GRANT UPDATE ON TABLE public.awards TO "service_role";
GRANT DELETE ON TABLE public.awards TO "service_role";
GRANT TRUNCATE ON TABLE public.awards TO "service_role";
GRANT REFERENCES ON TABLE public.awards TO "service_role";
GRANT TRIGGER ON TABLE public.awards TO "service_role";
GRANT MAINTAIN ON TABLE public.awards TO "service_role";
ALTER TABLE public.home_objects OWNER TO "postgres";
REVOKE ALL ON TABLE public.home_objects FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.home_objects TO "postgres";
GRANT SELECT ON TABLE public.home_objects TO "postgres";
GRANT UPDATE ON TABLE public.home_objects TO "postgres";
GRANT DELETE ON TABLE public.home_objects TO "postgres";
GRANT TRUNCATE ON TABLE public.home_objects TO "postgres";
GRANT REFERENCES ON TABLE public.home_objects TO "postgres";
GRANT TRIGGER ON TABLE public.home_objects TO "postgres";
GRANT MAINTAIN ON TABLE public.home_objects TO "postgres";
GRANT INSERT ON TABLE public.home_objects TO "anon";
GRANT SELECT ON TABLE public.home_objects TO "anon";
GRANT UPDATE ON TABLE public.home_objects TO "anon";
GRANT DELETE ON TABLE public.home_objects TO "anon";
GRANT TRUNCATE ON TABLE public.home_objects TO "anon";
GRANT REFERENCES ON TABLE public.home_objects TO "anon";
GRANT TRIGGER ON TABLE public.home_objects TO "anon";
GRANT MAINTAIN ON TABLE public.home_objects TO "anon";
GRANT INSERT ON TABLE public.home_objects TO "authenticated";
GRANT SELECT ON TABLE public.home_objects TO "authenticated";
GRANT UPDATE ON TABLE public.home_objects TO "authenticated";
GRANT DELETE ON TABLE public.home_objects TO "authenticated";
GRANT TRUNCATE ON TABLE public.home_objects TO "authenticated";
GRANT REFERENCES ON TABLE public.home_objects TO "authenticated";
GRANT TRIGGER ON TABLE public.home_objects TO "authenticated";
GRANT MAINTAIN ON TABLE public.home_objects TO "authenticated";
GRANT INSERT ON TABLE public.home_objects TO "service_role";
GRANT SELECT ON TABLE public.home_objects TO "service_role";
GRANT UPDATE ON TABLE public.home_objects TO "service_role";
GRANT DELETE ON TABLE public.home_objects TO "service_role";
GRANT TRUNCATE ON TABLE public.home_objects TO "service_role";
GRANT REFERENCES ON TABLE public.home_objects TO "service_role";
GRANT TRIGGER ON TABLE public.home_objects TO "service_role";
GRANT MAINTAIN ON TABLE public.home_objects TO "service_role";
ALTER TABLE public.homepage_alpha_systems_live OWNER TO "postgres";
REVOKE ALL ON TABLE public.homepage_alpha_systems_live FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT SELECT ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT UPDATE ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT DELETE ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT TRUNCATE ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT REFERENCES ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT TRIGGER ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT MAINTAIN ON TABLE public.homepage_alpha_systems_live TO "postgres";
GRANT INSERT ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT SELECT ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT UPDATE ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT DELETE ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT TRUNCATE ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT REFERENCES ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT TRIGGER ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT MAINTAIN ON TABLE public.homepage_alpha_systems_live TO "anon";
GRANT INSERT ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT SELECT ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT UPDATE ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT DELETE ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT TRUNCATE ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT REFERENCES ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT TRIGGER ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT MAINTAIN ON TABLE public.homepage_alpha_systems_live TO "authenticated";
GRANT INSERT ON TABLE public.homepage_alpha_systems_live TO "service_role";
GRANT SELECT ON TABLE public.homepage_alpha_systems_live TO "service_role";
GRANT UPDATE ON TABLE public.homepage_alpha_systems_live TO "service_role";
GRANT DELETE ON TABLE public.homepage_alpha_systems_live TO "service_role";
GRANT TRUNCATE ON TABLE public.homepage_alpha_systems_live TO "service_role";
GRANT REFERENCES ON TABLE public.homepage_alpha_systems_live TO "service_role";
GRANT TRIGGER ON TABLE public.homepage_alpha_systems_live TO "service_role";
GRANT MAINTAIN ON TABLE public.homepage_alpha_systems_live TO "service_role";
ALTER TABLE public.homepage_logs OWNER TO "postgres";
REVOKE ALL ON TABLE public.homepage_logs FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.homepage_logs TO "postgres";
GRANT SELECT ON TABLE public.homepage_logs TO "postgres";
GRANT UPDATE ON TABLE public.homepage_logs TO "postgres";
GRANT DELETE ON TABLE public.homepage_logs TO "postgres";
GRANT TRUNCATE ON TABLE public.homepage_logs TO "postgres";
GRANT REFERENCES ON TABLE public.homepage_logs TO "postgres";
GRANT TRIGGER ON TABLE public.homepage_logs TO "postgres";
GRANT MAINTAIN ON TABLE public.homepage_logs TO "postgres";
GRANT INSERT ON TABLE public.homepage_logs TO "anon";
GRANT SELECT ON TABLE public.homepage_logs TO "anon";
GRANT UPDATE ON TABLE public.homepage_logs TO "anon";
GRANT DELETE ON TABLE public.homepage_logs TO "anon";
GRANT TRUNCATE ON TABLE public.homepage_logs TO "anon";
GRANT REFERENCES ON TABLE public.homepage_logs TO "anon";
GRANT TRIGGER ON TABLE public.homepage_logs TO "anon";
GRANT MAINTAIN ON TABLE public.homepage_logs TO "anon";
GRANT INSERT ON TABLE public.homepage_logs TO "authenticated";
GRANT SELECT ON TABLE public.homepage_logs TO "authenticated";
GRANT UPDATE ON TABLE public.homepage_logs TO "authenticated";
GRANT DELETE ON TABLE public.homepage_logs TO "authenticated";
GRANT TRUNCATE ON TABLE public.homepage_logs TO "authenticated";
GRANT REFERENCES ON TABLE public.homepage_logs TO "authenticated";
GRANT TRIGGER ON TABLE public.homepage_logs TO "authenticated";
GRANT MAINTAIN ON TABLE public.homepage_logs TO "authenticated";
GRANT INSERT ON TABLE public.homepage_logs TO "service_role";
GRANT SELECT ON TABLE public.homepage_logs TO "service_role";
GRANT UPDATE ON TABLE public.homepage_logs TO "service_role";
GRANT DELETE ON TABLE public.homepage_logs TO "service_role";
GRANT TRUNCATE ON TABLE public.homepage_logs TO "service_role";
GRANT REFERENCES ON TABLE public.homepage_logs TO "service_role";
GRANT TRIGGER ON TABLE public.homepage_logs TO "service_role";
GRANT MAINTAIN ON TABLE public.homepage_logs TO "service_role";
ALTER TABLE public.trainer_progression OWNER TO "postgres";
REVOKE ALL ON TABLE public.trainer_progression FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.trainer_progression TO "postgres";
GRANT SELECT ON TABLE public.trainer_progression TO "postgres";
GRANT UPDATE ON TABLE public.trainer_progression TO "postgres";
GRANT DELETE ON TABLE public.trainer_progression TO "postgres";
GRANT TRUNCATE ON TABLE public.trainer_progression TO "postgres";
GRANT REFERENCES ON TABLE public.trainer_progression TO "postgres";
GRANT TRIGGER ON TABLE public.trainer_progression TO "postgres";
GRANT MAINTAIN ON TABLE public.trainer_progression TO "postgres";
GRANT INSERT ON TABLE public.trainer_progression TO "service_role";
GRANT SELECT ON TABLE public.trainer_progression TO "service_role";
GRANT UPDATE ON TABLE public.trainer_progression TO "service_role";
GRANT DELETE ON TABLE public.trainer_progression TO "service_role";
GRANT TRUNCATE ON TABLE public.trainer_progression TO "service_role";
GRANT REFERENCES ON TABLE public.trainer_progression TO "service_role";
GRANT TRIGGER ON TABLE public.trainer_progression TO "service_role";
GRANT MAINTAIN ON TABLE public.trainer_progression TO "service_role";
GRANT SELECT ON TABLE public.trainer_progression TO "authenticated";
ALTER TABLE public.personalities OWNER TO "postgres";
REVOKE ALL ON TABLE public.personalities FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.personalities TO "postgres";
GRANT SELECT ON TABLE public.personalities TO "postgres";
GRANT UPDATE ON TABLE public.personalities TO "postgres";
GRANT DELETE ON TABLE public.personalities TO "postgres";
GRANT TRUNCATE ON TABLE public.personalities TO "postgres";
GRANT REFERENCES ON TABLE public.personalities TO "postgres";
GRANT TRIGGER ON TABLE public.personalities TO "postgres";
GRANT MAINTAIN ON TABLE public.personalities TO "postgres";
GRANT INSERT ON TABLE public.personalities TO "anon";
GRANT SELECT ON TABLE public.personalities TO "anon";
GRANT UPDATE ON TABLE public.personalities TO "anon";
GRANT DELETE ON TABLE public.personalities TO "anon";
GRANT TRUNCATE ON TABLE public.personalities TO "anon";
GRANT REFERENCES ON TABLE public.personalities TO "anon";
GRANT TRIGGER ON TABLE public.personalities TO "anon";
GRANT MAINTAIN ON TABLE public.personalities TO "anon";
GRANT INSERT ON TABLE public.personalities TO "authenticated";
GRANT SELECT ON TABLE public.personalities TO "authenticated";
GRANT UPDATE ON TABLE public.personalities TO "authenticated";
GRANT DELETE ON TABLE public.personalities TO "authenticated";
GRANT TRUNCATE ON TABLE public.personalities TO "authenticated";
GRANT REFERENCES ON TABLE public.personalities TO "authenticated";
GRANT TRIGGER ON TABLE public.personalities TO "authenticated";
GRANT MAINTAIN ON TABLE public.personalities TO "authenticated";
GRANT INSERT ON TABLE public.personalities TO "service_role";
GRANT SELECT ON TABLE public.personalities TO "service_role";
GRANT UPDATE ON TABLE public.personalities TO "service_role";
GRANT DELETE ON TABLE public.personalities TO "service_role";
GRANT TRUNCATE ON TABLE public.personalities TO "service_role";
GRANT REFERENCES ON TABLE public.personalities TO "service_role";
GRANT TRIGGER ON TABLE public.personalities TO "service_role";
GRANT MAINTAIN ON TABLE public.personalities TO "service_role";
ALTER TABLE public.pet_element_deltas OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_element_deltas FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT SELECT ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT UPDATE ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT DELETE ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT REFERENCES ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT TRIGGER ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.pet_element_deltas TO "supabase_admin";
GRANT SELECT ON TABLE public.pet_element_deltas TO "authenticated";
ALTER TABLE public.pve_instability_fights OWNER TO "postgres";
REVOKE ALL ON TABLE public.pve_instability_fights FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pve_instability_fights TO "postgres";
GRANT SELECT ON TABLE public.pve_instability_fights TO "postgres";
GRANT UPDATE ON TABLE public.pve_instability_fights TO "postgres";
GRANT DELETE ON TABLE public.pve_instability_fights TO "postgres";
GRANT TRUNCATE ON TABLE public.pve_instability_fights TO "postgres";
GRANT REFERENCES ON TABLE public.pve_instability_fights TO "postgres";
GRANT TRIGGER ON TABLE public.pve_instability_fights TO "postgres";
GRANT MAINTAIN ON TABLE public.pve_instability_fights TO "postgres";
GRANT INSERT ON TABLE public.pve_instability_fights TO "anon";
GRANT SELECT ON TABLE public.pve_instability_fights TO "anon";
GRANT UPDATE ON TABLE public.pve_instability_fights TO "anon";
GRANT DELETE ON TABLE public.pve_instability_fights TO "anon";
GRANT TRUNCATE ON TABLE public.pve_instability_fights TO "anon";
GRANT REFERENCES ON TABLE public.pve_instability_fights TO "anon";
GRANT TRIGGER ON TABLE public.pve_instability_fights TO "anon";
GRANT MAINTAIN ON TABLE public.pve_instability_fights TO "anon";
GRANT INSERT ON TABLE public.pve_instability_fights TO "authenticated";
GRANT SELECT ON TABLE public.pve_instability_fights TO "authenticated";
GRANT UPDATE ON TABLE public.pve_instability_fights TO "authenticated";
GRANT DELETE ON TABLE public.pve_instability_fights TO "authenticated";
GRANT TRUNCATE ON TABLE public.pve_instability_fights TO "authenticated";
GRANT REFERENCES ON TABLE public.pve_instability_fights TO "authenticated";
GRANT TRIGGER ON TABLE public.pve_instability_fights TO "authenticated";
GRANT MAINTAIN ON TABLE public.pve_instability_fights TO "authenticated";
GRANT INSERT ON TABLE public.pve_instability_fights TO "service_role";
GRANT SELECT ON TABLE public.pve_instability_fights TO "service_role";
GRANT UPDATE ON TABLE public.pve_instability_fights TO "service_role";
GRANT DELETE ON TABLE public.pve_instability_fights TO "service_role";
GRANT TRUNCATE ON TABLE public.pve_instability_fights TO "service_role";
GRANT REFERENCES ON TABLE public.pve_instability_fights TO "service_role";
GRANT TRIGGER ON TABLE public.pve_instability_fights TO "service_role";
GRANT MAINTAIN ON TABLE public.pve_instability_fights TO "service_role";
ALTER TABLE public.retired_kith_species OWNER TO "postgres";
REVOKE ALL ON TABLE public.retired_kith_species FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.retired_kith_species TO "postgres";
GRANT SELECT ON TABLE public.retired_kith_species TO "postgres";
GRANT UPDATE ON TABLE public.retired_kith_species TO "postgres";
GRANT DELETE ON TABLE public.retired_kith_species TO "postgres";
GRANT TRUNCATE ON TABLE public.retired_kith_species TO "postgres";
GRANT REFERENCES ON TABLE public.retired_kith_species TO "postgres";
GRANT TRIGGER ON TABLE public.retired_kith_species TO "postgres";
GRANT MAINTAIN ON TABLE public.retired_kith_species TO "postgres";
GRANT INSERT ON TABLE public.retired_kith_species TO "anon";
GRANT SELECT ON TABLE public.retired_kith_species TO "anon";
GRANT UPDATE ON TABLE public.retired_kith_species TO "anon";
GRANT DELETE ON TABLE public.retired_kith_species TO "anon";
GRANT TRUNCATE ON TABLE public.retired_kith_species TO "anon";
GRANT REFERENCES ON TABLE public.retired_kith_species TO "anon";
GRANT TRIGGER ON TABLE public.retired_kith_species TO "anon";
GRANT MAINTAIN ON TABLE public.retired_kith_species TO "anon";
GRANT SELECT ON TABLE public.retired_kith_species TO "authenticated";
GRANT TRUNCATE ON TABLE public.retired_kith_species TO "authenticated";
GRANT REFERENCES ON TABLE public.retired_kith_species TO "authenticated";
GRANT TRIGGER ON TABLE public.retired_kith_species TO "authenticated";
GRANT MAINTAIN ON TABLE public.retired_kith_species TO "authenticated";
GRANT INSERT ON TABLE public.retired_kith_species TO "service_role";
GRANT SELECT ON TABLE public.retired_kith_species TO "service_role";
GRANT UPDATE ON TABLE public.retired_kith_species TO "service_role";
GRANT DELETE ON TABLE public.retired_kith_species TO "service_role";
GRANT TRUNCATE ON TABLE public.retired_kith_species TO "service_role";
GRANT REFERENCES ON TABLE public.retired_kith_species TO "service_role";
GRANT TRIGGER ON TABLE public.retired_kith_species TO "service_role";
GRANT MAINTAIN ON TABLE public.retired_kith_species TO "service_role";
ALTER TABLE public.profiles OWNER TO "postgres";
REVOKE ALL ON TABLE public.profiles FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.profiles TO "postgres";
GRANT SELECT ON TABLE public.profiles TO "postgres";
GRANT UPDATE ON TABLE public.profiles TO "postgres";
GRANT DELETE ON TABLE public.profiles TO "postgres";
GRANT TRUNCATE ON TABLE public.profiles TO "postgres";
GRANT REFERENCES ON TABLE public.profiles TO "postgres";
GRANT TRIGGER ON TABLE public.profiles TO "postgres";
GRANT MAINTAIN ON TABLE public.profiles TO "postgres";
GRANT INSERT ON TABLE public.profiles TO "anon";
GRANT SELECT ON TABLE public.profiles TO "anon";
GRANT UPDATE ON TABLE public.profiles TO "anon";
GRANT DELETE ON TABLE public.profiles TO "anon";
GRANT TRUNCATE ON TABLE public.profiles TO "anon";
GRANT REFERENCES ON TABLE public.profiles TO "anon";
GRANT TRIGGER ON TABLE public.profiles TO "anon";
GRANT MAINTAIN ON TABLE public.profiles TO "anon";
GRANT INSERT ON TABLE public.profiles TO "authenticated";
GRANT SELECT ON TABLE public.profiles TO "authenticated";
GRANT UPDATE ON TABLE public.profiles TO "authenticated";
GRANT DELETE ON TABLE public.profiles TO "authenticated";
GRANT TRUNCATE ON TABLE public.profiles TO "authenticated";
GRANT REFERENCES ON TABLE public.profiles TO "authenticated";
GRANT TRIGGER ON TABLE public.profiles TO "authenticated";
GRANT MAINTAIN ON TABLE public.profiles TO "authenticated";
GRANT INSERT ON TABLE public.profiles TO "service_role";
GRANT SELECT ON TABLE public.profiles TO "service_role";
GRANT UPDATE ON TABLE public.profiles TO "service_role";
GRANT DELETE ON TABLE public.profiles TO "service_role";
GRANT TRUNCATE ON TABLE public.profiles TO "service_role";
GRANT REFERENCES ON TABLE public.profiles TO "service_role";
GRANT TRIGGER ON TABLE public.profiles TO "service_role";
GRANT MAINTAIN ON TABLE public.profiles TO "service_role";
ALTER SEQUENCE public.signup_trigger_errors_id_seq OWNER TO "postgres";
REVOKE ALL ON SEQUENCE public.signup_trigger_errors_id_seq FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT SELECT ON SEQUENCE public.signup_trigger_errors_id_seq TO "postgres";
GRANT UPDATE ON SEQUENCE public.signup_trigger_errors_id_seq TO "postgres";
GRANT USAGE ON SEQUENCE public.signup_trigger_errors_id_seq TO "postgres";
GRANT SELECT ON SEQUENCE public.signup_trigger_errors_id_seq TO "anon";
GRANT UPDATE ON SEQUENCE public.signup_trigger_errors_id_seq TO "anon";
GRANT USAGE ON SEQUENCE public.signup_trigger_errors_id_seq TO "anon";
GRANT SELECT ON SEQUENCE public.signup_trigger_errors_id_seq TO "authenticated";
GRANT UPDATE ON SEQUENCE public.signup_trigger_errors_id_seq TO "authenticated";
GRANT USAGE ON SEQUENCE public.signup_trigger_errors_id_seq TO "authenticated";
GRANT SELECT ON SEQUENCE public.signup_trigger_errors_id_seq TO "service_role";
GRANT UPDATE ON SEQUENCE public.signup_trigger_errors_id_seq TO "service_role";
GRANT USAGE ON SEQUENCE public.signup_trigger_errors_id_seq TO "service_role";
ALTER TABLE public.wallets OWNER TO "postgres";
REVOKE ALL ON TABLE public.wallets FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.wallets TO "postgres";
GRANT SELECT ON TABLE public.wallets TO "postgres";
GRANT UPDATE ON TABLE public.wallets TO "postgres";
GRANT DELETE ON TABLE public.wallets TO "postgres";
GRANT TRUNCATE ON TABLE public.wallets TO "postgres";
GRANT REFERENCES ON TABLE public.wallets TO "postgres";
GRANT TRIGGER ON TABLE public.wallets TO "postgres";
GRANT MAINTAIN ON TABLE public.wallets TO "postgres";
GRANT SELECT ON TABLE public.wallets TO "anon";
GRANT MAINTAIN ON TABLE public.wallets TO "anon";
GRANT SELECT ON TABLE public.wallets TO "authenticated";
GRANT MAINTAIN ON TABLE public.wallets TO "authenticated";
GRANT INSERT ON TABLE public.wallets TO "service_role";
GRANT SELECT ON TABLE public.wallets TO "service_role";
GRANT UPDATE ON TABLE public.wallets TO "service_role";
GRANT DELETE ON TABLE public.wallets TO "service_role";
GRANT TRUNCATE ON TABLE public.wallets TO "service_role";
GRANT REFERENCES ON TABLE public.wallets TO "service_role";
GRANT TRIGGER ON TABLE public.wallets TO "service_role";
GRANT MAINTAIN ON TABLE public.wallets TO "service_role";
ALTER TABLE public.trainer_awards OWNER TO "postgres";
REVOKE ALL ON TABLE public.trainer_awards FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.trainer_awards TO "postgres";
GRANT SELECT ON TABLE public.trainer_awards TO "postgres";
GRANT UPDATE ON TABLE public.trainer_awards TO "postgres";
GRANT DELETE ON TABLE public.trainer_awards TO "postgres";
GRANT TRUNCATE ON TABLE public.trainer_awards TO "postgres";
GRANT REFERENCES ON TABLE public.trainer_awards TO "postgres";
GRANT TRIGGER ON TABLE public.trainer_awards TO "postgres";
GRANT MAINTAIN ON TABLE public.trainer_awards TO "postgres";
GRANT INSERT ON TABLE public.trainer_awards TO "anon";
GRANT SELECT ON TABLE public.trainer_awards TO "anon";
GRANT UPDATE ON TABLE public.trainer_awards TO "anon";
GRANT DELETE ON TABLE public.trainer_awards TO "anon";
GRANT TRUNCATE ON TABLE public.trainer_awards TO "anon";
GRANT REFERENCES ON TABLE public.trainer_awards TO "anon";
GRANT TRIGGER ON TABLE public.trainer_awards TO "anon";
GRANT MAINTAIN ON TABLE public.trainer_awards TO "anon";
GRANT INSERT ON TABLE public.trainer_awards TO "authenticated";
GRANT SELECT ON TABLE public.trainer_awards TO "authenticated";
GRANT UPDATE ON TABLE public.trainer_awards TO "authenticated";
GRANT DELETE ON TABLE public.trainer_awards TO "authenticated";
GRANT TRUNCATE ON TABLE public.trainer_awards TO "authenticated";
GRANT REFERENCES ON TABLE public.trainer_awards TO "authenticated";
GRANT TRIGGER ON TABLE public.trainer_awards TO "authenticated";
GRANT MAINTAIN ON TABLE public.trainer_awards TO "authenticated";
GRANT INSERT ON TABLE public.trainer_awards TO "service_role";
GRANT SELECT ON TABLE public.trainer_awards TO "service_role";
GRANT UPDATE ON TABLE public.trainer_awards TO "service_role";
GRANT DELETE ON TABLE public.trainer_awards TO "service_role";
GRANT TRUNCATE ON TABLE public.trainer_awards TO "service_role";
GRANT REFERENCES ON TABLE public.trainer_awards TO "service_role";
GRANT TRIGGER ON TABLE public.trainer_awards TO "service_role";
GRANT MAINTAIN ON TABLE public.trainer_awards TO "service_role";
ALTER TABLE public.user_resources OWNER TO "postgres";
REVOKE ALL ON TABLE public.user_resources FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.user_resources TO "postgres";
GRANT SELECT ON TABLE public.user_resources TO "postgres";
GRANT UPDATE ON TABLE public.user_resources TO "postgres";
GRANT DELETE ON TABLE public.user_resources TO "postgres";
GRANT TRUNCATE ON TABLE public.user_resources TO "postgres";
GRANT REFERENCES ON TABLE public.user_resources TO "postgres";
GRANT TRIGGER ON TABLE public.user_resources TO "postgres";
GRANT MAINTAIN ON TABLE public.user_resources TO "postgres";
GRANT INSERT ON TABLE public.user_resources TO "anon";
GRANT SELECT ON TABLE public.user_resources TO "anon";
GRANT UPDATE ON TABLE public.user_resources TO "anon";
GRANT DELETE ON TABLE public.user_resources TO "anon";
GRANT TRUNCATE ON TABLE public.user_resources TO "anon";
GRANT REFERENCES ON TABLE public.user_resources TO "anon";
GRANT TRIGGER ON TABLE public.user_resources TO "anon";
GRANT MAINTAIN ON TABLE public.user_resources TO "anon";
GRANT INSERT ON TABLE public.user_resources TO "authenticated";
GRANT SELECT ON TABLE public.user_resources TO "authenticated";
GRANT UPDATE ON TABLE public.user_resources TO "authenticated";
GRANT DELETE ON TABLE public.user_resources TO "authenticated";
GRANT TRUNCATE ON TABLE public.user_resources TO "authenticated";
GRANT REFERENCES ON TABLE public.user_resources TO "authenticated";
GRANT TRIGGER ON TABLE public.user_resources TO "authenticated";
GRANT MAINTAIN ON TABLE public.user_resources TO "authenticated";
GRANT INSERT ON TABLE public.user_resources TO "service_role";
GRANT SELECT ON TABLE public.user_resources TO "service_role";
GRANT UPDATE ON TABLE public.user_resources TO "service_role";
GRANT DELETE ON TABLE public.user_resources TO "service_role";
GRANT TRUNCATE ON TABLE public.user_resources TO "service_role";
GRANT REFERENCES ON TABLE public.user_resources TO "service_role";
GRANT TRIGGER ON TABLE public.user_resources TO "service_role";
GRANT MAINTAIN ON TABLE public.user_resources TO "service_role";
ALTER TABLE public.user_retired_kith OWNER TO "postgres";
REVOKE ALL ON TABLE public.user_retired_kith FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.user_retired_kith TO "postgres";
GRANT SELECT ON TABLE public.user_retired_kith TO "postgres";
GRANT UPDATE ON TABLE public.user_retired_kith TO "postgres";
GRANT DELETE ON TABLE public.user_retired_kith TO "postgres";
GRANT TRUNCATE ON TABLE public.user_retired_kith TO "postgres";
GRANT REFERENCES ON TABLE public.user_retired_kith TO "postgres";
GRANT TRIGGER ON TABLE public.user_retired_kith TO "postgres";
GRANT MAINTAIN ON TABLE public.user_retired_kith TO "postgres";
GRANT INSERT ON TABLE public.user_retired_kith TO "anon";
GRANT SELECT ON TABLE public.user_retired_kith TO "anon";
GRANT UPDATE ON TABLE public.user_retired_kith TO "anon";
GRANT DELETE ON TABLE public.user_retired_kith TO "anon";
GRANT TRUNCATE ON TABLE public.user_retired_kith TO "anon";
GRANT REFERENCES ON TABLE public.user_retired_kith TO "anon";
GRANT TRIGGER ON TABLE public.user_retired_kith TO "anon";
GRANT MAINTAIN ON TABLE public.user_retired_kith TO "anon";
GRANT SELECT ON TABLE public.user_retired_kith TO "authenticated";
GRANT TRUNCATE ON TABLE public.user_retired_kith TO "authenticated";
GRANT REFERENCES ON TABLE public.user_retired_kith TO "authenticated";
GRANT TRIGGER ON TABLE public.user_retired_kith TO "authenticated";
GRANT MAINTAIN ON TABLE public.user_retired_kith TO "authenticated";
GRANT INSERT ON TABLE public.user_retired_kith TO "service_role";
GRANT SELECT ON TABLE public.user_retired_kith TO "service_role";
GRANT UPDATE ON TABLE public.user_retired_kith TO "service_role";
GRANT DELETE ON TABLE public.user_retired_kith TO "service_role";
GRANT TRUNCATE ON TABLE public.user_retired_kith TO "service_role";
GRANT REFERENCES ON TABLE public.user_retired_kith TO "service_role";
GRANT TRIGGER ON TABLE public.user_retired_kith TO "service_role";
GRANT MAINTAIN ON TABLE public.user_retired_kith TO "service_role";
ALTER TABLE public.v_pet_total_stats OWNER TO "postgres";
REVOKE ALL ON TABLE public.v_pet_total_stats FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.v_pet_total_stats TO "postgres";
GRANT SELECT ON TABLE public.v_pet_total_stats TO "postgres";
GRANT UPDATE ON TABLE public.v_pet_total_stats TO "postgres";
GRANT DELETE ON TABLE public.v_pet_total_stats TO "postgres";
GRANT TRUNCATE ON TABLE public.v_pet_total_stats TO "postgres";
GRANT REFERENCES ON TABLE public.v_pet_total_stats TO "postgres";
GRANT TRIGGER ON TABLE public.v_pet_total_stats TO "postgres";
GRANT MAINTAIN ON TABLE public.v_pet_total_stats TO "postgres";
GRANT INSERT ON TABLE public.v_pet_total_stats TO "anon";
GRANT SELECT ON TABLE public.v_pet_total_stats TO "anon";
GRANT UPDATE ON TABLE public.v_pet_total_stats TO "anon";
GRANT DELETE ON TABLE public.v_pet_total_stats TO "anon";
GRANT TRUNCATE ON TABLE public.v_pet_total_stats TO "anon";
GRANT REFERENCES ON TABLE public.v_pet_total_stats TO "anon";
GRANT TRIGGER ON TABLE public.v_pet_total_stats TO "anon";
GRANT MAINTAIN ON TABLE public.v_pet_total_stats TO "anon";
GRANT INSERT ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT SELECT ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT UPDATE ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT DELETE ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT TRUNCATE ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT REFERENCES ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT TRIGGER ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT MAINTAIN ON TABLE public.v_pet_total_stats TO "authenticated";
GRANT INSERT ON TABLE public.v_pet_total_stats TO "service_role";
GRANT SELECT ON TABLE public.v_pet_total_stats TO "service_role";
GRANT UPDATE ON TABLE public.v_pet_total_stats TO "service_role";
GRANT DELETE ON TABLE public.v_pet_total_stats TO "service_role";
GRANT TRUNCATE ON TABLE public.v_pet_total_stats TO "service_role";
GRANT REFERENCES ON TABLE public.v_pet_total_stats TO "service_role";
GRANT TRIGGER ON TABLE public.v_pet_total_stats TO "service_role";
GRANT MAINTAIN ON TABLE public.v_pet_total_stats TO "service_role";
ALTER TABLE public.assanti_food_claims OWNER TO "postgres";
REVOKE ALL ON TABLE public.assanti_food_claims FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT SELECT ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT UPDATE ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT DELETE ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT REFERENCES ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT TRIGGER ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.assanti_food_claims TO "supabase_admin";
GRANT SELECT ON TABLE public.assanti_food_claims TO "authenticated";
GRANT INSERT ON TABLE public.assanti_food_claims TO "service_role";
GRANT SELECT ON TABLE public.assanti_food_claims TO "service_role";
GRANT UPDATE ON TABLE public.assanti_food_claims TO "service_role";
GRANT DELETE ON TABLE public.assanti_food_claims TO "service_role";
GRANT TRUNCATE ON TABLE public.assanti_food_claims TO "service_role";
GRANT REFERENCES ON TABLE public.assanti_food_claims TO "service_role";
GRANT TRIGGER ON TABLE public.assanti_food_claims TO "service_role";
GRANT MAINTAIN ON TABLE public.assanti_food_claims TO "service_role";
ALTER TABLE public.pet_stats OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_stats FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_stats TO "postgres";
GRANT SELECT ON TABLE public.pet_stats TO "postgres";
GRANT UPDATE ON TABLE public.pet_stats TO "postgres";
GRANT DELETE ON TABLE public.pet_stats TO "postgres";
GRANT TRUNCATE ON TABLE public.pet_stats TO "postgres";
GRANT REFERENCES ON TABLE public.pet_stats TO "postgres";
GRANT TRIGGER ON TABLE public.pet_stats TO "postgres";
GRANT MAINTAIN ON TABLE public.pet_stats TO "postgres";
GRANT SELECT ON TABLE public.pet_stats TO "anon";
GRANT MAINTAIN ON TABLE public.pet_stats TO "anon";
GRANT SELECT ON TABLE public.pet_stats TO "authenticated";
GRANT MAINTAIN ON TABLE public.pet_stats TO "authenticated";
GRANT INSERT ON TABLE public.pet_stats TO "service_role";
GRANT SELECT ON TABLE public.pet_stats TO "service_role";
GRANT UPDATE ON TABLE public.pet_stats TO "service_role";
GRANT DELETE ON TABLE public.pet_stats TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_stats TO "service_role";
GRANT REFERENCES ON TABLE public.pet_stats TO "service_role";
GRANT TRIGGER ON TABLE public.pet_stats TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_stats TO "service_role";
ALTER TABLE public.pet_elements OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_elements FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_elements TO "postgres";
GRANT SELECT ON TABLE public.pet_elements TO "postgres";
GRANT UPDATE ON TABLE public.pet_elements TO "postgres";
GRANT DELETE ON TABLE public.pet_elements TO "postgres";
GRANT TRUNCATE ON TABLE public.pet_elements TO "postgres";
GRANT REFERENCES ON TABLE public.pet_elements TO "postgres";
GRANT TRIGGER ON TABLE public.pet_elements TO "postgres";
GRANT MAINTAIN ON TABLE public.pet_elements TO "postgres";
GRANT SELECT ON TABLE public.pet_elements TO "anon";
GRANT MAINTAIN ON TABLE public.pet_elements TO "anon";
GRANT SELECT ON TABLE public.pet_elements TO "authenticated";
GRANT MAINTAIN ON TABLE public.pet_elements TO "authenticated";
GRANT INSERT ON TABLE public.pet_elements TO "service_role";
GRANT SELECT ON TABLE public.pet_elements TO "service_role";
GRANT UPDATE ON TABLE public.pet_elements TO "service_role";
GRANT DELETE ON TABLE public.pet_elements TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_elements TO "service_role";
GRANT REFERENCES ON TABLE public.pet_elements TO "service_role";
GRANT TRIGGER ON TABLE public.pet_elements TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_elements TO "service_role";
ALTER TABLE public.pet_stat_allocations OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_stat_allocations FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_stat_allocations TO "postgres";
GRANT SELECT ON TABLE public.pet_stat_allocations TO "postgres";
GRANT UPDATE ON TABLE public.pet_stat_allocations TO "postgres";
GRANT DELETE ON TABLE public.pet_stat_allocations TO "postgres";
GRANT TRUNCATE ON TABLE public.pet_stat_allocations TO "postgres";
GRANT REFERENCES ON TABLE public.pet_stat_allocations TO "postgres";
GRANT TRIGGER ON TABLE public.pet_stat_allocations TO "postgres";
GRANT MAINTAIN ON TABLE public.pet_stat_allocations TO "postgres";
GRANT SELECT ON TABLE public.pet_stat_allocations TO "anon";
GRANT MAINTAIN ON TABLE public.pet_stat_allocations TO "anon";
GRANT SELECT ON TABLE public.pet_stat_allocations TO "authenticated";
GRANT MAINTAIN ON TABLE public.pet_stat_allocations TO "authenticated";
GRANT INSERT ON TABLE public.pet_stat_allocations TO "service_role";
GRANT SELECT ON TABLE public.pet_stat_allocations TO "service_role";
GRANT UPDATE ON TABLE public.pet_stat_allocations TO "service_role";
GRANT DELETE ON TABLE public.pet_stat_allocations TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_stat_allocations TO "service_role";
GRANT REFERENCES ON TABLE public.pet_stat_allocations TO "service_role";
GRANT TRIGGER ON TABLE public.pet_stat_allocations TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_stat_allocations TO "service_role";
ALTER TABLE public.pet_battle_results OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_battle_results FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT SELECT ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT UPDATE ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT DELETE ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT REFERENCES ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT TRIGGER ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.pet_battle_results TO "supabase_admin";
GRANT SELECT ON TABLE public.pet_battle_results TO "authenticated";
GRANT INSERT ON TABLE public.pet_battle_results TO "service_role";
GRANT SELECT ON TABLE public.pet_battle_results TO "service_role";
ALTER TABLE public.poe_tay_toe_finds OWNER TO "postgres";
REVOKE ALL ON TABLE public.poe_tay_toe_finds FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT SELECT ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT UPDATE ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT DELETE ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT REFERENCES ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT TRIGGER ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_finds TO "postgres";
GRANT INSERT ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT SELECT ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT UPDATE ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT DELETE ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT REFERENCES ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT TRIGGER ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_finds TO "anon";
GRANT INSERT ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT SELECT ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT UPDATE ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT DELETE ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT REFERENCES ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT TRIGGER ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_finds TO "authenticated";
GRANT INSERT ON TABLE public.poe_tay_toe_finds TO "service_role";
GRANT SELECT ON TABLE public.poe_tay_toe_finds TO "service_role";
GRANT UPDATE ON TABLE public.poe_tay_toe_finds TO "service_role";
GRANT DELETE ON TABLE public.poe_tay_toe_finds TO "service_role";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_finds TO "service_role";
GRANT REFERENCES ON TABLE public.poe_tay_toe_finds TO "service_role";
GRANT TRIGGER ON TABLE public.poe_tay_toe_finds TO "service_role";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_finds TO "service_role";
ALTER TABLE public.assanti_food_catalog OWNER TO "postgres";
REVOKE ALL ON TABLE public.assanti_food_catalog FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT SELECT ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT UPDATE ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT DELETE ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT REFERENCES ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT TRIGGER ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.assanti_food_catalog TO "supabase_admin";
GRANT INSERT ON TABLE public.assanti_food_catalog TO "service_role";
GRANT SELECT ON TABLE public.assanti_food_catalog TO "service_role";
GRANT UPDATE ON TABLE public.assanti_food_catalog TO "service_role";
GRANT DELETE ON TABLE public.assanti_food_catalog TO "service_role";
GRANT TRUNCATE ON TABLE public.assanti_food_catalog TO "service_role";
GRANT REFERENCES ON TABLE public.assanti_food_catalog TO "service_role";
GRANT TRIGGER ON TABLE public.assanti_food_catalog TO "service_role";
GRANT MAINTAIN ON TABLE public.assanti_food_catalog TO "service_role";
ALTER TABLE public.assanti_food_config OWNER TO "postgres";
REVOKE ALL ON TABLE public.assanti_food_config FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT SELECT ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT UPDATE ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT DELETE ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT REFERENCES ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT TRIGGER ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.assanti_food_config TO "supabase_admin";
GRANT INSERT ON TABLE public.assanti_food_config TO "service_role";
GRANT SELECT ON TABLE public.assanti_food_config TO "service_role";
GRANT UPDATE ON TABLE public.assanti_food_config TO "service_role";
GRANT DELETE ON TABLE public.assanti_food_config TO "service_role";
GRANT TRUNCATE ON TABLE public.assanti_food_config TO "service_role";
GRANT REFERENCES ON TABLE public.assanti_food_config TO "service_role";
GRANT TRIGGER ON TABLE public.assanti_food_config TO "service_role";
GRANT MAINTAIN ON TABLE public.assanti_food_config TO "service_role";
ALTER TABLE public.assanti_food_days OWNER TO "postgres";
REVOKE ALL ON TABLE public.assanti_food_days FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT SELECT ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT UPDATE ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT DELETE ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT REFERENCES ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT TRIGGER ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.assanti_food_days TO "supabase_admin";
GRANT INSERT ON TABLE public.assanti_food_days TO "service_role";
GRANT SELECT ON TABLE public.assanti_food_days TO "service_role";
GRANT UPDATE ON TABLE public.assanti_food_days TO "service_role";
GRANT DELETE ON TABLE public.assanti_food_days TO "service_role";
GRANT TRUNCATE ON TABLE public.assanti_food_days TO "service_role";
GRANT REFERENCES ON TABLE public.assanti_food_days TO "service_role";
GRANT TRIGGER ON TABLE public.assanti_food_days TO "service_role";
GRANT MAINTAIN ON TABLE public.assanti_food_days TO "service_role";
ALTER TABLE public.pet_relic_equipment OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_relic_equipment FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT SELECT ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT UPDATE ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT DELETE ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT REFERENCES ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT TRIGGER ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.pet_relic_equipment TO "supabase_admin";
GRANT INSERT ON TABLE public.pet_relic_equipment TO "service_role";
GRANT SELECT ON TABLE public.pet_relic_equipment TO "service_role";
GRANT UPDATE ON TABLE public.pet_relic_equipment TO "service_role";
GRANT DELETE ON TABLE public.pet_relic_equipment TO "service_role";
ALTER TABLE public.kennith_wallet_days OWNER TO "postgres";
REVOKE ALL ON TABLE public.kennith_wallet_days FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT SELECT ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT UPDATE ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT DELETE ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT REFERENCES ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT TRIGGER ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.kennith_wallet_days TO "supabase_admin";
GRANT INSERT ON TABLE public.kennith_wallet_days TO "service_role";
GRANT SELECT ON TABLE public.kennith_wallet_days TO "service_role";
GRANT UPDATE ON TABLE public.kennith_wallet_days TO "service_role";
ALTER TABLE public.poe_tay_toe_state OWNER TO "postgres";
REVOKE ALL ON TABLE public.poe_tay_toe_state FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT SELECT ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT UPDATE ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT DELETE ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT REFERENCES ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT TRIGGER ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_state TO "postgres";
GRANT INSERT ON TABLE public.poe_tay_toe_state TO "anon";
GRANT SELECT ON TABLE public.poe_tay_toe_state TO "anon";
GRANT UPDATE ON TABLE public.poe_tay_toe_state TO "anon";
GRANT DELETE ON TABLE public.poe_tay_toe_state TO "anon";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_state TO "anon";
GRANT REFERENCES ON TABLE public.poe_tay_toe_state TO "anon";
GRANT TRIGGER ON TABLE public.poe_tay_toe_state TO "anon";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_state TO "anon";
GRANT INSERT ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT SELECT ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT UPDATE ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT DELETE ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT REFERENCES ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT TRIGGER ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_state TO "authenticated";
GRANT INSERT ON TABLE public.poe_tay_toe_state TO "service_role";
GRANT SELECT ON TABLE public.poe_tay_toe_state TO "service_role";
GRANT UPDATE ON TABLE public.poe_tay_toe_state TO "service_role";
GRANT DELETE ON TABLE public.poe_tay_toe_state TO "service_role";
GRANT TRUNCATE ON TABLE public.poe_tay_toe_state TO "service_role";
GRANT REFERENCES ON TABLE public.poe_tay_toe_state TO "service_role";
GRANT TRIGGER ON TABLE public.poe_tay_toe_state TO "service_role";
GRANT MAINTAIN ON TABLE public.poe_tay_toe_state TO "service_role";
ALTER TABLE public.kennith_stock_days OWNER TO "postgres";
REVOKE ALL ON TABLE public.kennith_stock_days FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT SELECT ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT UPDATE ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT DELETE ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT REFERENCES ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT TRIGGER ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.kennith_stock_days TO "supabase_admin";
GRANT INSERT ON TABLE public.kennith_stock_days TO "service_role";
GRANT SELECT ON TABLE public.kennith_stock_days TO "service_role";
GRANT UPDATE ON TABLE public.kennith_stock_days TO "service_role";
ALTER TABLE public.kennith_stock OWNER TO "postgres";
REVOKE ALL ON TABLE public.kennith_stock FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.kennith_stock TO "supabase_admin";
GRANT SELECT ON TABLE public.kennith_stock TO "supabase_admin";
GRANT UPDATE ON TABLE public.kennith_stock TO "supabase_admin";
GRANT DELETE ON TABLE public.kennith_stock TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.kennith_stock TO "supabase_admin";
GRANT REFERENCES ON TABLE public.kennith_stock TO "supabase_admin";
GRANT TRIGGER ON TABLE public.kennith_stock TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.kennith_stock TO "supabase_admin";
GRANT INSERT ON TABLE public.kennith_stock TO "service_role";
GRANT SELECT ON TABLE public.kennith_stock TO "service_role";
GRANT UPDATE ON TABLE public.kennith_stock TO "service_role";
ALTER TABLE public.wildwood_treasure_items OWNER TO "postgres";
REVOKE ALL ON TABLE public.wildwood_treasure_items FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT SELECT ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT UPDATE ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT DELETE ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT REFERENCES ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT TRIGGER ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.wildwood_treasure_items TO "supabase_admin";
GRANT INSERT ON TABLE public.wildwood_treasure_items TO "service_role";
GRANT SELECT ON TABLE public.wildwood_treasure_items TO "service_role";
GRANT UPDATE ON TABLE public.wildwood_treasure_items TO "service_role";
GRANT DELETE ON TABLE public.wildwood_treasure_items TO "service_role";
ALTER TABLE public.pet_stat_spend_receipts OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_stat_spend_receipts FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT SELECT ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT UPDATE ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT DELETE ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT REFERENCES ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT TRIGGER ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.pet_stat_spend_receipts TO "supabase_admin";
GRANT INSERT ON TABLE public.pet_stat_spend_receipts TO "service_role";
GRANT SELECT ON TABLE public.pet_stat_spend_receipts TO "service_role";
GRANT UPDATE ON TABLE public.pet_stat_spend_receipts TO "service_role";
GRANT DELETE ON TABLE public.pet_stat_spend_receipts TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_stat_spend_receipts TO "service_role";
GRANT REFERENCES ON TABLE public.pet_stat_spend_receipts TO "service_role";
GRANT TRIGGER ON TABLE public.pet_stat_spend_receipts TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_stat_spend_receipts TO "service_role";
ALTER TABLE public.pet_skill_milestone_claims OWNER TO "postgres";
REVOKE ALL ON TABLE public.pet_skill_milestone_claims FROM PUBLIC,anon,authenticated,service_role,postgres,supabase_admin;
GRANT INSERT ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT SELECT ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT UPDATE ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT DELETE ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT TRUNCATE ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT REFERENCES ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT TRIGGER ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT MAINTAIN ON TABLE public.pet_skill_milestone_claims TO "supabase_admin";
GRANT INSERT ON TABLE public.pet_skill_milestone_claims TO "service_role";
GRANT SELECT ON TABLE public.pet_skill_milestone_claims TO "service_role";
GRANT UPDATE ON TABLE public.pet_skill_milestone_claims TO "service_role";
GRANT DELETE ON TABLE public.pet_skill_milestone_claims TO "service_role";
GRANT TRUNCATE ON TABLE public.pet_skill_milestone_claims TO "service_role";
GRANT REFERENCES ON TABLE public.pet_skill_milestone_claims TO "service_role";
GRANT TRIGGER ON TABLE public.pet_skill_milestone_claims TO "service_role";
GRANT MAINTAIN ON TABLE public.pet_skill_milestone_claims TO "service_role";
REVOKE ALL ON FUNCTION public.claim_wildwood_item(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_wildwood_item(uuid,uuid,text) TO service_role;

COMMIT;
