-- Atomic wallet spend, symmetric to increment_wallet. Used by the
-- Lost Kith Registry recovery flow (and any future paid action) so the
-- balance check and deduction happen as one operation instead of a
-- read-then-write from the route handler.

create or replace function spend_wallet(
  p_user_id uuid,
  p_dots int default 0,
  p_crystals int default 0
)
returns boolean
language plpgsql
as $$
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
