
ALTER TABLE public.wisdom_sessions
ADD COLUMN crisis_marker boolean NOT NULL DEFAULT false;
