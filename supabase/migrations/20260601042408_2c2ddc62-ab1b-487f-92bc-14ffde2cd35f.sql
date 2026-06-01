
-- 1) Lock is_pastor and pastoral_community_id in the self-update guard
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service_role (edge functions) to change anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- If the authenticated user is updating their own profile,
  -- prevent changes to privileged fields
  IF NEW.user_id = auth.uid() THEN
    NEW.role := OLD.role;
    NEW.plan := OLD.plan;
    NEW.is_suspended := OLD.is_suspended;
    NEW.suspended_at := OLD.suspended_at;
    NEW.suspended_by := OLD.suspended_by;
    NEW.role_changed_at := OLD.role_changed_at;
    NEW.role_changed_by := OLD.role_changed_by;
    NEW.previous_role := OLD.previous_role;
    NEW.beta_granted_at := OLD.beta_granted_at;
    NEW.beta_granted_by := OLD.beta_granted_by;
    NEW.beta_notes := OLD.beta_notes;
    NEW.grace_period_until := OLD.grace_period_until;
    -- Pastor escalation guard
    NEW.is_pastor := OLD.is_pastor;
    NEW.pastoral_community_id := OLD.pastoral_community_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Drop the broad public SELECT policy that allows listing the videos bucket.
--    Public URLs (storage/v1/object/public/...) still work because the bucket is marked public.
DROP POLICY IF EXISTS public_video_read ON storage.objects;

-- 3) Revoke EXECUTE on internal/admin SECURITY DEFINER functions from anon/authenticated/PUBLIC.
--    These are either trigger functions (invoked by Postgres, not callers) or service-role-only operations.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_deleted_reflections() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_anon_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_cron_shared_secret() FROM PUBLIC, anon, authenticated;

-- Trigger-only functions (never called directly by clients)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_session_flagged() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_email_template_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_reflection_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_crisis_severity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_join_source() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_role_plan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_checkin_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_reflection_category() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_threshold_alert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_community_member_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_lock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_age_minimum() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_role_change() FROM PUBLIC, anon, authenticated;
