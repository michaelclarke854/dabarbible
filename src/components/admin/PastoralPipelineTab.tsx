import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Lead = {
  id: string;
  name: string;
  email: string;
  church_name: string | null;
  city: string | null;
  state: string | null;
  denomination: string | null;
  church_size: string | null;
  status: string;
  reply_received: boolean | null;
  last_contacted_at: string | null;
  next_contact_at: string | null;
  created_at: string;
};

const STATUSES = ["identified", "emailed", "replied", "using", "endorsed", "referring"];

export default function PastoralPipelineTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    church_name: "",
    city: "",
    state: "",
    denomination: "",
    church_size: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pastoral_leads" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setLeads((data as unknown as Lead[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const addLead = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("pastoral-outreach", {
      body: { action: "add_lead", ...form },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lead added");
    setForm({ name: "", email: "", church_name: "", city: "", state: "", denomination: "", church_size: "" });
    fetchLeads();
  };

  const markReplied = async (lead_id: string) => {
    const { error } = await supabase.functions.invoke("pastoral-outreach", {
      body: { action: "mark_replied", lead_id },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as replied");
    fetchLeads();
  };

  const runCadence = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("pastoral-outreach", {
      body: { action: "run_cadence" },
    });
    setRunning(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Cadence run — sent ${(data as { sent?: number })?.sent ?? 0}`);
    fetchLeads();
  };

  // Stats
  const total = leads.length;
  const weekAgo = Date.now() - 7 * 86400_000;
  const sentThisWeek = leads.filter(
    (l) => l.last_contacted_at && new Date(l.last_contacted_at).getTime() >= weekAgo,
  ).length;
  const replied = leads.filter((l) => l.reply_received).length;
  const using = leads.filter((l) => ["using", "endorsed", "referring"].includes(l.status)).length;
  const replyRate = total ? Math.round((replied / total) * 100) : 0;

  const grouped: Record<string, Lead[]> = {};
  for (const s of STATUSES) grouped[s] = [];
  for (const l of leads) {
    if (l.status in grouped) grouped[l.status].push(l);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total leads", value: total },
          { label: "Sent this week", value: sentThisWeek },
          { label: "Reply rate", value: `${replyRate}%` },
          { label: "Using DABAR", value: using },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-sm p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-body">{s.label}</p>
            <p className="text-2xl font-serif text-foreground mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add lead */}
      <div className="bg-card border border-border rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-foreground">Add pastoral lead</h3>
          <Button onClick={runCadence} disabled={running} variant="outline" size="sm">
            {running ? "Running…" : "Run cadence now"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Church name" value={form.church_name} onChange={(e) => setForm({ ...form, church_name: e.target.value })} />
          <Input placeholder="Denomination" value={form.denomination} onChange={(e) => setForm({ ...form, denomination: e.target.value })} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input placeholder="Church size (small/medium/large)" value={form.church_size} onChange={(e) => setForm({ ...form, church_size: e.target.value })} />
        </div>
        <Button onClick={addLead} disabled={submitting} className="mt-4">
          {submitting ? "Adding…" : "Add lead (contact immediately)"}
        </Button>
      </div>

      {/* Pipeline */}
      <div>
        <h3 className="font-serif text-foreground mb-3">Pipeline</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STATUSES.map((status) => (
              <div key={status} className="bg-card border border-border rounded-sm p-3 min-h-[120px]">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-body mb-2">
                  {status} ({grouped[status].length})
                </p>
                <div className="space-y-2">
                  {grouped[status].map((l) => (
                    <div key={l.id} className="border border-border rounded-sm p-2 text-xs">
                      <p className="font-medium text-foreground">{l.name}</p>
                      <p className="text-muted-foreground truncate">{l.email}</p>
                      {l.church_name && <p className="text-muted-foreground truncate">{l.church_name}</p>}
                      {!l.reply_received && (status === "emailed" || status === "identified") && (
                        <button
                          onClick={() => markReplied(l.id)}
                          className="mt-2 text-gold hover:underline"
                        >
                          Mark replied
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}