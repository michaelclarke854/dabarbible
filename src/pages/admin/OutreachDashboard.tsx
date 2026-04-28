import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Lead = {
  id: string;
  pastor_name: string;
  church_name: string;
  email: string;
  denomination: string | null;
  country_code: string;
  status: string;
  suppressed: boolean | null;
  last_contacted_at: string | null;
  initial_sent_at: string | null;
};

type Application = {
  id: string;
  pastor_name: string;
  church_name: string;
  email: string;
  denomination: string | null;
  church_size: string | null;
  country: string | null;
  status: string;
  created_at: string;
};

type EmailLogRow = {
  id: string;
  lead_id: string;
  sequence_step: number;
  subject: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  resend_id: string | null;
  body_preview: string | null;
};

type ReplyLogRow = {
  id: string;
  lead_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  intent: string | null;
  processed: boolean | null;
  agent_response_sent: boolean | null;
  received_at: string | null;
  body_preview: string | null;
};

interface EmailTemplate {
  id: string;
  template_key: string;
  step: number;
  denomination: string;
  subject: string;
  body: string;
  is_active: boolean;
  version: number;
  updated_at: string;
}

const STEP_LABELS: Record<number, string> = {
  0: "Transactional — pastoral access approval",
  1: "Step 1 — First contact",
  2: "Step 2 — Follow-up",
  3: "Step 3 — Final touch",
};

const ALLOWED_MERGE_FIELDS = ["pastor_name", "first_name", "church_name", "denomination"] as const;
const NAME_FIELDS = ["pastor_name", "first_name"] as const;

/** Returns { unknown: string[]; used: string[] } for all {{...}} tokens in text. */
function analyzeMergeFields(text: string): { unknown: string[]; used: string[] } {
  const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) ?? [];
  const tokens = matches.map((m) => m.replace(/[{}\s]/g, ""));
  const used = Array.from(new Set(tokens));
  const unknown = used.filter(
    (t) => !ALLOWED_MERGE_FIELDS.includes(t as (typeof ALLOWED_MERGE_FIELDS)[number]),
  );
  return { unknown, used };
}

const EMAIL_STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  delivered: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  opened: "bg-green-500/15 text-green-300 border-green-500/30",
  clicked: "bg-green-500/20 text-green-200 border-green-500/40",
  bounced: "bg-red-500/15 text-red-300 border-red-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
};

const fmtTs = (s: string | null) =>
  s ? new Date(s).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUSES = [
  "all", "pending", "sent", "delivered", "replied",
  "trial_started", "converted", "opted_out", "bounced",
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  delivered: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  replied: "bg-green-500/15 text-green-300 border-green-500/30",
  trial_started: "bg-green-500/15 text-green-300 border-green-500/30",
  converted: "bg-green-500/20 text-green-200 border-green-500/40",
  opted_out: "bg-red-500/15 text-red-300 border-red-500/30",
  bounced: "bg-red-500/15 text-red-300 border-red-500/30",
};

const PAGE_SIZE = 20;

