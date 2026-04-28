import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatWithFallback } from "../_shared/ai-with-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !lovableKey) {
    console.error("FATAL: Missing required env vars in pastor-dashboard");
    return json({ error: "Server misconfigured" }, 500);
  }

  // JWT validation — replicate seek-wisdom pattern
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isAnonKey = payload?.role === "anon";
      if (!isAnonKey) {
        const anonClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await anonClient.auth.getUser();
        userId = userData.user?.id ?? null;
      }
    } catch {
      return json({ error: "Invalid token" }, 401);
    }
  }

  if (!userId) return json({ error: "Authentication required" }, 401);

  // deno-lint-ignore no-explicit-any
  const supabase: any = createClient(supabaseUrl, serviceRoleKey);

  // Load profile (note: profiles uses user_id, not id)
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("is_pastor, pastoral_community_id, role")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile) return json({ error: "Profile not found" }, 404);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* no body */
  }
  const action = (body.action as string) ?? "get_themes";

  // ── ACTION: activate_pastor ───────────────────────────────────────────
  if (action === "activate_pastor") {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ is_pastor: true })
      .eq("user_id", userId);

    if (updateErr) return json({ error: updateErr.message }, 500);
    return json({ success: true });
  }

  // All remaining actions require is_pastor
  if (!profile.is_pastor) return json({ error: "Pastor access required" }, 403);

  // ── ACTION: get_themes ────────────────────────────────────────────────
  if (action === "get_themes") {
    if (!profile.pastoral_community_id) {
      return json({ community: null, member_count: 0, themes: [] });
    }

    // Time range filter: 'week' | 'month' | 'year' (default: 'month')
    const range = (body.range as string) ?? "month";
    const now = new Date();
    const since = new Date(now);
    if (range === "week") since.setDate(since.getDate() - 7);
    else if (range === "year") since.setFullYear(since.getFullYear() - 1);
    else since.setMonth(since.getMonth() - 1); // month
    const sinceIso = since.toISOString();

    const [communityRes, countRes, membersRes] = await Promise.all([
      supabase
        .from("pastoral_communities")
        .select("id, name, type, invite_code")
        .eq("id", profile.pastoral_community_id)
        .single(),
      supabase
        .from("pastoral_community_members")
        .select("*", { count: "exact", head: true })
        .eq("community_id", profile.pastoral_community_id),
      supabase
        .from("pastoral_community_members")
        .select("user_id")
        .eq("community_id", profile.pastoral_community_id),
    ]);

    const memberIds = (membersRes.data ?? []).map((m: { user_id: string }) => m.user_id);
    let themes: Array<{ theme: string; question_count: number; last_question_at: string }> = [];

    if (memberIds.length > 0) {
      // Fetch sessions in the time window for these members
      const { data: sessions } = await supabase
        .from("wisdom_sessions")
        .select("id, created_at")
        .in("user_id", memberIds)
        .eq("flagged", false)
        .gte("created_at", sinceIso);

      const sessionRows = (sessions ?? []) as Array<{ id: string; created_at: string }>;
      if (sessionRows.length > 0) {
        const sessionIds = sessionRows.map((s) => s.id);
        const sessionCreatedAt = new Map(sessionRows.map((s) => [s.id, s.created_at]));

        const { data: themeRows } = await supabase
          .from("session_themes")
          .select("session_id, theme, confidence")
          .in("session_id", sessionIds)
          .gte("confidence", 0.6);

        const counts = new Map<string, { count: number; last: string }>();
        for (const row of (themeRows ?? []) as Array<{ session_id: string; theme: string }>) {
          const theme = row.theme || "other";
          const ts = sessionCreatedAt.get(row.session_id) ?? sinceIso;
          const existing = counts.get(theme);
          if (existing) {
            existing.count += 1;
            if (ts > existing.last) existing.last = ts;
          } else {
            counts.set(theme, { count: 1, last: ts });
          }
        }

        themes = Array.from(counts.entries())
          .map(([theme, { count, last }]) => ({
            theme,
            question_count: count,
            last_question_at: last,
          }))
          .sort((a, b) => b.question_count - a.question_count)
          .slice(0, 12);
      }
    }

    return json({
      community: communityRes.data ?? null,
      member_count: countRes.count ?? 0,
      themes,
      range,
    });
  }

  // ── ACTION: setup_community ───────────────────────────────────────────
  if (action === "setup_community") {
    const name = (body.name as string)?.trim();
    const type = (body.type as string) ?? "church";

    if (!name || name.length < 1 || name.length > 200) {
      return json({ error: "Community name is required (1-200 chars)" }, 400);
    }
    const validTypes = ["church", "sunday_school", "small_group", "religious_school", "other"];
    if (!validTypes.includes(type)) {
      return json({ error: "Invalid community type" }, 400);
    }

    const { data: community, error: communityErr } = await supabase
      .from("pastoral_communities")
      .insert({ name, type, pastor_id: userId })
      .select("id, name, type, invite_code")
      .single();

    if (communityErr || !community) {
      console.error("Community create error:", communityErr);
      return json({ error: "Could not create community" }, 500);
    }

    await Promise.all([
      supabase
        .from("profiles")
        .update({ pastoral_community_id: community.id })
        .eq("user_id", userId),
      supabase
        .from("pastoral_community_members")
        .insert({ community_id: community.id, user_id: userId }),
    ]);

    return json({ community });
  }

  // ── ACTION: generate_message ──────────────────────────────────────────
  if (action === "generate_message") {
    const theme = body.theme as string;
    const questionCount = (body.question_count as number) ?? 0;

    if (!theme) return json({ error: "theme is required" }, 400);
    if (!profile.pastoral_community_id) {
      return json({ error: "No community configured" }, 400);
    }

    const systemPrompt = `You are helping a pastor prepare a message for their congregation.
Write with pastoral warmth. Ground everything in scripture. Avoid CBT framing, motivational
speaking language, or prosperity gospel aesthetics. One well-placed insight beats five bullet
points. Meet the congregation with depth, not platitudes.`;

    const userPrompt = `Based on this congregational data:
- Topic their community has been exploring: ${theme}
- Approximate number of people sitting with this theme: ${questionCount}

Create a pastoral message outline with:
1. A sermon title (warm and inviting, not preachy)
2. An opening (2-3 sentences — acknowledge where people actually are)
3. Three scripture passages that speak directly to this theme (Book Chapter:Verse)
4. Three main points, each with: the point, the supporting verse, one-sentence application
5. A closing pastoral reflection (2-3 sentences — grace-forward)
6. A small group discussion question

Return the outline as clean text the pastor can copy and adapt directly.`;

    // Claude first, Lovable AI as fallback when Anthropic is out of credits / rate limited.
    const aiResult = await chatWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      fallbackModel: "google/gemini-2.5-flash",
      maxTokens: 1500,
    });

    if (!aiResult) return json({ error: "AI service unavailable" }, 503);
    console.log(`Pastor draft provider: ${aiResult.provider}`);
    const outline: string = aiResult.body.choices?.[0]?.message?.content ?? "";

    if (!outline) return json({ error: "Empty response from AI" }, 500);

    const refs = [...outline.matchAll(/\b([1-3]?\s?[A-Z][a-z]+)\s+(\d+):(\d+(?:[-–]\d+)?)\b/g)]
      .map((m) => m[0].trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 12);

    const titleLine =
      outline.split("\n").find((l: string) => l.trim())?.replace(/^#+\s*/, "").trim() ?? theme;

    const { data: draft, error: draftErr } = await supabase
      .from("pastor_message_drafts")
      .insert({
        pastor_id: userId,
        community_id: profile.pastoral_community_id,
        title: titleLine.slice(0, 200),
        theme,
        question_count: questionCount,
        outline,
        scripture_refs: refs,
        status: "draft",
      })
      .select()
      .single();

    if (draftErr) {
      console.error("Draft save error:", draftErr);
      return json({ error: "Could not save draft" }, 500);
    }

    return json({ draft });
  }

  // ── ACTION: archive_draft ─────────────────────────────────────────────
  if (action === "archive_draft") {
    const draftId = body.draft_id as string;
    if (!draftId) return json({ error: "draft_id required" }, 400);

    const { error: archErr } = await supabase
      .from("pastor_message_drafts")
      .update({ status: "archived" })
      .eq("id", draftId)
      .eq("pastor_id", userId);

    if (archErr) return json({ error: archErr.message }, 500);
    return json({ success: true });
  }

  // ── ACTION: get_pulse ─────────────────────────────────────────────────
  // Returns the most recent congregation_pulse row for the pastor's community.
  if (action === "get_pulse") {
    if (!profile.pastoral_community_id) {
      return json({ pulse: null });
    }
    const { data: pulse, error: pulseErr } = await supabase
      .from("congregation_pulse")
      .select("*")
      .eq("community_id", profile.pastoral_community_id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pulseErr) return json({ error: pulseErr.message }, 500);
    return json({ pulse: pulse ?? null });
  }

  // ── ACTION: list_pulses (history) ─────────────────────────────────────
  if (action === "list_pulses") {
    if (!profile.pastoral_community_id) return json({ pulses: [] });
    const limit = Math.min(Number(body.limit) || 12, 52);
    const { data: pulses, error: pErr } = await supabase
      .from("congregation_pulse")
      .select("id, week_start, struggling, searching, grateful, top_categories, had_activity, broadcast_sent, broadcast_sent_at")
      .eq("community_id", profile.pastoral_community_id)
      .order("week_start", { ascending: false })
      .limit(limit);
    if (pErr) return json({ error: pErr.message }, 500);
    return json({ pulses: pulses ?? [] });
  }

  // ── ACTION: regenerate_pulse (manual trigger) ─────────────────────────
  // Calls the pulse-generator edge function for this pastor's community.
  if (action === "regenerate_pulse") {
    if (!profile.pastoral_community_id) {
      return json({ error: "No community configured" }, 400);
    }
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret) return json({ error: "Server misconfigured" }, 500);

    const resp = await fetch(`${supabaseUrl}/functions/v1/pulse-generator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
      body: JSON.stringify({ community_id: profile.pastoral_community_id }),
    });
    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return json({ error: result?.error ?? "Pulse generation failed" }, 500);
    }
    return json({ success: true, result });
  }

  // ── ACTION: list_alerts ───────────────────────────────────────────────
  if (action === "list_alerts") {
    if (!profile.pastoral_community_id) return json({ alerts: [] });
    const status = (body.status as string) ?? "pending";
    const { data: alerts, error: aErr } = await supabase
      .from("pastoral_threshold_alerts")
      .select("id, alert_type, signal_count, status, created_at, revealed_at, contacted_at")
      .eq("community_id", profile.pastoral_community_id)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50);
    if (aErr) return json({ error: aErr.message }, 500);
    return json({ alerts: alerts ?? [] });
  }

  // ── ACTION: reveal_alert ──────────────────────────────────────────────
  // Pastor explicitly clicks to see the member behind a persistent-struggle alert.
  if (action === "reveal_alert") {
    const alertId = body.alert_id as string;
    if (!alertId) return json({ error: "alert_id required" }, 400);
    const { data: updated, error: uErr } = await supabase
      .from("pastoral_threshold_alerts")
      .update({ status: "revealed", revealed_at: new Date().toISOString() })
      .eq("id", alertId)
      .eq("community_id", profile.pastoral_community_id)
      .select("id, member_id, alert_type, signal_count, revealed_at")
      .single();
    if (uErr || !updated) return json({ error: uErr?.message ?? "Not found" }, 404);
    return json({ alert: updated });
  }

  // ── ACTION: dismiss_alert ─────────────────────────────────────────────
  if (action === "dismiss_alert") {
    const alertId = body.alert_id as string;
    if (!alertId) return json({ error: "alert_id required" }, 400);
    const { error: dErr } = await supabase
      .from("pastoral_threshold_alerts")
      .update({ status: "dismissed" })
      .eq("id", alertId)
      .eq("community_id", profile.pastoral_community_id);
    if (dErr) return json({ error: dErr.message }, 500);
    return json({ success: true });
  }

  // ── ACTION: mark_alert_contacted ──────────────────────────────────────
  if (action === "mark_alert_contacted") {
    const alertId = body.alert_id as string;
    if (!alertId) return json({ error: "alert_id required" }, 400);
    const { error: cErr } = await supabase
      .from("pastoral_threshold_alerts")
      .update({ status: "contacted", contacted_at: new Date().toISOString() })
      .eq("id", alertId)
      .eq("community_id", profile.pastoral_community_id);
    if (cErr) return json({ error: cErr.message }, 500);
    return json({ success: true });
  }

  // ── ACTION: list_checkins ─────────────────────────────────────────────
  if (action === "list_checkins") {
    if (!profile.pastoral_community_id) return json({ checkins: [] });
    const status = (body.status as string) ?? "pending";
    const { data: checkins, error: cErr } = await supabase
      .from("pastoral_checkin_requests")
      .select("id, member_id, mood_signal, trigger_type, status, requested_at, resolved_at")
      .eq("community_id", profile.pastoral_community_id)
      .eq("status", status)
      .order("requested_at", { ascending: false })
      .limit(50);
    if (cErr) return json({ error: cErr.message }, 500);
    return json({ checkins: checkins ?? [] });
  }

  // ── ACTION: acknowledge_checkin ───────────────────────────────────────
  if (action === "acknowledge_checkin") {
    const checkinId = body.checkin_id as string;
    if (!checkinId) return json({ error: "checkin_id required" }, 400);
    const newStatus = (body.status as string) === "resolved" ? "resolved" : "acknowledged";
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "resolved") update.resolved_at = new Date().toISOString();
    const { error: aErr } = await supabase
      .from("pastoral_checkin_requests")
      .update(update)
      .eq("id", checkinId)
      .eq("community_id", profile.pastoral_community_id);
    if (aErr) return json({ error: aErr.message }, 500);
    return json({ success: true });
  }

  // ── ACTION: send_announcement ─────────────────────────────────────────
  // Pastor publishes a pastoral message (often derived from pulse.ai_draft) to community.
  if (action === "send_announcement") {
    if (!profile.pastoral_community_id) {
      return json({ error: "No community configured" }, 400);
    }
    const messageBody = (body.message_body as string)?.trim();
    const scriptureRefs = Array.isArray(body.scripture_refs) ? (body.scripture_refs as string[]).slice(0, 12) : [];
    const pulseId = (body.pulse_id as string | undefined) || null;

    if (!messageBody || messageBody.length < 10 || messageBody.length > 8000) {
      return json({ error: "message_body must be 10-8000 chars" }, 400);
    }

    // Count recipients
    const { count: recipientCount } = await supabase
      .from("pastoral_community_members")
      .select("*", { count: "exact", head: true })
      .eq("community_id", profile.pastoral_community_id);

    const { data: announcement, error: insErr } = await supabase
      .from("pastoral_announcements")
      .insert({
        community_id: profile.pastoral_community_id,
        pastor_id: userId,
        pulse_id: pulseId,
        message_body: messageBody,
        scripture_refs: scriptureRefs,
        recipient_count: recipientCount ?? 0,
        delivered_count: 0,
      })
      .select()
      .single();

    if (insErr || !announcement) {
      console.error("Announcement insert error:", insErr);
      return json({ error: insErr?.message ?? "Could not save announcement" }, 500);
    }

    // Mark pulse as broadcast
    if (pulseId) {
      await supabase
        .from("congregation_pulse")
        .update({ broadcast_sent: true, broadcast_sent_at: new Date().toISOString() })
        .eq("id", pulseId)
        .eq("community_id", profile.pastoral_community_id);
    }

    return json({ announcement });
  }

  // ── ACTION: list_announcements ────────────────────────────────────────
  if (action === "list_announcements") {
    if (!profile.pastoral_community_id) return json({ announcements: [] });
    const limit = Math.min(Number(body.limit) || 20, 100);
    const { data: anns, error: lErr } = await supabase
      .from("pastoral_announcements")
      .select("id, message_body, scripture_refs, recipient_count, delivered_count, sent_at, pulse_id")
      .eq("community_id", profile.pastoral_community_id)
      .order("sent_at", { ascending: false })
      .limit(limit);
    if (lErr) return json({ error: lErr.message }, 500);
    return json({ announcements: anns ?? [] });
  }

  return json({ error: "Unknown action" }, 400);
});