-- Fix calculate_age_group: "minor" → "blocked" for under-13
CREATE OR REPLACE FUNCTION public.calculate_age_group(dob date)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO 'public'
AS $function$
DECLARE
  age_years INT;
BEGIN
  age_years := date_part('year', age(dob));
  IF age_years < 13 THEN RETURN 'blocked';
  ELSIF age_years <= 17 THEN RETURN 'youth';
  ELSIF age_years <= 22 THEN RETURN 'young_adult';
  ELSE RETURN 'adult';
  END IF;
END;
$function$;

-- Fix enforce_age_minimum: catch both "blocked" and "minor"
CREATE OR REPLACE FUNCTION public.enforce_age_minimum()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.age_group IN ('blocked', 'minor') THEN
    RAISE EXCEPTION 'User must be 13 or older to create an account';
  END IF;
  RETURN NEW;
END;
$function$;