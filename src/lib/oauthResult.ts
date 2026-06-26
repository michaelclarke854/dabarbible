/**
 * Interpret the result of `lovable.auth.signInWithOAuth`.
 *
 * IMPORTANT — do not regress this:
 *   - `result.error` truthy → failure
 *   - `result.redirected === true`  → browser is navigating to the provider; keep loading overlay
 *   - `result.redirected === false` AND no error → SUCCESS (popup flow set session inline)
 *
 * Treating `!redirected` as failure caused users to see "could not complete"
 * toasts even though they were already signed in. Keep this helper as the
 * single source of truth and import it from every OAuth call site.
 */
export type OAuthSdkResult = {
  error?: { message?: string } | null;
  redirected?: boolean;
};

export type OAuthOutcome =
  | { kind: "error"; message: string }
  | { kind: "redirecting" }
  | { kind: "session_ready" };

export function interpretOAuthResult(result: OAuthSdkResult): OAuthOutcome {
  if (result?.error) {
    return { kind: "error", message: result.error.message || "Unknown error" };
  }
  if (result?.redirected) {
    return { kind: "redirecting" };
  }
  return { kind: "session_ready" };
}