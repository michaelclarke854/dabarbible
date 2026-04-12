
-- Fix community_members: enforce role='member' on all client INSERTs
-- The enforce_community_member_role trigger already does this, but belt-and-suspenders at RLS level
DROP POLICY IF EXISTS "Community admins can insert members" ON public.community_members;

CREATE POLICY "Community admins can insert members as member role"
ON public.community_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_community_admin(community_id, auth.uid())
  AND role = 'member'
);

-- Fix language_waitlist: restrict to authenticated only
DROP POLICY IF EXISTS "Users can join language waitlist" ON public.language_waitlist;
DROP POLICY IF EXISTS "Authenticated users can join waitlist" ON public.language_waitlist;

CREATE POLICY "Authenticated users can join waitlist"
ON public.language_waitlist
FOR INSERT
TO authenticated
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
