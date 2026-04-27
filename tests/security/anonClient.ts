/**
 * Shared anon Supabase client for the security regression suite.
 *
 * Uses the public anon key only — never the service-role key. Every
 * test in this directory must hit the database through this client so
 * the assertions reflect what an unauthenticated browser visitor can
 * actually do.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://crkkimoblnrxpszehmkg.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNya2tpbW9ibG5yeHBzemVobWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDQwNjUsImV4cCI6MjA5MTQ4MDA2NX0.jBR4qIt_wiqOk_VtnmPk7EAIDMdDBkj_HPtKEg15xgk";

export const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Stable share token seeded for the Playwright shared-draft fixture. */
export const QA_SHARE_TOKEN = "qa-preview-token-2026";

/** A token that is overwhelmingly unlikely to exist in the drafts table. */
export const UNKNOWN_TOKEN =
  "sec-regression-unknown-" + Math.random().toString(36).slice(2, 12);

/**
 * Helper: assert the anon client cannot SELECT from a table.
 * Either RLS returns zero rows OR the request errors with a 401/permission
 * code — both outcomes prove the boundary holds.
 */
export async function assertAnonCannotSelect(table: string) {
  // @ts-expect-error — table is a runtime string, fine for tests
  const { data, error } = await anon.from(table).select("*").limit(1);
  if (error) {
    // Permission / RLS errors are an acceptable form of "denied".
    return { denied: true as const, reason: "error" as const, error };
  }
  return {
    denied: (data?.length ?? 0) === 0,
    reason: "empty" as const,
    rows: data?.length ?? 0,
  };
}

/** Helper: assert the anon client cannot INSERT a row. */
export async function assertAnonCannotInsert(
  table: string,
  row: Record<string, unknown>,
) {
  // @ts-expect-error — table is a runtime string, fine for tests
  const { error } = await anon.from(table).insert(row);
  return { denied: !!error, error };
}