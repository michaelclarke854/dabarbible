-- 1. Restrictive policy: regardless of any permissive policy, the caller MUST be an admin.
--    (Restrictive policies are ANDed with permissive policies.)
DROP POLICY IF EXISTS "Only admins may access email_templates" ON public.email_templates;
CREATE POLICY "Only admins may access email_templates"
  ON public.email_templates
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));

-- 2. Explicitly block deletes for all client roles (service role bypasses RLS).
DROP POLICY IF EXISTS "No direct delete on email_templates" ON public.email_templates;
CREATE POLICY "No direct delete on email_templates"
  ON public.email_templates
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- 3. Revoke any leftover privileges from anon; minimum grants only to authenticated
--    (RLS still gates actual row access — only admins satisfy policies).
REVOKE ALL ON public.email_templates FROM anon;
REVOKE ALL ON public.email_templates FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.email_templates TO authenticated;