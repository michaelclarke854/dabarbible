import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const congregationSizes = [
  "Under 50",
  "50–150",
  "150–500",
  "500–2,000",
  "2,000+",
];

const ForPastorsPage = () => {
  const [name, setName] = useState("");
  const [churchName, setChurchName] = useState("");
  const [email, setEmail] = useState("");
  const [size, setSize] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "For pastors — Dabar";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !churchName.trim() || !email.trim()) {
      toast.error("Please fill in your name, church, and email.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("pastoral_inquiries").insert({
        name: name.trim(),
        church_name: churchName.trim(),
        email: email.trim(),
        congregation_size: size || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Thank you — we'll be in touch within 2 business days.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please email pastors@dabarbible.com directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="font-body text-sm text-gold/70 hover:text-gold transition-colors">
          ← Back to Dabar
        </Link>

        <h1 className="font-serif text-3xl md:text-4xl text-foreground tracking-wide mt-10 mb-4">
          Equip your congregation with biblical wisdom
        </h1>
        <p className="font-['Playfair_Display'] italic text-muted-foreground text-base mb-10 leading-relaxed">
          A reflective companion for the moments between Sundays — anchored in Scripture, never replacing the local church.
        </p>

        <div className="space-y-8 font-body text-foreground/90 leading-relaxed mb-12">
          <div>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-2">Personal devotion</h2>
            <p>For members wrestling with grief, decisions, or doubt at 2am — Dabar surfaces relevant Scripture and a reflective question, then sends them back to community.</p>
          </div>
          <div>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-2">Small group preparation</h2>
            <p>Leaders use Dabar to surface unexpected cross-references and reflective questions before group meetings.</p>
          </div>
          <div>
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest mb-2">Youth ministry</h2>
            <p>An age-aware response layer routes crisis-flagged questions (suicide, self-harm, abuse) to professional resources before any reflection.</p>
          </div>
        </div>

        <div className="border border-gold/20 rounded-sm p-6 md:p-8 bg-scripture-card">
          <h2 className="font-serif text-xl text-gold tracking-wide mb-2">
            Complimentary 6-month family plan
          </h2>
          <p className="font-body text-sm text-muted-foreground mb-6 leading-relaxed">
            Pastors who want to evaluate Dabar receive 6 months of family-tier access at no charge.
            No credit card. No obligation. We'll set up your account and answer any theological questions you have.
          </p>

          {submitted ? (
            <div className="text-center py-6">
              <p className="font-serif text-foreground text-lg mb-2">Thank you, Pastor.</p>
              <p className="font-body text-sm text-muted-foreground">
                We'll reach out within 2 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-body text-xs uppercase tracking-widest text-muted-foreground block mb-1">Your name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="font-body text-xs uppercase tracking-widest text-muted-foreground block mb-1">Church name</label>
                <input
                  required
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="font-body text-xs uppercase tracking-widest text-muted-foreground block mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="font-body text-xs uppercase tracking-widest text-muted-foreground block mb-1">Congregation size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:border-gold transition-colors"
                >
                  <option value="">Select…</option>
                  {congregationSizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-body text-xs uppercase tracking-widest text-muted-foreground block mb-1">Anything else? (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground outline-none focus:border-gold transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full font-serif tracking-widest text-sm uppercase px-6 py-3 rounded-sm bg-gold text-primary-foreground border border-gold/40 transition-all hover:shadow-[0_0_18px_rgba(196,151,58,0.35)] disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Request access"}
              </button>
              <p className="font-['Playfair_Display'] italic text-xs text-muted-foreground/70 text-center pt-2">
                Your congregation's questions are never shared, sold, or used to train AI models.
              </p>
            </form>
          )}
        </div>

        <p className="font-body text-xs text-muted-foreground text-center mt-10">
          See also: <Link to="/about-our-faith" className="text-gold hover:underline">Our statement of faith</Link>
        </p>
      </div>
    </div>
  );
};

export default ForPastorsPage;
