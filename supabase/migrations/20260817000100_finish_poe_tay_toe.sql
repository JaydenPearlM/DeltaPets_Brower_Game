create or replace function public.claim_poe_tay_toe(
  p_user_id uuid,
  p_location_key text
)
returns table (
  claimed boolean,
  reason text,
  cooldown_ends_at timestamptz,
  dots_awarded int,
  item_slug text,
  item_qty int
)
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.hide_poe_tay_toe(
  p_user_id uuid,
  p_location_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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