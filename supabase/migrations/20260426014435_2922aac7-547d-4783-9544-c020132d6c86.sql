
-- 1.1 Partial index for anonymous funnel queries
CREATE INDEX IF NOT EXISTS idx_funnel_events_anon_created
  ON public.funnel_events (user_id, created_at DESC)
  WHERE user_id IS NULL;

-- 1.2 View — day boundaries are UTC (intentional)
CREATE OR REPLACE VIEW public.admin_true_engagement AS
SELECT
  DATE_TRUNC('day', created_at)::date                                   AS day,
  COUNT(DISTINCT anon_session_id)                                        AS total_anon_sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'guest_question_asked'
        THEN anon_session_id END)                                        AS engaged_sessions,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN event_name = 'guest_question_asked'
                  THEN anon_session_id END)
    / NULLIF(COUNT(DISTINCT anon_session_id), 0)
  , 1)::float                                                            AS engagement_rate_pct
FROM public.funnel_events
WHERE user_id IS NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- 1.3 Lock view to service_role only
ALTER VIEW public.admin_true_engagement OWNER TO postgres;
REVOKE ALL ON public.admin_true_engagement FROM anon, authenticated, public;
GRANT SELECT ON public.admin_true_engagement TO service_role;
