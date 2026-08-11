CREATE TABLE public.onboarding_prompt_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day smallint not null,
  verse_ref text,
  sent_at timestamptz not null default now(),
  unique (user_id, day)
);
GRANT SELECT ON public.onboarding_prompt_log TO authenticated;
GRANT ALL ON public.onboarding_prompt_log TO service_role;
ALTER TABLE public.onboarding_prompt_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own onboarding prompts"
ON public.onboarding_prompt_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);