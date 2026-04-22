import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import UserEditDrawer from "@/components/UserEditDrawer";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare,
  Flag, AlertTriangle, FileText, Settings, LogOut,
  Activity, Server, ChevronDown, ChevronRight, Cpu, Sparkles,
} from "lucide-react";

type AdminTab =
  | "agent-health" | "ai-gateway" | "wisdom-health" | "stripe-health"
  | "dashboard" | "users" | "subscriptions" | "trial-utilization" | "monitor"
  | "flagged" | "crisis" | "prompts" | "settings";

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "agent-health", label: "Agent Health", icon: Activity },
  { id: "ai-gateway", label: "AI Gateway", icon: Cpu },
  { id: "wisdom-health", label: "Seek-Wisdom", icon: Server },
  { id: "stripe-health", label: "Stripe Health", icon: CreditCard },
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "trial-utilization", label: "Trial Utilization", icon: Sparkles },
  { id: "monitor", label: "Response Monitor", icon: MessageSquare },
  { id: "flagged", label: "Flagged", icon: Flag },
  { id: "crisis", label: "Crisis Log", icon: AlertTriangle },
  { id: "prompts", label: "System Prompt", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

// ─── Helpers ─────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const bg = color === "green" ? "border-green-500/50 bg-green-500/5"
    : color === "amber" ? "border-amber-500/50 bg-amber-500/5"
    : color === "red" ? "border-red-500/50 bg-red-500/5"
    : "border-border";
  return (
    <div className={`bg-card border rounded-sm p-5 ${bg}`}>
      <p className="text-muted-foreground text-xs uppercase tracking-widest font-body">{label}</p>
      <p className="text-3xl font-serif text-foreground mt-2">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════
// SECTION 1 — AGENT HEALTH MONITOR
// ═══════════════════════════════════════════
function AgentHealthTab() {
  const [runs, setRuns] = useState<any[]>([]);
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("7");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    let query = supabase.from("journal_agent_runs").select("*")
      .order("created_at", { ascending: false }).limit(200);
    if (periodFilter !== "all") {
      query = query.gte("created_at", daysAgo(Number(periodFilter)));
    }
    const { data } = await query;
    setRuns(data || []);
  }, [periodFilter]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Metrics from last 7 days
  const last7 = runs.filter(r => new Date(r.created_at) >= new Date(daysAgo(7)));
  const totalRuns = last7.length;
  const successCount = last7.filter(r => r.status === "success").length;
  const errorCount = last7.filter(r => r.status === "error").length;
  const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 100;
  const errorRate = totalRuns > 0 ? Math.round((errorCount / totalRuns) * 100) : 0;
  const durations = last7
    .map(r => r.metadata?.duration_ms)
    .filter((d): d is number => typeof d === "number");
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const successColor = successRate >= 98 ? "green" : successRate >= 90 ? "amber" : "red";

  // Determine agent name from metadata or fall back
  const getAgent = (r: any) => {
    if (r.metadata?.agent) return r.metadata.agent;
    return "journal-pattern-agent";
  };

  const filtered = runs.filter(r => {
    if (agentFilter !== "all" && getAgent(r) !== agentFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Runs (7d)" value={totalRuns} />
        <MetricCard label="Success Rate" value={`${successRate}%`} color={successColor} />
        <MetricCard label="Error Rate" value={`${errorRate}%`} color={errorRate > 10 ? "red" : undefined} />
        <MetricCard label="Avg Duration" value={`${avgDuration}ms`} />
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground">
          <option value="all">All Agents</option>
          <option value="scripture-research-agent">scripture-research-agent</option>
          <option value="journal-pattern-agent">journal-pattern-agent</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground">
          <option value="all">All Statuses</option>
          <option value="success">success</option>
          <option value="skipped">skipped</option>
          <option value="error">error</option>
        </select>
        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-2 w-8"></th>
              <th className="text-left py-3 px-2">Date/Time</th>
              <th className="text-left py-3 px-2">Agent</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Entries</th>
              <th className="text-left py-3 px-2">Themes</th>
              <th className="text-left py-3 px-2">Duration</th>
              <th className="text-left py-3 px-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map(r => {
              const isExpanded = expandedRow === r.id;
              const hasError = r.status === "error" && r.error_message;
              return (
                <>
                  <tr key={r.id}
                    className={`border-b border-border/50 hover:bg-secondary/50 ${hasError ? "cursor-pointer" : ""}`}
                    onClick={() => hasError && setExpandedRow(isExpanded ? null : r.id)}>
                    <td className="py-3 px-2">
                      {hasError && (isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />)}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-3 px-2 text-foreground text-xs font-mono">{getAgent(r)}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs font-serif uppercase ${
                        r.status === "success" ? "text-green-500"
                        : r.status === "error" ? "text-red-400"
                        : "text-amber-400"
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{r.metadata?.entries_read ?? "—"}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">
                      {r.metadata?.themes_found ? (r.metadata.themes_found as string[]).join(", ") : "—"}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">{r.metadata?.duration_ms ?? "—"}</td>
                    <td className="py-3 px-2 text-red-400 text-xs truncate max-w-[200px]">{r.error_message || "—"}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={8} className="bg-red-500/5 border-b border-red-500/20 px-6 py-4">
                        <p className="text-red-300 text-sm font-mono whitespace-pre-wrap">{r.error_message}</p>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-muted-foreground text-sm italic py-4 text-center">No runs found.</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SECTION 6 — AI GATEWAY & MODEL HEALTH
// ═══════════════════════════════════════════
const GEMINI_INPUT_RATE = 0.00015; // per 1K tokens
const GEMINI_OUTPUT_RATE = 0.00060; // per 1K tokens

function AIGatewayTab() {
  const [runs, setRuns] = useState<any[]>([]);

  const fetchRuns = useCallback(async () => {
    const { data } = await supabase.from("journal_agent_runs").select("status, metadata, created_at")
      .gte("created_at", daysAgo(7)).order("created_at", { ascending: false }).limit(500);
    setRuns(data || []);
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Metrics
  const totalCalls = runs.length;

  const inputTokens = runs
    .map(r => r.metadata?.input_tokens)
    .filter((t): t is number => typeof t === "number");
  const outputTokens = runs
    .map(r => r.metadata?.output_tokens)
    .filter((t): t is number => typeof t === "number");

  const avgInput = inputTokens.length > 0
    ? Math.round(inputTokens.reduce((a, b) => a + b, 0) / inputTokens.length) : 0;
  const avgOutput = outputTokens.length > 0
    ? Math.round(outputTokens.reduce((a, b) => a + b, 0) / outputTokens.length) : 0;

  const totalInputTokens = inputTokens.reduce((a, b) => a + b, 0);
  const totalOutputTokens = outputTokens.reduce((a, b) => a + b, 0);
  const estimatedCost = (totalInputTokens / 1000) * GEMINI_INPUT_RATE + (totalOutputTokens / 1000) * GEMINI_OUTPUT_RATE;
  const costColor = estimatedCost < 1 ? "green" : estimatedCost <= 5 ? "amber" : "red";

  // Tool call reliability by agent
  type AgentStats = { calls: number; toolSuccess: number; toolFailure: number };
  const agentMap: Record<string, AgentStats> = {};

  for (const r of runs) {
    const agent = (r.metadata?.agent as string) || "journal-pattern-agent";
    if (!agentMap[agent]) agentMap[agent] = { calls: 0, toolSuccess: 0, toolFailure: 0 };
    agentMap[agent].calls++;
    if (r.metadata?.tool_parse_success === true) agentMap[agent].toolSuccess++;
    if (r.metadata?.tool_parse_failure === true || r.status === "error") agentMap[agent].toolFailure++;
  }

  const agentRows = Object.entries(agentMap).map(([agent, stats]) => ({
    agent,
    ...stats,
    failureRate: stats.calls > 0 ? Math.round((stats.toolFailure / stats.calls) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total AI Calls (7d)" value={totalCalls} />
        <MetricCard label="Avg Input Tokens" value={avgInput} />
        <MetricCard label="Avg Output Tokens" value={avgOutput} />
        <MetricCard label="Est. Cost (Gemini Flash)" value={`$${estimatedCost.toFixed(2)}`} color={costColor} />
      </div>

      <div>
        <h3 className="font-serif text-gold text-sm uppercase tracking-widest mb-4">Tool Call Reliability</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-2">Agent</th>
                <th className="text-left py-3 px-2">Calls</th>
                <th className="text-left py-3 px-2">Tool Parse Success</th>
                <th className="text-left py-3 px-2">Tool Parse Failures</th>
                <th className="text-left py-3 px-2">Failure %</th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map(row => (
                <tr key={row.agent} className="border-b border-border/50 hover:bg-secondary/50">
                  <td className="py-3 px-2 text-foreground font-mono text-xs">{row.agent}</td>
                  <td className="py-3 px-2 text-muted-foreground">{row.calls}</td>
                  <td className="py-3 px-2 text-green-500">{row.toolSuccess}</td>
                  <td className="py-3 px-2 text-red-400">{row.toolFailure}</td>
                  <td className="py-3 px-2">
                    <span className={`text-xs font-serif ${row.failureRate > 10 ? "text-red-400" : row.failureRate > 0 ? "text-amber-400" : "text-green-500"}`}>
                      {row.failureRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {agentRows.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground text-sm italic">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SECTION 2 — SEEK-WISDOM HEALTH MONITOR
// ═══════════════════════════════════════════
function WisdomHealthTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; count: number; label: string }[]>([]);

  const fetchData = useCallback(async () => {
    const since = daysAgo(14);
    const { data } = await supabase.from("wisdom_sessions")
      .select("id, user_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    setSessions(data || []);

    // Build daily chart data
    const buckets: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    (data || []).forEach(s => {
      const day = s.created_at.slice(0, 10);
      if (buckets[day] !== undefined) buckets[day]++;
    });
    setDailyData(Object.entries(buckets).map(([date, count]) => ({
      date,
      count,
      label: new Date(date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const last7 = sessions.filter(s => new Date(s.created_at) >= new Date(daysAgo(7)));
  const totalQuestions = last7.length;
  const anonRequests = last7.filter(s => !s.user_id).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Questions (7d)" value={totalQuestions} />
        <MetricCard label="Avg Response Time" value="—" />
        <MetricCard label="Anonymous (7d)" value={anonRequests} />
        <MetricCard label="Rate Limited (7d)" value="—" />
      </div>

      <div>
        <h3 className="font-serif text-gold text-sm uppercase tracking-widest mb-4">Daily Volume (14 days)</h3>
        <div className="bg-card border border-border rounded-sm p-4" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {dailyData.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--gold))" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SECTION 3 — STRIPE & SUBSCRIPTION HEALTH
// ═══════════════════════════════════════════
function StripeHealthTab() {
  const [metrics, setMetrics] = useState({ paid: 0, trials: 0, converted: 0, churned: 0 });
  const [funnel, setFunnel] = useState({ signups30d: 0, trialsStarted: 0, converted: 0 });

  const fetchData = useCallback(async () => {
    const [{ data: profiles }, { data: subs }] = await Promise.all([
      supabase.from("profiles").select("plan, trial_converted, trial_started_at, created_at, updated_at"),
      supabase.from("subscriptions").select("plan_type, status, created_at"),
    ]);
    const allProfiles = profiles || [];
    const allSubs = subs || [];

    const paid = allProfiles.filter(p => ["personal", "family", "community"].includes(p.plan)).length;
    const trials = allProfiles.filter(p => p.plan === "trial").length;
    const weekAgo = new Date(daysAgo(7));
    const converted = allProfiles.filter(p => p.trial_converted && new Date(p.updated_at) >= weekAgo).length;
    const churned = allSubs.filter(s => s.status === "cancelled" && new Date(s.created_at) >= weekAgo).length;

    setMetrics({ paid, trials, converted, churned });

    // Funnel
    const monthAgo = new Date(daysAgo(30));
    const signups30d = allProfiles.filter(p => new Date(p.created_at) >= monthAgo).length;
    const trialsStarted = allProfiles.filter(p => p.trial_started_at && new Date(p.trial_started_at) >= monthAgo).length;
    const convertedAll = allProfiles.filter(p => p.trial_converted).length;

    setFunnel({ signups30d, trialsStarted, converted: convertedAll });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const funnelRate1 = funnel.signups30d > 0 ? Math.round((funnel.trialsStarted / funnel.signups30d) * 100) : 0;
  const funnelRate2 = funnel.trialsStarted > 0 ? Math.round((funnel.converted / funnel.trialsStarted) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Paid" value={metrics.paid} color="green" />
        <MetricCard label="Active Trials" value={metrics.trials} color="amber" />
        <MetricCard label="Converted (7d)" value={metrics.converted} color="green" />
        <MetricCard label="Churned (7d)" value={metrics.churned} color={metrics.churned > 0 ? "red" : undefined} />
      </div>

      <div>
        <h3 className="font-serif text-gold text-sm uppercase tracking-widest mb-4">Conversion Funnel (30 days)</h3>
        <div className="flex items-center gap-4 bg-card border border-border rounded-sm p-6">
          <div className="text-center flex-1">
            <p className="text-3xl font-serif text-foreground">{funnel.signups30d}</p>
            <p className="text-muted-foreground text-xs mt-1">Signups</p>
          </div>
          <div className="text-center">
            <p className="text-gold font-serif text-sm">→ {funnelRate1}%</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-3xl font-serif text-foreground">{funnel.trialsStarted}</p>
            <p className="text-muted-foreground text-xs mt-1">Trials Started</p>
          </div>
          <div className="text-center">
            <p className="text-gold font-serif text-sm">→ {funnelRate2}%</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-3xl font-serif text-foreground">{funnel.converted}</p>
            <p className="text-muted-foreground text-xs mt-1">Paid</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SECTION 4 — ERROR ALERTS
// ═══════════════════════════════════════════
function useAlerts(runs: any[], sessions: any[]) {
  const [anonHits, setAnonHits] = useState(0);

  useEffect(() => {
    (async () => {
      const hourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data } = await supabase.from("rate_limits_anonymous")
        .select("count")
        .gte("created_at", hourAgo);
      const total = (data || []).reduce((s, r) => s + (r.count || 0), 0);
      setAnonHits(total);
    })();
  }, []);

  const alerts: { level: "red" | "amber"; message: string }[] = [];

  // Agent error rate > 10%
  const last7runs = runs.filter(r => new Date(r.created_at) >= new Date(daysAgo(7)));
  if (last7runs.length > 0) {
    const errorRate = last7runs.filter(r => r.status === "error").length / last7runs.length;
    if (errorRate > 0.1) {
      alerts.push({ level: "red", message: "Agent error rate is elevated — check agent health below" });
    }
  }

  // Agent errors in last 24h
  const last24h = runs.filter(r => new Date(r.created_at) >= new Date(daysAgo(1)) && r.status === "error");
  if (last24h.length > 0) {
    alerts.push({ level: "red", message: `${last24h.length} agent error(s) in last 24 hours — review error details` });
  }

  // Zero wisdom sessions in 24h
  const sessions24h = sessions.filter(s => new Date(s.created_at) >= new Date(daysAgo(1)));
  if (sessions24h.length === 0 && sessions.length > 0) {
    alerts.push({ level: "red", message: "No questions received in 24 hours — seek-wisdom may be down" });
  }

  // Anon rate limiting
  if (anonHits > 5) {
    alerts.push({ level: "amber", message: "Anonymous rate limiting active — possible traffic spike" });
  }

  return alerts;
}

// ─── Existing Tabs (preserved) ─────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState({ users: 0, subscribers: 0, questionsToday: 0, mrr: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: userCount }, { count: subCount }, { data: usage }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).neq("plan_type", "free"),
        supabase.from("usage_daily").select("question_count").eq("date", new Date().toISOString().slice(0, 10)),
        supabase.from("subscriptions").select("plan_type, billing_cycle").eq("status", "active").neq("plan_type", "free"),
      ]);
      const questionsToday = (usage || []).reduce((s, r) => s + (r.question_count || 0), 0);
      const prices: Record<string, number> = { personal: 3.99, family: 9.99, community: 24.99 };
      const mrr = (subs || []).reduce((s, r) => {
        const p = prices[r.plan_type] || 0;
        return s + (r.billing_cycle === "yearly" ? p * 0.8 : p);
      }, 0);
      setStats({ users: userCount || 0, subscribers: subCount || 0, questionsToday, mrr });
    })();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users },
    { label: "Paid Subscribers", value: stats.subscribers },
    { label: "Questions Today", value: stats.questionsToday },
    { label: "Est. MRR", value: `$${stats.mrr.toFixed(2)}` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-card border border-border rounded-sm p-6">
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-body">{c.label}</p>
          <p className="text-3xl font-serif text-foreground mt-2">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ callerRole, onEditUser }: { callerRole: string; onEditUser: (id: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, created_at, age_group, role, plan, is_suspended")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order("created_at", { ascending: false });
      setUsers(profiles || []);
    })();
  }, [page]);

  const filtered = users.filter(u => {
    if (planFilter !== "all" && u.plan !== planFilter) return false;
    if (search && !u.user_id.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input placeholder="Search by user ID..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground flex-1 placeholder:text-muted-foreground" />
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground">
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="personal">Personal</option>
          <option value="family">Family</option>
          <option value="community">Community</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-2">User ID</th>
              <th className="text-left py-3 px-2">Joined</th>
              <th className="text-left py-3 px-2">Role</th>
              <th className="text-left py-3 px-2">Plan</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/50">
                <td className="py-3 px-2 text-foreground font-mono text-xs">{u.user_id.slice(0, 8)}…</td>
                <td className="py-3 px-2 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-2">
                  <span className={`font-serif text-xs uppercase ${u.role === "super_admin" ? "text-gold" : u.role === "beta" ? "text-gold-light" : "text-muted-foreground"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-2 text-gold font-serif text-xs uppercase">{u.plan}</td>
                <td className="py-3 px-2">
                  <span className={`text-xs ${u.is_suspended ? "text-destructive" : "text-green-500"}`}>
                    {u.is_suspended ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <button onClick={() => onEditUser(u.user_id)}
                    className="text-gold text-xs hover:text-gold-light transition-colors">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center">
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
          className="text-gold text-sm disabled:opacity-30">← Previous</button>
        <span className="text-muted-foreground text-xs">Page {page + 1}</span>
        <button onClick={() => setPage(page + 1)} disabled={filtered.length < PAGE_SIZE}
          className="text-gold text-sm disabled:opacity-30">Next →</button>
      </div>
    </div>
  );
}

function SubscriptionsTab() {
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: subs } = await supabase.from("subscriptions").select("plan_type").eq("status", "active");
      const counts: Record<string, number> = {};
      (subs || []).forEach(s => { counts[s.plan_type] = (counts[s.plan_type] || 0) + 1; });
      setBreakdown(counts);
      const { data: recentSubs } = await supabase.from("subscriptions").select("user_id, plan_type, status, created_at")
        .order("created_at", { ascending: false }).limit(10);
      setRecent(recentSubs || []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(breakdown).map(([plan, count]) => (
          <div key={plan} className="bg-card border border-border rounded-sm p-4">
            <p className="text-gold font-serif text-xs uppercase tracking-widest">{plan}</p>
            <p className="text-2xl font-serif text-foreground mt-1">{count}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-serif text-gold text-sm uppercase tracking-widest mb-3">Recent Events</h3>
        <div className="space-y-2">
          {recent.map((s, i) => (
            <div key={i} className="flex justify-between items-center bg-card border border-border/50 rounded-sm px-4 py-3 text-sm">
              <span className="text-foreground font-mono text-xs">{s.user_id.slice(0, 8)}…</span>
              <span className="text-gold font-serif uppercase text-xs">{s.plan_type}</span>
              <span className="text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonitorTab() {
  const [themes, setThemes] = useState<{ theme: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("session_themes").select("theme");
      const counts: Record<string, number> = {};
      (data || []).forEach(t => { counts[t.theme] = (counts[t.theme] || 0) + 1; });
      setThemes(Object.entries(counts).map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count).slice(0, 20));
    })();
  }, []);

  const maxCount = themes[0]?.count || 1;
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs mb-4">Aggregated themes — no individual user data shown.</p>
      {themes.map(t => (
        <div key={t.theme} className="flex items-center gap-3">
          <span className="text-foreground text-sm w-40 truncate font-body">{t.theme}</span>
          <div className="flex-1 h-6 bg-secondary rounded-sm overflow-hidden">
            <div className="h-full bg-gold/60 rounded-sm" style={{ width: `${(t.count / maxCount) * 100}%` }} />
          </div>
          <span className="text-muted-foreground text-xs w-10 text-right">{t.count}</span>
        </div>
      ))}
      {themes.length === 0 && <p className="text-muted-foreground text-sm italic">No theme data yet.</p>}
    </div>
  );
}

function FlaggedTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("wisdom_sessions")
        .select("id, question, created_at").eq("flagged", true)
        .order("created_at", { ascending: false }).limit(50);
      setSessions(data || []);
    })();
  }, []);
  return (
    <div className="space-y-3">
      {sessions.map(s => (
        <div key={s.id} className="bg-card border border-destructive/30 rounded-sm p-4">
          <p className="text-foreground text-sm">{s.question}</p>
          <p className="text-muted-foreground text-xs mt-2">{new Date(s.created_at).toLocaleString()}</p>
        </div>
      ))}
      {sessions.length === 0 && <p className="text-muted-foreground text-sm italic">No flagged sessions.</p>}
    </div>
  );
}

function CrisisTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [crisisCount7d, setCrisisCount7d] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("crisis_log").select("*").order("triggered_at", { ascending: false }).limit(100);
      setEvents(data || []);

      const sevenDaysAgo = daysAgo(7);
      const count = (data || []).filter(
        (e: any) => e.severity === "crisis" && new Date(e.triggered_at) >= new Date(sevenDaysAgo)
      ).length;
      setCrisisCount7d(count);
    })();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-xs">Crisis keyword triggers — no user identity stored.</p>
        {crisisCount7d > 0 && (
          <span className="bg-red-500/20 text-red-400 text-xs font-serif px-2 py-1 rounded-sm">
            {crisisCount7d} crisis event{crisisCount7d !== 1 ? "s" : ""} (7d)
          </span>
        )}
      </div>
      {events.map((e: any) => (
        <div
          key={e.id}
          className={`flex items-center justify-between bg-card border rounded-sm px-4 py-3 ${
            e.severity === "crisis"
              ? "border-red-500/40 bg-red-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <span className={`font-body text-sm font-medium ${
            e.severity === "crisis" ? "text-red-400" : "text-amber-400"
          }`}>
            {e.keyword_matched}
          </span>
          <span className={`text-xs font-serif uppercase ${
            e.severity === "crisis" ? "text-red-400" : "text-amber-400"
          }`}>
            {e.severity}
          </span>
          <span className="text-muted-foreground text-xs">{new Date(e.triggered_at).toLocaleString()}</span>
        </div>
      ))}
      {events.length === 0 && <p className="text-muted-foreground text-sm italic">No crisis events recorded.</p>}
    </div>
  );
}

function PromptsTab() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [newVersion, setNewVersion] = useState("");
  const [newContent, setNewContent] = useState("");

  const refresh = async () => {
    const { data } = await supabase.from("system_prompts").select("*").order("created_at", { ascending: false });
    setPrompts(data || []);
  };
  useEffect(() => { refresh(); }, []);

  const createPrompt = async () => {
    if (!newVersion || !newContent) return;
    try {
      const content = JSON.parse(newContent);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("system_prompts").insert({ version: newVersion, content, created_by: user?.id });
      setNewVersion(""); setNewContent("");
      refresh();
    } catch { /* invalid JSON */ }
  };

  const activatePrompt = async (id: string) => {
    await supabase.from("system_prompts").update({ is_active: false }).neq("id", "");
    await supabase.from("system_prompts").update({ is_active: true }).eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        <p className="font-serif text-gold text-xs uppercase tracking-widest">New Prompt Version</p>
        <input placeholder="Version (e.g. v2.1)" value={newVersion} onChange={e => setNewVersion(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground w-full placeholder:text-muted-foreground" />
        <textarea placeholder='Content as JSON' value={newContent} onChange={e => setNewContent(e.target.value)} rows={6}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground w-full placeholder:text-muted-foreground font-mono resize-none" />
        <button onClick={createPrompt}
          className="bg-gold text-primary-foreground font-serif text-xs uppercase tracking-widest px-6 py-2 rounded-sm hover:bg-gold-light transition-colors">
          Save Version
        </button>
      </div>
      <div className="space-y-3">
        {prompts.map(p => (
          <div key={p.id} className={`bg-card border rounded-sm p-4 ${p.is_active ? "border-gold" : "border-border"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-serif text-foreground text-sm">{p.version}</span>
              <div className="flex items-center gap-3">
                {p.is_active && <span className="text-gold text-xs font-serif uppercase">Active</span>}
                {!p.is_active && <button onClick={() => activatePrompt(p.id)} className="text-gold text-xs hover:text-gold-light transition-colors">Activate</button>}
                <span className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <pre className="text-muted-foreground text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-32">
              {JSON.stringify(p.content, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SECTION 7 — TRIAL UTILIZATION
// ═══════════════════════════════════════════
function TrialUtilizationTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [funnel, setFunnel] = useState({
    pricing_view: 0,
    paywall_view: 0,
    trial_interstitial_view: 0,
    upgrade_click: 0,
    checkout_start: 0,
  });
  const [anonFunnel, setAnonFunnel] = useState({
    guest_question_asked: 0,
    response_viewed: 0,
    soft_gate_shown: 0,
    blur_gate_shown: 0,
    auth_modal_opened: 0,
    converted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"active" | "all">("active");

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Pull trial profiles
      let q = supabase
        .from("profiles")
        .select("user_id, plan, trial_started_at, trial_ends_at, trial_converted, trial_nudge_sent")
        .not("trial_started_at", "is", null)
        .order("trial_started_at", { ascending: false })
        .limit(200);
      if (scope === "active") q = q.eq("plan", "trial");
      const { data: profiles } = await q;
      const trialProfiles = profiles || [];
      const userIds = trialProfiles.map(p => p.user_id);

      if (userIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Aggregate per-user metrics in parallel
      const [usageRes, sessionsRes, reflectionsRes, versesRes, patternsRes] = await Promise.all([
        supabase.from("usage_daily").select("user_id, date, question_count").in("user_id", userIds),
        supabase.from("wisdom_sessions").select("user_id, created_at").in("user_id", userIds),
        supabase.from("reflection_entries").select("user_id").in("user_id", userIds).is("deleted_at", null),
        supabase.from("saved_verses").select("user_id").in("user_id", userIds),
        supabase.from("user_patterns").select("user_id, theme, occurrence").in("user_id", userIds),
      ]);

      const byUser = (arr: any[] | null, key = "user_id") => {
        const m: Record<string, any[]> = {};
        (arr || []).forEach(r => {
          const k = r[key];
          if (!k) return;
          (m[k] ||= []).push(r);
        });
        return m;
      };

      const usageMap = byUser(usageRes.data);
      const sessionsMap = byUser(sessionsRes.data);
      const reflectionsMap = byUser(reflectionsRes.data);
      const versesMap = byUser(versesRes.data);
      const patternsMap = byUser(patternsRes.data);

      const enriched = trialProfiles.map(p => {
        const start = p.trial_started_at ? new Date(p.trial_started_at) : null;
        const end = p.trial_ends_at ? new Date(p.trial_ends_at) : null;
        const usage = (usageMap[p.user_id] || []).filter(u => {
          if (!start || !end) return true;
          const d = new Date(u.date);
          return d >= start && d <= end;
        });
        const sessions = (sessionsMap[p.user_id] || []).filter(s => {
          if (!start || !end) return true;
          const d = new Date(s.created_at);
          return d >= start && d <= end;
        });
        const daysActive = new Set(usage.map(u => u.date)).size;
        const totalQ = usage.reduce((sum, u) => sum + (u.question_count || 0), 0) || sessions.length;
        const reflections = (reflectionsMap[p.user_id] || []).length;
        const verses = (versesMap[p.user_id] || []).length;
        const patterns = (patternsMap[p.user_id] || []).sort((a, b) => b.occurrence - a.occurrence);
        const topTheme = patterns[0]?.theme || null;

        const now = new Date();
        const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)) : 0;
        const dayOfTrial = start
          ? Math.min(30, Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1))
          : 0;

        return {
          user_id: p.user_id,
          plan: p.plan,
          trial_started_at: p.trial_started_at,
          trial_ends_at: p.trial_ends_at,
          trial_converted: p.trial_converted,
          trial_nudge_sent: p.trial_nudge_sent || {},
          days_active: daysActive,
          total_questions: totalQ,
          reflections,
          verses,
          top_theme: topTheme,
          days_left: daysLeft,
          day_of_trial: dayOfTrial,
        };
      });
      enriched.sort((a, b) => b.total_questions - a.total_questions);
      setRows(enriched);

      // Funnel rollup over last 30 days
      const since = daysAgo(30);
      const { data: events } = await supabase
        .from("funnel_events")
        .select("event_name")
        .gte("created_at", since)
        .limit(5000);
      const counts: Record<string, number> = {
        pricing_view: 0,
        paywall_view: 0,
        trial_interstitial_view: 0,
        upgrade_click: 0,
        checkout_start: 0,
      };
      (events || []).forEach(e => {
        if (counts[e.event_name] !== undefined) counts[e.event_name]++;
      });
      setFunnel(counts as any);

      // Anonymous visitor funnel — unique anon_session_id per step
      const { data: anonEvents } = await supabase
        .from("funnel_events")
        .select("event_name, anon_session_id")
        .is("user_id", null)
        .not("anon_session_id", "is", null)
        .gte("created_at", since)
        .limit(10000);

      const sessionsByStep: Record<string, Set<string>> = {
        guest_question_asked: new Set(),
        response_viewed: new Set(),
        soft_gate_shown: new Set(),
        blur_gate_shown: new Set(),
        auth_modal_opened: new Set(),
      };
      (anonEvents || []).forEach((e: any) => {
        if (sessionsByStep[e.event_name] && e.anon_session_id) {
          sessionsByStep[e.event_name].add(e.anon_session_id);
        }
      });

      const { data: signupEvents } = await supabase
        .from("funnel_events")
        .select("anon_session_id")
        .eq("event_name", "signup_completed")
        .not("anon_session_id", "is", null)
        .gte("created_at", since);
      const convertedSessions = new Set((signupEvents || []).map((e: any) => e.anon_session_id));

      setAnonFunnel({
        guest_question_asked: sessionsByStep.guest_question_asked.size,
        response_viewed: sessionsByStep.response_viewed.size,
        soft_gate_shown: sessionsByStep.soft_gate_shown.size,
        blur_gate_shown: sessionsByStep.blur_gate_shown.size,
        auth_modal_opened: sessionsByStep.auth_modal_opened.size,
        converted: convertedSessions.size,
      });

      setLoading(false);
    })();
  }, [scope]);

  const totalTrials = rows.length;
  const activeTrials = rows.filter(r => r.plan === "trial").length;
  const convertedTrials = rows.filter(r => r.trial_converted).length;
  const avgDaysActive = totalTrials > 0
    ? (rows.reduce((s, r) => s + r.days_active, 0) / totalTrials).toFixed(1)
    : "0";
  const avgQuestions = totalTrials > 0
    ? (rows.reduce((s, r) => s + r.total_questions, 0) / totalTrials).toFixed(1)
    : "0";
  const engaged = rows.filter(r => r.days_active >= 3 && r.total_questions >= 5).length;

  const exportCSV = () => {
    const header = ["user_id", "plan", "day_of_trial", "days_left", "days_active", "total_questions", "reflections", "verses_saved", "top_theme", "converted"];
    const lines = [header.join(",")];
    rows.forEach(r => {
      lines.push([
        r.user_id, r.plan, r.day_of_trial, r.days_left, r.days_active,
        r.total_questions, r.reflections, r.verses, JSON.stringify(r.top_theme || ""), r.trial_converted,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-utilization-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Trials" value={activeTrials} color="amber" />
        <MetricCard label="Engaged (≥3 days, ≥5 q)" value={engaged} color="green" />
        <MetricCard label="Avg Days Active" value={avgDaysActive} />
        <MetricCard label="Avg Questions / Trial" value={avgQuestions} />
      </div>

      <div>
        <h3 className="font-serif text-gold text-sm uppercase tracking-widest mb-4">
          Conversion Funnel — last 30 days
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { k: "pricing_view", label: "Pricing Views" },
            { k: "trial_interstitial_view", label: "Day-21 Interstitial" },
            { k: "paywall_view", label: "Paywall Views" },
            { k: "upgrade_click", label: "Upgrade Clicks" },
            { k: "checkout_start", label: "Checkout Starts" },
          ].map(({ k, label }) => (
            <div key={k} className="bg-card border border-border rounded-sm p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-body">{label}</p>
              <p className="text-2xl font-serif text-foreground mt-2">
                {(funnel as any)[k] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-serif text-gold text-sm uppercase tracking-widest mb-4">
          Anonymous Visitor Funnel — unique sessions, last 30 days
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { k: "guest_question_asked", label: "Asked" },
            { k: "response_viewed", label: "Viewed Response" },
            { k: "soft_gate_shown", label: "Soft Gate" },
            { k: "blur_gate_shown", label: "Blur Gate" },
            { k: "auth_modal_opened", label: "Opened Auth" },
            { k: "converted", label: "Signed Up" },
          ].map(({ k, label }) => {
            const value = (anonFunnel as any)[k] ?? 0;
            const top = anonFunnel.guest_question_asked || 1;
            const pct = Math.round((value / top) * 100);
            return (
              <div key={k} className="bg-card border border-border rounded-sm p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-widest font-body">{label}</p>
                <p className="text-2xl font-serif text-foreground mt-2">{value}</p>
                {k !== "guest_question_asked" && (
                  <p className="text-[10px] font-body text-muted-foreground mt-1">{pct}% of asked</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setScope("active")}
            className={`text-xs font-serif uppercase tracking-wider px-3 py-2 rounded-sm border transition-colors ${
              scope === "active" ? "border-gold text-gold bg-gold/5" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Active trials
          </button>
          <button
            onClick={() => setScope("all")}
            className={`text-xs font-serif uppercase tracking-wider px-3 py-2 rounded-sm border transition-colors ${
              scope === "all" ? "border-gold text-gold bg-gold/5" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All trials
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">{totalTrials} users · {convertedTrials} converted</span>
          <button
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="text-xs font-serif uppercase tracking-wider px-3 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-2">User</th>
              <th className="text-left py-3 px-2">Plan</th>
              <th className="text-left py-3 px-2">Day</th>
              <th className="text-left py-3 px-2">Left</th>
              <th className="text-left py-3 px-2">Days Active</th>
              <th className="text-left py-3 px-2">Questions</th>
              <th className="text-left py-3 px-2">Reflections</th>
              <th className="text-left py-3 px-2">Verses</th>
              <th className="text-left py-3 px-2">Top Theme</th>
              <th className="text-left py-3 px-2">Nudges</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-sm italic">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-sm italic">No trials found.</td></tr>
            )}
            {!loading && rows.map(r => {
              const nudges = r.trial_nudge_sent || {};
              const fired = ["day14", "day21", "day28"].filter(k => nudges[k]);
              return (
                <tr key={r.user_id} className="border-b border-border/50 hover:bg-secondary/50">
                  <td className="py-3 px-2 text-foreground font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                  <td className="py-3 px-2">
                    <span className={`text-xs font-serif uppercase ${r.trial_converted ? "text-green-500" : r.plan === "trial" ? "text-amber-400" : "text-muted-foreground"}`}>
                      {r.trial_converted ? "converted" : r.plan}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">{r.day_of_trial}/30</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">{r.days_left}d</td>
                  <td className="py-3 px-2 text-foreground text-xs">{r.days_active}</td>
                  <td className="py-3 px-2 text-foreground text-xs">{r.total_questions}</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">{r.reflections}</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">{r.verses}</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs italic truncate max-w-[140px]">{r.top_theme || "—"}</td>
                  <td className="py-3 px-2 text-muted-foreground text-xs">{fired.length > 0 ? fired.join(", ") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [configs, setConfigs] = useState<{ key: string; value: string }[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const refresh = async () => {
    const { data } = await supabase.from("app_config").select("*").order("key");
    setConfigs((data || []) as { key: string; value: string }[]);
  };
  useEffect(() => { refresh(); }, []);

  const saveConfig = async () => {
    if (!newKey) return;
    await supabase.from("app_config").upsert({ key: newKey, value: newValue, updated_at: new Date().toISOString() });
    setNewKey(""); setNewValue("");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-sm p-4 space-y-3">
        <p className="font-serif text-gold text-xs uppercase tracking-widest">Add / Update Config</p>
        <div className="flex gap-3">
          <input placeholder="Key" value={newKey} onChange={e => setNewKey(e.target.value)}
            className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground flex-1 placeholder:text-muted-foreground" />
          <input placeholder="Value" value={newValue} onChange={e => setNewValue(e.target.value)}
            className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground flex-1 placeholder:text-muted-foreground" />
          <button onClick={saveConfig}
            className="bg-gold text-primary-foreground font-serif text-xs uppercase tracking-widest px-6 py-2 rounded-sm hover:bg-gold-light transition-colors whitespace-nowrap">Save</button>
        </div>
      </div>
      <div className="space-y-2">
        {configs.map(c => (
          <div key={c.key} className="flex items-center justify-between bg-card border border-border/50 rounded-sm px-4 py-3">
            <span className="text-gold font-mono text-sm">{c.key}</span>
            <span className="text-foreground text-sm">{c.value || "—"}</span>
          </div>
        ))}
        {configs.length === 0 && <p className="text-muted-foreground text-sm italic">No config entries yet.</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN ADMIN PAGE
// ═══════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("agent-health");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);

  // Data for alerts (shared state)
  const [agentRuns, setAgentRuns] = useState<any[]>([]);
  const [wisdomSessions, setWisdomSessions] = useState<any[]>([]);
  const [crisisBadge, setCrisisBadge] = useState(0);

  const fetchAlertData = useCallback(async () => {
    const [{ data: runs }, { data: sessions }, { data: crisisLogs }] = await Promise.all([
      supabase.from("journal_agent_runs").select("id, status, error_message, created_at, metadata")
        .gte("created_at", daysAgo(7)).order("created_at", { ascending: false }).limit(200),
      supabase.from("wisdom_sessions").select("id, user_id, created_at")
        .gte("created_at", daysAgo(14)).order("created_at", { ascending: false }).limit(1000),
      supabase.from("crisis_log").select("severity, triggered_at")
        .eq("severity", "crisis").gte("triggered_at", daysAgo(7)),
    ]);
    setAgentRuns(runs || []);
    setWisdomSessions(sessions || []);
    setCrisisBadge((crisisLogs || []).length);
    setLastUpdated(new Date());
  }, []);

  // Guard: super_admin only
  useEffect(() => {
    if (!loading && (!user || role !== "super_admin")) {
      navigate("/", { replace: true });
    }
  }, [loading, user, role, navigate]);

  // Initial fetch + 60s auto-refresh
  useEffect(() => {
    if (role === "super_admin") {
      fetchAlertData();
      const interval = setInterval(fetchAlertData, 60_000);
      return () => clearInterval(interval);
    }
  }, [role, fetchAlertData]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const alerts = useAlerts(agentRuns, wisdomSessions);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (role !== "super_admin") return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatElapsed = (s: number) => s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ${s % 60}s ago`;

  const tabContent: Record<AdminTab, JSX.Element> = {
    "agent-health": <AgentHealthTab />,
    "ai-gateway": <AIGatewayTab />,
    "wisdom-health": <WisdomHealthTab />,
    "stripe-health": <StripeHealthTab />,
    dashboard: <DashboardTab />,
    users: <UsersTab callerRole={role} onEditUser={id => setEditingUserId(id)} />,
    subscriptions: <SubscriptionsTab />,
    "trial-utilization": <TrialUtilizationTab />,
    monitor: <MonitorTab />,
    flagged: <FlaggedTab />,
    crisis: <CrisisTab />,
    prompts: <PromptsTab />,
    settings: <SettingsTab />,
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <h1 className="font-serif text-xl text-gold tracking-widest">DABAR</h1>
          <p className="text-muted-foreground text-xs font-body mt-1">Admin Console</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-body transition-colors ${
                activeTab === t.id ? "text-gold bg-secondary border-r-2 border-gold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.id === "crisis" && crisisBadge > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  {crisisBadge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors w-full">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl">
          {/* Alert banners */}
          {alerts.length === 0 ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-sm px-4 py-3 mb-6">
              <p className="text-green-400 text-sm font-body">✓ All systems healthy</p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {alerts.map((a, i) => (
                <div key={i} className={`border rounded-sm px-4 py-3 ${
                  a.level === "red" ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
                }`}>
                  <p className={`text-sm font-body ${a.level === "red" ? "text-red-400" : "text-amber-400"}`}>
                    ⚠ {a.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-foreground tracking-wide">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <span className="text-muted-foreground text-xs font-body">
              Last updated {formatElapsed(elapsed)}
            </span>
          </div>

          {tabContent[activeTab]}
        </div>
      </main>

      {editingUserId && (
        <UserEditDrawer
          userId={editingUserId}
          callerRole={role}
          onClose={() => setEditingUserId(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}
