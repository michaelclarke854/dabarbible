
-- Add preferred Bible version to profiles
ALTER TABLE public.profiles
ADD COLUMN preferred_bible_version text NOT NULL DEFAULT 'KJV';

-- Add version to saved_verses to record which translation was active at save time
ALTER TABLE public.saved_verses
ADD COLUMN version text NOT NULL DEFAULT 'KJV';
