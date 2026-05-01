import { Flame, Lock, Cross } from "lucide-react";

export function TrustStrip() {
  return (
    <div
      className="flex items-center justify-center gap-5 mt-6"
      style={{
        animation: "dabar-fadeup 0.6s ease 1s forwards",
        opacity: 0,
      }}
    >
      {[
        { icon: Flame, label: "Scripture-grounded" },
        { icon: Lock, label: "Private by default" },
        { icon: Cross, label: "Built by a Christian" },
      ].map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <Icon size={12} color="rgba(184,145,58,0.45)" strokeWidth={1.5} />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9.5px",
              fontWeight: 300,
              color: "rgba(240,234,216,0.4)",
              letterSpacing: "0.03em",
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}