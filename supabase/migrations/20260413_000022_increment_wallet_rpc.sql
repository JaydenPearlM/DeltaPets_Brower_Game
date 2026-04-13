create or replace function increment_wallet(
  p_user_id uuid,
  p_dots int default 0,
  p_crystals int default 0
)
returns void
language sql
as $$
  insert into wallets (user_id, dots, crystals)
  values (p_user_id, greatest(p_dots, 0), greatest(p_crystals, 0))
  on conflict (user_id) do update
    set
      dots     = wallets.dots     + greatest(p_dots, 0),
      crystals = wallets.crystals + greatest(p_crystals, 0),
      updated_at = now();
$$;