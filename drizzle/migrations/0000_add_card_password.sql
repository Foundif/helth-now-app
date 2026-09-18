ALTER TABLE public.emergency_cards
  ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';