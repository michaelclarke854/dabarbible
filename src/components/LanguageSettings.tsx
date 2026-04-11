import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Check, ChevronLeft } from "lucide-react";

interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  available: boolean;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", available: true },
  { code: "es", label: "Spanish", nativeLabel: "Español", available: false },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", available: false },
  { code: "ko", label: "Korean", nativeLabel: "한국어", available: false },
  { code: "fr", label: "French", nativeLabel: "Français", available: false },
];

interface LanguageSettingsProps {
  userId: string;
  currentLanguage: string;
  onLanguageChanged: (lang: string) => void;
  onBack: () => void;
}

const LanguageSettings = ({
  userId,
  currentLanguage,
  onLanguageChanged,
  onBack,
}: LanguageSettingsProps) => {
  const [waitlistLang, setWaitlistLang] = useState<string | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedLanguages, setJoinedLanguages] = useState<string[]>([]);

  const handleSelect = async (lang: LanguageOption) => {
    if (lang.available) {
      // Set language preference
      await supabase
        .from("profiles")
        .update({ language_preference: lang.code })
        .eq("user_id", userId);
      onLanguageChanged(lang.code);
      toast.success("Language updated.");
    } else {
      setWaitlistLang(lang.code);
      setWaitlistEmail("");
    }
  };

  const handleWaitlistSubmit = async () => {
    if (!waitlistEmail.trim() || !waitlistLang) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("language_waitlist").insert({
        email: waitlistEmail.trim(),
        language_code: waitlistLang,
      });
      if (error && error.code === "23505") {
        toast.info("You're already on this list. We'll reach out soon.");
      } else if (error) {
        throw error;
      } else {
        toast.success("You'll be the first to know.");
      }
      setJoinedLanguages((prev) => [...prev, waitlistLang]);
      setWaitlistLang(null);
    } catch {
      toast.error("Could not join waitlist. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedComingSoon = LANGUAGES.find((l) => l.code === waitlistLang);

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-12 max-w-lg mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ChevronLeft size={16} />
        <span className="font-body text-sm">Back</span>
      </button>

      <div className="flex items-center gap-3 mb-8">
        <Globe size={20} className="text-gold" />
        <h2 className="font-serif text-xl tracking-wide text-foreground">Language</h2>
      </div>

      <div className="space-y-2">
        {LANGUAGES.map((lang) => {
          const isActive = lang.available && currentLanguage === lang.code;
          const hasJoined = joinedLanguages.includes(lang.code);

          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang)}
              className={`w-full text-left px-4 py-4 rounded-sm border transition-all ${
                isActive
                  ? "border-gold bg-gold/5"
                  : lang.available
                  ? "border-border hover:border-gold/40"
                  : "border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-serif text-base text-foreground">
                    {lang.nativeLabel}
                  </span>
                  {lang.nativeLabel !== lang.label && (
                    <span className="font-body text-sm text-muted-foreground ml-2">
                      {lang.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isActive && <Check size={16} className="text-gold" />}
                  {!lang.available && !hasJoined && (
                    <span className="font-body text-[10px] tracking-wider uppercase text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                  {!lang.available && hasJoined && (
                    <span className="font-body text-[10px] tracking-wider uppercase text-gold">
                      Notified
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Waitlist modal */}
      {waitlistLang && selectedComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm px-6">
          <div className="bg-parchment border border-border rounded-sm p-8 max-w-sm w-full shadow-xl">
            <p className="font-serif text-lg text-foreground leading-relaxed mb-2">
              We're bringing Dabar to{" "}
              <span className="text-gold">{selectedComingSoon.nativeLabel}</span> soon.
            </p>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Want to be first to know?
            </p>

            <input
              type="email"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-transparent border border-border rounded-sm px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleWaitlistSubmit();
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={handleWaitlistSubmit}
                disabled={!waitlistEmail.trim() || isSubmitting}
                className="flex-1 font-serif tracking-widest text-xs uppercase px-6 py-3 bg-gold text-primary-foreground rounded-sm transition-all disabled:opacity-40"
              >
                {isSubmitting ? "Joining…" : "Notify me"}
              </button>
              <button
                onClick={() => setWaitlistLang(null)}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSettings;
