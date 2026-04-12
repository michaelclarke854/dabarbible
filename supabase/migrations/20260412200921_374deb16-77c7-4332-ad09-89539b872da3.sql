
-- Prevent community members from escalating their own role
CREATE POLICY "Community members cannot self-escalate role"
ON public.community_members
FOR UPDATE
TO authenticated
USING (
  -- Community admins can update any member in their community
  is_community_admin(community_id, auth.uid())
  OR
  -- Members can update their own row but not their role
  (user_id = auth.uid())
)
WITH CHECK (
  -- Admins can set any role
  is_community_admin(community_id, auth.uid())
  OR
  -- Non-admins updating own row must keep their existing role
  (user_id = auth.uid() AND role = (SELECT cm.role FROM public.community_members cm WHERE cm.id = community_members.id))
);

-- Prevent family members from escalating their own role
CREATE POLICY "Family members cannot self-escalate role"
ON public.family_members
FOR UPDATE
TO authenticated
USING (
  is_family_owner(family_id, auth.uid())
  OR
  (user_id = auth.uid())
)
WITH CHECK (
  is_family_owner(family_id, auth.uid())
  OR
  (user_id = auth.uid() AND role = (SELECT fm.role FROM public.family_members fm WHERE fm.id = family_members.id))
);
