import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Flame, BookOpen, Globe, BookText, Lock, Settings, Clock } from "lucide-react";
import AskScreen from "@/components/AskScreen";
import CrisisCheckinCard from "@/components/CrisisCheckinCard";
import ResponseScreen from "@/components/ResponseScreen";
import AuthModal from "@/components/AuthModal";
import OnboardingScreen from "@/components/OnboardingScreen";
import { LandingHero } from "@/components/LandingHero";
import { AnimatePresence, motion } from "framer-motion";
import BetaFeedbackButton from "@/components/BetaFeedbackButton";
import TrialBadge from "@/components/TrialBadge";
import TrialPaywall from "@/components/TrialPaywall";
import TrialNudgeBanner from "@/components/TrialNudgeBanner";
import TrialInterstitial from "@/components/TrialInterstitial";
import AppLoadingSkeleton from "@/components/AppLoadingSkeleton";
import EmailConfirmationPending from "@/components/EmailConfirmationPending";
import AgeGateScreen from "@/components/AgeGateScreen";
import { OnboardingIntent } from "@/components/OnboardingIntent";
import DailyVerseOptIn from "@/components/DailyVerseOptIn";
import { parseScriptureRef } from "@/data/kjvBooks";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/trackEvent";
import { isIOSNative } from "@/lib/platform";

const JournalScreen = lazy(() => import("@/components/JournalScreen"));
const ScriptureScreen = lazy(() => import("@/components/ScriptureScreen"));
const HistoryScreen = lazy(() => import("@/components/HistoryScreen"));
const LanguageSettings = lazy(() => import("@/components/LanguageSettings"));
const PrivacySettings = lazy(() => import("@/components/PrivacySettings"));
const NativeDailyPractice = lazy(() => import("@/components/NativeDailyPractice"));

type Tab = "ask" | "scripture" | "history" | "journal";
type Screen = "ask" | "response";

const GUEST_LIMIT = 3;
const FREE_DAILY_LIMIT = 3;
const STORAGE_KEY = "dabar-questions-used";
const ONBOARDING_KEY = "dabar-onboarded";

