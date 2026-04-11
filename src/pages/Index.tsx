import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Flame, BookOpen, Globe } from "lucide-react";
import AskScreen from "@/components/AskScreen";
import ResponseScreen from "@/components/ResponseScreen";
import JournalScreen from "@/components/JournalScreen";
import AuthModal from "@/components/AuthModal";
import LanguageSettings from "@/components/LanguageSettings";
import OnboardingScreen from "@/components/OnboardingScreen";
import type { User } from "@supabase/supabase-js";

type Tab = "ask" | "journal";
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

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string>("free");
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
  const [needsDob, setNeedsDob] = useState(false);
  const [stirPrompt, setStirPrompt] = useState<string | null>(null);
  const [languagePreference, setLanguagePreference] = useState("en");
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
  });

  const fetchUserData = useCallback(async (userId: string) => {
    // Fetch age group
    const { data: profile } = await supabase
      .from("profiles")
      .select("age_group, language_preference")
      .eq("user_id", userId)
      .single();
    const ag = profile?.age_group;
    const lp = profile?.language_preference;
    if (ag) {
      setAgeGroup(ag);
      setNeedsDob(false);
      if (ag === "minor") {
        toast.error("Dabar is designed for ages 13 and up. Ask a parent or guardian to create a Family Account.");
        await supabase.auth.signOut();
        return;
      }
    } else {
      setNeedsDob(true);
    }
    if (lp) {
      setLanguagePreference(lp);
    }

    // Fetch subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();
    if (sub?.plan_type) {
      setPlanType(sub.plan_type);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) fetchUserData(u.id);
        else { setAgeGroup(null); setNeedsDob(false); setPlanType("free"); }
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchUserData(u.id);
    });
    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const checkDailyLimit = useCallback(async (): Promise<boolean> => {
    if (!user) return true; // guests use localStorage limit
    if (planType !== "free") return true; // paid users unlimited

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
  }, [user, planType, navigate]);

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
      // Guest limit
      if (!user && getGuestQuestionsUsed() >= GUEST_LIMIT) {
        setAuthModal({
          open: true,
          message: "Your words are worth keeping. Create a free account to continue seeking — and to save what you've received.",
        });
        return;
      }

      // Daily limit for free users
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
        message: "Create a free account to save this reflection to your journal.",
      });
      return;
    }

    if (planType === "free") {
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
  }, [user, currentResponse, planType, navigate]);

  const handleTabChange = (newTab: Tab) => {
    if (newTab === "journal" && !user) {
      setAuthModal({ open: true, message: "Sign in to view your journal." });
      return;
    }
    if (newTab === "journal" && planType === "free") {
      toast("Journal requires a Personal plan or above.", {
        action: { label: "View Plans", onClick: () => navigate("/pricing") },
      });
      return;
    }
    setTab(newTab);
    if (newTab === "ask") setScreen("ask");
  };

  const showAuthModal = authModal.open && !needsDob;
  const showDobModal = needsDob && !!user;

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 ${hasOnboarded || user ? "pb-20" : ""}`}>
        {!hasOnboarded && !user ? (
          <OnboardingScreen
            onBegin={() => {
              try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
              setHasOnboarded(true);
            }}
          />
        ) : showLanguageSettings && user ? (
          <LanguageSettings
            userId={user.id}
            currentLanguage={languagePreference}
            onLanguageChanged={(lang) => {
              setLanguagePreference(lang);
              setShowLanguageSettings(false);
            }}
            onBack={() => setShowLanguageSettings(false)}
          />
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
                  if (planType === "free") return;
                  setStirPrompt(thresholdQ);
                  setTab("journal");
                });
              }}
              isSaving={isSaving}
              isSaved={isSaved}
            />
          ) : null
        ) : (
          <JournalScreen stirPrompt={stirPrompt} onStirConsumed={() => setStirPrompt(null)} />
        )}
      </main>

      {/* Bottom Navigation — hidden during onboarding */}
      {(hasOnboarded || user) && <nav className="fixed bottom-0 left-0 right-0 bg-parchment/95 backdrop-blur-sm border-t border-border z-30">
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
            onClick={() => handleTabChange("journal")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              tab === "journal" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            <BookOpen size={18} strokeWidth={1.5} />
            <span className="font-serif text-[10px] tracking-widest uppercase">Journal</span>
          </button>
        </div>
      </nav>}

      {/* Top bar — hidden during onboarding */}
      {(hasOnboarded || user) && <div className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-3">
        {user && planType === "free" && (
          <button
            onClick={() => navigate("/pricing")}
            className="text-[10px] font-body tracking-wider uppercase text-gold hover:text-gold-dark transition-colors border border-gold/30 px-3 py-1 rounded-sm"
          >
            Upgrade
          </button>
        )}
        <div className="flex items-center gap-3">
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setAuthModal({ open: false })}
        onSignedUp={() => { if (user) fetchUserData(user.id); }}
        message={authModal.message}
      />

      <AuthModal
        isOpen={showDobModal}
        onClose={() => {}}
        dobOnly
        userId={user?.id}
        onDobSubmitted={() => { if (user) fetchUserData(user.id); }}
        message="So your experience feels right for where you are in life."
      />
    </div>
  );
};

export default Index;
