import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Flame, BookOpen, Globe, BookText, Lock, Settings, Clock } from "lucide-react";
import AskScreen from "@/components/AskScreen";
import ResponseScreen from "@/components/ResponseScreen";
import AuthModal from "@/components/AuthModal";
import OnboardingScreen from "@/components/OnboardingScreen";
import BetaFeedbackButton from "@/components/BetaFeedbackButton";
import TrialBadge from "@/components/TrialBadge";
import TrialPaywall from "@/components/TrialPaywall";
import TrialNudgeBanner from "@/components/TrialNudgeBanner";
import TrialInterstitial from "@/components/TrialInterstitial";
import { parseScriptureRef } from "@/data/kjvBooks";
import { useAuth } from "@/contexts/AuthContext";

const JournalScreen = lazy(() => import("@/components/JournalScreen"));
const ScriptureScreen = lazy(() => import("@/components/ScriptureScreen"));
const HistoryScreen = lazy(() => import("@/components/HistoryScreen"));
const LanguageSettings = lazy(() => import("@/components/LanguageSettings"));
const PrivacySettings = lazy(() => import("@/components/PrivacySettings"));

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
  const { user, role, plan, isSuspended, ageGroup, hasFullAccess, isBeta, isAdmin, languagePreference, setLanguagePreference, preferredBibleVersion, setPreferredBibleVersion, refreshProfile, loading: authLoading, trial } = useAuth();

  const [needsDob, setNeedsDob] = useState(false);
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
  const [authModal, setAuthModal] = useState<{ open: boolean; message?: string }>({ open: false });
  const [stirPrompt, setStirPrompt] = useState<string | null>(null);
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
  });
  const [scriptureDeepLink, setScriptureDeepLink] = useState<{ book: string; chapter: number; verse: number; version?: string } | null>(null);

  // Trial nudge state
  const [nudgeDismissed, setNudgeDismissed] = useState<Record<string, boolean>>({});
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [trialQuestionCount, setTrialQuestionCount] = useState(0);
  const [trialTopTheme, setTrialTopTheme] = useState<string | null>(null);

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
    if (trial.isOnTrial && trial.daysLeft <= 9 && !trial.trialNudgeSent.day21 && !nudgeDismissed.day21) {
      setShowInterstitial(true);
    }
  }, [trial]);

  // Redirect suspended users
  useEffect(() => {
    if (!authLoading && isSuspended) {
      navigate("/suspended", { replace: true });
    }
  }, [authLoading, isSuspended, navigate]);

  // Check if DOB is needed
  useEffect(() => {
    if (user && !ageGroup && !authLoading) {
      setNeedsDob(true);
    } else {
      setNeedsDob(false);
    }
  }, [user, ageGroup, authLoading]);

  // Minor check
  useEffect(() => {
    if (ageGroup === "minor" && user) {
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
  }, [user, trial.trialNudgeSent]);

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
      if (!user && getGuestQuestionsUsed() >= GUEST_LIMIT) {
        setAuthModal({
          open: true,
          message: "Your words are worth keeping. Create a free account to start your 30-day trial — no card required.",
        });
        return;
      }

      if (user) {
        const canAsk = await checkDailyLimit();
        if (!canAsk) return;
      }

      if (user && needsDob) return;

      setIsLoading(true);
      setIsSaved(false);

      try {
        const { data, error } = await supabase.functions.invoke("seek-wisdom", {
          body: { question, userId: user?.id || null, ageGroup: ageGroup || null },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setCurrentResponse({
          question,
          response: data.response,
          scriptures: data.scriptures || [],
        });
        setScreen("response");

        if (!user) incrementGuestQuestions();
        else await incrementDailyUsage();
      } catch (err: any) {
        toast.error(err.message || "Could not seek wisdom at this time.");
      } finally {
        setIsLoading(false);
      }
    },
    [user, ageGroup, needsDob, checkDailyLimit, incrementDailyUsage]
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
    await supabase
      .from("profiles")
      .update({ plan: "free", role: "free" } as any)
      .eq("user_id", user.id);
    await refreshProfile();
  };

  const showAuthModal = authModal.open && !needsDob;
  const showDobModal = needsDob && !!user;

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

  // Determine which nudge banner to show
  const showDay14Banner = trial.isOnTrial && trial.daysLeft <= 16 && trial.daysLeft > 9 && !trial.trialNudgeSent.day14 && !nudgeDismissed.day14;
  const showDay28Banner = trial.isOnTrial && trial.daysLeft <= 2;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Trial nudge banners */}
      {(showDay14Banner || showDay28Banner) && (hasOnboarded || user) && (
        <div className="fixed top-0 left-0 right-0 z-30">
          <TrialNudgeBanner
            daysLeft={trial.daysLeft}
            variant={showDay28Banner ? "day28" : "day14"}
            onDismiss={() => {
              setNudgeDismissed(prev => ({ ...prev, day14: true }));
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
            setNudgeDismissed(prev => ({ ...prev, day21: true }));
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
            <AskScreen onSeekWisdom={seekWisdom} isLoading={isLoading} />
          ) : currentResponse ? (
            <ResponseScreen
              question={currentResponse.question}
              response={currentResponse.response}
              scriptures={currentResponse.scriptures}
              onAskAgain={() => { setScreen("ask"); setCurrentResponse(null); }}
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
            />
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
      {(hasOnboarded || user) && <nav className="fixed bottom-0 left-0 right-0 bg-nav/95 backdrop-blur-sm border-t border-gold/15 z-30">
        <div className="flex max-w-lg mx-auto">
          <button
            onClick={() => handleTabChange("ask")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "ask" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            <Flame size={18} strokeWidth={1.5} />
            <span className="font-serif text-[10px] tracking-widest uppercase">Ask</span>
          </button>
          <button
            onClick={() => handleTabChange("scripture")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "scripture" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            {!hasFullAccess && user ? <Lock size={18} strokeWidth={1.5} /> : <BookText size={18} strokeWidth={1.5} />}
            <span className="font-serif text-[10px] tracking-widest uppercase">Scripture</span>
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "history" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            {!hasFullAccess && user ? <Lock size={18} strokeWidth={1.5} /> : <Clock size={18} strokeWidth={1.5} />}
            <span className="font-serif text-[10px] tracking-widest uppercase">History</span>
          </button>
          <button
            onClick={() => handleTabChange("journal")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "journal" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            {!hasFullAccess && user ? <Lock size={18} strokeWidth={1.5} /> : <BookOpen size={18} strokeWidth={1.5} />}
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
          {isAdmin && (
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
              title="Settings"
            >
              <Settings size={16} />
            </button>
          )}
          {user && (
            <button
              onClick={() => setShowLanguageSettings(true)}
              className="text-muted-foreground hover:text-gold transition-colors"
              title="Language"
            >
              <Globe size={16} />
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

      <AuthModal
        isOpen={showDobModal}
        onClose={() => {}}
        dobOnly
        userId={user?.id}
        onDobSubmitted={() => refreshProfile()}
        message="So your experience feels right for where you are in life."
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
