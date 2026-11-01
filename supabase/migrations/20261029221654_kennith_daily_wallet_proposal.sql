-- PROPOSAL ONLY. Requires explicit approval before applying.
-- Apply separately: do not run an unfiltered push of other pending migrations.
-- Does not seed/update player inventory, wallets, items or Assanti's state.
BEGIN;
CREATE TABLE public.kennith_wallet_days (
  delta_day integer PRIMARY KEY CHECK (delta_day >= 0),
  starting_dots integer NOT NULL CHECK (starting_dots BETWEEN 1000 AND 2000),
  dots integer NOT NULL CHECK (dots >= 0)
);
ALTER TABLE public.kennith_wallet_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kennith_wallet_days FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kennith_wallet_days TO service_role;

CREATE FUNCTION public.get_kennith_wallet(p_delta_day integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
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
REVOKE ALL ON FUNCTION public.get_kennith_wallet(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_kennith_wallet(integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
