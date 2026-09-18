-- Family linking, family alerts, and safety check-in
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query -> Run).
-- Same pattern as the rest of the app: RLS enabled, no permissive policies -- every
-- read/write goes through server functions using the service-role key.

create table if not exists public.family_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.family_circles enable row level security;

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.family_circles (id) on delete cascade,
  card_id text not null references public.emergency_cards (card_id) on delete cascade,
  relation text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by_card_id text not null references public.emergency_cards (card_id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (circle_id, card_id)
);

alter table public.family_members enable row level security;

create index if not exists family_members_card_idx on public.family_members (card_id, status);
create index if not exists family_members_circle_idx on public.family_members (circle_id, status);

create table if not exists public.family_alerts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.family_circles (id) on delete cascade,
  card_id text not null references public.emergency_cards (card_id) on delete cascade,
  type text not null check (type in ('scan', 'sos', 'checkin_missed')),
  message text not null default '',
  created_at timestamptz not null default now()
);

alter table public.family_alerts enable row level security;

create index if not exists family_alerts_circle_idx on public.family_alerts (circle_id, created_at desc);

-- Enable Realtime for in-app live alert delivery while the app is open.
alter publication supabase_realtime add table public.family_alerts;

create table if not exists public.safety_checkins (
  card_id text primary key references public.emergency_cards (card_id) on delete cascade,
  enabled boolean not null default false,
  interval_minutes integer not null default 30,
  last_confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Note: if the ALTER PUBLICATION line above errors, you can instead enable Realtime
-- for family_alerts via Supabase Dashboard -> Database -> Replication -> toggle the table on.

alter table public.safety_checkins enable row level security;
