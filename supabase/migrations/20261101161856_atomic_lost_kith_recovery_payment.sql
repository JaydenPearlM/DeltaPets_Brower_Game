-- BUG-014: Recover the existing runaway Kith and debit its recovery price
-- in the same transaction. No existing data or migrations are rewritten.
CREATE OR REPLACE FUNCTION public.recover_runaway_pet_with_payment(
  p_user_id uuid,
  p_pet_id uuid,
  p_dots integer,
  p_crystals integer
)
RETURNS TABLE (party_slot integer, destination text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.recover_runaway_pet_with_payment(uuid, uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_runaway_pet_with_payment(uuid, uuid, integer, integer)
  TO service_role;
