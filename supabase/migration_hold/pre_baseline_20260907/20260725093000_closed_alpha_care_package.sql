begin;

insert into public.item_defs (
  slug,
  name,
  type,
  description,
  rarity,
  stack_limit,
  effects
)
values (
  'closed-alpha-care-package',
  'Closed Alpha Care Package',
  'care',
  'A thank-you gift for Closed Alpha testers.',
  3,
  1,
  '{"closedAlphaCarePackage":true}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  description = excluded.description,
  rarity = excluded.rarity,
  stack_limit = excluded.stack_limit,
  effects = excluded.effects;

create or replace function public.open_closed_alpha_care_package(p_user_id uuid)
returns table(opened boolean, dots integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  insert into public.wallet_ledger (
    user_id,
    currency,
    delta,
    reason
  )
  values (
    p_user_id,
    'dots',
    1000,
    'closed_alpha_care_package'
  );

  return query select true, v_dots;
end;
$$;

revoke all on function public.open_closed_alpha_care_package(uuid) from public;
revoke all on function public.open_closed_alpha_care_package(uuid) from anon;
revoke all on function public.open_closed_alpha_care_package(uuid) from authenticated;
grant execute on function public.open_closed_alpha_care_package(uuid) to service_role;

commit;