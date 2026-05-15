import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = ["account", "technical", "content", "billing", "other"];

const SupportPage = () => {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_requests").insert({
        email,
        category,
        subject,
        message,
        user_id: user?.id ?? null,
      });

      if (error) throw error;

      toast.success("Support request sent.");
      setEmail("");
      setSubject("");
      setMessage("");
      setCategory("account");
    } catch (err: any) {
      toast.error(err.message || "Could not send your request. Email support@dabarbible.com.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <a href="/" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
        Back to DABAR
      </a>

      <section className="mt-10 mb-10">
        <p className="font-serif text-4xl text-foreground tracking-wide mb-3">Support</p>
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          Need help with your account, Scripture study, privacy settings, or a technical issue?
          Send a note here or email{" "}
          <a href="mailto:support@dabarbible.com" className="text-gold hover:underline">
            support@dabarbible.com
          </a>.
        </p>
      </section>

      <section className="grid gap-4 mb-10">
        {[
          ["How quickly do you respond?", "Most support requests receive a reply within 1-2 business days."],
          ["Can I delete my account?", "Yes. Open Privacy & Data settings in the app to export or delete your data."],
          ["What if an AI response seems wrong?", "Use the feedback controls in the app or contact support. Theological concerns are reviewed carefully."],
        ].map(([question, answer]) => (
          <div key={question} className="border border-border rounded-sm p-4">
            <p className="font-serif text-base text-foreground mb-2">{question}</p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">{answer}</p>
          </div>
        ))}
      </section>

      <form onSubmit={submitRequest} className="space-y-4 border-t border-border pt-8">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          className="w-full bg-card border border-border rounded-sm px-4 py-3 font-body text-sm outline-none focus:border-gold"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full bg-card border border-border rounded-sm px-4 py-3 font-body text-sm outline-none focus:border-gold"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Subject"
          required
          className="w-full bg-card border border-border rounded-sm px-4 py-3 font-body text-sm outline-none focus:border-gold"
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="How can we help?"
          required
          rows={6}
          className="w-full bg-card border border-border rounded-sm px-4 py-3 font-body text-sm outline-none focus:border-gold resize-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send support request"}
        </button>
      </form>
    </main>
  );
};

export default SupportPage;
