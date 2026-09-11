CREATE TABLE public.emergency_cards (
  card_id TEXT PRIMARY KEY,
  holder_name TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  medications TEXT[] NOT NULL DEFAULT '{}',
  conditions TEXT[] NOT NULL DEFAULT '{}',
  contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  edit_token_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT emergency_cards_card_id_format CHECK (card_id ~ '^[A-Z0-9]{6,20}$'),
  CONSTRAINT emergency_cards_name_length CHECK (char_length(holder_name) BETWEEN 1 AND 100),
  CONSTRAINT emergency_cards_blood_group CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  CONSTRAINT emergency_cards_contacts_array CHECK (jsonb_typeof(contacts) = 'array')
);
GRANT ALL ON public.emergency_cards TO service_role;
ALTER TABLE public.emergency_cards ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_emergency_card(_card_id TEXT)
RETURNS TABLE (
  card_id TEXT,
  holder_name TEXT,
  blood_group TEXT,
  allergies TEXT[],
  medications TEXT[],
  conditions TEXT[],
  contacts JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.card_id,
    c.holder_name,
    c.blood_group,
    c.allergies,
    c.medications,
    c.conditions,
    c.contacts,
    c.updated_at
  FROM public.emergency_cards c
  WHERE c.card_id = upper(trim(_card_id));
$$;
REVOKE ALL ON FUNCTION public.get_emergency_card(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_emergency_card(TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_emergency_card(
  _card_id TEXT,
  _holder_name TEXT,
  _blood_group TEXT,
  _allergies TEXT[],
  _medications TEXT[],
  _conditions TEXT[],
  _contacts JSONB,
  _edit_token_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.emergency_cards
    WHERE card_id = upper(trim(_card_id))
      AND edit_token_hash <> _edit_token_hash
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.emergency_cards (
    card_id, holder_name, blood_group, allergies, medications, conditions, contacts, edit_token_hash
  ) VALUES (
    upper(trim(_card_id)), trim(_holder_name), _blood_group, _allergies, _medications, _conditions, _contacts, _edit_token_hash
  )
  ON CONFLICT (card_id) DO UPDATE SET
    holder_name = EXCLUDED.holder_name,
    blood_group = EXCLUDED.blood_group,
    allergies = EXCLUDED.allergies,
    medications = EXCLUDED.medications,
    conditions = EXCLUDED.conditions,
    contacts = EXCLUDED.contacts,
    updated_at = now();
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.set_emergency_card(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_emergency_card(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], JSONB, TEXT) TO service_role;