alter table public.pets
add column if not exists is_rescue_reroll boolean not null default false;