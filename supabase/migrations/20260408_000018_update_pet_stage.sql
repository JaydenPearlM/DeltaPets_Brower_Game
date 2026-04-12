-- normalize pet stage enum
alter type pet_stage rename to pet_stage_old;

create type pet_stage as enum (
  'egg',
  'hatchling',
  'lowform',
  'highform',
  'legion',
  'mythical_legendary'
);

alter table pets
  alter column stage type pet_stage
  using lower(stage)::pet_stage;

drop type pet_stage_old;