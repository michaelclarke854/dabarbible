import { supabase } from '@/integrations/supabase/client';

function getAnonSessionId(): string {
  const KEY = 'dabar_anon_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function trackEvent(
  eventName: string,
  opts?: { screen?: string; metadata?: Record<string, unknown>; userId?: string | null }
) {
  (async () => {
    try {
      const anonSessionId = getAnonSessionId();
      let userId = opts?.userId;
      if (userId === undefined) {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
      }
      await supabase.from('funnel_events').insert({
        user_id: userId ?? undefined,
        anon_session_id: anonSessionId,
        event_name: eventName,
        screen: opts?.screen ?? undefined,
        metadata: (opts?.metadata as never) ?? undefined,
      });
    } catch {
      // never let tracking break the UI
    }
  })();
}