const getGuestQuestionsUsed = (): number => {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10); } catch { return 0; }
};
const incrementGuestQuestions = () => {
  try { localStorage.setItem(STORAGE_KEY, String(getGuestQuestionsUsed() + 1)); } catch {}
};

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const landingContext = searchParams.get("context");
  const {
    user, role, plan, isSuspended, ageGroup, hasFullAccess, isBeta, isAdmin, isPastor,
    languagePreference, setLanguagePreference, preferredBibleVersion, setPreferredBibleVersion,
    refreshProfile, loading: authLoading, isHydrating, emailUnconfirmed, userEmail, trial, needsOnboardingIntent,
    needsAgeGate, pendingCheckin,
  } = useAuth();
  const nativeIOS = isIOSNative();
  const effectiveHasFullAccess = nativeIOS ? !!user : hasFullAccess;

  
  
  const [tab, setTab] = useState<Tab>("ask");
  const [screen, setScreen] = useState<Screen>("ask");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<{
    question: string;
    response: string;
    scriptures: string[];
  } | null>(null);
  const [currentIntentKey, setCurrentIntentKey] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStage, setAgentStage] = useState<"thinking" | "scripture" | "reflecting" | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean; message?: string }>({ open: false });
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup" | undefined>(undefined);
  const [stirPrompt, setStirPrompt] = useState<string | null>(null);
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
  });
  const [scriptureDeepLink, setScriptureDeepLink] = useState<{ book: string; chapter: number; verse: number; version?: string } | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef(false);
  // Guard so page_view{screen:"ask"} fires at most once per mount for anon visitors.
  const askPageViewFiredRef = useRef(false);

  // Cancel in-flight request on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // Read recovery params from /auth/callback → "/" redirect.
  // auth_error=link_expired  → reopen sign-in modal with inline message
  // auth_modal=signup        → reopen modal in signup mode (from "wrong email" link)
  useEffect(() => {
    const err = searchParams.get("auth_error");
    const modal = searchParams.get("auth_modal");
    if (!err && !modal) return;

    if (err === "link_expired") {
      setAuthModalMode("signin");
      setAuthModal({
        open: true,
        message: "That link has expired. Please sign in.",
      });
      trackEvent("auth_link_expired_recovered", { metadata: { source: "callback_redirect" } });
    } else if (modal === "signup") {
      setAuthModalMode("signup");
      setAuthModal({ open: true });
    }

    // Strip the query params from the URL without adding history.
    const url = new URL(window.location.href);
    url.searchParams.delete("auth_error");
    url.searchParams.delete("auth_modal");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track initial Ask page_view for anonymous visitors so the engagement-rate
  // denominator captures all landers (not just those who already engaged).
  // Fires once per mount when an unauthenticated visitor lands on the ask tab.
  useEffect(() => {
    if (isHydrating || authLoading) return;
    if (user) return;
    if (tab !== "ask") return;
    if (askPageViewFiredRef.current) return;
    askPageViewFiredRef.current = true;
    trackEvent("page_view", { screen: "ask", userId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrating, authLoading, user]);

  // Trial nudge state — derived from profile, not React state
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [trialQuestionCount, setTrialQuestionCount] = useState(0);
  const [trialTopTheme, setTrialTopTheme] = useState<string | null>(null);

  // Soft gate state for guest limit
  const [showSoftGate, setShowSoftGate] = useState(false);

  // Crisis check-in state — true if user just said "still struggling"
  const [crisisActive, setCrisisActive] = useState(false);

  // Centralized AuthModal opener — fires analytics in one place
  const openAuthModal = useCallback((trigger: string, message?: string) => {
    trackEvent('auth_modal_opened', {
      screen: 'auth_modal',
      metadata: { trigger },
      userId: null,
    });
    setAuthModal({ open: true, message });
  }, []);

  // Downgrade loading
  const [downgradeLoading, setDowngradeLoading] = useState(false);

  // Fetch trial stats when on trial
  useEffect(() => {
    if (!user || !trial.isOnTrial) return;
    (async () => {
      const { count } = await supabase
        .from("wisdom_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setTrialQuestionCount(count || 0);

      const { data: themes } = await supabase
        .from("user_patterns")
        .select("theme, occurrence")
        .eq("user_id", user.id)
        .order("occurrence", { ascending: false })
        .limit(1);
      setTrialTopTheme(themes?.[0]?.theme || null);
    })();
  }, [user, trial.isOnTrial]);

  // Show day 21 interstitial once
  useEffect(() => {
    if (trial.isOnTrial && trial.daysLeft <= 9 && !trial.trialNudgeSent.day21) {
      setShowInterstitial(true);
    }
  }, [trial]);

  // Redirect suspended users
  useEffect(() => {
    if (!authLoading && isSuspended) {
      navigate("/suspended", { replace: true });
    }
  }, [authLoading, isSuspended, navigate]);




  // Blocked age group check (under 13)
  useEffect(() => {
    if ((ageGroup === "blocked" || ageGroup === "minor") && user) {
      toast.error("Dabar is designed for ages 13 and up. Ask a parent or guardian to create a Family Account.");
      supabase.auth.signOut();
    }
  }, [ageGroup, user]);

  const markNudgeSent = useCallback(async (key: "day14" | "day21" | "day28") => {
    if (!user) return;
    const updated = { ...trial.trialNudgeSent, [key]: true };
    await supabase
      .from("profiles")
      .update({ trial_nudge_sent: updated } as any)
      .eq("user_id", user.id);
    await refreshProfile();
  }, [user, trial.trialNudgeSent, refreshProfile]);

  const checkDailyLimit = useCallback(async (): Promise<boolean> => {
    if (!user) return true;
    if (effectiveHasFullAccess) return true;

    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("usage_daily")
      .select("question_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    const count = data?.question_count ?? 0;
    if (count >= FREE_DAILY_LIMIT) {
      toast("You've reached your 3 daily questions.", {
        description: "Upgrade for unlimited wisdom.",
        action: { label: "View Plans", onClick: () => navigate("/pricing") },
      });
      return false;
    }
    return true;
  }, [user, effectiveHasFullAccess, navigate]);

  const incrementDailyUsage = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("usage_daily")
      .select("id, question_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (existing) {
      await supabase
        .from("usage_daily")
        .update({ question_count: (existing.question_count || 0) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("usage_daily")
        .insert({ user_id: user.id, date: today, question_count: 1 });
    }
  }, [user]);

  const seekWisdom = useCallback(
    async (question: string) => {
      if (isSubmittingRef.current) return;
      if (!question.trim()) return;
      isSubmittingRef.current = true;
      console.time('[DABAR] seek-wisdom:request');
      const slowWarn = setTimeout(() => {
        console.warn('[DABAR] seek-wisdom: >5s elapsed — potential slow network or cold start');
      }, 5000);
      const isGuestAtLimit = !user && getGuestQuestionsUsed() >= GUEST_LIMIT;

      if (!user) {
        const guestCount = getGuestQuestionsUsed();
        trackEvent('guest_question_asked', {
          screen: 'ask',
          metadata: { guest_question_number: guestCount + 1 },
          userId: null,
        });
      }

      if (user) {
        const canAsk = await checkDailyLimit();
        if (!canAsk) return;
      }

      if (user && needsAgeGate) return;

      setIsLoading(true);
      setIsSaved(false);
      setShowSoftGate(false);
      setCurrentSessionId(null);
      setCurrentIntentKey(null);

      // Cancel any prior in-flight request and create a fresh controller
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Timed stage progression
      setAgentStage("thinking");
      const t1 = setTimeout(() => setAgentStage("scripture"), 800);
      const t2 = setTimeout(() => setAgentStage("reflecting"), 1800);

      const performWisdomRequest = async (accessToken?: string | null) => {
        const endpoint = user
          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scripture-research-agent`
          : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seek-wisdom`;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "X-Dabar-Native-Ios": nativeIOS ? "1" : "0",
        };

        if (user) {
          if (!accessToken) {
            throw new Error("Session expired");
          }
          headers.Authorization = `Bearer ${accessToken}`;
        }

        return fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers,
          body: JSON.stringify({
            question,
            userId: user?.id || null,
            ageGroup: ageGroup || null,
            language: languagePreference,
            scriptureVersion: preferredBibleVersion,
            nativeIOS,
          }),
        });
      };

      try {
        let { data: { session: authSession } } = await supabase.auth.getSession();

        // If we have a logged-in user but no access_token, try refreshing once
        // before falling back. Never silently downgrade an authenticated user
        // to a guest request — that would attribute their session to user_id=NULL.
        if (user && !authSession?.access_token) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          authSession = refreshed.session ?? authSession;
        }

        if (user && !authSession?.access_token) {
          clearTimeout(t1); clearTimeout(t2);
          setIsLoading(false);
          setAgentStage(null);
          toast.error("Session expired", {
            description: "Please sign in again to continue.",
          });
          return;
        }

        let response = await performWisdomRequest(authSession?.access_token);

        if (user && response.status === 401) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          const refreshedToken = refreshed.session?.access_token;

          if (!refreshError && refreshedToken) {
            response = await performWisdomRequest(refreshedToken);
          }
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          if (response.status === 401 && user) {
            toast.error("Session expired", {
              description: "Please sign in again to continue.",
            });
            await supabase.auth.signOut();
            return;
          }
          if (err.error === "trial_expired") {
            await refreshProfile();
            return;
          }
          if (err.error === "rate_limited" || response.status === 429) {
            if (!user) {
              openAuthModal(
                'rate_limited',
                nativeIOS
                  ? "You've reached the guest limit. Sign in to continue with the iOS reflection experience."
                  : "You've reached the free limit. Sign up for a 30-day free trial with unlimited questions."
              );
            } else {
              toast.error(err.error || "You've asked many questions recently. Please wait a while.");
            }
            return;
          }
          throw new Error(err.message || err.error || "Something went wrong");
        }

        // Capture session ID from response headers (set by edge function)
        const sessionIdHeader = response.headers.get("X-Session-Id");
        const intentHeader = response.headers.get("X-Intent-Key");
        if (intentHeader) setCurrentIntentKey(intentHeader);
        if (sessionIdHeader) {
          setCurrentSessionId(sessionIdHeader);
          // Tag session with crisis marker if user was in crisis state
          if (crisisActive && user) {
            supabase
              .from("wisdom_sessions")
              .update({ crisis_marker: true } as any)
              .eq("id", sessionIdHeader)
              .then(() => {});
          }
        }

        // Set up streaming response
        setCurrentResponse({ question, response: "", scriptures: [] });
        setScreen("response");
        setIsStreaming(true);

        // iOS native: server returns a single JSON payload, not a stream
        if (nativeIOS) {
          clearTimeout(t1);
          clearTimeout(t2);
          setAgentStage(null);
          const json = await response.json();
          const fullText: string = json?.response ?? "";
          const scriptureRefs: string[] = [];
          const regex = /\[SCRIPTURE\]\s*\nreference:\s*(.+)\ntext:\s*.+\n\[\/SCRIPTURE\]/g;
          let m;
          while ((m = regex.exec(fullText)) !== null) {
            scriptureRefs.push(m[1].trim());
          }
          setCurrentResponse({ question, response: fullText, scriptures: scriptureRefs });

          if (!user) {
            incrementGuestQuestions();
            const newCount = getGuestQuestionsUsed();
            trackEvent('response_viewed', {
              screen: 'response',
              metadata: { is_guest: true, guest_question_number: newCount },
              userId: null,
            });
            if (isGuestAtLimit || newCount >= GUEST_LIMIT) {
              setShowSoftGate(true);
              const eventName = newCount > GUEST_LIMIT ? 'blur_gate_shown' : 'soft_gate_shown';
              trackEvent(eventName, {
                screen: 'response',
                metadata: { guest_question_number: newCount },
                userId: null,
              });
            }
          } else {
            await incrementDailyUsage();
          }
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let firstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Clear stage label on first chunk
          if (firstChunk) {
            clearTimeout(t1);
            clearTimeout(t2);
            setAgentStage(null);
            firstChunk = false;
          }

          setCurrentResponse((prev) =>
            prev ? { ...prev, response: fullText } : { question, response: fullText, scriptures: [] }
          );
        }

        // Parse scriptures from final text
        const scriptureRefs: string[] = [];
        const regex = /\[SCRIPTURE\]\s*\nreference:\s*(.+)\ntext:\s*.+\n\[\/SCRIPTURE\]/g;
        let match;
        while ((match = regex.exec(fullText)) !== null) {
          scriptureRefs.push(match[1].trim());
        }
        setCurrentResponse({ question, response: fullText, scriptures: scriptureRefs });

        if (!user) {
          incrementGuestQuestions();
          const newCount = getGuestQuestionsUsed();
          trackEvent('response_viewed', {
            screen: 'response',
            metadata: { is_guest: true, guest_question_number: newCount },
            userId: null,
          });
          if (isGuestAtLimit || newCount >= GUEST_LIMIT) {
            setShowSoftGate(true);
            const eventName = newCount > GUEST_LIMIT ? 'blur_gate_shown' : 'soft_gate_shown';
            trackEvent(eventName, {
              screen: 'response',
              metadata: { guest_question_number: newCount },
              userId: null,
            });
          }
        } else {
          await incrementDailyUsage();
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // User navigated away or started a new request — silent
          return;
        }
        toast.error(err.message || "Could not seek wisdom at this time.");
      } finally {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(slowWarn);
        isSubmittingRef.current = false;
        console.timeEnd('[DABAR] seek-wisdom:request');
        setAgentStage(null);
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [user, ageGroup, needsAgeGate, checkDailyLimit, incrementDailyUsage, refreshProfile, languagePreference, preferredBibleVersion, crisisActive, nativeIOS]
  );

  const reflectOnThis = useCallback(async () => {
    if (!user) {
      openAuthModal(
        'reflect_save',
        nativeIOS
          ? "Sign in to save this reflection in the iOS experience."
          : "Create a free account to save this reflection — 30 days free, no card needed."
      );
      return;
    }
    if (!effectiveHasFullAccess) {
      if (nativeIOS) {
        toast("Journal is available after signing in.");
      } else {
        toast("Journal requires a Personal plan or above.", {
          action: { label: "View Plans", onClick: () => navigate("/pricing") },
        });
      }
      return;
    }
    if (!currentResponse) return;

    setIsSaving(true);
    try {
      let sessionId = currentSessionId;

      // Fallback: if header wasn't captured (older guest path), look up by question
      if (!sessionId) {
        const { data: sessions } = await supabase
          .from("wisdom_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("question", currentResponse.question)
          .order("created_at", { ascending: false })
          .limit(1);
        sessionId = sessions?.[0]?.id ?? null;
      }

      if (sessionId) {
        await supabase
          .from("wisdom_sessions")
          .update({ saved_to_journal: true })
          .eq("id", sessionId);
      }
      setIsSaved(true);
      toast.success("Saved to your journal.");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [user, currentResponse, currentSessionId, effectiveHasFullAccess, navigate]);

  const handleScriptureDeepLink = useCallback((ref: string, version?: string) => {
    const parsed = parseScriptureRef(ref);
    if (parsed) {
      setScriptureDeepLink({ ...parsed, version: version || preferredBibleVersion });
      setTab("scripture");
    }
  }, [preferredBibleVersion]);

  const handleTabChange = (newTab: Tab) => {
    if (newTab === "scripture" && !effectiveHasFullAccess && user) {
      toast("Scripture is available after signing in.");
      return;
    }
    if (newTab === "scripture" && !user) {
      openAuthModal(
        'nav_scripture',
        nativeIOS
          ? "Sign in to access the Scripture companion in the iOS experience."
          : "Create a free account to access the full Scripture companion — 30 days free, no card needed."
      );
      return;
    }
    if (newTab === "history" && !user) {
      openAuthModal(
        'nav_history',
        nativeIOS
          ? "Sign in to view your history in the iOS experience."
          : "Create a free account to view your history — 30 days free, no card needed."
      );
      return;
    }
    if (newTab === "history" && !effectiveHasFullAccess) {
      toast("History is available after signing in.");
      return;
    }
    if (newTab === "journal" && !user) {
      openAuthModal(
        'nav_journal',
        nativeIOS
          ? "Sign in to keep your journal in the iOS experience."
          : "Create a free account to keep your journal — 30 days free, no card needed."
      );
      return;
    }
    if (newTab === "journal" && !effectiveHasFullAccess) {
      toast("Journal is available after signing in.");
      return;
    }
    setTab(newTab);
    if (newTab === "ask") setScreen("ask");
    // Avoid double-firing page_view{screen:"ask"} for anon visitors —
    // the mount effect already covers that case via askPageViewFiredRef.
    if (newTab === "ask" && !user && askPageViewFiredRef.current) return;
    if (newTab === "ask" && !user) askPageViewFiredRef.current = true;
    trackEvent("page_view", { screen: newTab, userId: user?.id ?? null });
  };

  const handleUpgrade = () => {
    trackEvent("upgrade_click", {
      screen: "in_app",
      metadata: { plan: plan, on_trial: trial.isOnTrial, days_left: trial.daysLeft },
      userId: user?.id ?? null,
    });
    if (isIOSNative()) {
      toast.info("This iOS version uses the free access path.");
      return;
    }
    navigate("/pricing");
  };

  const handleDowngradeToFree = async () => {
    if (!user) return;
    setDowngradeLoading(true);
    try {
      const { error } = await supabase.functions.invoke("downgrade-plan", {
        body: { userId: user.id },
      });
      if (error) throw error;
      await refreshProfile();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDowngradeLoading(false);
    }
  };

  // Hydration guard — show skeleton while loading auth state
  if (isHydrating || authLoading) {
    return <AppLoadingSkeleton />;
  }

  // Unconfirmed email screen
  if (emailUnconfirmed && userEmail) {
    return <EmailConfirmationPending email={userEmail} />;
  }

  // Age gate for Google OAuth users without age_group
  if (needsAgeGate) {
    return <AgeGateScreen />;
  }
  // Onboarding intent — shown once after signup before first question
  if (user && needsOnboardingIntent && !needsAgeGate && !emailUnconfirmed) {
    return <OnboardingIntent onComplete={() => refreshProfile()} defaultHighlight={landingContext === "grief" ? "grief" : undefined} />;
  }

  const showAuthModal = authModal.open;
  // Trial paywall: show if trial expired and still on trial plan
  if (user && trial.trialExpired && !nativeIOS) {
    trackEvent("paywall_view", { screen: "trial_paywall", userId: user.id });
    return (
      <TrialPaywall
        questionCount={trialQuestionCount}
        onUpgrade={handleUpgrade}
        onFreePlan={handleDowngradeToFree}
      />
    );
  }

  // Nudge display — derived from profile, not React state
  const showDay14Banner = !nativeIOS && trial.isOnTrial && trial.daysLeft <= 16 && trial.daysLeft > 9 && !trial.trialNudgeSent.day14 && !trial.trialConverted;
  const showDay28Banner = !nativeIOS && trial.isOnTrial && trial.daysLeft <= 2 && !trial.trialConverted;

  // Soft gate overlay for guest limit
  const renderSoftGate = () => {
    if (!showSoftGate || !currentResponse) return null;
    const responseLines = currentResponse.response.split("\n");
    const cutoff = Math.floor(responseLines.length * 0.4);

    return (
      <AnimatePresence>
        <motion.div
          key="soft-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-6"
        >
          <div className="relative">
            <div className="soft-gate-blur">
              {responseLines.slice(cutoff).map((line, i) => (
                <p
                  key={i}
                  className="font-serif text-base leading-relaxed text-foreground mb-2"
                >
                  {line}
                </p>
              ))}
            </div>
            {/* Gradient mask fading the blurred copy into the gate card */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-24"
              style={{
                background:
                  "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0) 100%)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center px-4"
            >
              <div className="dabar-glass border border-gold/30 rounded-sm p-6 text-center max-w-sm shadow-xl">
                <p className="font-serif text-lg text-foreground mb-2">
                  Unlock your full answer
                </p>
                <p className="font-body text-xs text-muted-foreground mb-4 leading-relaxed">
                  {nativeIOS
                    ? "Sign in to continue with scripture reflection, history, and journal access in this iOS experience."
                    : "Start your 30-day free trial — unlimited questions, full responses, journal access. No card required."}
                </p>
                <button
                  onClick={() => {
                    trackEvent("soft_gate_signup_clicked", { screen: "response" });
                    openAuthModal(
                      "soft_gate_cta",
                      nativeIOS
                        ? "Sign in to continue with the iOS reflection experience."
                        : "Start your 30-day free trial — unlimited questions, full responses, journal access."
                    );
                  }}
                  className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all mb-3"
                >
                  {nativeIOS ? "Sign in" : "Start free trial"}
                </button>
                <p className="text-xs font-body text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      trackEvent("soft_gate_signin_clicked", { screen: "response" });
                      openAuthModal("soft_gate_signin");
                    }}
                    className="text-gold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Trial nudge banners */}
      {(showDay14Banner || showDay28Banner) && (hasOnboarded || user) && (
        <div className="fixed top-0 left-0 right-0 z-30">
          <TrialNudgeBanner
            daysLeft={trial.daysLeft}
            variant={showDay28Banner ? "day28" : "day14"}
            onDismiss={() => {
              markNudgeSent("day14");
            }}
            onUpgrade={handleUpgrade}
          />
        </div>
      )}

      {/* Day 21 interstitial */}
      {showInterstitial && !nativeIOS && (
        <TrialInterstitial
          daysLeft={trial.daysLeft}
          questionCount={trialQuestionCount}
          topTheme={trialTopTheme}
          onUpgrade={handleUpgrade}
          onDismiss={() => {
            setShowInterstitial(false);
            markNudgeSent("day21");
          }}
        />
      )}

      <main className={`flex-1 ${hasOnboarded || user ? "pb-20" : ""} ${(showDay14Banner || showDay28Banner) && (hasOnboarded || user) ? "pt-10" : ""}`}>
        {!hasOnboarded && !user ? (
          <OnboardingScreen
            onBegin={() => {
              try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
              setHasOnboarded(true);
            }}
          />
        ) : showLanguageSettings && user ? (
          <Suspense fallback={<PageSpinner />}>
            <LanguageSettings
              userId={user.id}
              currentLanguage={languagePreference}
              onLanguageChanged={(lang) => {
                setLanguagePreference(lang);
                setShowLanguageSettings(false);
              }}
              onBack={() => setShowLanguageSettings(false)}
            />
          </Suspense>
        ) : tab === "ask" ? (
          screen === "ask" ? (
            pendingCheckin && user ? (
              <CrisisCheckinCard
                userId={user.id}
                onDismiss={() => refreshProfile()}
                onDismissWithCrisisState={(stillStruggling) => setCrisisActive(stillStruggling)}
              />
            ) : !user && getGuestQuestionsUsed() === 0 ? (
              <>
                <Suspense fallback={null}>
                  <NativeDailyPractice />
                </Suspense>
                <LandingHero
                  onSeekWisdom={seekWisdom}
                  isLoading={isLoading}
                  onSignIn={() =>
                    openAuthModal("landing_signin", "Welcome back. Sign in to continue.")
                  }
                />
              </>
            ) : (
              <>
                <Suspense fallback={null}>
                  <NativeDailyPractice />
                </Suspense>
                <AskScreen
                  onSeekWisdom={seekWisdom}
                  isLoading={isLoading}
                  guestQuestionsUsed={!user ? getGuestQuestionsUsed() : undefined}
                  guestLimit={!user ? GUEST_LIMIT : undefined}
                  onScriptureRef={handleScriptureDeepLink}
                />
              </>
            )
          ) : currentResponse ? (
            <>
              <ResponseScreen
                question={currentResponse.question}
                response={currentResponse.response}
                scriptures={currentResponse.scriptures}
                isStreaming={isStreaming}
                agentStage={agentStage}
                onAskAgain={() => { setScreen("ask"); setCurrentResponse(null); setShowSoftGate(false); setCrisisActive(false); }}
                onReflect={reflectOnThis}
                onStir={(thresholdQ) => {
                  reflectOnThis().then(() => {
                    if (!user) return;
                    if (!effectiveHasFullAccess) return;
                    setStirPrompt(thresholdQ);
                    setTab("journal");
                  });
                }}
                isSaving={isSaving}
                isSaved={isSaved}
                onScriptureRef={handleScriptureDeepLink}
                userId={user?.id}
                crisisActive={crisisActive}
                intentKey={currentIntentKey}
                profileVersion={preferredBibleVersion}
                onProfileVersionChanged={(v) => setPreferredBibleVersion(v)}
                onContinueExploring={(seed) => {
                  trackEvent("continue_exploring_clicked", {
                    screen: "response",
                    metadata: { seed_question: seed },
                    userId: user?.id ?? null,
                  });
                  setScreen("ask");
                  setCurrentResponse(null);
                  setShowSoftGate(false);
                  // Defer so AskScreen mounts before submission
                  setTimeout(() => seekWisdom(seed), 50);
                }}
              />
              {renderSoftGate()}
            </>
          ) : null
        ) : tab === "scripture" ? (
          <Suspense fallback={<PageSpinner />}>
            <ScriptureScreen
              user={user}
              deepLink={scriptureDeepLink as any}
              onDeepLinkConsumed={() => setScriptureDeepLink(null)}
              profileVersion={preferredBibleVersion as any}
              onProfileVersionChanged={(v) => setPreferredBibleVersion(v)}
            />
          </Suspense>
        ) : tab === "history" ? (
          <Suspense fallback={<PageSpinner />}>
            <HistoryScreen />
          </Suspense>
        ) : (
          <Suspense fallback={<PageSpinner />}>
            <JournalScreen
              stirPrompt={stirPrompt}
              onStirConsumed={() => setStirPrompt(null)}
              isFreePlan={!nativeIOS && plan === "free"}
              onUpgrade={handleUpgrade}
              onSignIn={() => openAuthModal("journal_gate", "Sign in to access your journal")}
            />
          </Suspense>
        )}
      </main>

      {/* Bottom Navigation */}
      {(hasOnboarded || user) && <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 bg-nav/95 backdrop-blur-sm border-t border-gold/15 z-30">
        <div className="flex max-w-lg mx-auto" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "ask"}
            aria-label="Ask a question"
            onClick={() => handleTabChange("ask")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "ask" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            <Flame size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className="font-serif text-[10px] tracking-widest uppercase">Ask</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "scripture"}
            aria-label="Scripture companion"
            onClick={() => handleTabChange("scripture")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "scripture" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            {!effectiveHasFullAccess && user ? <Lock size={18} strokeWidth={1.5} aria-hidden="true" /> : <BookText size={18} strokeWidth={1.5} aria-hidden="true" />}
            <span className="font-serif text-[10px] tracking-widest uppercase">Scripture</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "history"}
            aria-label="View history"
            onClick={() => handleTabChange("history")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "history" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            {!effectiveHasFullAccess && user ? <Lock size={18} strokeWidth={1.5} aria-hidden="true" /> : <Clock size={18} strokeWidth={1.5} aria-hidden="true" />}
            <span className="font-serif text-[10px] tracking-widest uppercase">History</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "journal"}
            aria-label="Open journal"
            onClick={() => handleTabChange("journal")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "journal" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            {!effectiveHasFullAccess && user ? <Lock size={18} strokeWidth={1.5} aria-hidden="true" /> : <BookOpen size={18} strokeWidth={1.5} aria-hidden="true" />}
            <span className="font-serif text-[10px] tracking-widest uppercase">Journal</span>
          </button>
        </div>
      </nav>}

      {/* Top bar */}
      {(hasOnboarded || user) && <div className={`fixed ${(showDay14Banner || showDay28Banner) ? "top-10" : "top-0"} left-0 right-0 z-20 flex justify-between items-center px-4 py-3`}>
        <div className="flex items-center gap-2">
          {user && !hasFullAccess && !nativeIOS && (
            <button
              onClick={() => navigate("/pricing")}
              className="text-[10px] font-body tracking-wider uppercase text-gold hover:text-gold-dark transition-colors border border-gold/30 px-3 py-1 rounded-sm"
            >
              Upgrade
            </button>
          )}
          {isBeta && (
            <span className="text-[10px] font-serif text-gold bg-gold/10 px-2 py-0.5 rounded">β Beta</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!nativeIOS && trial.isOnTrial && trial.trialEndsAt && (
            <TrialBadge trialEndsAt={trial.trialEndsAt} />
          )}
          {role === "super_admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="text-[10px] font-body tracking-wider uppercase text-gold hover:text-gold-light transition-colors"
            >
              Admin
            </button>
          )}
          {isPastor && (
            <button
              onClick={() => navigate("/pastor")}
              className="text-[10px] font-body tracking-wider uppercase text-gold hover:text-gold-light transition-colors"
            >
              Pastor
            </button>
          )}
          {user && (
            <button
              onClick={() => setShowPrivacySettings(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-body text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
              aria-label="Account and privacy settings"
            >
              <Settings size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Account & Privacy</span>
            </button>
          )}
          {user && (
            <button
              onClick={() => setShowLanguageSettings(true)}
              className="text-muted-foreground hover:text-gold transition-colors"
              aria-label="Language settings"
            >
              <Globe size={16} aria-hidden="true" />
            </button>
          )}
          {user ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out.");
              }}
              className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>}

      {/* Beta feedback button */}
      <BetaFeedbackButton />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => { setAuthModal({ open: false }); setAuthModalMode(undefined); }}
        onSignedUp={() => {}}
        message={authModal.message}
        defaultMode={authModalMode}
      />

      {user && <DailyVerseOptIn userId={user.id} />}

      {showPrivacySettings && user && (
        <Suspense fallback={null}>
          <PrivacySettings userId={user.id} onClose={() => setShowPrivacySettings(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
