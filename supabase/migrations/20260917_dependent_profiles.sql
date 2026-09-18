-- Dependent / managed profiles (e.g. a parent or child with no phone of their own)
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query -> Run).

alter table public.emergency_cards
  add column if not exists managed_by_card_id text references public.emergency_cards (card_id) on delete cascade;

create index if not exists emergency_cards_managed_by_idx
  on public.emergency_cards (managed_by_card_id);
