begin;

drop function if exists public.hatch_pet(
  uuid,
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  uuid,
  text,
  text,
  text,
  text[],
  text,
  text,
  text
);

notify pgrst, 'reload schema';

commit;