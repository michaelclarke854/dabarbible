
-- Fix community_members INSERT to authenticated only
DROP POLICY IF EXISTS "Community admins can insert members" ON public.community_members;
CREATE POLICY "Community admins can insert members"
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_community_admin(community_id, auth.uid()));

-- Fix community_members SELECT to authenticated only
DROP POLICY IF EXISTS "Community admins can view all members" ON public.community_members;
CREATE POLICY "Community admins can view all members"
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR is_community_admin(community_id, auth.uid()));

-- Fix family_members policies to authenticated only
DROP POLICY IF EXISTS "Family owners can insert members" ON public.family_members;
CREATE POLICY "Family owners can insert members"
  ON public.family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_family_owner(family_id, auth.uid()));

DROP POLICY IF EXISTS "Family owners can view their family members" ON public.family_members;
CREATE POLICY "Family owners can view their family members"
  ON public.family_members
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR is_family_owner(family_id, auth.uid()));

DROP POLICY IF EXISTS "Family owners can delete members" ON public.family_members;
CREATE POLICY "Family owners can delete members"
  ON public.family_members
  FOR DELETE
  TO authenticated
  USING (is_family_owner(family_id, auth.uid()));
