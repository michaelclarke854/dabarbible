import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedUp?: () => void;
  onDobSubmitted?: () => void;
  message?: string;
  dobOnly?: boolean;
  userId?: string;
}

const AuthModal = ({ isOpen, onClose, onSignedUp, onDobSubmitted, message, dobOnly, userId }: AuthModalProps) => {
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

  const getAgeGroup = (age: number) => {
    if (age < 13) return "minor";
    if (age <= 17) return "youth";
    if (age <= 22) return "young_adult";
    return "adult";
  };

  const handleDobSubmit = async () => {
    setDobError("");
    const dob = parseDob();
    if (!dob) {
      setDobError("Please enter a valid date of birth.");
      return;
    }
    const age = getAgeYears(dob);
    if (age < 13) {
      setDobError("Dabar is designed for ages 13 and up. Ask a parent or guardian to create a Family Account — they can set up access for you from their account.");
      return;
    }

    setLoading(true);
    try {
      const dobString = `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;
      const ageGroup = getAgeGroup(age);

      await supabase
        .from("profiles")
        .update({ date_of_birth: dobString, age_group: ageGroup })
        .eq("user_id", userId);

      toast.success("Thank you.");
      onDobSubmitted?.();
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
          setDobError("Dabar is designed for ages 13 and up. Ask a parent or guardian to create a Family Account — they can set up access for you from their account.");
          setLoading(false);
          return;
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        if (signUpData.user) {
          const dobString = `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;
          const ageGroup = getAgeGroup(age);

          await supabase
            .from("profiles")
            .update({ date_of_birth: dobString, age_group: ageGroup })
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message || "Google sign-in failed.");
    if (result.redirected) return;
  };

  const inputClass = "w-full bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors";
  const dobInputClass = "bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors text-center";

  const dobFields = (
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
  );

  // DOB-only mode for existing users (e.g. Google OAuth)
  if (dobOnly) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
        <div className="bg-card rounded-sm shadow-xl max-w-sm w-full p-8 relative border border-border">
          {message && (
            <p className="font-serif text-sm text-foreground/80 text-center mb-6 leading-relaxed">
              {message}
            </p>
          )}
          <h3 className="font-serif text-xl text-center mb-6 tracking-wide">
            One more thing
          </h3>
          {dobFields}
          <button
            onClick={handleDobSubmit}
            disabled={loading}
            className="w-full mt-6 font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
          >
            {loading ? "…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
        <div className="bg-card rounded-sm shadow-xl max-w-sm w-full p-8 relative max-h-[90vh] overflow-y-auto border border-border">
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

          {mode === "signup" && dobFields}

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
