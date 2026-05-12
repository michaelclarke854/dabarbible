import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SUPPORT_EMAIL = "support@dabarbible.com";

type Category = "billing" | "technical" | "content" | "account" | "other";

export default function SupportPage() {
  const { user, userEmail } = useAuth();
  const [form, setForm] = useState({
    email: userEmail ?? "",
    subject: "",
    message: "",
    category: "technical" as Category,
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.from("support_requests").insert({
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      category: form.category,
      user_id: user?.id ?? null,
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="font-body text-xs text-gold/70 hover:text-gold tracking-widest uppercase">
          ← Back to Dabar
        </Link>

        <h1 className="font-serif text-4xl tracking-wide mt-8 mb-3">Support</h1>
        <p className="font-body text-foreground/70 leading-relaxed mb-12">
          We're here to help. Email us, browse the questions below, or send a request.
        </p>

        <section className="mb-12">
          <h2 className="font-serif text-xl tracking-wide mb-3">Contact</h2>
          <p className="font-body text-sm text-foreground/80">
            Email:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gold hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            We respond within one business day.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-serif text-xl tracking-wide mb-4">Frequently Asked Questions</h2>
          <dl className="space-y-6">
            <div>
              <dt className="font-serif text-base text-foreground mb-1">How do I cancel my subscription?</dt>
              <dd className="font-body text-sm text-foreground/70 leading-relaxed">
                On iPhone: open <span className="text-foreground">Settings → your name → Subscriptions → DABAR</span> and tap Cancel.
                If you subscribed on the web: sign in and open Settings → Manage Subscription.
              </dd>
            </div>
            <div>
              <dt className="font-serif text-base text-foreground mb-1">How do I delete my account?</dt>
              <dd className="font-body text-sm text-foreground/70 leading-relaxed">
                In the app, open Settings → Account → Delete Account. All your data is removed within 30 days.
              </dd>
            </div>
            <div>
              <dt className="font-serif text-base text-foreground mb-1">What translations does Dabar support?</dt>
              <dd className="font-body text-sm text-foreground/70 leading-relaxed">
                Currently the King James Version (KJV). Additional translations are on the roadmap.
              </dd>
            </div>
            <div>
              <dt className="font-serif text-base text-foreground mb-1">Why does Dabar sometimes redirect me to crisis resources?</dt>
              <dd className="font-body text-sm text-foreground/70 leading-relaxed">
                Dabar includes a safety layer: when a question references self-harm or crisis topics,
                we redirect to professional resources rather than generate a theological response.
                This is intentional and cannot be disabled.
              </dd>
            </div>
            <div>
              <dt className="font-serif text-base text-foreground mb-1">Is my reflection data private?</dt>
              <dd className="font-body text-sm text-foreground/70 leading-relaxed">
                Yes. Your reflections are encrypted at rest and never sold or shared with advertisers.
                See our <Link to="/privacy" className="text-gold hover:underline">Privacy Policy</Link>.
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="font-serif text-xl tracking-wide mb-4">Send a Request</h2>
          {status === "sent" ? (
            <div className="bg-card border border-border rounded-sm p-6">
              <p className="font-body text-sm text-foreground/80">
                Thanks — we got your message. We'll reply within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-body text-xs text-foreground/70 mb-1 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 font-body text-sm text-foreground focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="block font-body text-xs text-foreground/70 mb-1 uppercase tracking-wider">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 font-body text-sm text-foreground focus:border-gold outline-none"
                >
                  <option value="billing">Billing</option>
                  <option value="technical">Technical Issue</option>
                  <option value="content">Content / Theology</option>
                  <option value="account">Account</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-body text-xs text-foreground/70 mb-1 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 font-body text-sm text-foreground focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="block font-body text-xs text-foreground/70 mb-1 uppercase tracking-wider">Message</label>
                <textarea
                  required
                  rows={6}
                  maxLength={4000}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-card border border-border rounded-sm px-3 py-2 font-body text-sm text-foreground focus:border-gold outline-none"
                />
              </div>
              {status === "error" && (
                <p className="text-destructive text-xs font-body">Error: {errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="font-serif text-sm tracking-widest uppercase py-3 px-8 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send Request"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}