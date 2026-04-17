DROP POLICY IF EXISTS "Anyone can submit a pastoral inquiry" ON public.pastoral_inquiries;

CREATE POLICY "Public can submit valid pastoral inquiry"
ON public.pastoral_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND length(trim(church_name)) BETWEEN 1 AND 200
  AND length(trim(email)) BETWEEN 3 AND 320
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (congregation_size IS NULL OR length(congregation_size) <= 50)
  AND (notes IS NULL OR length(notes) <= 2000)
);