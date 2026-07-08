INSERT INTO app_config (key, value) VALUES
  ('dabar_paid_subscriber_gate', '50'),
  ('dabar_gate_deadline', '2026-07-31'),
  ('dabar_gate_status', 'active'),
  ('dabar_faith_tools_submitted', 'false'),
  ('dabar_grief_community_pitched', 'false')
ON CONFLICT (key) DO NOTHING;