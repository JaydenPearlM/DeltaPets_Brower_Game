-- 20260131_000005_pet_home_room.sql
-- Adds pet home/bond + runaway logic fields

alter table public.pets
  add column if not exists bond int not null default 0 check (bond between 0 and 100),
  add column if not exists last_fed_at timestamptz not null default now(),
  add column if not exists runaway_at timestamptz,
  add column if not exists is_runaway boolean not null default false,
  add column if not exists cd_bond_ends_at timestamptz;

create index if not exists pets_last_fed_at_idx on public.pets (last_fed_at);
create index if not exists pets_is_runaway_idx on public.pets (is_runaway);
create index if not exists pets_cd_bond_ends_at_idx on public.pets (cd_bond_ends_at);
