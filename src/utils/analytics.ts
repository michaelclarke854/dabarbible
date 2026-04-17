/**
 * Analytics event tracking — passes through to GA4 (gtag) and Plausible if present.
 * Safe to call even if no analytics library is loaded; it will simply no-op.
 *
 * Event naming convention: snake_case, past tense for completed actions
 * (e.g. question_submitted, signup_completed, soft_gate_converted).
 */

export type AnalyticsProps = Record<string, string | number | boolean | undefined | null>;

export function track(event: string, props?: AnalyticsProps) {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      plausible?: (event: string, options?: { props?: AnalyticsProps }) => void;
    };
    if (typeof w.gtag === "function") {
      w.gtag("event", event, props || {});
    }
    if (typeof w.plausible === "function") {
      w.plausible(event, props ? { props } : undefined);
    }
    // Custom listener
    window.dispatchEvent(new CustomEvent("dabar:track", { detail: { event, props } }));
  } catch {
    // Never let tracking break the app
  }
}
