import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight client-side funnel event tracker.
 * Fire-and-forget — never blocks the UI and silently swallows errors
 * (analytics must never break the app).
 *
 * Examples:
 *   trackEvent("page_view", { screen: "ask" })
 *   trackEvent("paywall_view", { screen: "trial_paywall" })
 *   trackEvent("upgrade_click", { screen: "pricing", metadata: { plan: "personal" } })
 */
export function trackEvent(
  eventName: string,
  opts?: { screen?: string; metadata?: Record<string, any>; userId?: string | null }
) {
  // Never await — analytics must not block the render path.
  (async () => {
    try {
      let userId = opts?.userId;
      if (userId === undefined) {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
      }
      await supabase.from("funnel_events").insert({
        user_id: userId ?? null,
        event_name: eventName,
        screen: opts?.screen ?? null,
        metadata: opts?.metadata ?? null,
      });
    } catch {
      // swallow — never let tracking break the UI
    }
  })();
}