DROP FUNCTION IF EXISTS public.get_emergency_card(TEXT);
DROP FUNCTION IF EXISTS public.set_emergency_card(TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], JSONB, TEXT);

GRANT SELECT (card_id, holder_name, blood_group, allergies, medications, conditions, contacts, updated_at) ON public.emergency_cards TO anon, authenticated;

CREATE POLICY "Emergency details are publicly readable by card id"
ON public.emergency_cards
FOR SELECT
TO anon, authenticated
USING (true);