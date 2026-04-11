
CREATE OR REPLACE FUNCTION public.calculate_age_group(dob DATE)
RETURNS public.age_group
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
