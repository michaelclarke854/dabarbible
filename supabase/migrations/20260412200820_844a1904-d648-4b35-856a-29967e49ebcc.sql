
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create a hardened INSERT policy that enforces safe defaults
CREATE POLICY "Users can insert own profile with safe defaults"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'free'
  AND plan = 'free'
  AND (is_suspended IS NULL OR is_suspended = false)
  AND stripe_customer_id IS NULL
  AND suspended_at IS NULL
  AND suspended_by IS NULL
  AND role_changed_at IS NULL
  AND role_changed_by IS NULL
  AND previous_role IS NULL
  AND beta_granted_at IS NULL
  AND beta_granted_by IS NULL
  AND beta_notes IS NULL
  AND grace_period_until IS NULL
  AND trial_converted = false
);