export default function OutreachDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== "admin" && role !== "super_admin")) {
      navigate("/");
    }
  }, [user, role, authLoading, navigate]);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    sentThisWeek: 0,
    replies: 0,
    pendingApps: 0,
  });

  // Leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [page, setPage] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Apps
  const [apps, setApps] = useState<Application[]>([]);

  // Debug logs
  const [emailLogs, setEmailLogs] = useState<EmailLogRow[]>([]);
  const [replyLogs, setReplyLogs] = useState<ReplyLogRow[]>([]);

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Config
  const [paused, setPaused] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [todayCount, setTodayCount] = useState(0);

  // Add lead form
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    pastor_name: "", church_name: "", email: "",
    denomination: "", country_code: "US", church_size: "",
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const refresh = useCallback(async () => {
    setLoadingLeads(true);
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      totalRes, sentWeekRes, repliesRes, pendingAppsRes,
      todayRes, configRes, limitRes,
    ] = await Promise.all([
      supabase.from("pastor_leads").select("*", { count: "exact", head: true }),
      supabase.from("outreach_email_log").select("*", { count: "exact", head: true })
        .gte("sent_at", weekAgo),
      supabase.from("outreach_reply_log").select("*", { count: "exact", head: true }),
      supabase.from("pastoral_access_applications").select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("outreach_email_log").select("*", { count: "exact", head: true })
        .gte("sent_at", todayStart.toISOString()),
      supabase.from("outreach_config").select("value").eq("key", "sending_paused").maybeSingle(),
      supabase.from("outreach_config").select("value").eq("key", "daily_send_limit").maybeSingle(),
    ]);

    setMetrics({
      totalLeads: totalRes.count ?? 0,
      sentThisWeek: sentWeekRes.count ?? 0,
      replies: repliesRes.count ?? 0,
      pendingApps: pendingAppsRes.count ?? 0,
    });
    setTodayCount(todayRes.count ?? 0);
    const pv = configRes.data?.value;
    setPaused(pv === true || pv === "true");
    setDailyLimit(Number(limitRes.data?.value ?? 50));

    // Leads (filtered + paged)
    let q = supabase
      .from("pastor_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (countryFilter.trim()) q = q.ilike("country_code", `%${countryFilter.trim()}%`);

    const leadsRes = await q;
    setLeads((leadsRes.data as Lead[]) ?? []);
    setTotalLeads(leadsRes.count ?? 0);

    // Pending apps
    const appsRes = await supabase
      .from("pastoral_access_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    setApps((appsRes.data as Application[]) ?? []);

    // Debug logs (most recent 50 of each)
    const [emailLogRes, replyLogRes] = await Promise.all([
      supabase
        .from("outreach_email_log")
        .select("id, lead_id, sequence_step, subject, status, sent_at, delivered_at, opened_at, clicked_at, resend_id, body_preview")
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(50),
      supabase
        .from("outreach_reply_log")
        .select("id, lead_id, from_email, from_name, subject, intent, processed, agent_response_sent, received_at, body_preview")
        .order("received_at", { ascending: false, nullsFirst: false })
        .limit(50),
    ]);
    setEmailLogs((emailLogRes.data as EmailLogRow[]) ?? []);
    setReplyLogs((replyLogRes.data as ReplyLogRow[]) ?? []);

    const templatesRes = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true)
      .order("step", { ascending: true })
      .order("denomination", { ascending: true });
    setTemplates((templatesRes.data as EmailTemplate[]) ?? []);

    setLoadingLeads(false);
  }, [page, statusFilter, countryFilter]);

  useEffect(() => {
    if (user && (role === "admin" || role === "super_admin")) refresh();
  }, [user, role, refresh]);

  const togglePause = async (next: boolean) => {
    const { error } = await supabase
      .from("outreach_config")
      .update({ value: next })
      .eq("key", "sending_paused");
    if (error) {
      toast.error("Failed to update pause state");
      return;
    }
    setPaused(next);
    toast.success(next ? "Sending paused" : "Sending resumed");
  };

  const addLead = async () => {
    if (!addForm.pastor_name.trim() || !addForm.church_name.trim() || !addForm.email.trim()) {
      toast.error("Name, church, and email required");
      return;
    }
    setSubmittingAdd(true);
    const { error } = await supabase.from("pastor_leads").insert({
      pastor_name: addForm.pastor_name.trim(),
      church_name: addForm.church_name.trim(),
      email: addForm.email.trim().toLowerCase(),
      denomination: addForm.denomination || null,
      country_code: addForm.country_code.trim().toUpperCase() || "US",
      church_size: addForm.church_size || null,
      source: "manual",
    });
    setSubmittingAdd(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lead added");
    setAddForm({
      pastor_name: "", church_name: "", email: "",
      denomination: "", country_code: "US", church_size: "",
    });
    setAdding(false);
    refresh();
  };

  const updateAppStatus = async (id: string, status: "approved" | "rejected") => {
    const patch: { status: "approved" | "rejected"; approved_at?: string } = { status };
    if (status === "approved") patch.approved_at = new Date().toISOString();
    const { error } = await supabase
      .from("pastoral_access_applications")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (status === "approved") {
      const app = apps.find((a) => a.id === id);
      if (app) {
        const { error: emailError } = await supabase.functions.invoke(
          "send-pastoral-approval",
          {
            body: {
              pastor_name: app.pastor_name,
              email: app.email,
              church_name: app.church_name,
            },
          },
        );
        if (emailError) {
          toast.warning(
            "Application approved but approval email failed to send. Check logs.",
          );
        } else {
          toast.success("Application approved and welcome email sent.");
        }
        refresh();
        return;
      }
    }

    toast.success(status === "approved" ? "Application approved" : "Application rejected");
    refresh();
  };

  const triggerNow = async () => {
    const { data, error } = await supabase.functions.invoke("elijah-outreach", { body: {} });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Run complete: ${JSON.stringify(data)}`);
    refresh();
  };

  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE));

  if (authLoading || !user) return null;

  return (
    <main className="min-h-screen px-6 py-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif-display text-3xl text-foreground">ELIJAH Outreach</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Autonomous pastoral outreach pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh}>Refresh</Button>
          <Button onClick={triggerNow}>Run now</Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total leads", value: metrics.totalLeads },
          { label: "Sent this week", value: metrics.sentThisWeek },
          { label: "Replies received", value: metrics.replies },
          { label: "Pending applications", value: metrics.pendingApps },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-sm p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-body">
              {s.label}
            </p>
            <p className="text-2xl font-serif text-foreground mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Circuit breaker */}
      <div className="bg-card border border-border rounded-sm p-5 space-y-3">
        <h2 className="font-serif text-foreground">Sending controls</h2>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="pause-switch" className="font-body">Pause sending</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Today: {todayCount} / {dailyLimit} sends
            </p>
          </div>
          <Switch id="pause-switch" checked={paused} onCheckedChange={togglePause} />
        </div>
      </div>

      {/* Pending applications */}
      {apps.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-foreground">Pending pastoral applications</h2>
          <div className="bg-card border border-border rounded-sm divide-y divide-border">
            {apps.map((a) => (
              <div key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="text-sm">
                  <p className="text-foreground font-medium">{a.pastor_name} · {a.church_name}</p>
                  <p className="text-muted-foreground">
                    {a.email} · {a.denomination ?? "—"} · {a.church_size ?? "—"} · {a.country ?? "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateAppStatus(a.id, "rejected")}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => updateAppStatus(a.id, "approved")}>
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leads */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2 className="font-serif text-foreground">Leads</h2>
          <div className="flex gap-2 items-center">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Country (e.g. US)"
              value={countryFilter}
              onChange={(e) => { setCountryFilter(e.target.value); setPage(0); }}
              className="w-[160px]"
            />
            <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
              {adding ? "Cancel" : "Add lead"}
            </Button>
          </div>
        </div>

        {adding && (
          <div className="bg-card border border-border rounded-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Pastor name *" value={addForm.pastor_name}
              onChange={(e) => setAddForm((f) => ({ ...f, pastor_name: e.target.value }))} />
            <Input placeholder="Church name *" value={addForm.church_name}
              onChange={(e) => setAddForm((f) => ({ ...f, church_name: e.target.value }))} />
            <Input placeholder="Email *" type="email" value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
            <Input placeholder="Denomination (e.g. baptist)" value={addForm.denomination}
              onChange={(e) => setAddForm((f) => ({ ...f, denomination: e.target.value.toLowerCase() }))} />
            <Input placeholder="Country code (US)" value={addForm.country_code}
              onChange={(e) => setAddForm((f) => ({ ...f, country_code: e.target.value }))} />
            <Input placeholder="Church size (small/medium/large)" value={addForm.church_size}
              onChange={(e) => setAddForm((f) => ({ ...f, church_size: e.target.value }))} />
            <div className="md:col-span-3">
              <Button onClick={addLead} disabled={submittingAdd}>
                {submittingAdd ? "Adding…" : "Add lead"}
              </Button>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs uppercase tracking-wider font-body">
              <tr className="border-b border-border">
                <th className="text-left p-3">Pastor</th>
                <th className="text-left p-3">Church</th>
                <th className="text-left p-3">Country</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Last contact</th>
              </tr>
            </thead>
            <tbody>
              {loadingLeads && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loadingLeads && leads.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No leads</td></tr>
              )}
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 text-foreground">{l.pastor_name}</td>
                  <td className="p-3 text-foreground/80">
                    {l.church_name}
                    <span className="block text-xs text-muted-foreground">{l.email}</span>
                  </td>
                  <td className="p-3 text-foreground/80">{l.country_code}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-xs border ${STATUS_BADGE[l.status] ?? "bg-muted text-muted-foreground"}`}>
                      {l.status}
                    </span>
                    {l.suppressed && (
                      <span className="ml-2 text-xs text-muted-foreground">(suppressed)</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {l.last_contacted_at
                      ? new Date(l.last_contacted_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {totalLeads} leads
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </section>

      {/* Debug: Email send log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-foreground">Email send log</h2>
          <p className="text-xs text-muted-foreground">Latest 50 sends</p>
        </div>
        <div className="bg-card border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs uppercase tracking-wider font-body">
              <tr className="border-b border-border">
                <th className="text-left p-3">Sent</th>
                <th className="text-left p-3">Step</th>
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Delivered</th>
                <th className="text-left p-3">Opened</th>
                <th className="text-left p-3">Clicked</th>
                <th className="text-left p-3">Lead</th>
              </tr>
            </thead>
            <tbody>
              {emailLogs.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No emails sent yet</td></tr>
              )}
              {emailLogs.map((e) => (
                <tr key={e.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{fmtTs(e.sent_at)}</td>
                  <td className="p-3 text-foreground/80">{e.sequence_step}</td>
                  <td className="p-3 text-foreground max-w-[280px] truncate" title={e.subject}>{e.subject}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-xs border ${EMAIL_STATUS_BADGE[e.status] ?? "bg-muted text-muted-foreground"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{fmtTs(e.delivered_at)}</td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{fmtTs(e.opened_at)}</td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{fmtTs(e.clicked_at)}</td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">{e.lead_id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Debug: Reply log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-foreground">Reply log</h2>
          <p className="text-xs text-muted-foreground">Latest 50 inbound replies</p>
        </div>
        <div className="bg-card border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs uppercase tracking-wider font-body">
              <tr className="border-b border-border">
                <th className="text-left p-3">Received</th>
                <th className="text-left p-3">From</th>
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">Intent</th>
                <th className="text-left p-3">Processed</th>
                <th className="text-left p-3">Replied</th>
                <th className="text-left p-3">Lead</th>
              </tr>
            </thead>
            <tbody>
              {replyLogs.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No replies yet</td></tr>
              )}
              {replyLogs.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{fmtTs(r.received_at)}</td>
                  <td className="p-3 text-foreground/80 text-xs">
                    {r.from_name ? <span className="block text-foreground">{r.from_name}</span> : null}
                    {r.from_email}
                  </td>
                  <td className="p-3 text-foreground max-w-[260px] truncate" title={r.subject ?? ""}>{r.subject ?? "—"}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 rounded-sm text-xs border bg-muted text-muted-foreground">
                      {r.intent ?? "—"}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{r.processed ? "✓" : "—"}</td>
                  <td className="p-3 text-xs">{r.agent_response_sent ? "✓" : "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">{r.lead_id ? r.lead_id.slice(0, 8) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Email templates editor */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-foreground text-xl">Email templates</h2>
          <p className="text-xs text-muted-foreground font-body mt-1">
            ELIJAH uses these templates first. AI generation is the fallback when no template matches.
          </p>
        </div>
        {[1, 2, 3, 0].map((stepNum) => {
          const stepTemplates = templates
            .filter((t) => t.step === stepNum)
            .sort((a, b) => {
              if (a.denomination === "default") return -1;
              if (b.denomination === "default") return 1;
              return a.denomination.localeCompare(b.denomination);
            });
          if (stepTemplates.length === 0) return null;
          return (
            <div key={stepNum} className="space-y-3">
              <h3 className="font-serif text-foreground text-base border-b border-border pb-2">
                {STEP_LABELS[stepNum] ?? `Step ${stepNum}`}
              </h3>
              {stepTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} onSaved={refresh} />
              ))}
            </div>
          );
        })}
      </section>
    </main>
  );
}

function TemplateCard({
  template,
  onSaved,
}: {
  template: EmailTemplate;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubject(template.subject);
    setBody(template.body);
  }, [template.id, template.subject, template.body, template.version]);

  const dirty = subject !== template.subject || body !== template.body;
  const charCount = body.length;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const overWord = wordCount > 150;

  const subjectAnalysis = analyzeMergeFields(subject);
  const bodyAnalysis = analyzeMergeFields(body);
  const unknownFields = Array.from(
    new Set([...subjectAnalysis.unknown, ...bodyAnalysis.unknown]),
  );
  const allUsed = new Set([...subjectAnalysis.used, ...bodyAnalysis.used]);
  const hasNameField = NAME_FIELDS.some((f) => allUsed.has(f));
  const hasUnknown = unknownFields.length > 0;

  const save = async () => {
    if (hasUnknown) {
      toast.error(
        `Unknown merge field${unknownFields.length > 1 ? "s" : ""}: ${unknownFields
          .map((f) => `{{${f}}}`)
          .join(", ")}`,
      );
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("email_templates")
      .update({ subject, body })
      .eq("id", template.id)
      .select("version")
      .single();
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success(`Template saved (v${data?.version ?? template.version + 1})`);
    onSaved();
  };

  const reset = () => {
    setSubject(template.subject);
    setBody(template.body);
  };

  const isDefault = template.denomination === "default";

  return (
    <div className="bg-card border border-border rounded-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-sm border border-border bg-muted text-muted-foreground uppercase tracking-wider">
            Step {template.step}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-sm border border-border bg-muted text-muted-foreground">
            {isDefault ? "All denominations (default)" : template.denomination}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{template.template_key}</span>
        </div>
        <span className="text-xs text-muted-foreground">v{template.version}</span>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-body">
          Subject
        </Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-body">
          Body
        </Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-sm min-h-[280px]"
          rows={12}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            Available merge fields:{" "}
            <code className="bg-muted px-1 py-0.5 rounded-sm">{"{{pastor_name}}"}</code>{" "}
            <code className="bg-muted px-1 py-0.5 rounded-sm">{"{{first_name}}"}</code>{" "}
            <code className="bg-muted px-1 py-0.5 rounded-sm">{"{{church_name}}"}</code>
          </span>
          <span className={overWord ? "text-amber-400" : "text-muted-foreground"}>
            {charCount} characters · ~{wordCount} words
          </span>
        </div>

        {hasUnknown && (
          <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-sm px-2 py-1.5">
            Unknown merge field{unknownFields.length > 1 ? "s" : ""}:{" "}
            {unknownFields.map((f) => (
              <code key={f} className="bg-red-500/20 px-1 mx-0.5 rounded-sm">{`{{${f}}}`}</code>
            ))}
            {" "}— save is blocked until removed.
          </div>
        )}
        {!hasUnknown && !hasNameField && (
          <div className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-sm px-2 py-1.5">
            No name field used. Consider adding{" "}
            <code className="bg-amber-500/20 px-1 mx-0.5 rounded-sm">{"{{first_name}}"}</code>
            {" "}or{" "}
            <code className="bg-amber-500/20 px-1 mx-0.5 rounded-sm">{"{{pastor_name}}"}</code>
            {" "}to personalize this email.
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {dirty && (
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={reset}
          >
            Reset to saved
          </button>
        )}
        <Button size="sm" onClick={save} disabled={!dirty || saving || hasUnknown}>
          {saving ? "Saving…" : "Save template"}
        </Button>
      </div>
    </div>
  );
}