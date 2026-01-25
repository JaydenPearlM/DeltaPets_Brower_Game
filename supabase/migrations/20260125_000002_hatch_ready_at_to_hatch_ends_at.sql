-- Rename hatch timer column to a single source of truth:
-- hatch_ready_at -> hatch_ends_at

alter table public.pets
add column if not exists hatch_ends_at timestamptz;

update public.pets
set hatch_ends_at = hatch_ready_at
where hatch_ends_at is null
  and hatch_ready_at is not null;

alter table public.pets
drop column if exists hatch_ready_at;
