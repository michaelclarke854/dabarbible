
-- Re-add age_group as text with constraint
ALTER TABLE public.profiles ADD COLUMN age_group text NOT NULL DEFAULT 'adult'
  CONSTRAINT age_group_valid CHECK (age_group IN ('minor', 'youth', 'young_adult', 'adult'));

-- Make date_of_birth NOT NULL (fill existing nulls first)
UPDATE public.profiles SET date_of_birth = '2000-01-01' WHERE date_of_birth IS NULL;
ALTER TABLE public.profiles ALTER COLUMN date_of_birth SET NOT NULL;

-- Remove the default now that column exists
ALTER TABLE public.profiles ALTER COLUMN age_group DROP DEFAULT;

-- Recreate helper function returning text
CREATE OR REPLACE FUNCTION public.calculate_age_group(dob DATE)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  age_years INT;
BEGIN
  age_years := date_part('year', age(dob));
  IF age_years < 13 THEN RETURN 'minor';
  ELSIF age_years <= 17 THEN RETURN 'youth';
  ELSIF age_years <= 22 THEN RETURN 'young_adult';
  ELSE RETURN 'adult';
  END IF;
END;
$$;
