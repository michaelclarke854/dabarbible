-- Store the cron shared secret in Vault so pg_cron jobs can read it
-- without exposing the literal value in cron.job.command.
SELECT vault.create_secret(
  'tTigiY_aPIcYLtDHy8-qUXFl-GldtRz_gI7XlkCHlekL6GEAAeaJXEnN5BC77bgN',
  'cron_shared_secret',
  'Shared secret used by pg_cron to authenticate calls to protected edge functions (expire-trials, journal-pattern-agent). Must match the CRON_SECRET edge function env var.'
);