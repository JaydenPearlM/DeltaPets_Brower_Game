drop policy if exists "wallets_crud_own" on public.wallets;
drop policy if exists "wallets_select_own" on public.wallets;

create policy "wallets_select_own"
on public.wallets
for select
using (auth.uid() = user_id);