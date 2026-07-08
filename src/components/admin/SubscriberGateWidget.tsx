import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GateConfig {
  current: number;
  target: number;
  deadline: string;
  status: string;
  faithToolsSubmitted: boolean;
  griefCommunityPitched: boolean;
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-body">
      <span className={done ? "text-green-500" : "text-muted-foreground"}>
        {done ? "✓" : "○"}
      </span>
      <span className={done ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

export function SubscriberGateWidget() {
  const [gate, setGate] = useState<GateConfig | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", [
          "dabar_paid_subscriber_gate",
          "dabar_gate_deadline",
          "dabar_gate_status",
          "dabar_faith_tools_submitted",
          "dabar_grief_community_pitched",
        ]);

      if (!data) return;
      const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));

      // Live count of paid subscribers (Paddle-synced via profiles.plan)
      const { count: paidCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("plan", ["personal", "family", "community"]);

      setGate({
        current: paidCount ?? 0,
        target: Number(map.dabar_paid_subscriber_gate ?? 50),
        deadline: String(map.dabar_gate_deadline ?? "2026-07-31"),
        status: String(map.dabar_gate_status ?? "active"),
        faithToolsSubmitted: map.dabar_faith_tools_submitted === "true",
        griefCommunityPitched: map.dabar_grief_community_pitched === "true",
      });
    }
    load();
  }, []);

  if (!gate) return null;

  const pct = Math.min(100, Math.round((gate.current / gate.target) * 100));
  const daysLeft = Math.ceil(
    (new Date(gate.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isAtRisk = daysLeft < 45 && pct < 50;

  return (
    <div className={`border rounded-sm p-5 mb-6 ${isAtRisk ? "border-red-500/50 bg-red-500/5" : "border-gold/30 bg-gold/5"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-serif text-gold text-sm uppercase tracking-widest">
            DABAR Subscriber Gate
          </h3>
          <p className="text-muted-foreground text-xs font-body mt-1">
            {gate.current} / {gate.target} paid · deadline {gate.deadline}
          </p>
        </div>
        <span className={`text-xs font-mono px-2 py-1 rounded ${
          isAtRisk ? "bg-red-500/20 text-red-400" : "bg-gold/20 text-gold"
        }`}>
          {daysLeft}d left
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-border rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isAtRisk ? "hsl(var(--destructive))" : "hsl(var(--gold))",
          }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        <CheckItem done={gate.faithToolsSubmitted} label="faith.tools listing submitted" />
        <CheckItem done={gate.griefCommunityPitched} label="Grief community partnership pitched" />
        <CheckItem done={pct >= 100} label="50 paid subscribers reached" />
      </div>

      {isAtRisk && (
        <p className="text-red-400 text-xs font-body mt-4 leading-relaxed">
          ⚠ At risk — gate not met by deadline = maintenance mode, 100% focus to CodeCity.
        </p>
      )}
    </div>
  );
}

export default SubscriberGateWidget;