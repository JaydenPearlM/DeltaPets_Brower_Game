-- supabase/migrations/20260411_000017_drop_pets_one_per_user_alpha.sql
-- Drops old alpha-era one-pet-per-user constraint now that party/storage support exists.

drop index if exists public.pets_one_per_user_alpha;