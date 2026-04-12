import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AgeGateScreen = () => {
  const currentYear = new Date().getFullYear();
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, clearAgeGate } = useAuth();

  const deriveAgeGroup = (year: number, month: number): string => {
    const ageMonths =
      (new Date().getFullYear() - year) * 12 +
      (new Date().getMonth() + 1 - month);
    const age = ageMonths / 12;
    if (age < 13) return "blocked";
    if (age < 18) return "youth";
    if (age < 25) return "young_adult";
    return "adult";
  };

  const handleSubmit = async () => {
    if (!birthYear || !birthMonth) {
      setError("Please select both your birth year and month.");
      return;
    }
    const ageGroup = deriveAgeGroup(parseInt(birthYear), parseInt(birthMonth));
    if (ageGroup === "blocked") {
      setError(
        "Dabar is designed for ages 13 and up. Ask a parent or guardian to create a Family Account."
      );
      return;
    }
    setLoading(true);
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ age_group: ageGroup })
      .eq("user_id", user!.id);
    setLoading(false);
    if (dbError) {
      setError(
        dbError.message.includes("13 or older")
          ? "You must be 13 or older to use Dabar."
          : "Something went wrong. Please try again."
      );
      return;
    }
    clearAgeGate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-sm w-full text-center">
        <h2 className="font-serif text-2xl tracking-wide text-foreground mb-4">
          One quick thing
        </h2>

        <p className="font-body text-sm text-foreground/80 leading-relaxed mb-2">
          To personalise your experience and ensure age-appropriate content, we
          need to know your approximate age.
        </p>

        <p className="font-body text-xs text-muted-foreground mb-6">
          We store only your age group — not your exact birthdate.
        </p>

        <div className="flex gap-3 mb-4">
          <select
            value={birthMonth}
            onChange={(e) => {
              setBirthMonth(e.target.value);
              setError("");
            }}
            className="flex-1 bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors"
          >
            <option value="">Month</option>
            {[
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December",
            ].map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={birthYear}
            onChange={(e) => {
              setBirthYear(e.target.value);
              setError("");
            }}
            className="flex-1 bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors"
          >
            <option value="">Year</option>
            {Array.from({ length: 100 }, (_, i) => currentYear - 13 - i).map(
              (y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              )
            )}
          </select>
        </div>

        {error && (
          <p className="text-xs text-destructive font-body mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50 mb-4"
        >
          {loading ? "Saving…" : "Continue"}
        </button>

        <p className="text-xs font-body text-muted-foreground">
          Wrong account?{" "}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-muted-foreground hover:text-foreground underline text-xs bg-transparent border-none cursor-pointer"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
};

export default AgeGateScreen;
