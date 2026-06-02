import { useState, useEffect, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { isIOSNative, isNative } from "@/lib/platform";
import { signInWithAppleNative, recordAuthError, getLastAuthError } from "@/lib/nativeAuth";
import { Capacitor } from "@capacitor/core";
import { trackEvent } from "@/lib/trackEvent";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedUp?: () => void;
  message?: string;
  defaultMode?: "signin" | "signup";
}

const RETURNING_USER_KEY = "dabar_has_signed_up";

const AuthModal = forwardRef<HTMLDivElement, AuthModalProps>(({ isOpen, onClose, onSignedUp, message, defaultMode }, _ref) => {
  const { setPendingConfirmation } = useAuth();

  // Returning users see Sign In first; new users see Create Account.
  const initialMode: "signin" | "signup" =
    defaultMode ?? (typeof window !== "undefined" && localStorage.getItem(RETURNING_USER_KEY) ? "signin" : "signup");

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
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
  // Reviewer bypass (hidden — revealed by tapping the title 5 times)
  const [titleTaps, setTitleTaps] = useState(0);
  const [showReviewer, setShowReviewer] = useState(false);
  const [reviewerCode, setReviewerCode] = useState("");
  const [reviewerError, setReviewerError] = useState("");
  const [reviewerLoading, setReviewerLoading] = useState(false);
  const nativeIOS = isIOSNative();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagHealth, setDiagHealth] = useState<string>("(not checked)");

  // Re-evaluate initial mode whenever the modal re-opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode ?? (localStorage.getItem(RETURNING_USER_KEY) ? "signin" : "signup"));
      setOauthError(null);
      setOauthLoading(false);
      setTitleTaps(0);
      setShowReviewer(false);
      setReviewerCode("");
      setReviewerError("");
      setShowDiagnostics(false);
    }
  }, [isOpen, defaultMode]);

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


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!email.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const redirectBase = isNative() ? "https://dabarbible.com" : window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${redirectBase}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      recordAuthError(`forgot: ${err?.message || err}`);
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

        const redirectBase = isNative() ? "https://dabarbible.com" : window.location.origin;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${redirectBase}/auth/callback`,
            data: { age_group: result.ageGroup },
          },
        });
        if (error) throw error;

        // Mark this device as having attempted signup so future opens default to Sign In
        localStorage.setItem(RETURNING_USER_KEY, "1");

        trackEvent("signup_email_submitted", { metadata: { age_group: result.ageGroup } });

        toast.success("Check your email to confirm your account.");
        setPendingConfirmation(email);
        onSignedUp?.();
        onClose();
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        localStorage.setItem(RETURNING_USER_KEY, "1");
        trackEvent("signin_password_success", {
          userId: signInData?.user?.id ?? null,
        });

        // One-time hint if user also has a Google identity linked
        const identities = signInData?.user?.identities ?? [];
        const hasGoogle = identities.some((id: any) => id.provider === "google");
        if (hasGoogle) {
          const hintKey = `dabar_google_hint_shown_${signInData.user.id}`;
          if (!localStorage.getItem(hintKey)) {
            toast.info("You can also sign in with Google using this email address.");
            localStorage.setItem(hintKey, "1");
          }
        }

        toast.success("Welcome back.");
        onClose();
      }
    } catch (err: any) {
      recordAuthError(`${mode}: ${err?.message || err}`);
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    setOauthError(null);

    // Mark as returning so the next visit defaults to Sign In
    localStorage.setItem(RETURNING_USER_KEY, "1");
    trackEvent("oauth_start", { metadata: { provider: "google" } });

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });

    if (result.error) {
      setOauthLoading(false);
      trackEvent("oauth_failure", {
        metadata: { provider: "google", reason: result.error.message || "unknown" },
      });
      setOauthError(`Google sign-in failed: ${result.error.message || "Unknown error"}. Please try email instead.`);
      return;
    }

    if (!result.redirected) {
      setOauthLoading(false);
      trackEvent("oauth_failure", {
        metadata: { provider: "google", reason: "no_redirect" },
      });
      setOauthError("Google sign-in could not complete. Please try again or use email.");
      return;
    }
    // Redirect in progress — overlay persists until return
  };

  const handleApple = async () => {
    setOauthLoading(true);
    setOauthError(null);
    localStorage.setItem(RETURNING_USER_KEY, "1");
    trackEvent("oauth_start", { metadata: { provider: "apple" } });

    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });

    if (result.error) {
      setOauthLoading(false);
      trackEvent("oauth_failure", {
        metadata: { provider: "apple", reason: result.error.message || "unknown" },
      });
      setOauthError(`Apple sign-in failed: ${result.error.message || "Unknown error"}. Please try email instead.`);
      return;
    }

    if (!result.redirected) {
      setOauthLoading(false);
      trackEvent("oauth_failure", {
        metadata: { provider: "apple", reason: "no_redirect" },
      });
      setOauthError("Apple sign-in could not complete. Please try again or use email.");
      return;
    }
    // Redirect in progress
  };

  const handleTitleTap = () => {
    setTitleTaps((n) => {
      const next = n + 1;
      if (next >= 5) {
        setShowReviewer(true);
        return 0;
      }
      return next;
    });
  };

  const handleReviewerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewerError("");
    if (!reviewerCode.trim()) {
      setReviewerError("Enter a code.");
      return;
    }
    setReviewerLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reviewer-signin", {
        body: { code: reviewerCode.trim() },
      });
      if (error) throw error;
      const tokens = data as { access_token?: string; refresh_token?: string };
      if (!tokens?.access_token || !tokens?.refresh_token) {
        throw new Error("Invalid code");
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (setErr) throw setErr;
      localStorage.setItem(RETURNING_USER_KEY, "1");
      toast.success("Reviewer access granted.");
      onClose();
    } catch (err: any) {
      setReviewerError(err?.message || "Invalid code.");
    } finally {
      setReviewerLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,250,238,0.08)",
    borderWidth: "0.5px",
    borderStyle: "solid",
    borderColor: "rgba(255,250,238,0.25)",
    borderRadius: 8,
    padding: "11px 13px",
    color: "#e8dfc8",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 300,
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s ease, background-color 0.2s ease",
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.background = "rgba(255,250,238,0.12)";
    e.currentTarget.style.borderColor = "rgba(232,184,75,0.6)";
  };
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.background = "rgba(255,250,238,0.08)";
    e.currentTarget.style.borderColor = "rgba(255,250,238,0.25)";
  };

  const dobFields = (
    <div className="pt-2">
      <p className="text-xs font-body text-muted-foreground mb-2 leading-relaxed">
        We ask for your birth month and year so responses are appropriate for where you are in life. We never store your full date of birth.
      </p>
      <label className="block text-xs font-body text-foreground/70 mb-1">
        Your birth year and month
      </label>
      <div className="flex gap-3">
        <select
          value={dobMonth}
          onChange={(e) => setDobMonth(e.target.value)}
          disabled={oauthLoading}
          className="bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors flex-1 disabled:opacity-50"
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
          disabled={oauthLoading}
          className="bg-transparent border-b border-border pb-2 text-sm font-body outline-none focus:border-gold transition-colors text-center w-24 disabled:opacity-50"
        />
      </div>
      {dobError && (
        <p className="text-xs text-destructive mt-2 font-body">{dobError}</p>
      )}
    </div>
  );


  // Forgot password mode
  if (mode === "forgot") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: "rgba(10,8,5,0.85)", backdropFilter: "blur(4px)" }}>
        <div style={{ background: "#1a1410", border: "0.5px solid rgba(184,145,58,0.25)", borderRadius: 12, padding: "28px 24px", maxWidth: 400, width: "100%" }} className="relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg"
          >
            ×
          </button>

          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: "#f0ead8", textAlign: "center", marginBottom: 20, letterSpacing: "0.04em" }}>
            Reset Password
          </h3>

          {forgotSent ? (
            <div className="text-center space-y-5">
              <p className="font-body text-sm text-foreground/80 leading-relaxed">
                We sent a reset link to <span className="text-gold">{email}</span>. Check your inbox.
              </p>
              <button
                onClick={() => { setMode("signin"); setForgotSent(false); }}
                className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark"
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
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
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
                <button type="button" onClick={() => setMode("signin")} className="text-gold hover:underline">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: "rgba(10,8,5,0.85)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#1a1410", border: "0.5px solid rgba(184,145,58,0.25)", borderRadius: 12, padding: "28px 24px", maxWidth: 400, width: "100%" }} className="relative max-h-[90vh] overflow-y-auto">
        {/* Full-modal overlay during OAuth redirect */}
        {oauthLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm rounded-sm">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
            <p className="font-body text-sm text-foreground/80">Connecting to Google…</p>
          </div>
        )}

        <button
          onClick={onClose}
          disabled={oauthLoading}
          aria-label="Close"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg disabled:opacity-30"
        >
          ×
        </button>

        {message && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: "rgba(240,234,216,0.4)", textAlign: "center", marginBottom: 20, letterSpacing: "0.03em", lineHeight: 1.5 }}>
            {message}
          </p>
        )}

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: "rgba(240,234,216,0.4)", textAlign: "center", marginBottom: 4, letterSpacing: "0.03em", lineHeight: 1.5 }}>
          {nativeIOS
            ? "Your spiritual discernment companion — no payment required in this iOS version."
            : "Your spiritual discernment companion — 30 days free, no card needed."}
        </p>
        <h3 onClick={handleTitleTap} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: "#f0ead8", textAlign: "center", marginBottom: 20, letterSpacing: "0.04em", cursor: "default", userSelect: "none" }}>
          {mode === "signup" ? "Create Account" : "Sign In"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            disabled={oauthLoading}
            style={{ ...inputStyle, opacity: oauthLoading ? 0.5 : 1 }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"}
            required
            minLength={8}
            disabled={oauthLoading}
            style={{ ...inputStyle, opacity: oauthLoading ? 0.5 : 1 }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
            disabled={loading || oauthLoading}
            className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm transition-all hover:bg-gold-dark disabled:opacity-50"
          >
            {loading ? "…" : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        {!nativeIOS && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-body">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Apple Sign In — placed above Google per Apple HIG (App Store 4.8.0) */}
            <button
              onClick={handleApple}
              disabled={oauthLoading || loading}
              aria-label="Continue with Apple"
              className="w-full font-body text-sm py-3 mb-3 rounded-sm bg-[#0a0907] text-[#f0ead8] border border-[#0a0907] hover:bg-[#1a1410] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true">
                <path d="M11.6 8.49c-.02-2.07 1.69-3.06 1.77-3.11-.96-1.41-2.46-1.6-2.99-1.62-1.27-.13-2.48.75-3.13.75-.65 0-1.65-.73-2.71-.71-1.4.02-2.69.81-3.41 2.06-1.45 2.52-.37 6.25 1.05 8.3.7 1 1.51 2.13 2.58 2.09 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.61.67 2.71.65 1.12-.02 1.83-1.02 2.51-2.03.79-1.16 1.12-2.29 1.14-2.35-.02-.01-2.18-.84-2.21-3.36ZM9.6 2.41c.57-.7.96-1.66.85-2.62-.83.04-1.83.55-2.42 1.24-.53.61-.99 1.59-.87 2.53.93.07 1.87-.47 2.44-1.15Z" />
              </svg>
              {oauthLoading ? "Connecting…" : "Continue with Apple"}
            </button>

            <button
              onClick={handleGoogle}
              disabled={oauthLoading || loading}
              className="w-full font-body text-sm py-3 border border-border rounded-sm hover:border-gold transition-colors disabled:opacity-50"
            >
              {oauthLoading ? "Connecting…" : "Continue with Google"}
            </button>
          </>
        )}

        {oauthError && (
          <p className="text-xs text-destructive font-body mt-2 text-center">{oauthError}</p>
        )}

        {showReviewer && (
          <form onSubmit={handleReviewerSubmit} className="mt-5 pt-5 border-t border-border space-y-3">
            <p className="text-xs font-body text-muted-foreground text-center">
              Reviewer access
            </p>
            <input
              type="password"
              value={reviewerCode}
              onChange={(e) => setReviewerCode(e.target.value)}
              placeholder="Reviewer code"
              autoComplete="off"
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            {reviewerError && (
              <p className="text-xs text-destructive font-body text-center">{reviewerError}</p>
            )}
            <button
              type="submit"
              disabled={reviewerLoading}
              className="w-full font-serif text-xs tracking-widest uppercase py-2 border border-gold/40 text-gold rounded-sm hover:bg-gold/10 transition-colors disabled:opacity-50"
            >
              {reviewerLoading ? "…" : "Enter as reviewer"}
            </button>
          </form>
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
});

AuthModal.displayName = "AuthModal";

export default AuthModal;
