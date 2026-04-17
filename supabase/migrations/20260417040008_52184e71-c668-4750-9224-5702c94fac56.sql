-- Add resolved tracking to response_flags and pastoral_inquiries
ALTER TABLE public.response_flags
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;

ALTER TABLE public.pastoral_inquiries
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;

-- Allow admins to update (mark resolved) on both tables
CREATE POLICY "Admins can update response flags"
ON public.response_flags
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

CREATE POLICY "Admins can update pastoral inquiries"
ON public.pastoral_inquiries
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));