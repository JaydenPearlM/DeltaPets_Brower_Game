-- Insert only the tester-pet FK cleanup into the existing function definition.
-- This migration does not invoke the cleanup function or delete player data.
DO $migration$
DECLARE
  function_definition text;
  line_ending text;
  pet_delete text;
  event_delete text;
BEGIN
  function_definition := pg_get_functiondef(
    'admin.delete_jayden_testing_emails(text)'::regprocedure
  );
  line_ending := CASE
    WHEN strpos(function_definition, E'\r\n') > 0 THEN E'\r\n'
    ELSE E'\n'
  END;

  pet_delete := array_to_string(ARRAY[
    '  delete from public.pets p',
    '  where p.id in (',
    '    select jtp.pet_id',
    '    from _jayden_test_user_pets jtp',
    '  );'
  ], line_ending);

  event_delete := array_to_string(ARRAY[
    '  delete from public.legendary_kith_event_state lkes',
    '  where lkes.egg_pet_id in (',
    '    select jtp.pet_id',
    '    from _jayden_test_user_pets jtp',
    '  );',
    '',
    ''
  ], line_ending);

  IF strpos(function_definition, event_delete || pet_delete) > 0 THEN
    RETURN;
  END IF;

  IF (length(function_definition) -
      length(replace(function_definition, pet_delete, ''))) <> length(pet_delete) THEN
    RAISE EXCEPTION 'Expected exactly one tester pet deletion; cleanup function unchanged.';
  END IF;

  EXECUTE replace(function_definition, pet_delete, event_delete || pet_delete);
END;
$migration$;
