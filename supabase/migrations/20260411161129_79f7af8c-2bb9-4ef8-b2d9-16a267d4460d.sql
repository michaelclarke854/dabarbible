-- Make date_of_birth and age_group nullable so handle_new_user trigger works
ALTER TABLE public.profiles ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN age_group DROP NOT NULL;