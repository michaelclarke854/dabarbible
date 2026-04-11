import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedUp?: () => void;
  message?: string;
}

const AuthModal = ({ isOpen, onClose, onSignedUp, message }: AuthModalProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [dobError, setDobError] = useState("");

  if (!isOpen) return null;

  const parseDob = (): Date | null => {
    const m = parseInt(dobMonth, 10);
    const d = parseInt(dobDay, 10);
    const y = parseInt(dobYear, 10);
    if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) {
      return null;
    }
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    if (date > new Date()) return null;
    return date;
  };

  const getAgeYears = (dob: Date): number => {
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDobError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const dob = parseDob();
        if (!dob) {
          setDobError("Please enter a valid date of birth.");
          setLoading(false);
          return;
        }

        const age = getAgeYears(dob);
        if (age < 13) {
          setDobError("You must be at least 13 years old to use The Voice. Please ask a parent or guardian for guidance.");
          setLoading(false);
          return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        // Update profile with DOB after signup
        if (signUpData.user) {
          const dobString = `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;
          const ageGroup = age < 13 ? "minor" : age <= 17 ? "youth" : age <= 22 ? "young_adult" : "adult";

          // Use service-role via edge function or direct update
          await supabase
            .from("profiles" as any)
            .update({ date_of_birth: dobString, age_group: ageGroup } as any)
            .eq("user_id", signUpData.user.id);
        }

        toast.success("Check your email to confirm your account.");
        onSignedUp?.();
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back.");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  };

  const inputClass = "w-full bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors";
  const dobInputClass = "bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors text-center";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-6">
      <div className="bg-parchment rounded-sm shadow-xl max-w-sm w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg"
        >
          ×
        </button>

        {message && (
          <p className="font-serif text-sm text-foreground/80 text-center mb-6 leading-relaxed">
            {message}
          </p>
        )}

        <h3 className="font-serif text-xl text-center mb-6 tracking-wide">
          {mode === "signup" ? "Create Account" : "Sign In"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className={inputClass}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className={inputClass}
          />

          {mode === "signup" && (
            <div className="pt-2">
              <label className="block text-xs font-body text-foreground/70 mb-2">
                Your date of birth
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={dobMonth}
                  onChange={(e) => setDobMonth(e.target.value.replace(/\D/g, ""))}
                  placeholder="MM"
                  required
                  className={`${dobInputClass} w-16`}
                />
                <span className="text-muted-foreground self-end pb-2">/</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={dobDay}
                  onChange={(e) => setDobDay(e.target.value.replace(/\D/g, ""))}
                  placeholder="DD"
                  required
                  className={`${dobInputClass} w-16`}
                />
                <span className="text-muted-foreground self-end pb-2">/</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={dobYear}
                  onChange={(e) => setDobYear(e.target.value.replace(/\D/g, ""))}
                  placeholder="YYYY"
                  required
                  className={`${dobInputClass} w-20`}
                />
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2 font-body">
                So your experience feels right for where you are in life.
              </p>
              {dobError && (
                <p className="text-xs text-destructive mt-1 font-body">{dobError}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
          >
            {loading ? "…" : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-body">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full font-body text-sm py-3 border border-border rounded-sm hover:border-gold transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center mt-6 text-xs font-body text-muted-foreground">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-gold hover:underline">
                Sign in
              </button>
            </>
          ) : (
            <>
              Need an account?{" "}
              <button onClick={() => setMode("signup")} className="text-gold hover:underline">
                Create one
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
