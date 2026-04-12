-- 1. Trigger for new user signups (CRITICAL)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Enforce super_admin lock on profiles
CREATE OR REPLACE TRIGGER enforce_super_admin_lock_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_lock();

-- 3. Prevent self role change on profiles
CREATE OR REPLACE TRIGGER prevent_self_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- 4. Age minimum enforcement on profiles
CREATE OR REPLACE TRIGGER check_age_on_profile
  BEFORE INSERT OR UPDATE OF age_group ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_age_minimum();

-- 5. Validate profile role and plan values
CREATE OR REPLACE TRIGGER validate_profile_role_plan_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_role_plan();

-- 6. Auto-update updated_at on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Auto-update updated_at on reflection_entries
CREATE OR REPLACE TRIGGER update_reflection_timestamp_trigger
  BEFORE UPDATE ON public.reflection_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_reflection_timestamp();

-- 8. Enforce community member role
CREATE OR REPLACE TRIGGER enforce_community_member_role_trigger
  BEFORE INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_community_member_role();