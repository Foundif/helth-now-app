-- Blood Donor Network + Blood Request
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query -> Run).
-- All access from the app goes through server functions using the service-role key,
-- which bypasses RLS, so these tables intentionally have RLS enabled with NO
-- permissive policies: the anon/publishable key can never read or write them directly.

create table if not exists public.blood_donors (
  card_id text primary key references public.emergency_cards (card_id) on delete cascade,
  name text not null,
  blood_group text not null,
  city text not null,
  phone text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.blood_donors enable row level security;

create index if not exists blood_donors_search_idx
  on public.blood_donors (blood_group, city)
  where active;

create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.emergency_cards (card_id) on delete cascade,
  requester_name text not null,
  blood_group text not null,
  city text not null,
  hospital text,
  notes text,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.blood_requests enable row level security;

create index if not exists blood_requests_open_idx
  on public.blood_requests (blood_group, city, created_at desc)
  where status = 'open';
