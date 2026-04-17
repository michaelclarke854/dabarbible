CREATE OR REPLACE FUNCTION public.mark_session_flagged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE public.wisdom_sessions SET flagged = true WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_session_flagged ON public.response_flags;
CREATE TRIGGER trg_mark_session_flagged
AFTER INSERT ON public.response_flags
FOR EACH ROW
EXECUTE FUNCTION public.mark_session_flagged();

-- Backfill: mark any existing sessions that already have flags
UPDATE public.wisdom_sessions ws
SET flagged = true
FROM public.response_flags rf
WHERE rf.session_id = ws.id AND ws.flagged = false;