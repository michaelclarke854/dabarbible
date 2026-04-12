CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, plan, role, trial_started_at, trial_ends_at, age_group)
  VALUES (
    NEW.id,
    'trial',
    'personal',
    now(),
    now() + interval '30 days',
    COALESCE(NEW.raw_user_meta_data->>'age_group', NULL)
  );
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'trial', 'active');
  RETURN NEW;
END;
$$;