/**
 * Virtual pageview tracking for SPA screens.
 *
 * Lovable's built-in analytics (and most third-party trackers like GA4, Plausible,
 * PostHog, etc.) record a "pageview" whenever the URL path changes. Because Dabar
 * runs almost entirely on `/`, internal screen transitions (onboarding → ask →
 * response → journal) were never counted, which inflated the bounce rate.
 *
 * This helper updates `document.title` and pushes a virtual path into the History
 * API so trackers see the navigation. We also dispatch a `dabar:pageview` custom
 * event in case any future analytics integration wants to listen directly.
 *
 * Notes:
 * - We use `replaceState` for the FIRST virtual view per session (so the back
 *   button doesn't get a junk entry), then `pushState` for subsequent ones.
 * - We never touch routes the React Router knows about (like `/pricing`).
 *   Virtual paths are namespaced under `/app/...`.
 */

const VIRTUAL_PATH_PREFIX = "/app";

let initialized = false;

const realRoutes = new Set([
  "/",
  "/pricing",
  "/blog",
  "/privacy",
  "/terms",
  "/admin",
  "/suspended",
  "/reset-password",
  "/payment-success",
]);

function isOnRealRoute(): boolean {
  if (typeof window === "undefined") return true;
  const path = window.location.pathname;
  // Treat `/` and any non-virtual path as a real route — only override when
  // we're already inside a previously-pushed virtual `/app/...` path.
  return !path.startsWith(VIRTUAL_PATH_PREFIX);
}

export interface PageviewOptions {
  /** Short slug like "ask", "response", "journal/voice". */
  screen: string;
  /** Human-readable page title. */
  title: string;
}

export function trackPageview({ screen, title }: PageviewOptions) {
  if (typeof window === "undefined") return;

  // Don't override real routes (e.g., when user is on /pricing or /admin).
  // Only track virtual screens when on the root SPA shell.
  const onRoot = window.location.pathname === "/" || window.location.pathname.startsWith(VIRTUAL_PATH_PREFIX);
  if (!onRoot) return;

  const virtualPath = `${VIRTUAL_PATH_PREFIX}/${screen}`.replace(/\/+/g, "/");
  const fullTitle = `${title} — Dabar`;

  try {
    document.title = fullTitle;

    if (!initialized) {
      window.history.replaceState(window.history.state, "", virtualPath);
      initialized = true;
    } else if (window.location.pathname !== virtualPath) {
      window.history.pushState({ virtual: true, screen }, "", virtualPath);
    }

    // Custom event for any future analytics listener
    window.dispatchEvent(
      new CustomEvent("dabar:pageview", {
        detail: { screen, title: fullTitle, path: virtualPath },
      })
    );

    // GA4 / gtag (if ever added)
    const w = window as any;
    if (typeof w.gtag === "function") {
      w.gtag("event", "page_view", {
        page_title: fullTitle,
        page_location: window.location.origin + virtualPath,
        page_path: virtualPath,
      });
    }

    // Plausible (if ever added)
    if (typeof w.plausible === "function") {
      w.plausible("pageview", { u: window.location.origin + virtualPath });
    }
  } catch {
    // Never let tracking break the app
  }
}

export function resetPageviewTracking() {
  initialized = false;
}
