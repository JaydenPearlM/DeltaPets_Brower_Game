begin;

alter table public.profiles
  add column if not exists starter_cleanup_affected boolean not null default false;

alter table public.profiles
  add column if not exists starter_cleanup_notice_seen boolean not null default false;

update public.profiles
set starter_cleanup_affected = true,
    starter_cleanup_notice_seen = false,
    updated_at = now()
where user_id = '0ff4d38a-b072-4865-b072-771a4b795f19';

update public.wallets
set dots = dots + 1000,
    updated_at = now()
where user_id = '0ff4d38a-b072-4865-b072-771a4b795f19';

insert into public.wallet_ledger (
  user_id,
  currency,
  delta,
  reason
)
values (
  '0ff4d38a-b072-4865-b072-771a4b795f19',
  'dots',
  1000,
  'starter_cleanup_compensation'
);

commit;