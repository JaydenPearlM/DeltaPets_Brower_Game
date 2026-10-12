BEGIN;
SET LOCAL lock_timeout = '5s';

-- Forward-only: do not edit or replay the applied 20261001005606 migration.
CREATE TABLE public.pet_battle_results (
  battle_id uuid NOT NULL REFERENCES public.wildwood_rooms(battle_id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('victory', 'defeat')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, pet_id)
);

CREATE INDEX pet_battle_results_owner_pet_result_idx
  ON public.pet_battle_results (user_id, pet_id, result);
CREATE INDEX pet_battle_results_pet_idx ON public.pet_battle_results (pet_id);

ALTER TABLE public.pet_battle_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pet_battle_results FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.pet_battle_results TO authenticated;
GRANT SELECT, INSERT ON TABLE public.pet_battle_results TO service_role;

CREATE POLICY pet_battle_results_select_own
  ON public.pet_battle_results FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Validate against authoritative rows inside the batch INSERT transaction.
-- SHARE locks prevent ownership/completion changes between validation and insert.
-- No SECURITY DEFINER: the existing server role supplies its own privileges.
CREATE FUNCTION public.validate_wildwood_pet_battle_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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

REVOKE ALL ON FUNCTION public.validate_wildwood_pet_battle_result() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_wildwood_pet_battle_result() TO service_role;
CREATE TRIGGER validate_wildwood_pet_battle_result
  BEFORE INSERT ON public.pet_battle_results
  FOR EACH ROW EXECUTE FUNCTION public.validate_wildwood_pet_battle_result();

COMMIT;
