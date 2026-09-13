ALTER TABLE public.emergency_cards ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS emergency_cards_phone_key ON public.emergency_cards (phone);
ALTER TABLE public.emergency_cards ALTER COLUMN edit_token_hash SET DEFAULT '';
ALTER TABLE public.emergency_cards ALTER COLUMN holder_name SET DEFAULT '';
ALTER TABLE public.emergency_cards ALTER COLUMN blood_group SET DEFAULT '';
CREATE SEQUENCE IF NOT EXISTS public.helth_card_seq START 1;
REVOKE SELECT (phone, edit_token_hash) ON public.emergency_cards FROM anon;
REVOKE SELECT (phone, edit_token_hash) ON public.emergency_cards FROM authenticated;

CREATE TABLE IF NOT EXISTS public.health_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id text NOT NULL REFERENCES public.emergency_cards(card_id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.health_documents TO service_role;
ALTER TABLE public.health_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Health documents are server-managed only" ON public.health_documents FOR ALL TO service_role USING (true) WITH CHECK (true);