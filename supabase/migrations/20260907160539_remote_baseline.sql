


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "admin";


ALTER SCHEMA "admin" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."age_stage" AS ENUM (
    'Baby_sprout',
    'Toddler_sprout',
    'Teen_sprout',
    'Adult_sprout',
    'Legion'
);


ALTER TYPE "public"."age_stage" OWNER TO "postgres";


CREATE TYPE "public"."currency_kind" AS ENUM (
    'dots',
    'crystals',
    'gems'
);


ALTER TYPE "public"."currency_kind" OWNER TO "postgres";


CREATE TYPE "public"."element_kind" AS ENUM (
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


ALTER TYPE "public"."element_kind" OWNER TO "postgres";


CREATE TYPE "public"."elemental_line" AS ENUM (
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


ALTER TYPE "public"."elemental_line" OWNER TO "postgres";


CREATE TYPE "public"."fight_kind" AS ENUM (
    'normal',
    'boss'
);


ALTER TYPE "public"."fight_kind" OWNER TO "postgres";


CREATE TYPE "public"."item_type" AS ENUM (
    'care',
    'battle_food',
    'material',
    'equipment',
    'currency_pack'
);


ALTER TYPE "public"."item_type" OWNER TO "postgres";


CREATE TYPE "public"."log_category" AS ENUM (
    'complete',
    'coming_next',
    'patch'
);


ALTER TYPE "public"."log_category" OWNER TO "postgres";


CREATE TYPE "public"."personality_trait" AS ENUM (
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


ALTER TYPE "public"."personality_trait" OWNER TO "postgres";


CREATE TYPE "public"."pet_gender" AS ENUM (
    'male',
    'female',
    'null',
    'null_gender'
);


ALTER TYPE "public"."pet_gender" OWNER TO "postgres";


CREATE TYPE "public"."pet_location" AS ENUM (
    'hatchery',
    'active',
    'storage',
    'inventory',
    'party'
);


ALTER TYPE "public"."pet_location" OWNER TO "postgres";


CREATE TYPE "public"."pet_stage" AS ENUM (
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


ALTER TYPE "public"."pet_stage" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "admin"."delete_jayden_testing_emails"("p_confirm_text" "text" DEFAULT 'DRY_RUN'::"text") RETURNS TABLE("action" "text", "target_email" "text", "user_id" "uuid", "matched_auth_email" "text", "matched_profile_email" "text", "display_name" "text", "pet_count" integer)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "admin"."delete_jayden_testing_emails"("p_confirm_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "admin"."reset_runaway_or_null_pet_users"("p_dry_run" boolean DEFAULT true) RETURNS TABLE("action" "text", "user_id" "uuid", "email" "text", "display_name" "text", "reset_reason" "text", "total_pets" integer, "owned_pets" integer, "runaway_pets" integer, "affected_pet_count" integer)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "admin"."reset_runaway_or_null_pet_users"("p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_hunger_decay"("p_pet_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."apply_hunger_decay"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_pet_care_decay"("p_pet_id" "uuid") RETURNS TABLE("hunger" integer, "clean" integer, "happy" integer, "comfort" integer, "rest" integer, "energy" integer, "ran_away" boolean, "last_care_decay_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."apply_pet_care_decay"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_new_pet_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  perform public.assign_pet_mutation(new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."assign_new_pet_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_pet_mutation"("p_pet_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."assign_pet_mutation"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_pet_personality"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."assign_pet_personality"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") RETURNS TABLE("claimed" boolean, "reason" "text", "cooldown_ends_at" timestamp with time zone, "dots_awarded" integer, "item_slug" "text", "item_qty" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_state public.poe_tay_toe_state%rowtype;
  v_last_found_at timestamptz;
  v_item_id uuid;
  v_item_slug text;
  v_dots_awarded int := 100;
  v_item_qty int := 1;
begin
  select *
  into v_state
  from public.poe_tay_toe_state
  where id = 1
  for update;

  if not found then
    return query
    select false, 'missing_state'::text, null::timestamptz, 0, null::text, 0;
    return;
  end if;

  if
    v_state.claimed_by_user_id is not null
    and v_state.claimed_at is not null
    and v_state.claimed_at <= now() - interval '10 minutes'
  then
    update public.poe_tay_toe_state
    set
      claimed_by_user_id = null,
      claimed_at = null,
      updated_at = now()
    where id = 1;

    v_state.claimed_by_user_id := null;
    v_state.claimed_at := null;
  end if;

  select found_at
  into v_last_found_at
  from public.poe_tay_toe_finds
  where user_id = p_user_id
  order by found_at desc
  limit 1;

  if
    v_last_found_at is not null
    and v_last_found_at > now() - interval '2 hours'
  then
    return query
    select
      false,
      'cooldown'::text,
      v_last_found_at + interval '2 hours',
      0,
      null::text,
      0;
    return;
  end if;

  if v_state.claimed_by_user_id is not null then
    return query
    select false, 'claimed'::text, null::timestamptz, 0, null::text, 0;
    return;
  end if;

  if v_state.current_location_key <> p_location_key then
    return query
    select false, 'moved'::text, null::timestamptz, 0, null::text, 0;
    return;
  end if;

  select slug, id
  into v_item_slug, v_item_id
  from public.item_defs
  where slug in (
    'kithna-food-pack',
    'soft-cleaning-brush',
    'spark-jingle-toy',
    'moon-nap-pillow'
  )
  order by random()
  limit 1;

  if v_item_id is null then
    raise exception 'Poe Tay Toe reward item definitions are missing.';
  end if;

  insert into public.wallets (
    user_id,
    dots
  )
  values (
    p_user_id,
    v_dots_awarded
  )
  on conflict (user_id) do update
  set
    dots = public.wallets.dots + v_dots_awarded,
    updated_at = now();

  insert into public.inventory (
    user_id,
    item_id,
    qty,
    updated_at
  )
  values (
    p_user_id,
    v_item_id,
    v_item_qty,
    now()
  )
  on conflict (user_id, item_id) do update
  set
    qty = public.inventory.qty + v_item_qty,
    updated_at = now();

  insert into public.poe_tay_toe_finds (
    user_id,
    location_key,
    dots_awarded,
    item_slug,
    item_qty
  )
  values (
    p_user_id,
    p_location_key,
    v_dots_awarded,
    v_item_slug,
    v_item_qty
  );

  update public.poe_tay_toe_state
  set
    claimed_by_user_id = p_user_id,
    claimed_at = now(),
    find_count = find_count + 1,
    updated_at = now()
  where id = 1;

  return query
  select
    true,
    null::text,
    null::timestamptz,
    v_dots_awarded,
    v_item_slug,
    v_item_qty;
end;
$$;


ALTER FUNCTION "public"."claim_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_trough"("p_user_id" "uuid", "p_amount" integer) RETURNS TABLE("trough_fill" integer, "trough_capacity" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."consume_trough"("p_user_id" "uuid", "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_pet_mutation_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."enforce_pet_mutation_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_eastern_date"("ts" timestamp with time zone) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN (ts AT TIME ZONE 'America/New_York')::DATE;
END;
$$;


ALTER FUNCTION "public"."extract_eastern_date"("ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_aliune_signal_report"("p_start" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."generate_aliune_signal_report"("p_start" timestamp with time zone) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."pve_active_buffs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "buff_type" "text" NOT NULL,
    "strength" numeric DEFAULT 1.0 NOT NULL,
    "description" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pve_active_buffs_buff_type_check" CHECK (("buff_type" = ANY (ARRAY['bonus_xp'::"text", 'reduced_decay'::"text", 'hatch_speed'::"text", 'drop_rate'::"text"]))),
    CONSTRAINT "pve_active_buffs_strength_check" CHECK (("strength" >= (0)::numeric))
);


ALTER TABLE "public"."pve_active_buffs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_buffs"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."pve_active_buffs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_active_buffs"("p_user_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pve_instabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region" "text" DEFAULT 'Kithna'::"text" NOT NULL,
    "condition" "text" NOT NULL,
    "corruption_level" "text" NOT NULL,
    "description" "text" NOT NULL,
    "total_fights" integer DEFAULT 3 NOT NULL,
    "has_boss" boolean DEFAULT false NOT NULL,
    "reward_xp" integer DEFAULT 100 NOT NULL,
    "reward_materials" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "reward_buffs" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "spawned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pve_instabilities_condition_check" CHECK (("condition" = ANY (ARRAY['minor'::"text", 'major'::"text", 'critical'::"text"]))),
    CONSTRAINT "pve_instabilities_corruption_level_check" CHECK (("corruption_level" = ANY (ARRAY['low'::"text", 'rising'::"text", 'high'::"text"]))),
    CONSTRAINT "pve_instabilities_reward_xp_check" CHECK (("reward_xp" >= 0)),
    CONSTRAINT "pve_instabilities_total_fights_check" CHECK ((("total_fights" >= 1) AND ("total_fights" <= 5)))
);


ALTER TABLE "public"."pve_instabilities" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_instabilities"("p_region" "text" DEFAULT 'Kithna'::"text") RETURNS SETOF "public"."pve_instabilities"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select *
  from public.pve_instabilities
  where enabled = true
    and expires_at > now()
    and region = p_region
  order by spawned_at desc
  limit 10;
$$;


ALTER FUNCTION "public"."get_active_instabilities"("p_region" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select au.email
  from profiles p
  join auth.users au
    on au.id = p.user_id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;


ALTER FUNCTION "public"."get_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_kithna_tutorial_signal"() RETURNS TABLE("id" "uuid", "enabled" boolean, "condition" "text", "region" "text", "town" "text", "corruption" "text", "report_text" "text", "report_age_days" integer, "start_time" time without time zone, "end_time" time without time zone, "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_or_create_kithna_tutorial_signal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text",
    "line" "public"."elemental_line" NOT NULL,
    "stage" "public"."pet_stage" DEFAULT 'egg'::"public"."pet_stage" NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "xp" integer DEFAULT 0 NOT NULL,
    "hatched_at" timestamp with time zone,
    "hunger" integer DEFAULT 50 NOT NULL,
    "energy" integer DEFAULT 100 NOT NULL,
    "atk" integer DEFAULT 5 NOT NULL,
    "def" integer DEFAULT 5 NOT NULL,
    "spd" integer DEFAULT 5 NOT NULL,
    "hp_max" integer DEFAULT 30 NOT NULL,
    "hp_cur" integer DEFAULT 30 NOT NULL,
    "age" "public"."age_stage" DEFAULT 'Baby_sprout'::"public"."age_stage" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gender" "public"."pet_gender" DEFAULT 'null_gender'::"public"."pet_gender" NOT NULL,
    "bond" integer DEFAULT 0 NOT NULL,
    "last_cared_at" timestamp with time zone,
    "hatch_ends_at" timestamp with time zone,
    "cd_feed_ends_at" timestamp with time zone,
    "cd_clean_ends_at" timestamp with time zone,
    "cd_play_ends_at" timestamp with time zone,
    "unspent_points" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "last_hunger_decay_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "magi" integer DEFAULT 0 NOT NULL,
    "personality_id" "uuid",
    "personality_key" "text",
    "mana" integer DEFAULT 0 NOT NULL,
    "nickname" "text",
    "location" "text" DEFAULT 'storage'::"text" NOT NULL,
    "hatchery_slot_index" integer,
    "species" "text",
    "description" "text",
    "growth_strong_stats" "text"[],
    "growth_weak_stat" "text",
    "hatch_time_alignment" "text",
    "clean" integer DEFAULT 50 NOT NULL,
    "happy" integer DEFAULT 50 NOT NULL,
    "comfort" integer DEFAULT 50 NOT NULL,
    "rest" integer DEFAULT 50 NOT NULL,
    "neglect_hours" integer DEFAULT 0 NOT NULL,
    "ran_away" boolean DEFAULT false NOT NULL,
    "runaway_at" timestamp with time zone,
    "last_care_decay_at" timestamp with time zone,
    "last_fed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cd_bond_ends_at" timestamp with time zone,
    "passive_trait_id" "uuid",
    "passive_trait_key" "text",
    "mutation_capacity" smallint DEFAULT 4 NOT NULL,
    "cd_pet_ends_at" timestamp with time zone,
    "pending_hatch_minutes" integer,
    "rarity" "text",
    "is_rescue_reroll" boolean DEFAULT false NOT NULL,
    CONSTRAINT "pets_clean_check" CHECK ((("clean" >= 0) AND ("clean" <= 50))),
    CONSTRAINT "pets_comfort_check" CHECK ((("comfort" >= 0) AND ("comfort" <= 50))),
    CONSTRAINT "pets_energy_check" CHECK ((("energy" >= 0) AND ("energy" <= 100))),
    CONSTRAINT "pets_happy_check" CHECK ((("happy" >= 0) AND ("happy" <= 50))),
    CONSTRAINT "pets_hatchery_slot_index_check" CHECK ((("hatchery_slot_index" IS NULL) OR (("hatchery_slot_index" >= 1) AND ("hatchery_slot_index" <= 10)))),
    CONSTRAINT "pets_hunger_check" CHECK ((("hunger" >= 0) AND ("hunger" <= 50))),
    CONSTRAINT "pets_level_check" CHECK ((("level" >= 0) AND ("level" <= 10))),
    CONSTRAINT "pets_location_valid_check" CHECK (("location" = ANY (ARRAY['hatchery'::"text", 'active'::"text", 'storage'::"text", 'inventory'::"text", 'party'::"text"]))),
    CONSTRAINT "pets_mutation_capacity_check" CHECK ((("mutation_capacity" >= 1) AND ("mutation_capacity" <= 4))),
    CONSTRAINT "pets_neglect_hours_check" CHECK (("neglect_hours" >= 0)),
    CONSTRAINT "pets_nickname_len_check" CHECK ((("nickname" IS NULL) OR ("char_length"("nickname") <= 24))),
    CONSTRAINT "pets_rarity_check" CHECK ((("rarity" IS NULL) OR ("rarity" = ANY (ARRAY['common'::"text", 'uncommon'::"text", 'rare'::"text", 'epic'::"text"])))),
    CONSTRAINT "pets_rest_check" CHECK ((("rest" >= 0) AND ("rest" <= 50))),
    CONSTRAINT "pets_unspent_points_nonneg" CHECK (("unspent_points" >= 0))
);


ALTER TABLE "public"."pets" OWNER TO "postgres";


COMMENT ON TABLE "public"."pets" IS 'CORE: Main Kith table. Active. Do not drop.';



COMMENT ON COLUMN "public"."pets"."energy" IS 'Energy stat defaults to 50 and is capped at 50 to match care stat balance';



COMMENT ON COLUMN "public"."pets"."growth_strong_stats" IS 'Stat strengths rolled from the egg preview and locked in at hatch.';



COMMENT ON COLUMN "public"."pets"."growth_weak_stat" IS 'Stat weakness rolled from the egg preview and locked in at hatch.';



COMMENT ON COLUMN "public"."pets"."clean" IS 'Pet cleanliness stat (0-100). Decays over time if not cared for.';



COMMENT ON COLUMN "public"."pets"."happy" IS 'Pet happiness stat (0-100). Increases with play interactions.';



COMMENT ON COLUMN "public"."pets"."neglect_hours" IS 'Hours the pet has been neglected. Increments when care stats are critically low.';



COMMENT ON COLUMN "public"."pets"."ran_away" IS 'Whether the pet has run away due to neglect. Can be recovered through special actions.';



COMMENT ON COLUMN "public"."pets"."pending_hatch_minutes" IS 'Rolled incubation length in minutes for an egg sitting in inventory or storage, not yet started. Cleared once hatch_ends_at is set.';



COMMENT ON COLUMN "public"."pets"."rarity" IS 'Species rarity: common, uncommon, rare, or epic. Starter species are always epic.';



COMMENT ON CONSTRAINT "pets_clean_check" ON "public"."pets" IS 'Care stats cap at 50 to allow balanced decay and future expansion';



COMMENT ON CONSTRAINT "pets_happy_check" ON "public"."pets" IS 'Care stats cap at 50 to allow balanced decay and future expansion';



COMMENT ON CONSTRAINT "pets_hunger_check" ON "public"."pets" IS 'Care stats cap at 50 to allow balanced decay and future expansion';



CREATE OR REPLACE FUNCTION "public"."hatch_pet"("p_user_id" "uuid", "p_egg_id" "uuid", "p_iv_hp" integer, "p_iv_atk" integer, "p_iv_def" integer, "p_iv_spd" integer, "p_iv_magi" integer, "p_iv_mana" integer, "p_gender" "text", "p_personality_id" "uuid", "p_personality_key" "text", "p_hatchling_name" "text", "p_description" "text", "p_growth_strong_stats" "text"[], "p_growth_weak_stat" "text", "p_hatch_time_alignment" "text", "p_line" "public"."elemental_line") RETURNS TABLE("pet_row" "public"."pets", "success" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

  RETURN QUERY SELECT pet_row, true, NULL::text;
END;
$$;


ALTER FUNCTION "public"."hatch_pet"("p_user_id" "uuid", "p_egg_id" "uuid", "p_iv_hp" integer, "p_iv_atk" integer, "p_iv_def" integer, "p_iv_spd" integer, "p_iv_magi" integer, "p_iv_mana" integer, "p_gender" "text", "p_personality_id" "uuid", "p_personality_key" "text", "p_hatchling_name" "text", "p_description" "text", "p_growth_strong_stats" "text"[], "p_growth_weak_stat" "text", "p_hatch_time_alignment" "text", "p_line" "public"."elemental_line") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hide_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if p_location_key not in (
    'hatchery-back',
    'profile',
    'pet',
    'food-merchant'
  ) then
    return false;
  end if;

  update public.poe_tay_toe_state
  set
    current_location_key = p_location_key,
    hidden_by_user_id = p_user_id,
    hidden_at = now(),
    claimed_by_user_id = null,
    claimed_at = null,
    updated_at = now()
  where id = 1
    and claimed_by_user_id = p_user_id;

  return found;
end;
$$;


ALTER FUNCTION "public"."hide_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_pve_research_stats"("p_user_id" "uuid", "p_instabilities_cleared" integer DEFAULT 0, "p_fights_won" integer DEFAULT 0, "p_bosses_defeated" integer DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."increment_pve_research_stats"("p_user_id" "uuid", "p_instabilities_cleared" integer, "p_fights_won" integer, "p_bosses_defeated" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_wallet"("p_user_id" "uuid", "p_dots" integer DEFAULT 0, "p_crystals" integer DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."increment_wallet"("p_user_id" "uuid", "p_dots" integer, "p_crystals" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_signup_trigger_error"("p_user_id" "uuid", "p_email" "text", "p_step" "text", "p_error_message" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  insert into public.signup_trigger_errors (user_id, email, step, error_message)
  values (p_user_id, p_email, p_step, p_error_message);
$$;


ALTER FUNCTION "public"."log_signup_trigger_error"("p_user_id" "uuid", "p_email" "text", "p_step" "text", "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."open_closed_alpha_care_package"("p_user_id" "uuid") RETURNS TABLE("opened" boolean, "dots" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_item_id uuid;
  v_dots integer;
begin
  select id
  into v_item_id
  from public.item_defs
  where slug = 'closed-alpha-care-package';

  if v_item_id is null then
    raise exception 'Closed Alpha Care Package item definition is missing';
  end if;

  update public.inventory
  set
    qty = qty - 1,
    updated_at = now()
  where user_id = p_user_id
    and item_id = v_item_id
    and qty > 0;

  if not found then
    select coalesce(wallets.dots, 0)
    into v_dots
    from public.wallets as wallets
    where wallets.user_id = p_user_id;

    return query select false, coalesce(v_dots, 0);
    return;
  end if;

  insert into public.wallets (user_id, dots)
  values (p_user_id, 1000)
  on conflict (user_id) do update
  set
    dots = public.wallets.dots + 1000,
    updated_at = now()
  returning public.wallets.dots into v_dots;

  insert into public.wallet_ledger (user_id, currency, delta, reason)
  values (p_user_id, 'dots', 1000, 'closed_alpha_care_package');

  return query select true, v_dots;
end;
$$;


ALTER FUNCTION "public"."open_closed_alpha_care_package"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_locked_velune_activation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."prevent_locked_velune_activation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_locked_velune_party_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."prevent_locked_velune_party_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_personality_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  -- If it was set before, don't allow changing it
  if old.personality_id is not null and new.personality_id is distinct from old.personality_id then
    raise exception 'Personality is permanent and cannot be changed.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_personality_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_profile_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."prevent_profile_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."prevent_role_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_kith_discovery_from_pet"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."record_kith_discovery_from_pet"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recover_runaway_pet_to_party"("p_user_id" "uuid", "p_pet_id" "uuid") RETURNS TABLE("party_slot" integer, "destination" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."recover_runaway_pet_to_party"("p_user_id" "uuid", "p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_test_runaway_pets"("p_confirm_text" "text" DEFAULT 'DRY_RUN'::"text") RETURNS TABLE("action" "text", "email" "text", "user_id" "uuid", "pet_id" "uuid", "pet_name" "text", "species" "text", "old_ran_away" boolean, "old_runaway_at" timestamp with time zone, "old_is_active" boolean, "old_location" "text", "new_ran_away" boolean, "new_runaway_at" timestamp with time zone, "new_is_active" boolean, "new_location" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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


ALTER FUNCTION "public"."restore_test_runaway_pets"("p_confirm_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."roll_velune_encounter"("p_user_id" "uuid", "p_location_key" "text", "p_sighting_roll" integer, "p_egg_roll" integer, "p_bypass_cooldown" boolean DEFAULT false) RETURNS TABLE("attempted" boolean, "sighted" boolean, "egg_awarded" boolean, "reason" "text", "retry_after_ms" integer, "egg_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."roll_velune_encounter"("p_user_id" "uuid", "p_location_key" "text", "p_sighting_roll" integer, "p_egg_roll" integer, "p_bypass_cooldown" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_homepage_alerts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_homepage_alerts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."spend_wallet"("p_user_id" "uuid", "p_dots" integer DEFAULT 0, "p_crystals" integer DEFAULT 0) RETURNS boolean
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."spend_wallet"("p_user_id" "uuid", "p_dots" integer, "p_crystals" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eggs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "starter_element" "public"."elemental_line" NOT NULL,
    "hatch_ready_at" timestamp with time zone NOT NULL,
    "hatched_at" timestamp with time zone,
    "pet_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."eggs" OWNER TO "postgres";


COMMENT ON TABLE "public"."eggs" IS 'CORE: Egg and hatch tracking. Active. Do not drop.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "username" "text",
    "display_name" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "email" "text",
    "alpha_ribbon_awarded" boolean DEFAULT false NOT NULL,
    "daily_care_completed_at" timestamp with time zone,
    "timezone" "text",
    "intro_seen" boolean DEFAULT false NOT NULL,
    "intro_cutscene_completed" boolean DEFAULT false NOT NULL,
    "hatchery_initialized" boolean DEFAULT false NOT NULL,
    "active_title" "text",
    "starter_cleanup_affected" boolean DEFAULT false NOT NULL,
    "starter_cleanup_notice_seen" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_email_format_check" CHECK ((("email" IS NULL) OR ("email" ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'::"text"))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'CORE: User profile table. Active. Do not drop.';



CREATE OR REPLACE VIEW "admin"."profiles_with_starter_pet" AS
 WITH "starter_egg" AS (
         SELECT DISTINCT ON ("e"."user_id") "e"."user_id",
            "e"."id" AS "egg_id",
            "e"."pet_id",
            "e"."starter_element",
            "e"."created_at" AS "egg_created_at",
            "e"."hatched_at" AS "egg_hatched_at"
           FROM "public"."eggs" "e"
          ORDER BY "e"."user_id", "e"."created_at"
        ), "first_pet" AS (
         SELECT DISTINCT ON ("p"."user_id") "p"."user_id",
            "p"."id" AS "pet_id",
            "p"."name",
            "p"."nickname",
            "p"."species",
            "p"."line",
            "p"."stage",
            "p"."created_at",
            "p"."hatched_at"
           FROM "public"."pets" "p"
          ORDER BY "p"."user_id", "p"."created_at"
        )
 SELECT "pr"."user_id",
    "pr"."username",
    "pr"."display_name",
    "pr"."email",
    "pr"."is_admin",
    "pr"."role",
    "pr"."created_at",
    "pr"."updated_at",
    "pr"."alpha_ribbon_awarded",
    "pr"."daily_care_completed_at",
    "pr"."timezone",
    "pr"."intro_seen",
    "pr"."intro_cutscene_completed",
    "pr"."hatchery_initialized",
    "se"."egg_id" AS "starter_egg_id",
    "se"."pet_id" AS "starter_egg_pet_id",
    COALESCE("ep"."id", "fp"."pet_id") AS "starter_pet_id",
    COALESCE("ep"."species", "fp"."species") AS "starter_pet_species",
    COALESCE("ep"."nickname", "ep"."name", "fp"."nickname", "fp"."name") AS "starter_pet_name",
    COALESCE(("ep"."line")::"text", ("fp"."line")::"text", ("se"."starter_element")::"text") AS "starter_pet_element",
    COALESCE(("ep"."stage")::"text", ("fp"."stage")::"text") AS "starter_pet_stage",
    ("se"."starter_element")::"text" AS "starter_egg_element",
    "se"."egg_hatched_at",
    COALESCE("ep"."hatched_at", "fp"."hatched_at") AS "starter_pet_hatched_at",
        CASE
            WHEN (("pr"."username" IS NULL) AND ("pr"."display_name" IS NULL) AND ("pr"."email" IS NULL)) THEN 'profile_identity_null'::"text"
            WHEN (("se"."user_id" IS NULL) AND ("fp"."pet_id" IS NULL)) THEN 'no_egg_no_pet'::"text"
            WHEN (("se"."pet_id" IS NULL) AND ("fp"."pet_id" IS NULL)) THEN 'egg_exists_pet_id_null'::"text"
            WHEN (("se"."pet_id" IS NOT NULL) AND ("ep"."id" IS NULL)) THEN 'egg_pet_link_broken'::"text"
            WHEN (COALESCE("ep"."species", "fp"."species") IS NULL) THEN 'pet_exists_species_null'::"text"
            ELSE 'ok'::"text"
        END AS "starter_pet_status"
   FROM ((("public"."profiles" "pr"
     LEFT JOIN "starter_egg" "se" ON (("se"."user_id" = "pr"."user_id")))
     LEFT JOIN "public"."pets" "ep" ON (("ep"."id" = "se"."pet_id")))
     LEFT JOIN "first_pet" "fp" ON (("fp"."user_id" = "pr"."user_id")));


ALTER VIEW "admin"."profiles_with_starter_pet" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_user_starters" AS
 WITH "pet_counts" AS (
         SELECT "p"."user_id",
            ("count"(*))::integer AS "pet_count"
           FROM "public"."pets" "p"
          GROUP BY "p"."user_id"
        ), "starter_pets" AS (
         SELECT DISTINCT ON ("p"."user_id") "p"."id",
            "p"."user_id",
            "p"."name",
            "p"."line",
            "p"."stage",
            "p"."level",
            "p"."xp",
            "p"."hatched_at",
            "p"."hunger",
            "p"."energy",
            "p"."atk",
            "p"."def",
            "p"."spd",
            "p"."hp_max",
            "p"."hp_cur",
            "p"."age",
            "p"."created_at",
            "p"."updated_at",
            "p"."gender",
            "p"."bond",
            "p"."last_cared_at",
            "p"."hatch_ends_at",
            "p"."cd_feed_ends_at",
            "p"."cd_clean_ends_at",
            "p"."cd_play_ends_at",
            "p"."unspent_points",
            "p"."is_active",
            "p"."last_hunger_decay_at",
            "p"."magi",
            "p"."personality_id",
            "p"."personality_key",
            "p"."mana",
            "p"."nickname",
            "p"."location",
            "p"."hatchery_slot_index",
            "p"."species",
            "p"."description",
            "p"."growth_strong_stats",
            "p"."growth_weak_stat",
            "p"."hatch_time_alignment",
            "p"."clean",
            "p"."happy",
            "p"."comfort",
            "p"."rest",
            "p"."neglect_hours",
            "p"."ran_away",
            "p"."runaway_at",
            "p"."last_care_decay_at",
            "p"."last_fed_at",
            "p"."cd_bond_ends_at",
            "p"."passive_trait_id",
            "p"."passive_trait_key",
            "p"."mutation_capacity",
            "p"."cd_pet_ends_at"
           FROM "public"."pets" "p"
          ORDER BY "p"."user_id", "p"."created_at", "p"."id"
        )
 SELECT "u"."id" AS "user_id",
    COALESCE(NULLIF("pr"."display_name", ''::"text"), NULLIF(("u"."raw_user_meta_data" ->> 'display_name'::"text"), ''::"text"), NULLIF(("u"."raw_user_meta_data" ->> 'name'::"text"), ''::"text"), NULLIF(("u"."raw_user_meta_data" ->> 'username'::"text"), ''::"text"), '-'::"text") AS "display_name",
    COALESCE(NULLIF("pr"."email", ''::"text"), NULLIF(("u"."email")::"text", ''::"text"), '-'::"text") AS "email",
    "u"."created_at" AS "user_created_at",
    "u"."last_sign_in_at",
    COALESCE("pc"."pet_count", 0) AS "pet_count",
    ("sp"."id" IS NOT NULL) AS "owns_pet",
    "sp"."id" AS "starter_pet_id",
    COALESCE(NULLIF("sp"."species", ''::"text"), '-'::"text") AS "starter_species_key",
        CASE COALESCE(NULLIF("sp"."species", ''::"text"), ''::"text")
            WHEN 'water_starter'::"text" THEN 'Mizu'::"text"
            WHEN 'fire_starter'::"text" THEN 'Kindlekin'::"text"
            WHEN 'earth_starter'::"text" THEN 'Twiglet'::"text"
            WHEN 'air_starter'::"text" THEN 'Wistpip'::"text"
            WHEN 'ice_starter'::"text" THEN 'Cribi'::"text"
            WHEN 'storm_starter'::"text" THEN 'Volb'::"text"
            WHEN 'light_starter'::"text" THEN 'Solen'::"text"
            WHEN 'shadow_day_good'::"text" THEN 'Esperon'::"text"
            WHEN 'shadow_night_bad'::"text" THEN 'Esperon'::"text"
            ELSE COALESCE(NULLIF("sp"."species", ''::"text"),
            CASE
                WHEN ("sp"."line" IS NOT NULL) THEN "initcap"("replace"(("sp"."line")::"text", '_'::"text", ' '::"text"))
                ELSE NULL::"text"
            END, '-'::"text")
        END AS "starter_species",
    COALESCE(NULLIF("sp"."nickname", ''::"text"), NULLIF("sp"."name", ''::"text"), '-'::"text") AS "starter_nickname",
    COALESCE(NULLIF(("sp"."line")::"text", ''::"text"), '-'::"text") AS "starter_element",
    COALESCE(NULLIF(("sp"."stage")::"text", ''::"text"), '-'::"text") AS "starter_stage",
        CASE
            WHEN (("sp"."species" = 'water_starter'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Water Egg'::"text"
            WHEN (("sp"."species" = 'water_starter'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Mizu'::"text"
            WHEN (("sp"."species" = 'water_starter'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Mizule'::"text"
            WHEN (("sp"."species" = 'water_starter'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Zulelon'::"text"
            WHEN (("sp"."species" = 'water_starter'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Aquilyth'::"text"
            WHEN (("sp"."species" = 'fire_starter'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Fire Egg'::"text"
            WHEN (("sp"."species" = 'fire_starter'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Kindlekin'::"text"
            WHEN (("sp"."species" = 'fire_starter'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Moltikyn'::"text"
            WHEN (("sp"."species" = 'fire_starter'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Magnakyn'::"text"
            WHEN (("sp"."species" = 'fire_starter'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Lavakyn'::"text"
            WHEN (("sp"."species" = 'earth_starter'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Earth Egg'::"text"
            WHEN (("sp"."species" = 'earth_starter'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Twiglet'::"text"
            WHEN (("sp"."species" = 'earth_starter'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Rootle'::"text"
            WHEN (("sp"."species" = 'earth_starter'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Radaroot'::"text"
            WHEN (("sp"."species" = 'earth_starter'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Roovine'::"text"
            WHEN (("sp"."species" = 'air_starter'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Air Egg'::"text"
            WHEN (("sp"."species" = 'air_starter'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Wistpip'::"text"
            WHEN (("sp"."species" = 'air_starter'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Zephyx'::"text"
            WHEN (("sp"."species" = 'air_starter'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Phyxlion'::"text"
            WHEN (("sp"."species" = 'air_starter'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Phyxion'::"text"
            WHEN (("sp"."species" = 'ice_starter'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Ice Egg'::"text"
            WHEN (("sp"."species" = 'ice_starter'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Cribi'::"text"
            WHEN (("sp"."species" = 'ice_starter'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Cribit'::"text"
            WHEN (("sp"."species" = 'ice_starter'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Crabbit'::"text"
            WHEN (("sp"."species" = 'ice_starter'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Crionyx'::"text"
            WHEN (("sp"."species" = 'storm_starter'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Storm Egg'::"text"
            WHEN (("sp"."species" = 'storm_starter'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Volb'::"text"
            WHEN (("sp"."species" = 'storm_starter'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Voltlet'::"text"
            WHEN (("sp"."species" = 'storm_starter'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Tovote'::"text"
            WHEN (("sp"."species" = 'storm_starter'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Voltaris'::"text"
            WHEN (("sp"."species" = 'light_starter'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Light Egg'::"text"
            WHEN (("sp"."species" = 'light_starter'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Solen'::"text"
            WHEN (("sp"."species" = 'light_starter'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Solkit'::"text"
            WHEN (("sp"."species" = 'light_starter'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Solaryn'::"text"
            WHEN (("sp"."species" = 'light_starter'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Angelyx'::"text"
            WHEN (("sp"."species" = 'shadow_day_good'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Day Shadow Egg'::"text"
            WHEN (("sp"."species" = 'shadow_day_good'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Esperon'::"text"
            WHEN (("sp"."species" = 'shadow_day_good'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Flareclaw'::"text"
            WHEN (("sp"."species" = 'shadow_day_good'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Shadeclaw'::"text"
            WHEN (("sp"."species" = 'shadow_day_good'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Nightvielclaw'::"text"
            WHEN (("sp"."species" = 'shadow_night_bad'::"text") AND (("sp"."stage")::"text" = 'egg'::"text")) THEN 'Night Shadow Egg'::"text"
            WHEN (("sp"."species" = 'shadow_night_bad'::"text") AND (("sp"."stage")::"text" = 'hatchling'::"text")) THEN 'Esperon'::"text"
            WHEN (("sp"."species" = 'shadow_night_bad'::"text") AND (("sp"."stage")::"text" = 'lowform'::"text")) THEN 'Noctimp'::"text"
            WHEN (("sp"."species" = 'shadow_night_bad'::"text") AND (("sp"."stage")::"text" = 'highform'::"text")) THEN 'Nightmareimp'::"text"
            WHEN (("sp"."species" = 'shadow_night_bad'::"text") AND (("sp"."stage")::"text" = 'legion'::"text")) THEN 'Espereonite'::"text"
            ELSE COALESCE(NULLIF("sp"."name", ''::"text"), NULLIF("sp"."nickname", ''::"text"), '-'::"text")
        END AS "starter_current_form",
    "sp"."created_at" AS "starter_created_at"
   FROM ((("auth"."users" "u"
     LEFT JOIN "public"."profiles" "pr" ON (("pr"."user_id" = "u"."id")))
     LEFT JOIN "pet_counts" "pc" ON (("pc"."user_id" = "u"."id")))
     LEFT JOIN "starter_pets" "sp" ON (("sp"."user_id" = "u"."id")));


ALTER VIEW "public"."admin_user_starters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aliune_signal_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "condition" "text" NOT NULL,
    "region" "text" NOT NULL,
    "corruption" "text" NOT NULL,
    "report_text" "text" NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "report_age_days" integer,
    "town" "text",
    CONSTRAINT "aliune_signal_reports_condition_check" CHECK (("condition" = ANY (ARRAY['stable'::"text", 'unbalanced'::"text", 'unstable'::"text"]))),
    CONSTRAINT "aliune_signal_reports_corruption_check" CHECK (("corruption" = ANY (ARRAY['none'::"text", 'low'::"text", 'rising'::"text", 'high'::"text", 'too high'::"text"]))),
    CONSTRAINT "aliune_signal_reports_valid_window" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."aliune_signal_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."aliune_signal_reports" IS 'REVIEW: Current Aliune Signal report table if frontend uses this.';



CREATE TABLE IF NOT EXISTS "public"."aliune_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "condition" "text" NOT NULL,
    "region" "text" NOT NULL,
    "corruption" "text" NOT NULL,
    "report_age_days" integer DEFAULT 0 NOT NULL,
    "report_text" "text" NOT NULL,
    "portal_event" boolean DEFAULT false NOT NULL,
    "irregular_eggs" boolean DEFAULT false NOT NULL,
    "corrupted_egg_bonus" numeric(5,2) DEFAULT 0.10 NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "aliune_signals_condition_check" CHECK (("condition" = ANY (ARRAY['stable'::"text", 'unbalanced'::"text", 'unstable'::"text"]))),
    CONSTRAINT "aliune_signals_corruption_check" CHECK (("corruption" = ANY (ARRAY['low'::"text", 'rising'::"text", 'high'::"text", 'too high'::"text"]))),
    CONSTRAINT "aliune_signals_region_check" CHECK (("region" = ANY (ARRAY['Starweald Rise'::"text", 'Ashfall Coast'::"text", 'Moonroot Fen'::"text", 'Thornmere Hollow'::"text"]))),
    CONSTRAINT "aliune_signals_report_age_days_check" CHECK (("report_age_days" >= 0)),
    CONSTRAINT "aliune_signals_valid_window" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."aliune_signals" OWNER TO "postgres";


COMMENT ON TABLE "public"."aliune_signals" IS 'REVIEW: Possible duplicate/older Aliune Signal table.';



CREATE TABLE IF NOT EXISTS "public"."alpha_systems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "enabled" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "released_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alpha_systems" OWNER TO "postgres";


COMMENT ON TABLE "public"."alpha_systems" IS 'HOMEPAGE: Alpha systems list.';



CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "page_scope" "text" DEFAULT 'homepage'::"text" NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcements" IS 'HOMEPAGE: Announcement panel content.';



CREATE TABLE IF NOT EXISTS "public"."awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "icon_url" "text",
    "rarity" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "awards_type_check" CHECK (("type" = ANY (ARRAY['ribbon'::"text", 'trophy'::"text"])))
);


ALTER TABLE "public"."awards" OWNER TO "postgres";


COMMENT ON TABLE "public"."awards" IS 'PARKED: Future award/ribbon system.';



CREATE TABLE IF NOT EXISTS "public"."battle_run_fights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "fight_number" integer NOT NULL,
    "kind" "public"."fight_kind" DEFAULT 'normal'::"public"."fight_kind" NOT NULL,
    "enemy_level" integer DEFAULT 1 NOT NULL,
    "enemy_line" "public"."elemental_line",
    "result" "text" NOT NULL,
    "reward" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "battle_run_fights_fight_number_check" CHECK ((("fight_number" >= 1) AND ("fight_number" <= 6))),
    CONSTRAINT "battle_run_fights_result_check" CHECK (("result" = ANY (ARRAY['pending'::"text", 'won'::"text", 'lost'::"text"])))
);


ALTER TABLE "public"."battle_run_fights" OWNER TO "postgres";


COMMENT ON TABLE "public"."battle_run_fights" IS 'CORE: Individual battle fights. Active/Alpha.';



CREATE TABLE IF NOT EXISTS "public"."battle_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_fight" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "battle_runs_current_fight_check" CHECK ((("current_fight" >= 1) AND ("current_fight" <= 6))),
    CONSTRAINT "battle_runs_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'won'::"text", 'lost'::"text"])))
);


ALTER TABLE "public"."battle_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."battle_runs" IS 'CORE: Battle dungeon run tracking. Active/Alpha.';



CREATE TABLE IF NOT EXISTS "public"."daily_care" (
    "user_id" "uuid" NOT NULL,
    "last_completed_at" timestamp with time zone,
    "streak" integer DEFAULT 0 NOT NULL,
    "alpha_ribbon_awarded" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_date_eastern" "date",
    "completed_delta_day" integer,
    CONSTRAINT "daily_care_streak_nonnegative" CHECK (("streak" >= 0))
);


ALTER TABLE "public"."daily_care" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_login_rewards" (
    "id" "uuid" NOT NULL,
    "streak" integer DEFAULT 0 NOT NULL,
    "last_claimed_at" timestamp with time zone,
    "potato_received" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."daily_login_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."element_defs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."element_defs" OWNER TO "postgres";


COMMENT ON TABLE "public"."element_defs" IS 'PARKED: Normalized element definitions. Future replacement for hardcoded elements.';



CREATE TABLE IF NOT EXISTS "public"."game_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."game_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."game_config" IS 'PARKED: Global config store. Keep for future tuning.';



CREATE TABLE IF NOT EXISTS "public"."hatchery_shelf_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slot_index" integer NOT NULL,
    "unlocked" boolean DEFAULT false NOT NULL,
    "item_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hatchery_shelf_slots_slot_index_check" CHECK ((("slot_index" >= 1) AND ("slot_index" <= 10)))
);


ALTER TABLE "public"."hatchery_shelf_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."hatchery_shelf_slots" IS 'PARKED: Possible old/future hatchery shelf slot system.';



CREATE TABLE IF NOT EXISTS "public"."hatchery_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slot_index" integer NOT NULL,
    "unlocked" boolean DEFAULT false NOT NULL,
    "pet_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hatchery_slots_slot_index_check" CHECK ((("slot_index" >= 1) AND ("slot_index" <= 10)))
);


ALTER TABLE "public"."hatchery_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."hatchery_slots" IS 'PARKED: Hatchery slot system. Verify current code before changing.';



CREATE TABLE IF NOT EXISTS "public"."home_objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "x" integer DEFAULT 0 NOT NULL,
    "y" integer DEFAULT 0 NOT NULL,
    "rotation" integer DEFAULT 0 NOT NULL,
    "placed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."home_objects" OWNER TO "postgres";


COMMENT ON TABLE "public"."home_objects" IS 'PARKED: Future room/home placement system.';



CREATE TABLE IF NOT EXISTS "public"."homepage_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message" "text" NOT NULL,
    "alert_color" "text" DEFAULT 'yellow'::"text" NOT NULL,
    "alert_type" "text" DEFAULT 'news'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "cta_label" "text",
    "cta_href" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "homepage_alerts_alert_color_check" CHECK (("alert_color" = ANY (ARRAY['yellow'::"text", 'red'::"text", 'blue'::"text", 'pink'::"text", 'green'::"text"]))),
    CONSTRAINT "homepage_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['news'::"text", 'event'::"text", 'weather'::"text", 'market'::"text", 'anomaly'::"text", 'funny'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."homepage_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."homepage_alerts" IS 'HOMEPAGE: Aliune Signal/banner alerts.';



CREATE OR REPLACE VIEW "public"."homepage_alerts_live" WITH ("security_invoker"='true') AS
 SELECT "id",
    "message",
    "alert_color",
    "alert_type",
    "cta_label",
    "cta_href",
    "starts_at",
    "ends_at",
    "updated_at"
   FROM "public"."homepage_alerts"
  WHERE (("is_active" = true) AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"())))
  ORDER BY "updated_at" DESC, "created_at" DESC;


ALTER VIEW "public"."homepage_alerts_live" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."homepage_aliune_signal_live" WITH ("security_invoker"='true') AS
 SELECT "id",
    "condition",
    "region",
    "corruption",
    "report_text",
    "report_age_days",
    "start_time",
    "end_time",
    "starts_at",
    "ends_at",
    "created_at",
    "updated_at"
   FROM "public"."aliune_signal_reports"
  WHERE (("enabled" = true) AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"())))
  ORDER BY COALESCE("starts_at", "created_at") DESC, "created_at" DESC;


ALTER VIEW "public"."homepage_aliune_signal_live" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."homepage_alpha_systems_live" WITH ("security_invoker"='true') AS
 SELECT "id",
    "title",
    "description",
    "sort_order",
    "released_at",
    "created_at"
   FROM "public"."alpha_systems"
  WHERE ("enabled" = true)
  ORDER BY "sort_order", "released_at" DESC, "created_at" DESC;


ALTER VIEW "public"."homepage_alpha_systems_live" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."homepage_announcements_live" WITH ("security_invoker"='true') AS
 SELECT "id",
    "title",
    "body",
    "created_at",
    "updated_at"
   FROM "public"."announcements"
  WHERE (("is_published" = true) AND ("page_scope" = 'homepage'::"text"))
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."homepage_announcements_live" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homepage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "public"."log_category" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "patch_html" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."homepage_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."homepage_logs" IS 'HOMEPAGE: Patch/next log display.';



CREATE TABLE IF NOT EXISTS "public"."patch_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" "text" NOT NULL,
    "title" "text",
    "summary" "text",
    "body" "text",
    "is_published" boolean DEFAULT true NOT NULL,
    "released_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "new_notes" "text",
    "updated_notes" "text",
    "fixed_notes" "text",
    "notes" "text"
);


ALTER TABLE "public"."patch_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."patch_notes" IS 'HOMEPAGE: Versioned patch notes.';



CREATE OR REPLACE VIEW "public"."homepage_patch_notes_live" WITH ("security_invoker"='true') AS
 SELECT "id",
    "version",
    "title",
    "summary",
    "released_at",
    "created_at",
    "new_notes",
    "updated_notes",
    "fixed_notes",
    "notes"
   FROM "public"."patch_notes"
  WHERE ("is_published" = true)
  ORDER BY "released_at" DESC, "created_at" DESC;


ALTER VIEW "public"."homepage_patch_notes_live" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "qty" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pet_id" "uuid",
    CONSTRAINT "inventory_qty_check" CHECK (("qty" >= 0))
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory" IS 'CORE: User inventory. Active.';



CREATE TABLE IF NOT EXISTS "public"."item_defs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."item_type" NOT NULL,
    "description" "text",
    "rarity" integer DEFAULT 1 NOT NULL,
    "stack_limit" integer DEFAULT 999 NOT NULL,
    "effects" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "item_defs_rarity_check" CHECK ((("rarity" >= 1) AND ("rarity" <= 5)))
);


ALTER TABLE "public"."item_defs" OWNER TO "postgres";


COMMENT ON TABLE "public"."item_defs" IS 'CORE: Item definitions. Active.';



CREATE TABLE IF NOT EXISTS "public"."legendary_kith_event_state" (
    "user_id" "uuid" NOT NULL,
    "legendary_key" "text" NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "sighting_count" integer DEFAULT 0 NOT NULL,
    "egg_obtained_at" timestamp with time zone,
    "egg_pet_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "legendary_kith_event_state_completion_check" CHECK (((("egg_obtained_at" IS NULL) AND ("egg_pet_id" IS NULL)) OR (("egg_obtained_at" IS NOT NULL) AND ("egg_pet_id" IS NOT NULL)))),
    CONSTRAINT "legendary_kith_event_state_sighting_count_check" CHECK (("sighting_count" >= 0)),
    CONSTRAINT "legendary_kith_event_state_velune_key_check" CHECK (("legendary_key" = 'velune'::"text"))
);


ALTER TABLE "public"."legendary_kith_event_state" OWNER TO "postgres";


COMMENT ON TABLE "public"."legendary_kith_event_state" IS 'Durable server-owned eligibility and completion state for one-time Legendary Kith events.';



CREATE TABLE IF NOT EXISTS "public"."mutations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "rarity" "text" NOT NULL,
    "description" "text" NOT NULL,
    "effect_summary" "text" NOT NULL,
    "drawback_summary" "text",
    "effects" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mutations_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'uncommon'::"text", 'rare'::"text", 'legendary'::"text"])))
);


ALTER TABLE "public"."mutations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."party_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slot_index" integer NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "party_slots_slot_index_check" CHECK ((("slot_index" >= 1) AND ("slot_index" <= 4)))
);


ALTER TABLE "public"."party_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."party_slots" IS 'CORE: Active team/party slots. Active. Do not drop.';



CREATE TABLE IF NOT EXISTS "public"."passive_traits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "stat_key" "text" NOT NULL,
    "rarity" "text" NOT NULL,
    "description" "text" NOT NULL,
    "effect_summary" "text" NOT NULL,
    "effects" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "passive_traits_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'uncommon'::"text", 'rare'::"text", 'legendary'::"text"]))),
    CONSTRAINT "passive_traits_stat_key_check" CHECK (("stat_key" = ANY (ARRAY['hp'::"text", 'atk'::"text", 'def'::"text", 'spd'::"text", 'magi'::"text", 'mana'::"text"])))
);


ALTER TABLE "public"."passive_traits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personalities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "definition" "text" NOT NULL,
    "modifiers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."personalities" OWNER TO "postgres";


COMMENT ON TABLE "public"."personalities" IS 'CORE: Pet personality definitions. Active. Do not drop.';



CREATE TABLE IF NOT EXISTS "public"."pet_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "award_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."pet_awards" OWNER TO "postgres";


COMMENT ON TABLE "public"."pet_awards" IS 'PARKED: Future earned pet awards.';



CREATE TABLE IF NOT EXISTS "public"."pet_element_affinities" (
    "pet_id" "uuid" NOT NULL,
    "element_id" "uuid" NOT NULL,
    "affinity" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pet_element_affinities_affinity_check" CHECK (("affinity" >= 0))
);


ALTER TABLE "public"."pet_element_affinities" OWNER TO "postgres";


COMMENT ON TABLE "public"."pet_element_affinities" IS 'PARKED: Normalized element affinities. Possible future replacement for pet_elements.';



CREATE TABLE IF NOT EXISTS "public"."pet_elements" (
    "pet_id" "uuid" NOT NULL,
    "null_element" integer DEFAULT 0 NOT NULL,
    "water" integer DEFAULT 0 NOT NULL,
    "fire" integer DEFAULT 0 NOT NULL,
    "earth" integer DEFAULT 0 NOT NULL,
    "air" integer DEFAULT 0 NOT NULL,
    "ice" integer DEFAULT 0 NOT NULL,
    "storm" integer DEFAULT 0 NOT NULL,
    "light" integer DEFAULT 0 NOT NULL,
    "shadow" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "pet_elements_check" CHECK (((NULL::integer >= 0) AND ("water" >= 0) AND ("fire" >= 0) AND ("earth" >= 0) AND ("air" >= 0) AND ("ice" >= 0) AND ("storm" >= 0) AND ("light" >= 0) AND ("shadow" >= 0)))
);


ALTER TABLE "public"."pet_elements" OWNER TO "postgres";


COMMENT ON TABLE "public"."pet_elements" IS 'CORE: Current elemental values. Active. Do not drop.';



CREATE TABLE IF NOT EXISTS "public"."pet_mutations" (
    "pet_id" "uuid" NOT NULL,
    "mutation_id" "uuid",
    "has_mutation" boolean NOT NULL,
    "roll_value" double precision NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slot_index" smallint DEFAULT 1 NOT NULL,
    CONSTRAINT "pet_mutations_check" CHECK (((("has_mutation" = true) AND ("mutation_id" IS NOT NULL)) OR (("has_mutation" = false) AND ("mutation_id" IS NULL)))),
    CONSTRAINT "pet_mutations_roll_value_check" CHECK ((("roll_value" >= (0)::double precision) AND ("roll_value" < (1)::double precision))),
    CONSTRAINT "pet_mutations_slot_index_check" CHECK ((("slot_index" >= 1) AND ("slot_index" <= 4)))
);


ALTER TABLE "public"."pet_mutations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_skills" (
    "pet_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "equipped" boolean DEFAULT false NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pet_skills" OWNER TO "postgres";


COMMENT ON TABLE "public"."pet_skills" IS 'CORE: Pet unlocked/equipped skills. Active.';



CREATE TABLE IF NOT EXISTS "public"."pet_stat_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "hp" integer DEFAULT 0 NOT NULL,
    "atk" integer DEFAULT 0 NOT NULL,
    "magi" integer DEFAULT 0 NOT NULL,
    "def" integer DEFAULT 0 NOT NULL,
    "spd" integer DEFAULT 0 NOT NULL,
    "mana" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "xp" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "pet_alloc_non_negative" CHECK (((COALESCE("hp", 0) >= 0) AND (COALESCE("atk", 0) >= 0) AND (COALESCE("def", 0) >= 0) AND (COALESCE("spd", 0) >= 0) AND (COALESCE("magi", 0) >= 0) AND (COALESCE("mana", 0) >= 0))),
    CONSTRAINT "pet_alloc_points_valid" CHECK ((("hp" >= 0) AND ("atk" >= 0) AND ("magi" >= 0) AND ("def" >= 0) AND ("spd" >= 0) AND ("mana" >= 0) AND ((("level" = 1) AND ((((((("hp" + "atk") + "magi") + "def") + "spd") + "mana") >= 0) AND (((((("hp" + "atk") + "magi") + "def") + "spd") + "mana") <= 30))) OR (("level" > 1) AND (((((("hp" + "atk") + "magi") + "def") + "spd") + "mana") = 1))))),
    CONSTRAINT "pet_stat_allocations_check" CHECK ((("hp" >= 0) AND ("atk" >= 0) AND ("magi" >= 0) AND ("def" >= 0) AND ("spd" >= 0) AND ("mana" >= 0))),
    CONSTRAINT "pet_stat_allocations_level_check" CHECK ((("level" >= 1) AND ("level" <= 10)))
);


ALTER TABLE "public"."pet_stat_allocations" OWNER TO "postgres";


COMMENT ON TABLE "public"."pet_stat_allocations" IS 'CORE: Level/stat allocation history. Active. Do not drop.';



CREATE TABLE IF NOT EXISTS "public"."pet_stats" (
    "pet_id" "uuid" NOT NULL,
    "base_hp" integer NOT NULL,
    "base_atk" integer NOT NULL,
    "base_magi" integer NOT NULL,
    "base_def" integer NOT NULL,
    "base_spd" integer NOT NULL,
    "base_mana" integer NOT NULL,
    "base_total" integer DEFAULT 10 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pet_stats_birth_caps" CHECK (((("base_hp" >= 0) AND ("base_hp" <= 10)) AND (("base_atk" >= 0) AND ("base_atk" <= 10)) AND (("base_magi" >= 0) AND ("base_magi" <= 10)) AND (("base_def" >= 0) AND ("base_def" <= 10)) AND (("base_spd" >= 0) AND ("base_spd" <= 10)) AND (("base_mana" >= 0) AND ("base_mana" <= 10)))),
    CONSTRAINT "pet_stats_birth_sum" CHECK ((((((("base_hp" + "base_atk") + "base_magi") + "base_def") + "base_spd") + "base_mana") = "base_total")),
    CONSTRAINT "pet_stats_check" CHECK ((("base_hp" >= 0) AND ("base_atk" >= 0) AND ("base_magi" >= 0) AND ("base_def" >= 0) AND ("base_spd" >= 0) AND ("base_mana" >= 0)))
);


ALTER TABLE "public"."pet_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."pet_stats" IS 'Base stats for pets. Egg base stats sum to 10, then +7 random points at hatch = 17 total. All stat values must be explicitly provided during pet creation.';



CREATE TABLE IF NOT EXISTS "public"."player_quests" (
    "user_id" "uuid" NOT NULL,
    "quest_key" "text" NOT NULL,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "target" integer NOT NULL,
    "accepted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "reward_claimed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "player_quests_progress_check" CHECK (("progress" >= 0)),
    CONSTRAINT "player_quests_somethings_afoot_progress_check" CHECK ((("quest_key" <> 'somethings_afoot'::"text") OR (("target" = 5) AND (("progress" >= 0) AND ("progress" <= 5))))),
    CONSTRAINT "player_quests_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'active'::"text", 'ready_to_turn_in'::"text", 'completed'::"text"]))),
    CONSTRAINT "player_quests_target_check" CHECK (("target" > 0))
);


ALTER TABLE "public"."player_quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poe_tay_toe_finds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "location_key" "text" NOT NULL,
    "dots_awarded" integer NOT NULL,
    "item_slug" "text" NOT NULL,
    "item_qty" integer NOT NULL,
    "found_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "poe_tay_toe_finds_dots_awarded_check" CHECK (("dots_awarded" >= 0)),
    CONSTRAINT "poe_tay_toe_finds_item_qty_check" CHECK (("item_qty" > 0))
);


ALTER TABLE "public"."poe_tay_toe_finds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poe_tay_toe_state" (
    "id" smallint DEFAULT 1 NOT NULL,
    "current_location_key" "text" NOT NULL,
    "hidden_by_user_id" "uuid",
    "hidden_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "claimed_by_user_id" "uuid",
    "claimed_at" timestamp with time zone,
    "find_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "poe_tay_toe_state_find_count_check" CHECK (("find_count" >= 0)),
    CONSTRAINT "poe_tay_toe_state_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."poe_tay_toe_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pve_instability_fights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "fight_number" integer NOT NULL,
    "enemy_name" "text" NOT NULL,
    "enemy_level" integer NOT NULL,
    "enemy_element" "text" NOT NULL,
    "enemy_line" "text" NOT NULL,
    "result" "text",
    "rewards" "jsonb",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pve_instability_fights_fight_number_check" CHECK (("fight_number" > 0)),
    CONSTRAINT "pve_instability_fights_result_check" CHECK (("result" = ANY (ARRAY['victory'::"text", 'defeat'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."pve_instability_fights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pve_instability_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "instability_id" "uuid" NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "current_fight" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pve_instability_runs_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."pve_instability_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pve_research_stats" (
    "user_id" "uuid" NOT NULL,
    "total_instabilities_cleared" integer DEFAULT 0 NOT NULL,
    "total_fights_won" integer DEFAULT 0 NOT NULL,
    "total_bosses_defeated" integer DEFAULT 0 NOT NULL,
    "rarest_drop_tier" integer DEFAULT 0 NOT NULL,
    "first_clear_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pve_research_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."retired_kith_species" (
    "species_key" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "element_key" "text" NOT NULL,
    "retirement_group" "text" DEFAULT 'Closed Alpha'::"text" NOT NULL,
    "retirement_note" "text" DEFAULT 'Retired to the void of unused Alpha content.'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."retired_kith_species" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rune_defs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "rune_number" smallint NOT NULL,
    "stage_tier" "text" NOT NULL,
    "vocabulary_group" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rune_defs_rune_number_check" CHECK ((("rune_number" >= 1) AND ("rune_number" <= 26))),
    CONSTRAINT "rune_defs_stage_tier_check" CHECK (("stage_tier" = ANY (ARRAY['hatchling'::"text", 'lowform'::"text", 'highform'::"text", 'legion'::"text", 'mythical_legendary'::"text"])))
);


ALTER TABLE "public"."rune_defs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signup_trigger_errors" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "step" "text" NOT NULL,
    "error_message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."signup_trigger_errors" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."signup_trigger_errors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."signup_trigger_errors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."signup_trigger_errors_id_seq" OWNED BY "public"."signup_trigger_errors"."id";



CREATE TABLE IF NOT EXISTS "public"."skill_defs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "required_level" integer DEFAULT 1 NOT NULL,
    "requirements" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skill_defs" OWNER TO "postgres";


COMMENT ON TABLE "public"."skill_defs" IS 'CORE: Skill definitions. Active.';



CREATE TABLE IF NOT EXISTS "public"."trainer_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "award_id" "uuid" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "context" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trainer_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainer_progression" (
    "user_id" "uuid" NOT NULL,
    "trainer_level" integer DEFAULT 1 NOT NULL,
    "trainer_xp" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trainer_progression_trainer_level_check" CHECK (("trainer_level" >= 1)),
    CONSTRAINT "trainer_progression_trainer_xp_check" CHECK (("trainer_xp" >= 0))
);


ALTER TABLE "public"."trainer_progression" OWNER TO "postgres";


COMMENT ON TABLE "public"."trainer_progression" IS 'Server-owned player progression. Kith level and elemental training remain separate systems.';



CREATE TABLE IF NOT EXISTS "public"."user_kith_discoveries" (
    "user_id" "uuid" NOT NULL,
    "species_key" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "first_hatched_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_kith_discoveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_resources" (
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_resources" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_resources" IS 'PARKED: User resource/trough system.';



CREATE TABLE IF NOT EXISTS "public"."user_retired_kith" (
    "user_id" "uuid" NOT NULL,
    "species_key" "text" NOT NULL,
    "first_owned_at" timestamp with time zone NOT NULL,
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_retired_kith" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_runes" (
    "user_id" "uuid" NOT NULL,
    "rune_id" "uuid" NOT NULL,
    "discovered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discovery_context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_runes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pet_storage_stats" WITH ("security_invoker"='true') AS
 SELECT "pet_id",
    "base_hp" AS "hp",
    "base_atk" AS "atk",
    "base_magi" AS "magi",
    "base_def" AS "def",
    "base_spd" AS "spd",
    "base_mana" AS "mana",
    "base_total"
   FROM "public"."pet_stats" "s";


ALTER VIEW "public"."v_pet_storage_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pet_total_stats" WITH ("security_invoker"='true') AS
 SELECT "s"."pet_id",
    ("s"."base_hp" + COALESCE("sum"("a"."hp"), (0)::bigint)) AS "hp",
    ("s"."base_atk" + COALESCE("sum"("a"."atk"), (0)::bigint)) AS "atk",
    ("s"."base_magi" + COALESCE("sum"("a"."magi"), (0)::bigint)) AS "magi",
    ("s"."base_def" + COALESCE("sum"("a"."def"), (0)::bigint)) AS "def",
    ("s"."base_spd" + COALESCE("sum"("a"."spd"), (0)::bigint)) AS "spd",
    ("s"."base_mana" + COALESCE("sum"("a"."mana"), (0)::bigint)) AS "mana",
    "s"."base_total",
    COALESCE("count"("a".*), (0)::bigint) AS "allocated_levels"
   FROM ("public"."pet_stats" "s"
     LEFT JOIN "public"."pet_stat_allocations" "a" ON (("a"."pet_id" = "s"."pet_id")))
  GROUP BY "s"."pet_id", "s"."base_hp", "s"."base_atk", "s"."base_magi", "s"."base_def", "s"."base_spd", "s"."base_mana", "s"."base_total";


ALTER VIEW "public"."v_pet_total_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "currency" "public"."currency_kind" NOT NULL,
    "delta" integer NOT NULL,
    "reason" "text" NOT NULL,
    "ref_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wallet_ledger" OWNER TO "postgres";


COMMENT ON TABLE "public"."wallet_ledger" IS 'CORE: Currency transaction log. Active.';



CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "user_id" "uuid" NOT NULL,
    "dots" integer DEFAULT 5000 NOT NULL,
    "gems" integer DEFAULT 0 NOT NULL,
    "crystals" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wallets_crystals_check" CHECK (("crystals" >= 0)),
    CONSTRAINT "wallets_dots_check" CHECK (("dots" >= 0)),
    CONSTRAINT "wallets_gems_check" CHECK (("gems" >= 0))
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


COMMENT ON TABLE "public"."wallets" IS 'CORE: User currencies. Active.';



CREATE TABLE IF NOT EXISTS "public"."wildwood_expeditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "intro_step" integer DEFAULT 0 NOT NULL,
    "depth" integer DEFAULT 0 NOT NULL,
    "rooms_since_corrupted" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wildwood_expeditions_depth_check" CHECK (("depth" >= 0)),
    CONSTRAINT "wildwood_expeditions_intro_step_check" CHECK (("intro_step" >= 0)),
    CONSTRAINT "wildwood_expeditions_rooms_since_corrupted_check" CHECK (("rooms_since_corrupted" >= 0)),
    CONSTRAINT "wildwood_expeditions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'left'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."wildwood_expeditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wildwood_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expedition_id" "uuid" NOT NULL,
    "sequence_number" integer NOT NULL,
    "event_kind" "text" NOT NULL,
    "event_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'unresolved'::"text" NOT NULL,
    "battle_id" "uuid",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "wildwood_rooms_event_kind_check" CHECK (("event_kind" = ANY (ARRAY['flavor'::"text", 'quest_clue'::"text", 'corrupted_battle'::"text"]))),
    CONSTRAINT "wildwood_rooms_sequence_number_check" CHECK (("sequence_number" >= 0)),
    CONSTRAINT "wildwood_rooms_status_check" CHECK (("status" = ANY (ARRAY['unresolved'::"text", 'resolved'::"text", 'left'::"text"])))
);


ALTER TABLE "public"."wildwood_rooms" OWNER TO "postgres";


ALTER TABLE ONLY "public"."signup_trigger_errors" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."signup_trigger_errors_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."aliune_signal_reports"
    ADD CONSTRAINT "aliune_signal_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."aliune_signals"
    ADD CONSTRAINT "aliune_signals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alpha_systems"
    ADD CONSTRAINT "alpha_systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."awards"
    ADD CONSTRAINT "awards_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."awards"
    ADD CONSTRAINT "awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battle_run_fights"
    ADD CONSTRAINT "battle_run_fights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battle_run_fights"
    ADD CONSTRAINT "battle_run_fights_run_id_fight_number_key" UNIQUE ("run_id", "fight_number");



ALTER TABLE ONLY "public"."battle_runs"
    ADD CONSTRAINT "battle_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_care"
    ADD CONSTRAINT "daily_care_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."daily_care"
    ADD CONSTRAINT "daily_care_user_date_unique" UNIQUE ("user_id", "completed_date_eastern");



COMMENT ON CONSTRAINT "daily_care_user_date_unique" ON "public"."daily_care" IS 'Prevents race conditions by ensuring a user can only complete daily care once per Eastern calendar day';



ALTER TABLE ONLY "public"."daily_login_rewards"
    ADD CONSTRAINT "daily_login_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eggs"
    ADD CONSTRAINT "eggs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."element_defs"
    ADD CONSTRAINT "element_defs_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."element_defs"
    ADD CONSTRAINT "element_defs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_config"
    ADD CONSTRAINT "game_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."hatchery_shelf_slots"
    ADD CONSTRAINT "hatchery_shelf_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hatchery_shelf_slots"
    ADD CONSTRAINT "hatchery_shelf_slots_user_id_slot_index_key" UNIQUE ("user_id", "slot_index");



ALTER TABLE ONLY "public"."hatchery_slots"
    ADD CONSTRAINT "hatchery_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hatchery_slots"
    ADD CONSTRAINT "hatchery_slots_user_id_slot_index_key" UNIQUE ("user_id", "slot_index");



ALTER TABLE ONLY "public"."home_objects"
    ADD CONSTRAINT "home_objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homepage_alerts"
    ADD CONSTRAINT "homepage_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homepage_logs"
    ADD CONSTRAINT "homepage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("user_id", "item_id");



ALTER TABLE ONLY "public"."item_defs"
    ADD CONSTRAINT "item_defs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_defs"
    ADD CONSTRAINT "item_defs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."legendary_kith_event_state"
    ADD CONSTRAINT "legendary_kith_event_state_pkey" PRIMARY KEY ("user_id", "legendary_key");



ALTER TABLE ONLY "public"."mutations"
    ADD CONSTRAINT "mutations_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."mutations"
    ADD CONSTRAINT "mutations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."party_slots"
    ADD CONSTRAINT "party_slots_pet_id_key" UNIQUE ("pet_id");



ALTER TABLE ONLY "public"."party_slots"
    ADD CONSTRAINT "party_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."party_slots"
    ADD CONSTRAINT "party_slots_user_id_slot_index_key" UNIQUE ("user_id", "slot_index");



ALTER TABLE ONLY "public"."passive_traits"
    ADD CONSTRAINT "passive_traits_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."passive_traits"
    ADD CONSTRAINT "passive_traits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patch_notes"
    ADD CONSTRAINT "patch_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patch_notes"
    ADD CONSTRAINT "patch_notes_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."personalities"
    ADD CONSTRAINT "personalities_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."personalities"
    ADD CONSTRAINT "personalities_key_unique" UNIQUE ("key");



ALTER TABLE ONLY "public"."personalities"
    ADD CONSTRAINT "personalities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_awards"
    ADD CONSTRAINT "pet_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_element_affinities"
    ADD CONSTRAINT "pet_element_affinities_pkey" PRIMARY KEY ("pet_id", "element_id");



ALTER TABLE ONLY "public"."pet_elements"
    ADD CONSTRAINT "pet_elements_pkey" PRIMARY KEY ("pet_id");



ALTER TABLE ONLY "public"."pet_mutations"
    ADD CONSTRAINT "pet_mutations_pkey" PRIMARY KEY ("pet_id", "slot_index");



ALTER TABLE ONLY "public"."pet_skills"
    ADD CONSTRAINT "pet_skills_pkey" PRIMARY KEY ("pet_id", "skill_id");



ALTER TABLE ONLY "public"."pet_stat_allocations"
    ADD CONSTRAINT "pet_stat_allocations_pet_id_level_key" UNIQUE ("pet_id", "level");



ALTER TABLE ONLY "public"."pet_stat_allocations"
    ADD CONSTRAINT "pet_stat_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_stats"
    ADD CONSTRAINT "pet_stats_pkey" PRIMARY KEY ("pet_id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_quests"
    ADD CONSTRAINT "player_quests_pkey" PRIMARY KEY ("user_id", "quest_key");



ALTER TABLE ONLY "public"."poe_tay_toe_finds"
    ADD CONSTRAINT "poe_tay_toe_finds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poe_tay_toe_state"
    ADD CONSTRAINT "poe_tay_toe_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."pve_active_buffs"
    ADD CONSTRAINT "pve_active_buffs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pve_instabilities"
    ADD CONSTRAINT "pve_instabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pve_instability_fights"
    ADD CONSTRAINT "pve_instability_fights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pve_instability_fights"
    ADD CONSTRAINT "pve_instability_fights_run_id_fight_number_key" UNIQUE ("run_id", "fight_number");



ALTER TABLE ONLY "public"."pve_instability_runs"
    ADD CONSTRAINT "pve_instability_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pve_research_stats"
    ADD CONSTRAINT "pve_research_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."retired_kith_species"
    ADD CONSTRAINT "retired_kith_species_pkey" PRIMARY KEY ("species_key");



ALTER TABLE ONLY "public"."rune_defs"
    ADD CONSTRAINT "rune_defs_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."rune_defs"
    ADD CONSTRAINT "rune_defs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rune_defs"
    ADD CONSTRAINT "rune_defs_rune_number_key" UNIQUE ("rune_number");



ALTER TABLE ONLY "public"."signup_trigger_errors"
    ADD CONSTRAINT "signup_trigger_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_defs"
    ADD CONSTRAINT "skill_defs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_defs"
    ADD CONSTRAINT "skill_defs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."trainer_awards"
    ADD CONSTRAINT "trainer_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainer_awards"
    ADD CONSTRAINT "trainer_awards_user_id_award_id_key" UNIQUE ("user_id", "award_id");



ALTER TABLE ONLY "public"."trainer_progression"
    ADD CONSTRAINT "trainer_progression_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_kith_discoveries"
    ADD CONSTRAINT "user_kith_discoveries_pkey" PRIMARY KEY ("user_id", "species_key");



ALTER TABLE ONLY "public"."user_resources"
    ADD CONSTRAINT "user_resources_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_retired_kith"
    ADD CONSTRAINT "user_retired_kith_pkey" PRIMARY KEY ("user_id", "species_key");



ALTER TABLE ONLY "public"."user_runes"
    ADD CONSTRAINT "user_runes_pkey" PRIMARY KEY ("user_id", "rune_id");



ALTER TABLE ONLY "public"."wallet_ledger"
    ADD CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."wildwood_expeditions"
    ADD CONSTRAINT "wildwood_expeditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wildwood_rooms"
    ADD CONSTRAINT "wildwood_rooms_battle_id_key" UNIQUE ("battle_id");



ALTER TABLE ONLY "public"."wildwood_rooms"
    ADD CONSTRAINT "wildwood_rooms_expedition_id_sequence_number_key" UNIQUE ("expedition_id", "sequence_number");



ALTER TABLE ONLY "public"."wildwood_rooms"
    ADD CONSTRAINT "wildwood_rooms_pkey" PRIMARY KEY ("id");



CREATE INDEX "aliune_signal_reports_window_idx" ON "public"."aliune_signal_reports" USING "btree" ("enabled", "starts_at" DESC, "ends_at" DESC);



CREATE INDEX "aliune_signals_enabled_window_idx" ON "public"."aliune_signals" USING "btree" ("enabled", "starts_at" DESC, "ends_at" DESC);



CREATE UNIQUE INDEX "battle_runs_one_active_run_per_user" ON "public"."battle_runs" USING "btree" ("user_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "daily_care_user_completed_delta_day_idx" ON "public"."daily_care" USING "btree" ("user_id", "completed_delta_day");



CREATE INDEX "eggs_hatch_ready_at_idx" ON "public"."eggs" USING "btree" ("hatch_ready_at");



CREATE INDEX "eggs_user_id_idx" ON "public"."eggs" USING "btree" ("user_id");



CREATE UNIQUE INDEX "hatchery_shelf_slots_user_slot_unique" ON "public"."hatchery_shelf_slots" USING "btree" ("user_id", "slot_index");



CREATE UNIQUE INDEX "hatchery_slots_user_pet_unique" ON "public"."hatchery_slots" USING "btree" ("user_id", "pet_id") WHERE ("pet_id" IS NOT NULL);



CREATE UNIQUE INDEX "hatchery_slots_user_slot_unique" ON "public"."hatchery_slots" USING "btree" ("user_id", "slot_index");



CREATE UNIQUE INDEX "home_objects_one_trough" ON "public"."home_objects" USING "btree" ("user_id", "kind") WHERE ("kind" = 'trough'::"text");



CREATE INDEX "home_objects_user_id_idx" ON "public"."home_objects" USING "btree" ("user_id");



CREATE INDEX "homepage_logs_category_idx" ON "public"."homepage_logs" USING "btree" ("category", "display_order");



CREATE INDEX "idx_aliune_signal_reports_enabled_window" ON "public"."aliune_signal_reports" USING "btree" ("enabled", "starts_at", "ends_at", "created_at" DESC);



CREATE INDEX "idx_alpha_systems_enabled_sort_release" ON "public"."alpha_systems" USING "btree" ("enabled", "sort_order", "released_at" DESC);



CREATE INDEX "idx_announcements_homepage_live" ON "public"."announcements" USING "btree" ("page_scope", "is_published", "created_at" DESC);



CREATE INDEX "idx_announcements_page_scope" ON "public"."announcements" USING "btree" ("page_scope", "is_published", "created_at" DESC);



CREATE INDEX "idx_battle_run_fights_run_id" ON "public"."battle_run_fights" USING "btree" ("run_id");



CREATE INDEX "idx_battle_runs_pet_id" ON "public"."battle_runs" USING "btree" ("pet_id");



CREATE INDEX "idx_battle_runs_user_id" ON "public"."battle_runs" USING "btree" ("user_id");



CREATE INDEX "idx_daily_care_user_date" ON "public"."daily_care" USING "btree" ("user_id", "completed_date_eastern");



CREATE INDEX "idx_daily_care_user_id" ON "public"."daily_care" USING "btree" ("user_id");



CREATE INDEX "idx_daily_login_rewards_last_claimed_at" ON "public"."daily_login_rewards" USING "btree" ("last_claimed_at");



CREATE INDEX "idx_eggs_user_id" ON "public"."eggs" USING "btree" ("user_id");



CREATE INDEX "idx_element_defs_key" ON "public"."element_defs" USING "btree" ("key");



CREATE INDEX "idx_hatchery_shelf_slots_user_id" ON "public"."hatchery_shelf_slots" USING "btree" ("user_id");



CREATE INDEX "idx_hatchery_shelf_slots_user_id_slot_index" ON "public"."hatchery_shelf_slots" USING "btree" ("user_id", "slot_index");



CREATE INDEX "idx_hatchery_slots_user_id" ON "public"."hatchery_slots" USING "btree" ("user_id");



CREATE INDEX "idx_hatchery_slots_user_id_slot_index" ON "public"."hatchery_slots" USING "btree" ("user_id", "slot_index");



CREATE INDEX "idx_home_objects_user_id" ON "public"."home_objects" USING "btree" ("user_id");



CREATE INDEX "idx_homepage_alerts_active_window" ON "public"."homepage_alerts" USING "btree" ("is_active", "starts_at", "ends_at", "updated_at" DESC);



CREATE INDEX "idx_homepage_logs_active_category_order" ON "public"."homepage_logs" USING "btree" ("is_active", "category", "display_order", "created_at" DESC);



CREATE INDEX "idx_inventory_pet_id" ON "public"."inventory" USING "btree" ("pet_id");



CREATE INDEX "idx_inventory_user_id" ON "public"."inventory" USING "btree" ("user_id");



CREATE INDEX "idx_item_defs_slug" ON "public"."item_defs" USING "btree" ("slug");



CREATE INDEX "idx_mutations_active_rarity" ON "public"."mutations" USING "btree" ("is_active", "rarity");



CREATE INDEX "idx_mutations_rarity" ON "public"."mutations" USING "btree" ("rarity");



CREATE INDEX "idx_party_slots_user_id_slot_index" ON "public"."party_slots" USING "btree" ("user_id", "slot_index");



CREATE INDEX "idx_passive_traits_rarity" ON "public"."passive_traits" USING "btree" ("rarity");



CREATE INDEX "idx_passive_traits_stat_key" ON "public"."passive_traits" USING "btree" ("stat_key");



CREATE INDEX "idx_patch_notes_published_release" ON "public"."patch_notes" USING "btree" ("is_published", "released_at" DESC);



CREATE INDEX "idx_personalities_key" ON "public"."personalities" USING "btree" ("key");



CREATE INDEX "idx_pet_awards_award_id" ON "public"."pet_awards" USING "btree" ("award_id");



CREATE INDEX "idx_pet_awards_pet_id" ON "public"."pet_awards" USING "btree" ("pet_id");



CREATE INDEX "idx_pet_element_affinities_element_id" ON "public"."pet_element_affinities" USING "btree" ("element_id");



CREATE INDEX "idx_pet_element_affinities_pet_id" ON "public"."pet_element_affinities" USING "btree" ("pet_id");



CREATE INDEX "idx_pet_mutations_mutation_id" ON "public"."pet_mutations" USING "btree" ("mutation_id");



CREATE UNIQUE INDEX "idx_pet_mutations_unique_mutation_per_pet" ON "public"."pet_mutations" USING "btree" ("pet_id", "mutation_id") WHERE ("mutation_id" IS NOT NULL);



CREATE INDEX "idx_pet_skills_pet_id" ON "public"."pet_skills" USING "btree" ("pet_id");



CREATE INDEX "idx_pet_skills_skill_id" ON "public"."pet_skills" USING "btree" ("skill_id");



CREATE INDEX "idx_pets_neglect_hours" ON "public"."pets" USING "btree" ("neglect_hours") WHERE ("neglect_hours" > 0);



CREATE INDEX "idx_pets_personality_id" ON "public"."pets" USING "btree" ("personality_id");



CREATE INDEX "idx_pets_ran_away" ON "public"."pets" USING "btree" ("ran_away") WHERE ("ran_away" = true);



CREATE INDEX "idx_pets_user_id" ON "public"."pets" USING "btree" ("user_id");



CREATE INDEX "idx_pets_user_id_is_active" ON "public"."pets" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_pets_user_id_location" ON "public"."pets" USING "btree" ("user_id", "location");



CREATE INDEX "idx_pets_user_id_stage" ON "public"."pets" USING "btree" ("user_id", "stage");



CREATE INDEX "idx_profiles_email_lower" ON "public"."profiles" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_profiles_username_lower" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_pve_active_buffs_user_active" ON "public"."pve_active_buffs" USING "btree" ("user_id", "expires_at" DESC);



CREATE INDEX "idx_pve_instabilities_active" ON "public"."pve_instabilities" USING "btree" ("enabled", "region", "expires_at" DESC) WHERE ("enabled" = true);



CREATE INDEX "idx_pve_instability_runs_user_status" ON "public"."pve_instability_runs" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "idx_rune_defs_active_number" ON "public"."rune_defs" USING "btree" ("is_active", "rune_number");



CREATE INDEX "idx_rune_defs_stage_tier" ON "public"."rune_defs" USING "btree" ("stage_tier");



CREATE INDEX "idx_skill_defs_slug" ON "public"."skill_defs" USING "btree" ("slug");



CREATE INDEX "idx_user_resources_user_id" ON "public"."user_resources" USING "btree" ("user_id");



CREATE INDEX "idx_user_runes_rune_id" ON "public"."user_runes" USING "btree" ("rune_id");



CREATE INDEX "idx_user_runes_user_id" ON "public"."user_runes" USING "btree" ("user_id");



CREATE INDEX "idx_wallet_ledger_user_id" ON "public"."wallet_ledger" USING "btree" ("user_id");



CREATE UNIQUE INDEX "inventory_user_item_unique" ON "public"."inventory" USING "btree" ("user_id", "item_id");



CREATE UNIQUE INDEX "legendary_kith_event_state_egg_pet_id_key" ON "public"."legendary_kith_event_state" USING "btree" ("egg_pet_id") WHERE ("egg_pet_id" IS NOT NULL);



CREATE INDEX "party_slots_user_idx" ON "public"."party_slots" USING "btree" ("user_id");



CREATE UNIQUE INDEX "party_slots_user_pet_unique" ON "public"."party_slots" USING "btree" ("user_id", "pet_id");



CREATE UNIQUE INDEX "party_slots_user_slot_unique" ON "public"."party_slots" USING "btree" ("user_id", "slot_index");



CREATE INDEX "personalities_key_idx" ON "public"."personalities" USING "btree" ("key");



CREATE UNIQUE INDEX "pet_awards_unique" ON "public"."pet_awards" USING "btree" ("pet_id", "award_id");



CREATE INDEX "pets_cd_bond_ends_at_idx" ON "public"."pets" USING "btree" ("cd_bond_ends_at");



CREATE INDEX "pets_cd_clean_ends_at_idx" ON "public"."pets" USING "btree" ("cd_clean_ends_at");



CREATE INDEX "pets_cd_feed_ends_at_idx" ON "public"."pets" USING "btree" ("cd_feed_ends_at");



CREATE INDEX "pets_cd_pet_ends_at_idx" ON "public"."pets" USING "btree" ("cd_pet_ends_at");



CREATE INDEX "pets_cd_play_ends_at_idx" ON "public"."pets" USING "btree" ("cd_play_ends_at");



CREATE INDEX "pets_hatch_ends_at_idx" ON "public"."pets" USING "btree" ("hatch_ends_at");



CREATE INDEX "pets_last_care_decay_at_idx" ON "public"."pets" USING "btree" ("last_care_decay_at");



CREATE INDEX "pets_last_fed_at_idx" ON "public"."pets" USING "btree" ("last_fed_at");



CREATE INDEX "pets_last_hunger_decay_at_idx" ON "public"."pets" USING "btree" ("last_hunger_decay_at");



CREATE UNIQUE INDEX "pets_one_active_per_user" ON "public"."pets" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "pets_one_active_per_user_idx" ON "public"."pets" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "pets_one_active_pet_per_user" ON "public"."pets" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "pets_user_hatchery_slot_unique" ON "public"."pets" USING "btree" ("user_id", "hatchery_slot_index") WHERE (("stage" = 'egg'::"public"."pet_stage") AND ("location" = 'hatchery'::"text") AND ("hatchery_slot_index" IS NOT NULL));



CREATE INDEX "pets_user_is_active_idx" ON "public"."pets" USING "btree" ("user_id", "is_active");



CREATE INDEX "poe_tay_toe_finds_user_found_at_idx" ON "public"."poe_tay_toe_finds" USING "btree" ("user_id", "found_at" DESC);



CREATE UNIQUE INDEX "profiles_email_unique" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE UNIQUE INDEX "profiles_username_unique" ON "public"."profiles" USING "btree" ("lower"("username"));



CREATE UNIQUE INDEX "profiles_username_unique_lower" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE UNIQUE INDEX "wildwood_one_active_expedition_per_user" ON "public"."wildwood_expeditions" USING "btree" ("user_id") WHERE ("status" = 'active'::"text");



CREATE OR REPLACE TRIGGER "announcements_set_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "prevent_locked_velune_activation" BEFORE INSERT OR UPDATE OF "is_active", "location", "species" ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_locked_velune_activation"();



CREATE OR REPLACE TRIGGER "prevent_locked_velune_party_assignment" BEFORE INSERT OR UPDATE OF "pet_id", "user_id" ON "public"."party_slots" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_locked_velune_party_assignment"();



CREATE OR REPLACE TRIGGER "record_kith_discovery_after_hatch" AFTER INSERT OR UPDATE OF "stage" ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."record_kith_discovery_from_pet"();



CREATE OR REPLACE TRIGGER "set_aliune_signal_reports_updated_at" BEFORE UPDATE ON "public"."aliune_signal_reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_aliune_signals_updated_at" BEFORE UPDATE ON "public"."aliune_signals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_hatchery_shelf_slots_updated_at" BEFORE UPDATE ON "public"."hatchery_shelf_slots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_hatchery_slots_updated_at" BEFORE UPDATE ON "public"."hatchery_slots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_home_objects_updated_at" BEFORE UPDATE ON "public"."home_objects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_homepage_alerts_updated_at" BEFORE UPDATE ON "public"."homepage_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_inventory_updated_at" BEFORE UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pet_stats_updated_at" BEFORE UPDATE ON "public"."pet_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pets_updated_at" BEFORE UPDATE ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pve_active_buffs_updated_at" BEFORE UPDATE ON "public"."pve_active_buffs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pve_instabilities_updated_at" BEFORE UPDATE ON "public"."pve_instabilities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pve_instability_fights_updated_at" BEFORE UPDATE ON "public"."pve_instability_fights" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pve_instability_runs_updated_at" BEFORE UPDATE ON "public"."pve_instability_runs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pve_research_stats_updated_at" BEFORE UPDATE ON "public"."pve_research_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_resources_updated_at" BEFORE UPDATE ON "public"."user_resources" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_wallets_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_aliune_signals_updated_at" BEFORE UPDATE ON "public"."aliune_signals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_assign_new_pet_mutation" AFTER INSERT ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."assign_new_pet_mutation"();



CREATE OR REPLACE TRIGGER "trg_assign_pet_personality" BEFORE INSERT ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."assign_pet_personality"();



CREATE OR REPLACE TRIGGER "trg_daily_care_updated_at" BEFORE UPDATE ON "public"."daily_care" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_enforce_pet_mutation_capacity" BEFORE INSERT OR UPDATE OF "pet_id", "slot_index" ON "public"."pet_mutations" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_pet_mutation_capacity"();



CREATE OR REPLACE TRIGGER "trg_hatchery_shelf_slots_updated_at" BEFORE UPDATE ON "public"."hatchery_shelf_slots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_hatchery_slots_updated_at" BEFORE UPDATE ON "public"."hatchery_slots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_homepage_alerts_updated_at" BEFORE UPDATE ON "public"."homepage_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."set_homepage_alerts_updated_at"();



CREATE OR REPLACE TRIGGER "trg_item_defs_updated_at" BEFORE UPDATE ON "public"."item_defs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_party_slots_updated_at" BEFORE UPDATE ON "public"."party_slots" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_stats_updated_at" BEFORE UPDATE ON "public"."pet_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pets_updated_at" BEFORE UPDATE ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_personality_change" BEFORE UPDATE ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_personality_change"();



CREATE OR REPLACE TRIGGER "trg_prevent_role_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_escalation"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."battle_run_fights"
    ADD CONSTRAINT "battle_run_fights_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."battle_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_runs"
    ADD CONSTRAINT "battle_runs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_runs"
    ADD CONSTRAINT "battle_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_care"
    ADD CONSTRAINT "daily_care_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_login_rewards"
    ADD CONSTRAINT "daily_login_rewards_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eggs"
    ADD CONSTRAINT "eggs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eggs"
    ADD CONSTRAINT "eggs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hatchery_shelf_slots"
    ADD CONSTRAINT "hatchery_shelf_slots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hatchery_slots"
    ADD CONSTRAINT "hatchery_slots_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hatchery_slots"
    ADD CONSTRAINT "hatchery_slots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."home_objects"
    ADD CONSTRAINT "home_objects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."item_defs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."legendary_kith_event_state"
    ADD CONSTRAINT "legendary_kith_event_state_egg_pet_id_fkey" FOREIGN KEY ("egg_pet_id") REFERENCES "public"."pets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."legendary_kith_event_state"
    ADD CONSTRAINT "legendary_kith_event_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."party_slots"
    ADD CONSTRAINT "party_slots_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."party_slots"
    ADD CONSTRAINT "party_slots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_awards"
    ADD CONSTRAINT "pet_awards_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_awards"
    ADD CONSTRAINT "pet_awards_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_element_affinities"
    ADD CONSTRAINT "pet_element_affinities_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "public"."element_defs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pet_element_affinities"
    ADD CONSTRAINT "pet_element_affinities_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_elements"
    ADD CONSTRAINT "pet_elements_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_mutations"
    ADD CONSTRAINT "pet_mutations_mutation_id_fkey" FOREIGN KEY ("mutation_id") REFERENCES "public"."mutations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pet_mutations"
    ADD CONSTRAINT "pet_mutations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_skills"
    ADD CONSTRAINT "pet_skills_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_skills"
    ADD CONSTRAINT "pet_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skill_defs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pet_stat_allocations"
    ADD CONSTRAINT "pet_stat_allocations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_stats"
    ADD CONSTRAINT "pet_stats_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_passive_trait_id_fkey" FOREIGN KEY ("passive_trait_id") REFERENCES "public"."passive_traits"("id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_personality_id_fkey" FOREIGN KEY ("personality_id") REFERENCES "public"."personalities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_quests"
    ADD CONSTRAINT "player_quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poe_tay_toe_finds"
    ADD CONSTRAINT "poe_tay_toe_finds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poe_tay_toe_state"
    ADD CONSTRAINT "poe_tay_toe_state_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."poe_tay_toe_state"
    ADD CONSTRAINT "poe_tay_toe_state_hidden_by_user_id_fkey" FOREIGN KEY ("hidden_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pve_active_buffs"
    ADD CONSTRAINT "pve_active_buffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pve_instability_fights"
    ADD CONSTRAINT "pve_instability_fights_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."pve_instability_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pve_instability_runs"
    ADD CONSTRAINT "pve_instability_runs_instability_id_fkey" FOREIGN KEY ("instability_id") REFERENCES "public"."pve_instabilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pve_instability_runs"
    ADD CONSTRAINT "pve_instability_runs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pve_instability_runs"
    ADD CONSTRAINT "pve_instability_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pve_research_stats"
    ADD CONSTRAINT "pve_research_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainer_awards"
    ADD CONSTRAINT "trainer_awards_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainer_awards"
    ADD CONSTRAINT "trainer_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainer_progression"
    ADD CONSTRAINT "trainer_progression_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_kith_discoveries"
    ADD CONSTRAINT "user_kith_discoveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_resources"
    ADD CONSTRAINT "user_resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_retired_kith"
    ADD CONSTRAINT "user_retired_kith_species_key_fkey" FOREIGN KEY ("species_key") REFERENCES "public"."retired_kith_species"("species_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_retired_kith"
    ADD CONSTRAINT "user_retired_kith_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_runes"
    ADD CONSTRAINT "user_runes_rune_id_fkey" FOREIGN KEY ("rune_id") REFERENCES "public"."rune_defs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_runes"
    ADD CONSTRAINT "user_runes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_ledger"
    ADD CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wildwood_expeditions"
    ADD CONSTRAINT "wildwood_expeditions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wildwood_rooms"
    ADD CONSTRAINT "wildwood_rooms_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "public"."wildwood_expeditions"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read" ON "public"."alpha_systems" FOR SELECT USING (true);



CREATE POLICY "Anyone can view active instabilities" ON "public"."pve_instabilities" FOR SELECT USING ((("enabled" = true) AND ("expires_at" > "now"())));



CREATE POLICY "Authenticated users can read retired Kith species" ON "public"."retired_kith_species" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Legendary event state is readable by owner" ON "public"."legendary_kith_event_state" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Players can read their own Wildwood rooms" ON "public"."wildwood_rooms" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."wildwood_expeditions" "expedition"
  WHERE (("expedition"."id" = "wildwood_rooms"."expedition_id") AND ("expedition"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Players can read their own expeditions" ON "public"."wildwood_expeditions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Players can read their own quests" ON "public"."player_quests" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Public can read active homepage alerts" ON "public"."homepage_alerts" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" >= "now"()))));



CREATE POLICY "Public can read personalities" ON "public"."personalities" FOR SELECT USING (true);



CREATE POLICY "Public can read published patch notes" ON "public"."patch_notes" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Service role can view signup trigger errors" ON "public"."signup_trigger_errors" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Trainer progression is readable by owner" ON "public"."trainer_progression" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read their own Kith discoveries" ON "public"."user_kith_discoveries" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own retired Kith ownership" ON "public"."user_retired_kith" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own resources" ON "public"."user_resources" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own buffs" ON "public"."pve_active_buffs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own fights" ON "public"."pve_instability_fights" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pve_instability_runs"
  WHERE (("pve_instability_runs"."id" = "pve_instability_fights"."run_id") AND ("pve_instability_runs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own research" ON "public"."pve_research_stats" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own runs" ON "public"."pve_instability_runs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own resources" ON "public"."user_resources" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admins manage announcements" ON "public"."announcements" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "aliune signal reports public read" ON "public"."aliune_signal_reports" FOR SELECT TO "authenticated", "anon" USING (("enabled" = true));



CREATE POLICY "aliune signals public read" ON "public"."aliune_signals" FOR SELECT TO "authenticated", "anon" USING (("enabled" = true));



ALTER TABLE "public"."aliune_signal_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aliune_signals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alpha_systems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "awards_read_authed" ON "public"."awards" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "battle_fights_select_own" ON "public"."battle_run_fights" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."battle_runs" "r"
  WHERE (("r"."id" = "battle_run_fights"."run_id") AND ("r"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."battle_run_fights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "battle_run_fights_select_own" ON "public"."battle_run_fights" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."battle_runs" "r"
  WHERE (("r"."id" = "battle_run_fights"."run_id") AND ("r"."user_id" = "auth"."uid"())))));



CREATE POLICY "battle_run_fights_write_own" ON "public"."battle_run_fights" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."battle_runs" "r"
  WHERE (("r"."id" = "battle_run_fights"."run_id") AND ("r"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."battle_runs" "r"
  WHERE (("r"."id" = "battle_run_fights"."run_id") AND ("r"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."battle_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "battle_runs_select_own" ON "public"."battle_runs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "battle_runs_write_own" ON "public"."battle_runs" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."daily_care" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_care_insert_own" ON "public"."daily_care" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "daily_care_select_own" ON "public"."daily_care" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "daily_care_update_own" ON "public"."daily_care" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."daily_login_rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_login_rewards_select_own" ON "public"."daily_login_rewards" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "daily_login_rewards_write_own" ON "public"."daily_login_rewards" TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."eggs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eggs_select_own" ON "public"."eggs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "eggs_write_own" ON "public"."eggs" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."element_defs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "element_defs_read_authed" ON "public"."element_defs" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."game_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "game_config_read" ON "public"."game_config" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "game_config_read_authed" ON "public"."game_config" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."hatchery_shelf_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hatchery_shelf_slots_delete_own" ON "public"."hatchery_shelf_slots" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "hatchery_shelf_slots_insert_own" ON "public"."hatchery_shelf_slots" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "hatchery_shelf_slots_select_own" ON "public"."hatchery_shelf_slots" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "hatchery_shelf_slots_update_own" ON "public"."hatchery_shelf_slots" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."hatchery_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hatchery_slots_delete_own" ON "public"."hatchery_slots" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "hatchery_slots_insert_own" ON "public"."hatchery_slots" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "hatchery_slots_select_own" ON "public"."hatchery_slots" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "hatchery_slots_update_own" ON "public"."hatchery_slots" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."home_objects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "home_objects_delete_own" ON "public"."home_objects" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "home_objects_insert_own" ON "public"."home_objects" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "home_objects_select_own" ON "public"."home_objects" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "home_objects_update_own" ON "public"."home_objects" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."homepage_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homepage_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "homepage_logs_public_read" ON "public"."homepage_logs" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_select_own" ON "public"."inventory" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "inventory_write_own" ON "public"."inventory" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."item_defs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_defs_read_all" ON "public"."item_defs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "item_defs_read_authed" ON "public"."item_defs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ledger_select_own" ON "public"."wallet_ledger" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."legendary_kith_event_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mutations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mutations_read_active" ON "public"."mutations" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."party_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "party_slots_delete_own" ON "public"."party_slots" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "party_slots_insert_own" ON "public"."party_slots" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "party_slots_select_own" ON "public"."party_slots" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "party_slots_update_own" ON "public"."party_slots" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."passive_traits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patch_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personalities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personalities_select_all" ON "public"."personalities" FOR SELECT USING (true);



ALTER TABLE "public"."pet_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_awards_crud_own" ON "public"."pet_awards" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_awards"."pet_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_awards"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."pet_element_affinities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_element_affinities_select_own" ON "public"."pet_element_affinities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_element_affinities"."pet_id") AND ("pets"."user_id" = "auth"."uid"())))));



CREATE POLICY "pet_element_affinities_write_own" ON "public"."pet_element_affinities" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_element_affinities"."pet_id") AND ("pets"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_element_affinities"."pet_id") AND ("pets"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."pet_elements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_elements_own" ON "public"."pet_elements" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_elements"."pet_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_elements"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."pet_mutations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_skills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_skills_own" ON "public"."pet_skills" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_skills"."pet_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_skills"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "pet_skills_select_own" ON "public"."pet_skills" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_skills"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "pet_skills_write_own" ON "public"."pet_skills" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_skills"."pet_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_skills"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."pet_stat_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_stat_allocations_select_own" ON "public"."pet_stat_allocations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_stat_allocations"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "pet_stat_allocations_write_own" ON "public"."pet_stat_allocations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_stat_allocations"."pet_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_stat_allocations"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."pet_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_stats_select_own" ON "public"."pet_stats" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_stats"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "pet_stats_write_own" ON "public"."pet_stats" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_stats"."pet_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_stats"."pet_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pets_crud_own" ON "public"."pets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "pets_select_own" ON "public"."pets" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "pets_write_own" ON "public"."pets" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."player_quests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poe_tay_toe_finds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poe_tay_toe_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_select_all_authed" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_write_own" ON "public"."profiles" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."pve_active_buffs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pve_instabilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pve_instability_fights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pve_instability_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pve_research_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "read published announcements" ON "public"."announcements" FOR SELECT USING (("is_published" = true));



ALTER TABLE "public"."retired_kith_species" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rune_defs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rune_defs_read_active" ON "public"."rune_defs" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."signup_trigger_errors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_defs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_defs_read_authed" ON "public"."skill_defs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "skills_read_all" ON "public"."skill_defs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."trainer_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainer_awards_select_own" ON "public"."trainer_awards" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."trainer_progression" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_kith_discoveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_resources_select_own" ON "public"."user_resources" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_resources_write_own" ON "public"."user_resources" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_retired_kith" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_runes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_read_own_pet_mutations" ON "public"."pet_mutations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "pet_mutations"."pet_id") AND ("pets"."user_id" = "auth"."uid"())))));



CREATE POLICY "users_read_own_runes" ON "public"."user_runes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."wallet_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wallet_ledger_select_own" ON "public"."wallet_ledger" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wallet_ledger_write_own" ON "public"."wallet_ledger" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wallets_select_own" ON "public"."wallets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wallets_write_own" ON "public"."wallets" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."wildwood_expeditions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wildwood_rooms" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "admin"."delete_jayden_testing_emails"("p_confirm_text" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "admin"."reset_runaway_or_null_pet_users"("p_dry_run" boolean) FROM PUBLIC;











































































































































































GRANT ALL ON FUNCTION "public"."apply_hunger_decay"("p_pet_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_hunger_decay"("p_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_hunger_decay"("p_pet_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_pet_care_decay"("p_pet_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_pet_care_decay"("p_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_pet_care_decay"("p_pet_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_new_pet_mutation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_new_pet_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_pet_mutation"("p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_pet_mutation"("p_pet_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_pet_personality"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_pet_personality"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_pet_personality"() TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_trough"("p_user_id" "uuid", "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."consume_trough"("p_user_id" "uuid", "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_trough"("p_user_id" "uuid", "p_amount" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_pet_mutation_capacity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_pet_mutation_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_eastern_date"("ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."extract_eastern_date"("ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_eastern_date"("ts" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_aliune_signal_report"("p_start" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_aliune_signal_report"("p_start" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_aliune_signal_report"("p_start" timestamp with time zone) TO "service_role";



GRANT ALL ON TABLE "public"."pve_active_buffs" TO "anon";
GRANT ALL ON TABLE "public"."pve_active_buffs" TO "authenticated";
GRANT ALL ON TABLE "public"."pve_active_buffs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_active_buffs"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_active_buffs"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_buffs"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."pve_instabilities" TO "anon";
GRANT ALL ON TABLE "public"."pve_instabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."pve_instabilities" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_instabilities"("p_region" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_instabilities"("p_region" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_instabilities"("p_region" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_or_create_kithna_tutorial_signal"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_or_create_kithna_tutorial_signal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_kithna_tutorial_signal"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON TABLE "public"."pets" TO "anon";
GRANT ALL ON TABLE "public"."pets" TO "authenticated";
GRANT ALL ON TABLE "public"."pets" TO "service_role";



GRANT ALL ON FUNCTION "public"."hatch_pet"("p_user_id" "uuid", "p_egg_id" "uuid", "p_iv_hp" integer, "p_iv_atk" integer, "p_iv_def" integer, "p_iv_spd" integer, "p_iv_magi" integer, "p_iv_mana" integer, "p_gender" "text", "p_personality_id" "uuid", "p_personality_key" "text", "p_hatchling_name" "text", "p_description" "text", "p_growth_strong_stats" "text"[], "p_growth_weak_stat" "text", "p_hatch_time_alignment" "text", "p_line" "public"."elemental_line") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hatch_pet"("p_user_id" "uuid", "p_egg_id" "uuid", "p_iv_hp" integer, "p_iv_atk" integer, "p_iv_def" integer, "p_iv_spd" integer, "p_iv_magi" integer, "p_iv_mana" integer, "p_gender" "text", "p_personality_id" "uuid", "p_personality_key" "text", "p_hatchling_name" "text", "p_description" "text", "p_growth_strong_stats" "text"[], "p_growth_weak_stat" "text", "p_hatch_time_alignment" "text", "p_line" "public"."elemental_line") TO "service_role";



GRANT ALL ON FUNCTION "public"."hide_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hide_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hide_poe_tay_toe"("p_user_id" "uuid", "p_location_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_pve_research_stats"("p_user_id" "uuid", "p_instabilities_cleared" integer, "p_fights_won" integer, "p_bosses_defeated" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_pve_research_stats"("p_user_id" "uuid", "p_instabilities_cleared" integer, "p_fights_won" integer, "p_bosses_defeated" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_pve_research_stats"("p_user_id" "uuid", "p_instabilities_cleared" integer, "p_fights_won" integer, "p_bosses_defeated" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_wallet"("p_user_id" "uuid", "p_dots" integer, "p_crystals" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_wallet"("p_user_id" "uuid", "p_dots" integer, "p_crystals" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_signup_trigger_error"("p_user_id" "uuid", "p_email" "text", "p_step" "text", "p_error_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_signup_trigger_error"("p_user_id" "uuid", "p_email" "text", "p_step" "text", "p_error_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."open_closed_alpha_care_package"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."open_closed_alpha_care_package"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_locked_velune_activation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_locked_velune_activation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_locked_velune_party_assignment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_locked_velune_party_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_personality_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_personality_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_personality_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_profile_escalation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_profile_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_kith_discovery_from_pet"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_kith_discovery_from_pet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_kith_discovery_from_pet"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."recover_runaway_pet_to_party"("p_user_id" "uuid", "p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recover_runaway_pet_to_party"("p_user_id" "uuid", "p_pet_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_test_runaway_pets"("p_confirm_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_test_runaway_pets"("p_confirm_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_test_runaway_pets"("p_confirm_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."roll_velune_encounter"("p_user_id" "uuid", "p_location_key" "text", "p_sighting_roll" integer, "p_egg_roll" integer, "p_bypass_cooldown" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."roll_velune_encounter"("p_user_id" "uuid", "p_location_key" "text", "p_sighting_roll" integer, "p_egg_roll" integer, "p_bypass_cooldown" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_homepage_alerts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_homepage_alerts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_homepage_alerts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."spend_wallet"("p_user_id" "uuid", "p_dots" integer, "p_crystals" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."spend_wallet"("p_user_id" "uuid", "p_dots" integer, "p_crystals" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."spend_wallet"("p_user_id" "uuid", "p_dots" integer, "p_crystals" integer) TO "service_role";












GRANT ALL ON TABLE "public"."eggs" TO "anon";
GRANT ALL ON TABLE "public"."eggs" TO "authenticated";
GRANT ALL ON TABLE "public"."eggs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";















GRANT ALL ON TABLE "public"."admin_user_starters" TO "service_role";



GRANT ALL ON TABLE "public"."aliune_signal_reports" TO "anon";
GRANT ALL ON TABLE "public"."aliune_signal_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."aliune_signal_reports" TO "service_role";



GRANT ALL ON TABLE "public"."aliune_signals" TO "anon";
GRANT ALL ON TABLE "public"."aliune_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."aliune_signals" TO "service_role";



GRANT ALL ON TABLE "public"."alpha_systems" TO "anon";
GRANT ALL ON TABLE "public"."alpha_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."alpha_systems" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."awards" TO "anon";
GRANT ALL ON TABLE "public"."awards" TO "authenticated";
GRANT ALL ON TABLE "public"."awards" TO "service_role";



GRANT ALL ON TABLE "public"."battle_run_fights" TO "anon";
GRANT ALL ON TABLE "public"."battle_run_fights" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_run_fights" TO "service_role";



GRANT ALL ON TABLE "public"."battle_runs" TO "anon";
GRANT ALL ON TABLE "public"."battle_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_runs" TO "service_role";



GRANT ALL ON TABLE "public"."daily_care" TO "anon";
GRANT ALL ON TABLE "public"."daily_care" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_care" TO "service_role";



GRANT ALL ON TABLE "public"."daily_login_rewards" TO "anon";
GRANT ALL ON TABLE "public"."daily_login_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_login_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."element_defs" TO "anon";
GRANT ALL ON TABLE "public"."element_defs" TO "authenticated";
GRANT ALL ON TABLE "public"."element_defs" TO "service_role";



GRANT ALL ON TABLE "public"."game_config" TO "anon";
GRANT ALL ON TABLE "public"."game_config" TO "authenticated";
GRANT ALL ON TABLE "public"."game_config" TO "service_role";



GRANT ALL ON TABLE "public"."hatchery_shelf_slots" TO "anon";
GRANT ALL ON TABLE "public"."hatchery_shelf_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."hatchery_shelf_slots" TO "service_role";



GRANT ALL ON TABLE "public"."hatchery_slots" TO "anon";
GRANT ALL ON TABLE "public"."hatchery_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."hatchery_slots" TO "service_role";



GRANT ALL ON TABLE "public"."home_objects" TO "anon";
GRANT ALL ON TABLE "public"."home_objects" TO "authenticated";
GRANT ALL ON TABLE "public"."home_objects" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_alerts" TO "anon";
GRANT ALL ON TABLE "public"."homepage_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_alerts_live" TO "anon";
GRANT ALL ON TABLE "public"."homepage_alerts_live" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_alerts_live" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_aliune_signal_live" TO "anon";
GRANT ALL ON TABLE "public"."homepage_aliune_signal_live" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_aliune_signal_live" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_alpha_systems_live" TO "anon";
GRANT ALL ON TABLE "public"."homepage_alpha_systems_live" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_alpha_systems_live" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_announcements_live" TO "anon";
GRANT ALL ON TABLE "public"."homepage_announcements_live" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_announcements_live" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_logs" TO "anon";
GRANT ALL ON TABLE "public"."homepage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."patch_notes" TO "anon";
GRANT ALL ON TABLE "public"."patch_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."patch_notes" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_patch_notes_live" TO "anon";
GRANT ALL ON TABLE "public"."homepage_patch_notes_live" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_patch_notes_live" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."item_defs" TO "anon";
GRANT ALL ON TABLE "public"."item_defs" TO "authenticated";
GRANT ALL ON TABLE "public"."item_defs" TO "service_role";



GRANT ALL ON TABLE "public"."legendary_kith_event_state" TO "service_role";
GRANT SELECT ON TABLE "public"."legendary_kith_event_state" TO "authenticated";



GRANT SELECT,MAINTAIN ON TABLE "public"."mutations" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."mutations" TO "authenticated";
GRANT ALL ON TABLE "public"."mutations" TO "service_role";



GRANT ALL ON TABLE "public"."party_slots" TO "anon";
GRANT ALL ON TABLE "public"."party_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."party_slots" TO "service_role";



GRANT ALL ON TABLE "public"."passive_traits" TO "anon";
GRANT ALL ON TABLE "public"."passive_traits" TO "authenticated";
GRANT ALL ON TABLE "public"."passive_traits" TO "service_role";



GRANT ALL ON TABLE "public"."personalities" TO "anon";
GRANT ALL ON TABLE "public"."personalities" TO "authenticated";
GRANT ALL ON TABLE "public"."personalities" TO "service_role";



GRANT ALL ON TABLE "public"."pet_awards" TO "anon";
GRANT ALL ON TABLE "public"."pet_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_awards" TO "service_role";



GRANT ALL ON TABLE "public"."pet_element_affinities" TO "anon";
GRANT ALL ON TABLE "public"."pet_element_affinities" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_element_affinities" TO "service_role";



GRANT ALL ON TABLE "public"."pet_elements" TO "anon";
GRANT ALL ON TABLE "public"."pet_elements" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_elements" TO "service_role";



GRANT SELECT,MAINTAIN ON TABLE "public"."pet_mutations" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."pet_mutations" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_mutations" TO "service_role";



GRANT ALL ON TABLE "public"."pet_skills" TO "anon";
GRANT ALL ON TABLE "public"."pet_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_skills" TO "service_role";



GRANT ALL ON TABLE "public"."pet_stat_allocations" TO "anon";
GRANT ALL ON TABLE "public"."pet_stat_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_stat_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."pet_stats" TO "anon";
GRANT ALL ON TABLE "public"."pet_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."pet_stats" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."player_quests" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."player_quests" TO "authenticated";
GRANT ALL ON TABLE "public"."player_quests" TO "service_role";



GRANT ALL ON TABLE "public"."poe_tay_toe_finds" TO "anon";
GRANT ALL ON TABLE "public"."poe_tay_toe_finds" TO "authenticated";
GRANT ALL ON TABLE "public"."poe_tay_toe_finds" TO "service_role";



GRANT ALL ON TABLE "public"."poe_tay_toe_state" TO "anon";
GRANT ALL ON TABLE "public"."poe_tay_toe_state" TO "authenticated";
GRANT ALL ON TABLE "public"."poe_tay_toe_state" TO "service_role";



GRANT ALL ON TABLE "public"."pve_instability_fights" TO "anon";
GRANT ALL ON TABLE "public"."pve_instability_fights" TO "authenticated";
GRANT ALL ON TABLE "public"."pve_instability_fights" TO "service_role";



GRANT ALL ON TABLE "public"."pve_instability_runs" TO "anon";
GRANT ALL ON TABLE "public"."pve_instability_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."pve_instability_runs" TO "service_role";



GRANT ALL ON TABLE "public"."pve_research_stats" TO "anon";
GRANT ALL ON TABLE "public"."pve_research_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."pve_research_stats" TO "service_role";



GRANT ALL ON TABLE "public"."retired_kith_species" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."retired_kith_species" TO "authenticated";
GRANT ALL ON TABLE "public"."retired_kith_species" TO "service_role";



GRANT ALL ON TABLE "public"."rune_defs" TO "anon";
GRANT ALL ON TABLE "public"."rune_defs" TO "authenticated";
GRANT ALL ON TABLE "public"."rune_defs" TO "service_role";



GRANT ALL ON TABLE "public"."signup_trigger_errors" TO "anon";
GRANT ALL ON TABLE "public"."signup_trigger_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."signup_trigger_errors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."signup_trigger_errors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."signup_trigger_errors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."signup_trigger_errors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."skill_defs" TO "anon";
GRANT ALL ON TABLE "public"."skill_defs" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_defs" TO "service_role";



GRANT ALL ON TABLE "public"."trainer_awards" TO "anon";
GRANT ALL ON TABLE "public"."trainer_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."trainer_awards" TO "service_role";



GRANT ALL ON TABLE "public"."trainer_progression" TO "service_role";
GRANT SELECT ON TABLE "public"."trainer_progression" TO "authenticated";



GRANT ALL ON TABLE "public"."user_kith_discoveries" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_kith_discoveries" TO "authenticated";
GRANT ALL ON TABLE "public"."user_kith_discoveries" TO "service_role";



GRANT ALL ON TABLE "public"."user_resources" TO "anon";
GRANT ALL ON TABLE "public"."user_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."user_resources" TO "service_role";



GRANT ALL ON TABLE "public"."user_retired_kith" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_retired_kith" TO "authenticated";
GRANT ALL ON TABLE "public"."user_retired_kith" TO "service_role";



GRANT ALL ON TABLE "public"."user_runes" TO "anon";
GRANT ALL ON TABLE "public"."user_runes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_runes" TO "service_role";



GRANT ALL ON TABLE "public"."v_pet_storage_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_pet_storage_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_pet_storage_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_pet_total_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_pet_total_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_pet_total_stats" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_ledger" TO "anon";
GRANT ALL ON TABLE "public"."wallet_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."wildwood_expeditions" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."wildwood_expeditions" TO "authenticated";
GRANT ALL ON TABLE "public"."wildwood_expeditions" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."wildwood_rooms" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."wildwood_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."wildwood_rooms" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




































DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";

CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW
EXECUTE FUNCTION "public"."handle_new_user_profile"();
