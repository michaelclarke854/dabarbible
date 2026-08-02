// Lightweight, privacy-safe session tracking used to compute bounce rate.
// Stores nothing but an anonymous per-tab session id, a screen counter and
// timestamps. No PII, no URLs, no content.

import { supabase } from "@/integrations/supabase/client";

const KEY = "dabar_session";
const IDLE_MS = 30 * 60 * 1000; // a new session after 30 min of inactivity
const HEARTBEAT_THROTTLE_MS = 5000;

type StoredSession = { id: string; lastSeen: number; screens: number };

let currentId: string | null = null;
let screenCount = 0;
let lastFlush = 0;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function read(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function write(s: StoredSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

async function createSession(id: string) {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("app_sessions").insert({
      session_id: id,
      user_id: data.user?.id ?? null,
      screen_count: 1,
    });
  } catch {
    // analytics must never break the app
  }
}

async function flush() {
  if (!currentId) return;
  lastFlush = Date.now();
  try {
    await supabase
      .from("app_sessions")
      .update({ screen_count: screenCount, last_seen_at: new Date().toISOString() })
      .eq("session_id", currentId);
  } catch {
    // ignore
  }
}

function scheduleFlush() {
  const since = Date.now() - lastFlush;
  if (since >= HEARTBEAT_THROTTLE_MS) {
    void flush();
    return;
  }
  if (pendingTimer) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    void flush();
  }, HEARTBEAT_THROTTLE_MS - since);
}

/** Records a screen/route view for the current anonymous session. */
export function trackScreenView() {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const stored = read();

  if (!currentId) {
    if (stored && now - stored.lastSeen < IDLE_MS) {
      // Resuming an existing session (e.g. page reload) — keep its screen count.
      currentId = stored.id;
      screenCount = (stored.screens ?? 1) + 1;
      write({ id: currentId, lastSeen: now, screens: screenCount });
      lastFlush = 0;
      scheduleFlush();
      return;
    }
    currentId = crypto.randomUUID();
    screenCount = 1;
    write({ id: currentId, lastSeen: now, screens: screenCount });
    void createSession(currentId);
    lastFlush = now;
    return;
  }

  if (now - (stored?.lastSeen ?? now) >= IDLE_MS) {
    // Idle gap — start a fresh session.
    currentId = crypto.randomUUID();
    screenCount = 1;
    write({ id: currentId, lastSeen: now, screens: screenCount });
    void createSession(currentId);
    lastFlush = now;
    return;
  }

  screenCount += 1;
  write({ id: currentId, lastSeen: now, screens: screenCount });
  scheduleFlush();
}

/** Best-effort final heartbeat so short sessions get an accurate duration. */
export function endSessionHeartbeat() {
  if (!currentId) return;
  void flush();
}
