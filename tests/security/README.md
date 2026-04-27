# Security regression suite

Automated checks that re-verify the security boundaries of the DABAR
backend after every change. The suite runs as a separate Vitest project
and hits the **live Supabase database** using only the public anon key —
the same surface an attacker has from a browser.

Every assertion is shaped as **"the anon client must NOT be able to
do X"**. If a future migration accidentally relaxes an RLS policy or
expands a `SECURITY DEFINER` function's return shape, a test here will
fail.

## What is covered

1. **RLS boundaries (anon read-deny)** — `profiles`, `wisdom_sessions`,
   `saved_verses`, `reflection_entries`, `role_change_log`,
   `subscriptions`, `crisis_log`, `crisis_events`, `system_prompts`,
   `app_config`, `journal_insights`, `user_patterns`, `usage_daily`,
   `verse_annotations`, `beta_feedback`, `email_send_log`,
   `email_unsubscribe_tokens`, `pastoral_inquiries`, `processed_webhook_events`,
   `rate_limits`, `rate_limits_anonymous`, `journal_agent_runs`,
   `pastoral_communities`, `pastoral_community_members`,
   `pastor_message_drafts`, `family_members`, `community_members`.
2. **RLS boundaries (anon write-deny)** — anon client is blocked from
   inserting into `profiles`, `subscriptions`, `wisdom_sessions`,
   `role_change_log`, `system_prompts`, `app_config`,
   `pastor_message_drafts`.
3. **SECURITY DEFINER functions** — `lookup_draft_by_share_token` and
   `lookup_community_by_invite` only return whitelisted columns and
   return empty for unknown / archived inputs. `has_role` and
   `get_user_role` cannot be coerced into returning truthy values for
   anon callers.
4. **Share / invite token access** — invalid share tokens cannot
   enumerate drafts; the seeded QA token (`qa-preview-token-2026`)
   exposes only `title, theme, outline, scripture_refs, created_at` and
   never `pastor_id`, `community_id`, `share_token`, or `id`.
5. **Public submission paths** — `pastoral_inquiries` and
   `funnel_events` accept properly shaped anon inserts (regression
   guard for the public lead-capture and analytics flows).

## How to run

```bash
bun run test:security
```

The suite is also wired into `bun run test:all` so CI runs it after the
unit tests and before the visual suite.

## When a test fails

- A **read-deny** failure means an anon client can now read a table it
  could not read before. Audit the most recent migration's RLS changes.
- A **write-deny** failure means an anon client can now mutate a table.
  Treat this as **critical** — block the deploy.
- A **share-token shape** failure means a `SECURITY DEFINER` function
  started returning extra columns. Tighten the function's return list
  before merging.

## Why anon, not service role

Service-role bypasses RLS by design, so a service-role test proves
nothing about the production attack surface. The anon key is what every
browser ships with; if anon cannot do X, no end-user can do X.