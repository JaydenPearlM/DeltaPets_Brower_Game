BEGIN;

-- Hatching is authorized and validated by the Express route. Clients must not
-- bypass it by invoking this privileged database function directly.
REVOKE EXECUTE ON FUNCTION public.hatch_pet(
  uuid, uuid, integer, integer, integer, integer, integer, integer,
  text, uuid, text, text, text, text[], text, text, public.elemental_line
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.hatch_pet(
  uuid, uuid, integer, integer, integer, integer, integer, integer,
  text, uuid, text, text, text, text[], text, text, public.elemental_line
) TO service_role;

COMMIT;
