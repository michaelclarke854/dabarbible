import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Flame, BookOpen, Globe, BookText, Lock, Settings, Clock } from "lucide-react";
import AskScreen from "@/components/AskScreen";
import CrisisCheckinCard from "@/components/CrisisCheckinCard";
import ResponseScreen from "@/components/ResponseScreen";
import AuthModal from "@/components/AuthModal";
import OnboardingScreen from "@/components/OnboardingScreen";
import BetaFeedbackButton from "@/components/BetaFeedbackButton";
import TrialBadge from "@/components/TrialBadge";
import TrialPaywall from "@/components/TrialPaywall";
import TrialNudgeBanner from "@/components/TrialNudgeBanner";
import TrialInterstitial from "@/components/TrialInterstitial";
import AppLoadingSkeleton from "@/components/AppLoadingSkeleton";
import EmailConfirmationPending from "@/components/EmailConfirmationPending";
import AgeGateScreen from "@/components/AgeGateScreen";
import { parseScriptureRef } from "@/data/kjvBooks";
import { useAuth } from "@/contexts/AuthContext";
import { trackPageview } from "@/utils/trackPageview";

const JournalScreen = lazy(() => import("@/components/JournalScreen"));
const ScriptureScreen = lazy(() => import("@/components/ScriptureScreen"));
const HistoryScreen = lazy(() => import("@/components/HistoryScreen"));
const LanguageSettings = lazy(() => import("@/components/LanguageSettings"));
const PrivacySettings = lazy(() => import("@/components/PrivacySettings"));
const SoftCaptureCard = lazy(() => import("@/components/SoftCaptureCard"));

type Tab = "ask" | "scripture" | "history" | "journal";
type Screen = "ask" | "response";

// Solution 3 — Anonymous gate:
//   Q1 → full answer + soft capture nudge
//   Q2 → full answer (still allowed) but next attempt is blurred behind hard paywall
const GUEST_LIMIT = 2;
const FREE_DAILY_LIMIT = 3;
const STORAGE_KEY = "dabar-questions-used";
const ONBOARDING_KEY = "dabar-onboarded";
const ANON_ID_KEY = "dabar_anon_id";

const getGuestQuestionsUsed = (): number => {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10); } catch { return 0; }
};
const incrementGuestQuestions = () => {
  try { localStorage.setItem(STORAGE_KEY, String(getGuestQuestionsUsed() + 1)); } catch {}
};

/** Get-or-create a stable per-device anonymous id. Used (alongside IP) by
 *  the seek-wisdom edge function to enforce the 2-question guest limit. */
