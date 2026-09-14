ALTER TABLE public.emergency_cards DROP CONSTRAINT IF EXISTS emergency_cards_name_length;
ALTER TABLE public.emergency_cards ADD CONSTRAINT emergency_cards_name_length CHECK (holder_name = '' OR char_length(holder_name) BETWEEN 1 AND 100);
ALTER TABLE public.emergency_cards DROP CONSTRAINT IF EXISTS emergency_cards_blood_group;
ALTER TABLE public.emergency_cards ADD CONSTRAINT emergency_cards_blood_group CHECK (blood_group IN ('', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'));
ALTER SEQUENCE public.helth_card_seq OWNED BY NONE;