-- Add language preference to profiles
ALTER TABLE public.profiles ADD COLUMN language_preference text NOT NULL DEFAULT 'en';

-- Create language waitlist table
CREATE TABLE public.language_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  language_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email, language_code)
);

ALTER TABLE public.language_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up for the waitlist
CREATE POLICY "Anyone can join waitlist"
  ON public.language_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can see their own waitlist entries
CREATE POLICY "Users can view their own waitlist entries"
  ON public.language_waitlist FOR SELECT
  USING (true);