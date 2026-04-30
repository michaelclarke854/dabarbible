
-- Create onboarding_intent table
CREATE TABLE IF NOT EXISTS public.onboarding_intent (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL,
  intent_key   TEXT NOT NULL,
  intent_label TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.onboarding_intent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_intent" ON public.onboarding_intent
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_intent_key TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
