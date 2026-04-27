/**
 * RLS read-deny regression suite.
 *
 * For every table that holds private, sensitive, or service-role-only
 * data, the anon client must either error or return zero rows. A future
 * migration that loosens a SELECT policy will trip one of these.
 */
import { describe, expect, it } from "vitest";
import { assertAnonCannotSelect } from "./anonClient";

const READ_DENY_TABLES = [
  // User-owned PII / content — no row should be visible without auth.
  "profiles",
  "wisdom_sessions",
  "saved_verses",
  "verse_annotations",
  "reflection_entries",
  "journal_insights",
  "user_patterns",
  "usage_daily",
  "subscriptions",
  "beta_feedback",

  // Admin / audit surfaces.
  "role_change_log",
  "crisis_log",
  "crisis_events",
  "system_prompts",
  "app_config",
  "response_flags",
  "session_themes",
  "user_roles",

  // Email + queue infra (service-role only).
  "email_send_log",
  "email_unsubscribe_tokens",
  "email_send_state",
  "suppressed_emails",
  "processed_webhook_events",
  "rate_limits",
  "rate_limits_anonymous",
  "journal_agent_runs",

  // Pastoral surfaces — readable only to pastor / member.
  "pastoral_communities",
  "pastoral_community_members",
  "pastor_message_drafts",
  "pastoral_inquiries",
  "community_members",
  "family_members",

  // Funnel events — INSERT-only for anon.
  "funnel_events",

  // Language waitlist — readable only by the owning email.
  "language_waitlist",
] as const;

describe("RLS — anon SELECT is denied or empty for every private table", () => {
  for (const table of READ_DENY_TABLES) {
    it(`anon cannot read ${table}`, async () => {
      const result = await assertAnonCannotSelect(table);
      expect(result.denied, JSON.stringify(result)).toBe(true);
    });
  }
});