const getOrCreateAnonId = (): string => {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing && /^[a-f0-9-]{8,64}$/i.test(existing)) return existing;
    const fresh = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(ANON_ID_KEY, fresh);
    return fresh;
  } catch {
    return "no-storage";
  }
};

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const {
    user, role, plan, isSuspended, ageGroup, hasFullAccess, isBeta, isAdmin,
    languagePreference, setLanguagePreference, preferredBibleVersion, setPreferredBibleVersion,
    refreshProfile, loading: authLoading, isHydrating, emailUnconfirmed, userEmail, trial,
    needsAgeGate, pendingCheckin,
  } = useAuth();

  
  
  const [tab, setTab] = useState<Tab>("ask");
  const [screen, setScreen] = useState<Screen>("ask");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<{
    question: string;
    response: string;
    scriptures: string[];
    sessionId?: string | null;
  } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStage, setAgentStage] = useState<"thinking" | "scripture" | "reflecting" | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean; message?: string }>({ open: false });
  const [stirPrompt, setStirPrompt] = useState<string | null>(null);
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
  });
  const [scriptureDeepLink, setScriptureDeepLink] = useState<{ book: string; chapter: number; verse: number; version?: string } | null>(null);

  // Trial nudge state — derived from profile, not React state
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [trialQuestionCount, setTrialQuestionCount] = useState(0);
  const [trialTopTheme, setTrialTopTheme] = useState<string | null>(null);

  // Soft gate state for guest limit
  const [showSoftGate, setShowSoftGate] = useState(false);
  // Soft capture nudge — shown after Q1 (not yet at hard limit)
  const [showSoftCapture, setShowSoftCapture] = useState(false);

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

  // Virtual pageview tracking — fire on every meaningful screen transition so
  // SPA navigation is recorded in analytics (otherwise everything looks like
  // a single bounced session on `/`).
  useEffect(() => {
    if (isHydrating || authLoading) return;
    if (isSuspended) return;
    if (emailUnconfirmed) {
      trackPageview({ screen: "email-confirmation", title: "Confirm your email" });
      return;
    }
    if (needsAgeGate) {
      trackPageview({ screen: "age-gate", title: "Age verification" });
      return;
    }
    if (!hasOnboarded && !user) {
      trackPageview({ screen: "onboarding", title: "Welcome" });
      return;
    }
    if (showLanguageSettings) {
      trackPageview({ screen: "settings/language", title: "Language settings" });
      return;
    }
    if (showPrivacySettings) {
      trackPageview({ screen: "settings/privacy", title: "Privacy settings" });
      return;
    }
    if (tab === "ask") {
      if (pendingCheckin && user) {
        trackPageview({ screen: "ask/checkin", title: "Pastoral check-in" });
      } else if (screen === "response") {
        trackPageview({ screen: "ask/response", title: "Wisdom response" });
      } else {
        trackPageview({ screen: "ask", title: "Ask" });
      }
      return;
    }
    if (tab === "scripture") {
      trackPageview({ screen: "scripture", title: "Scripture" });
      return;
    }
    if (tab === "history") {
      trackPageview({ screen: "history", title: "History" });
      return;
    }
    if (tab === "journal") {
      trackPageview({ screen: "journal", title: "Journal" });
      return;
    }
  }, [
    isHydrating, authLoading, isSuspended, emailUnconfirmed, needsAgeGate,
    hasOnboarded, user, showLanguageSettings, showPrivacySettings,
    tab, screen, pendingCheckin,
  ]);




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
    if (hasFullAccess) return true;

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
  }, [user, hasFullAccess, navigate]);

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
      const isGuestAtLimit = !user && getGuestQuestionsUsed() >= GUEST_LIMIT;

      if (user) {
        const canAsk = await checkDailyLimit();
        if (!canAsk) return;
      }

      if (user && needsAgeGate) return;

      setIsLoading(true);
      setIsSaved(false);
      setShowSoftGate(false);
      setShowSoftCapture(false);

      // Timed stage progression
      setAgentStage("thinking");
      const t1 = setTimeout(() => setAgentStage("scripture"), 800);
      const t2 = setTimeout(() => setAgentStage("reflecting"), 1800);

      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();

        // Use scripture-research-agent for authenticated users, seek-wisdom for guests
        const endpoint = user
          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scripture-research-agent`
          : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seek-wisdom`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            // Anonymous device id — only used by edge function when userId is null
            ...(user ? {} : { "x-anon-id": getOrCreateAnonId() }),
          },
          body: JSON.stringify({
            question,
            userId: user?.id || null,
            ageGroup: ageGroup || null,
            language: languagePreference,
            scriptureVersion: preferredBibleVersion,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          if (err.error === "trial_expired") {
            await refreshProfile();
            return;
          }
          if (err.error === "rate_limited" || response.status === 429) {
            if (!user) {
              setAuthModal({
                open: true,
                message: "You've reached the free limit. Sign up for a 30-day free trial with unlimited questions.",
              });
            } else {
              toast.error(err.error || "You've asked many questions recently. Please wait a while.");
            }
            return;
          }
          throw new Error(err.message || err.error || "Something went wrong");
        }

        // Set up streaming response
        setCurrentResponse({ question, response: "", scriptures: [] });
        setScreen("response");
        setIsStreaming(true);

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
        // Look up the session id the edge function just created (so flag/save can target it)
        let createdSessionId: string | null = null;
        if (user) {
          try {
            const { data: recent } = await supabase
              .from("wisdom_sessions")
              .select("id")
              .eq("user_id", user.id)
              .eq("question", question)
              .order("created_at", { ascending: false })
              .limit(1);
            createdSessionId = recent?.[0]?.id ?? null;
          } catch {
            // non-fatal — flag button just won't render
          }
        }

        setCurrentResponse({ question, response: fullText, scriptures: scriptureRefs, sessionId: createdSessionId });

        if (!user) {
          incrementGuestQuestions();
          const used = getGuestQuestionsUsed();
          // Q1 done (used == 1) → soft nudge above response, no blur
          // Q2 done (used >= 2) → next attempt will be blocked; show soft gate now
          if (used >= GUEST_LIMIT) {
            setShowSoftGate(true);
            setShowSoftCapture(false);
          } else {
            setShowSoftCapture(true);
            setShowSoftGate(false);
          }
        } else {
          await incrementDailyUsage();
        }
      } catch (err: any) {
        toast.error(err.message || "Could not seek wisdom at this time.");
      } finally {
        clearTimeout(t1);
        clearTimeout(t2);
        setAgentStage(null);
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [user, ageGroup, needsAgeGate, checkDailyLimit, incrementDailyUsage, refreshProfile, languagePreference, preferredBibleVersion]
  );

  const reflectOnThis = useCallback(async () => {
    if (!user) {
      setAuthModal({
        open: true,
        message: "Create a free account to save this reflection — 30 days free, no card needed.",
      });
      return;
    }
    if (!hasFullAccess) {
      toast("Journal requires a Personal plan or above.", {
        action: { label: "View Plans", onClick: () => navigate("/pricing") },
      });
      return;
    }
    if (!currentResponse) return;

    setIsSaving(true);
    try {
      const { data: sessions } = await supabase
        .from("wisdom_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("question", currentResponse.question)
        .order("created_at", { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        await supabase
          .from("wisdom_sessions")
          .update({ saved_to_journal: true })
          .eq("id", sessions[0].id);
      }
      setIsSaved(true);
      toast.success("Saved to your journal.");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [user, currentResponse, hasFullAccess, navigate]);

  const handleScriptureDeepLink = useCallback((ref: string, version?: string) => {
    const parsed = parseScriptureRef(ref);
    if (parsed) {
      setScriptureDeepLink({ ...parsed, version: version || preferredBibleVersion });
      setTab("scripture");
    }
  }, [preferredBibleVersion]);

  const handleTabChange = (newTab: Tab) => {
    if (newTab === "scripture" && !hasFullAccess && user) {
      toast("Scripture tab requires a paid plan.", {
        action: { label: "View Plans", onClick: () => navigate("/pricing") },
      });
      return;
    }
    if (newTab === "scripture" && !user) {
      setAuthModal({ open: true, message: "Create a free account to access the full Scripture companion — 30 days free, no card needed." });
      return;
    }
    if (newTab === "history" && !user) {
      setAuthModal({ open: true, message: "Create a free account to view your history — 30 days free, no card needed." });
      return;
    }
    if (newTab === "history" && !hasFullAccess) {
      toast("History requires a Personal plan or above.", {
        action: { label: "View Plans", onClick: () => navigate("/pricing") },
      });
      return;
    }
    if (newTab === "journal" && !user) {
      setAuthModal({ open: true, message: "Create a free account to keep your journal — 30 days free, no card needed." });
      return;
    }
    if (newTab === "journal" && !hasFullAccess) {
      toast("Journal requires a Personal plan or above.", {
        action: { label: "View Plans", onClick: () => navigate("/pricing") },
      });
      return;
    }
    setTab(newTab);
    if (newTab === "ask") setScreen("ask");
  };

  const handleUpgrade = () => navigate("/pricing");

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

  const showAuthModal = authModal.open;

  // Trial paywall: show if trial expired and still on trial plan
  if (user && trial.trialExpired) {
    return (
      <TrialPaywall
        questionCount={trialQuestionCount}
        onUpgrade={handleUpgrade}
        onFreePlan={handleDowngradeToFree}
      />
    );
  }

  // Nudge display — derived from profile, not React state
  const showDay14Banner = trial.isOnTrial && trial.daysLeft <= 16 && trial.daysLeft > 9 && !trial.trialNudgeSent.day14 && !trial.trialConverted;
  const showDay28Banner = trial.isOnTrial && trial.daysLeft <= 2 && !trial.trialConverted;

  // Soft gate overlay for guest limit (Q2+) — blurs last 60% behind paywall
  const renderSoftGate = () => {
    if (!showSoftGate || !currentResponse) return null;
    const responseLines = currentResponse.response.split("\n");
    // Show first 40%, blur last 60%
    const cutoff = Math.floor(responseLines.length * 0.4);

    return (
      <div className="mt-6 px-4">
        <div className="relative">
          <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none" as const }}>
            {responseLines.slice(cutoff).map((line, i) => (
              <p key={i} className="font-serif text-base leading-relaxed text-foreground mb-2">{line}</p>
            ))}
          </div>
          <div className="absolute inset-0 flex items-start justify-center pt-6">
            <div className="bg-card border border-gold/30 rounded-sm p-6 text-center max-w-sm shadow-[0_0_32px_rgba(196,151,58,0.18)]">
              <p className="font-serif text-lg text-foreground mb-2">You've used your 2 free questions.</p>
              <p className="font-body text-xs text-muted-foreground mb-5 leading-relaxed">
                Start your 30-day free trial to unlock the rest of this answer, save it to your private journal,
                and ask without limits.
              </p>
              <button
                onClick={() => setAuthModal({ open: true, message: "Start your 30-day free trial — unlimited questions, full responses, journal access." })}
                className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all mb-2"
              >
                Start free trial
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="w-full font-serif text-xs tracking-widest uppercase py-2.5 border border-gold/30 text-gold rounded-sm hover:bg-gold/10 transition-all mb-3"
              >
                See plans
              </button>
              <p className="text-xs font-body text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => setAuthModal({ open: true })}
                  className="text-gold hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
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
      {showInterstitial && (
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
            onTryAsGuest={() => {
              try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
              setHasOnboarded(true);
              setTab("ask");
              setScreen("ask");
            }}
            onAskQuestion={async (q) => {
              // Onboard the visitor immediately so the response renders
              // inside the normal in-app shell (with bottom nav, soft-gate, etc.)
              try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
              setHasOnboarded(true);
              setTab("ask");
              await seekWisdom(q);
            }}
            guestQuestionsRemaining={Math.max(0, GUEST_LIMIT - getGuestQuestionsUsed())}
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
              />
            ) : (
              <AskScreen
                onSeekWisdom={seekWisdom}
                isLoading={isLoading}
                guestQuestionsRemaining={!user ? Math.max(0, GUEST_LIMIT - getGuestQuestionsUsed()) : null}
              />
            )
          ) : currentResponse ? (
            <>
              <ResponseScreen
                question={currentResponse.question}
                response={currentResponse.response}
                scriptures={currentResponse.scriptures}
                isStreaming={isStreaming}
                agentStage={agentStage}
                onAskAgain={() => { setScreen("ask"); setCurrentResponse(null); setShowSoftGate(false); setShowSoftCapture(false); }}
                onReflect={reflectOnThis}
                onStir={(thresholdQ) => {
                  reflectOnThis().then(() => {
                    if (!user) return;
                    if (!hasFullAccess) return;
                    setStirPrompt(thresholdQ);
                    setTab("journal");
                  });
                }}
                isSaving={isSaving}
                isSaved={isSaved}
                onScriptureRef={handleScriptureDeepLink}
                userId={user?.id}
                profileVersion={preferredBibleVersion}
                onProfileVersionChanged={(v) => setPreferredBibleVersion(v)}
                sessionId={currentResponse.sessionId ?? null}
              />
              {showSoftCapture && !user && !showSoftGate && (
                <Suspense fallback={null}>
                  <SoftCaptureCard
                    questionsRemaining={Math.max(0, GUEST_LIMIT - getGuestQuestionsUsed())}
                    onSignUp={() => setAuthModal({ open: true, message: "Create a free account to save this reflection — 30 days free, no card needed." })}
                  />
                </Suspense>
              )}
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
            <JournalScreen stirPrompt={stirPrompt} onStirConsumed={() => setStirPrompt(null)} />
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
            {!hasFullAccess && user ? <Lock size={18} strokeWidth={1.5} aria-hidden="true" /> : <BookText size={18} strokeWidth={1.5} aria-hidden="true" />}
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
            {!hasFullAccess && user ? <Lock size={18} strokeWidth={1.5} aria-hidden="true" /> : <Clock size={18} strokeWidth={1.5} aria-hidden="true" />}
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
            {!hasFullAccess && user ? <Lock size={18} strokeWidth={1.5} aria-hidden="true" /> : <BookOpen size={18} strokeWidth={1.5} aria-hidden="true" />}
            <span className="font-serif text-[10px] tracking-widest uppercase">Journal</span>
          </button>
        </div>
      </nav>}

      {/* Top bar */}
      {(hasOnboarded || user) && <div className={`fixed ${(showDay14Banner || showDay28Banner) ? "top-10" : "top-0"} left-0 right-0 z-20 flex justify-between items-center px-4 py-3`}>
        <div className="flex items-center gap-2">
          {user && !hasFullAccess && (
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
          {trial.isOnTrial && trial.trialEndsAt && (
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
          {user && (
            <button
              onClick={() => setShowPrivacySettings(true)}
              className="text-muted-foreground hover:text-gold transition-colors"
              aria-label="Settings"
            >
              <Settings size={16} aria-hidden="true" />
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
        onClose={() => setAuthModal({ open: false })}
        onSignedUp={() => {}}
        message={authModal.message}
      />


      {showPrivacySettings && user && (
        <Suspense fallback={null}>
          <PrivacySettings userId={user.id} onClose={() => setShowPrivacySettings(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
