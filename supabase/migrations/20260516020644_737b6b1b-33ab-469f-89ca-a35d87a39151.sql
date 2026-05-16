CREATE OR REPLACE VIEW public.admin_true_engagement AS
WITH ask_flow_sessions AS (
  SELECT DISTINCT date_trunc('day', created_at)::date AS day,
                  anon_session_id
  FROM funnel_events
  WHERE user_id IS NULL
    AND anon_session_id IS NOT NULL
    AND created_at >= now() - interval '30 days'
    AND event_name <> 'security_regression_probe'
    AND (
      (event_name = 'page_view' AND screen = 'ask')
      OR event_name IN (
        'landing_hero_cta_clicked',
        'chip_question_tapped',
        'guest_question_asked',
        'response_viewed',
        'soft_gate_shown',
        'blur_gate_shown'
      )
    )
),
engaged AS (
  SELECT DISTINCT date_trunc('day', created_at)::date AS day,
                  anon_session_id
  FROM funnel_events
  WHERE user_id IS NULL
    AND anon_session_id IS NOT NULL
    AND event_name = 'guest_question_asked'
    AND created_at >= now() - interval '30 days'
)
SELECT a.day,
       count(DISTINCT a.anon_session_id) AS total_anon_sessions,
       count(DISTINCT e.anon_session_id) AS engaged_sessions,
       round(100.0 * count(DISTINCT e.anon_session_id)::numeric
             / NULLIF(count(DISTINCT a.anon_session_id), 0)::numeric, 1)::double precision
         AS engagement_rate_pct
FROM ask_flow_sessions a
LEFT JOIN engaged e ON e.day = a.day AND e.anon_session_id = a.anon_session_id
GROUP BY a.day
ORDER BY a.day DESC;