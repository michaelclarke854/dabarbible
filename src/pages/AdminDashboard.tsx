import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import UserEditDrawer from "@/components/UserEditDrawer";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare,
  Flag, AlertTriangle, FileText, Settings, LogOut
} from "lucide-react";

type AdminTab = "dashboard" | "users" | "subscriptions" | "monitor" | "flagged" | "crisis" | "prompts" | "settings";

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "monitor", label: "Response Monitor", icon: MessageSquare },
  { id: "flagged", label: "Flagged", icon: Flag },
  { id: "crisis", label: "Crisis Log", icon: AlertTriangle },
  { id: "prompts", label: "System Prompt", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

// ─── Dashboard Overview ─────────────────────────────
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
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-sm p-6">
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-body">{c.label}</p>
          <p className="text-3xl font-serif text-foreground mt-2">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Users ─────────────────────────────
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

  const filtered = users.filter((u) => {
    if (planFilter !== "all" && u.plan !== planFilter) return false;
    if (search && !u.user_id.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input placeholder="Search by user ID..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground flex-1 placeholder:text-muted-foreground" />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
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
            {filtered.map((u) => (
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
                    className="text-gold text-xs hover:text-gold-light transition-colors">
                    Edit
                  </button>
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

// ─── Subscriptions ─────────────────────────────
function SubscriptionsTab() {
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: subs } = await supabase.from("subscriptions").select("plan_type").eq("status", "active");
      const counts: Record<string, number> = {};
      (subs || []).forEach((s) => { counts[s.plan_type] = (counts[s.plan_type] || 0) + 1; });
      setBreakdown(counts);

      const { data: recentSubs } = await supabase
        .from("subscriptions").select("user_id, plan_type, status, created_at")
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

// ─── Response Monitor ─────────────────────────────
function MonitorTab() {
  const [themes, setThemes] = useState<{ theme: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("session_themes").select("theme");
      const counts: Record<string, number> = {};
      (data || []).forEach((t) => { counts[t.theme] = (counts[t.theme] || 0) + 1; });
      setThemes(Object.entries(counts).map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count).slice(0, 20));
    })();
  }, []);

  const maxCount = themes[0]?.count || 1;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs mb-4">Aggregated themes — no individual user data shown.</p>
      {themes.map((t) => (
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

// ─── Flagged ─────────────────────────────
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
      {sessions.map((s) => (
        <div key={s.id} className="bg-card border border-destructive/30 rounded-sm p-4">
          <p className="text-foreground text-sm">{s.question}</p>
          <p className="text-muted-foreground text-xs mt-2">{new Date(s.created_at).toLocaleString()}</p>
        </div>
      ))}
      {sessions.length === 0 && <p className="text-muted-foreground text-sm italic">No flagged sessions.</p>}
    </div>
  );
}

// ─── Crisis Log ─────────────────────────────
function CrisisTab() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("crisis_events").select("*")
        .order("routed_at", { ascending: false }).limit(50);
      setEvents(data || []);
    })();
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs mb-4">Crisis keyword triggers — no user identity stored.</p>
      {events.map((e) => (
        <div key={e.id} className="flex items-center justify-between bg-card border border-border rounded-sm px-4 py-3">
          <span className="text-destructive font-body text-sm font-medium">{e.keyword}</span>
          <span className="text-muted-foreground text-xs">{e.age_group || "—"}</span>
          <span className="text-muted-foreground text-xs">{new Date(e.routed_at).toLocaleString()}</span>
        </div>
      ))}
      {events.length === 0 && <p className="text-muted-foreground text-sm italic">No crisis events recorded.</p>}
    </div>
  );
}

// ─── System Prompt ─────────────────────────────
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
        <input placeholder="Version (e.g. v2.1)" value={newVersion} onChange={(e) => setNewVersion(e.target.value)}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground w-full placeholder:text-muted-foreground" />
        <textarea placeholder='Content as JSON' value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={6}
          className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground w-full placeholder:text-muted-foreground font-mono resize-none" />
        <button onClick={createPrompt}
          className="bg-gold text-primary-foreground font-serif text-xs uppercase tracking-widest px-6 py-2 rounded-sm hover:bg-gold-light transition-colors">
          Save Version
        </button>
      </div>
      <div className="space-y-3">
        {prompts.map((p) => (
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

// ─── Settings ─────────────────────────────
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
          <input placeholder="Key" value={newKey} onChange={(e) => setNewKey(e.target.value)}
            className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground flex-1 placeholder:text-muted-foreground" />
          <input placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)}
            className="bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground flex-1 placeholder:text-muted-foreground" />
          <button onClick={saveConfig}
            className="bg-gold text-primary-foreground font-serif text-xs uppercase tracking-widest px-6 py-2 rounded-sm hover:bg-gold-light transition-colors whitespace-nowrap">Save</button>
        </div>
      </div>
      <div className="space-y-2">
        {configs.map((c) => (
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

// ─── Main Admin Page ─────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, role, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/", { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const tabContent: Record<AdminTab, JSX.Element> = {
    dashboard: <DashboardTab />,
    users: <UsersTab callerRole={role} onEditUser={(id) => setEditingUserId(id)} />,
    subscriptions: <SubscriptionsTab />,
    monitor: <MonitorTab />,
    flagged: <FlaggedTab />,
    crisis: <CrisisTab />,
    prompts: <PromptsTab />,
    settings: <SettingsTab />,
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="font-serif text-xl text-gold tracking-widest">DABAR</h1>
          <p className="text-muted-foreground text-xs font-body mt-1">Admin Console</p>
        </div>
        <nav className="flex-1 py-4">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-body transition-colors ${
                activeTab === t.id ? "text-gold bg-secondary border-r-2 border-gold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
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
          <h2 className="font-serif text-2xl text-foreground tracking-wide mb-6">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
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
