
-- Missing indexes for query performance
CREATE INDEX IF NOT EXISTS idx_wisdom_sessions_user_id ON public.wisdom_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reflection_entries_user_id ON public.reflection_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_verses_user_id ON public.saved_verses(user_id);

-- Drop unused date_of_birth column (privacy — only age_group should be stored)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS date_of_birth;
