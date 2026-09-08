-- normalize pet stage enum safely
-- Do not rename/recreate the enum here.
-- The remote DB already has dependencies on pets.stage.

alter type public.pet_stage add value if not exists 'egg';
alter type public.pet_stage add value if not exists 'hatchling';
alter type public.pet_stage add value if not exists 'lowform';
alter type public.pet_stage add value if not exists 'highform';
alter type public.pet_stage add value if not exists 'legion';
alter type public.pet_stage add value if not exists 'mythical_legendary';