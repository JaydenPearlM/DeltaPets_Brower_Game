begin;

alter table public.wallets
  alter column dots set default 5000,
  alter column crystals set default 0;

insert into public.wallets (user_id, dots, crystals)
select id, 5000, 0
from auth.users
on conflict (user_id) do nothing;

update public.wallets
set
  dots = 5000,
  updated_at = now()
where dots < 5000;

commit;