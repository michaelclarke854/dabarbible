import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedUp?: () => void;
  message?: string;
}

const AuthModal = ({ isOpen, onClose, onSignedUp, message }: AuthModalProps) => {
  const { setPendingConfirmation } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [dobError, setDobError] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  if (!isOpen) return null;

  const getAgeFromYearMonth = (year: number, month: number): number => {
    const now = new Date();
    let age = now.getFullYear() - year;
    if (now.getMonth() + 1 < month) age--;
    return age;
  };

  const getAgeGroup = (age: number) => {
    if (age < 13) return "blocked";
    if (age <= 17) return "youth";
    if (age <= 22) return "young_adult";
    return "adult";
  };

  const validateDob = (): { ageGroup: string; age: number } | null => {
    const m = parseInt(dobMonth, 10);
    const y = parseInt(dobYear, 10);
    if (!m || !y || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
      setDobError("Please enter a valid birth year and month.");
      return null;
    }
    const age = getAgeFromYearMonth(y, m);
    const ageGroup = getAgeGroup(age);
    if (ageGroup === "blocked") {
      setDobError("Dabar is designed for ages 13 and up. Ask a parent or guardian to create a Family Account — they can set up access for you from their account.");
      return null;
    }
    return { ageGroup, age };
  };

  const handleDobSubmit = async () => {
    setDobError("");
    const result = validateDob();
    if (!result) return;

    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({ age_group: result.ageGroup })
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!email.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.message || "Something went wrong.");
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
        const result = validateDob();
        if (!result) {
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { age_group: result.ageGroup },
          },
        });
        if (error) throw error;

        toast.success("Check your email to confirm your account.");
        setPendingConfirmation(email);
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
    setOauthLoading(true);
    setOauthError(null);

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      setOauthLoading(false);
      setOauthError(`Google sign-in failed: ${result.error.message || "Unknown error"}. Please try email instead.`);
      return;
    }

    if (!result.redirected) {
      setOauthLoading(false);
      setOauthError("Google sign-in could not complete. Please try again or use email.");
      return;
    }
    // Redirect in progress — loading persists until return
  };

  const inputClass = "w-full bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors";

  const dobFields = (
    <div className="pt-2">
      <label className="block text-xs font-body text-foreground/70 mb-1">
        {dobOnly
          ? "To personalize your experience and ensure age-appropriate content, we ask for your approximate age. We store only your age group, not your exact birthdate."
          : "Your birth year and month"}
      </label>
      <div className="flex gap-3">
        <select
          value={dobMonth}
          onChange={(e) => setDobMonth(e.target.value)}
          className="bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors flex-1"
        >
          <option value="">Month</option>
          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
            <option key={m} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={dobYear}
          onChange={(e) => setDobYear(e.target.value.replace(/\D/g, ""))}
          placeholder="Year"
          required
          className="bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors text-center w-24"
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

  // Forgot password mode
  if (mode === "forgot") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
        <div className="bg-card rounded-sm shadow-xl max-w-sm w-full p-8 relative max-h-[90vh] overflow-y-auto border border-border">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg"
          >
            ×
          </button>

          <h3 className="font-serif text-xl text-center mb-6 tracking-wide">
            Reset Password
          </h3>

          {forgotSent ? (
            <div className="text-center">
              <p className="font-body text-sm text-foreground/80 leading-relaxed mb-6">
                We sent a reset link to <span className="text-gold">{email}</span>. Check your inbox.
              </p>
              <button
                onClick={() => { setMode("signin"); setForgotSent(false); }}
                className="text-gold hover:underline text-sm font-body"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="font-body text-sm text-foreground/70 leading-relaxed">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className={inputClass}
              />
              {forgotError && (
                <p className="text-xs text-destructive font-body">{forgotError}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
              >
                {loading ? "…" : "Send reset link"}
              </button>
              <p className="text-center text-xs font-body text-muted-foreground">
                <button onClick={() => setMode("signin")} className="text-gold hover:underline">
                  Back to sign in
                </button>
              </p>
            </form>
          )}
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

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-xs font-body text-muted-foreground hover:text-gold transition-colors"
            >
              Forgot password?
            </button>
          )}

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
          disabled={oauthLoading}
          className="w-full font-body text-sm py-3 border border-border rounded-sm hover:border-gold transition-colors disabled:opacity-50"
        >
          {oauthLoading ? "Connecting…" : "Continue with Google"}
        </button>

        {oauthError && (
          <p className="text-xs text-destructive font-body mt-2 text-center">{oauthError}</p>
        )}

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
