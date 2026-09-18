-- Hospital Information + Doctor Sharing
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query -> Run).
-- Same pattern as the rest of the app: RLS enabled, no permissive policies -- every
-- read/write goes through server functions using the service-role key.

create table if not exists public.saved_hospitals (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.emergency_cards (card_id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.saved_hospitals enable row level security;

create index if not exists saved_hospitals_card_idx on public.saved_hospitals (card_id, created_at desc);

create table if not exists public.doctor_shares (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.emergency_cards (card_id) on delete cascade,
  label text not null default '',
  include_allergies boolean not null default true,
  include_medications boolean not null default true,
  include_conditions boolean not null default true,
  include_contacts boolean not null default false,
  document_ids text[] not null default '{}',
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.doctor_shares enable row level security;

create index if not exists doctor_shares_card_idx on public.doctor_shares (card_id, created_at desc);
