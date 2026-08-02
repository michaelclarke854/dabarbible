// Virtual pageview tracker for SPA transitions.
// Umami (used by Lovable analytics) only records a pageview on real URL
// changes, which makes single-page flows like Ask → Response → Journal look
// like a 97% bounce. This helper fires a synthetic pageview so engagement
// on internal screens is counted.
//
// Safe to call anywhere: it's a no-op when Umami isn't loaded (dev, native
// shell, ad-blocked visitors).

type UmamiTrack = (
  eventOrProps?:
    | string
    | Record<string, unknown>
    | ((props: Record<string, unknown>) => Record<string, unknown>)
) => void;

declare global {
  interface Window {
    umami?: { track: UmamiTrack };
  }
}

import { trackScreenView } from "@/lib/sessionTracker";

let lastPath: string | null = null;

export function trackVirtualPageview(path: string, title?: string) {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/")) path = `/${path}`;
  if (path === lastPath) return;
  lastPath = path;

  // Anonymous session/screen-count tracking (used for bounce rate).
  trackScreenView();

  try {
    window.umami?.track((props) => ({
      ...props,
      url: path,
      title: title ?? document.title,
    }));
  } catch {
    // ignore — analytics must never break the app
  }
}
