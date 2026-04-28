import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DENOMINATIONS = [
  "Evangelical", "Baptist", "Methodist", "Pentecostal",
  "Catholic", "Anglican", "Presbyterian", "Other",
];
const SIZES = ["Under 50", "50–150", "150–500", "500+"];

export default function PastoralAccessPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    pastor_name: "",
    church_name: "",
    email: "",
    denomination: "",
    church_size: "",
    country: "",
    how_heard: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pastor_name.trim() || !form.church_name.trim() || !form.email.trim()) {
      toast.error("Please fill in your name, church, and email.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("pastoral_access_applications").insert({
      pastor_name: form.pastor_name.trim(),
      church_name: form.church_name.trim(),
      email: form.email.trim().toLowerCase(),
      denomination: form.denomination || null,
      church_size: form.church_size || null,
      country: form.country.trim() || null,
      how_heard: form.how_heard.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("An application with this email already exists.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center space-y-6">
          <h1 className="font-serif-display text-3xl md:text-4xl text-gold">
            Thank you, {form.pastor_name.split(" ")[0]}.
          </h1>
          <p className="text-foreground/80 leading-relaxed font-body">
            We'll review your application and send you access within 24 hours —
            usually sooner. In the meantime, you're welcome to explore DABAR as a personal user.
          </p>
          <Link
            to="/"
            className="inline-block text-gold hover:text-gold-light underline underline-offset-4"
          >
            Return to DABAR
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-16 md:py-24">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold/80 font-body">
            Pastoral Access
          </p>
          <h1 className="font-serif-display text-3xl md:text-5xl text-foreground leading-tight">
            Scripture wisdom for your congregation —{" "}
            <span className="text-gold">a pastoral gift</span>
          </h1>
          <p className="text-foreground/75 leading-relaxed font-body max-w-xl mx-auto pt-2">
            DABAR is a daily Biblical reflection practice. Your congregation asks any
            question on their heart and receives scripture-grounded wisdom. You see
            their collective spiritual pulse each week and send a pastoral word — which
            DABAR helps you draft. Free for 90 days for verified pastors. No credit card.
            No strings.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="bg-card border border-border rounded-sm p-6 md:p-8 space-y-5"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pastor_name">Your name</Label>
              <Input
                id="pastor_name"
                value={form.pastor_name}
                onChange={(e) => update("pastor_name", e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="church_name">Your church</Label>
              <Input
                id="church_name"
                value={form.church_name}
                onChange={(e) => update("church_name", e.target.value)}
                maxLength={200}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Your email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              maxLength={320}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Denomination</Label>
              <Select value={form.denomination} onValueChange={(v) => update("denomination", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DENOMINATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Congregation size</Label>
              <Select value={form.church_size} onValueChange={(v) => update("church_size", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="how_heard">How did you hear about DABAR? (optional)</Label>
            <Textarea
              id="how_heard"
              value={form.how_heard}
              onChange={(e) => update("how_heard", e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending…" : "Apply for pastoral access"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground font-body">
          We'll respond personally within 24 hours.
        </p>
      </div>
    </main>
  );
}