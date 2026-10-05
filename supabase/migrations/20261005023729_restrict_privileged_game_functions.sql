-- Permission-only change: preserve function bodies and all existing Alpha data.
-- PUBLIC must be revoked too: anon/authenticated inherit its EXECUTE privilege.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.claim_poe_tay_toe(uuid, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_poe_tay_toe(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.hide_poe_tay_toe(uuid, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hide_poe_tay_toe(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_pve_research_stats(uuid, integer, integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pve_research_stats(uuid, integer, integer, integer)
TO service_role;

REVOKE EXECUTE ON FUNCTION public.restore_test_runaway_pets(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_test_runaway_pets(text) TO service_role;

COMMIT;
