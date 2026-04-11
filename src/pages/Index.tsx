import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AskScreen from "@/components/AskScreen";
import ResponseScreen from "@/components/ResponseScreen";
import JournalScreen from "@/components/JournalScreen";
import AuthModal from "@/components/AuthModal";
import type { User } from "@supabase/supabase-js";

type Tab = "ask" | "journal";
type Screen = "ask" | "response";

const FREE_QUESTION_LIMIT = 3;
const STORAGE_KEY = "the-voice-questions-used";

const getQuestionsUsed = (): number => {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
};

const incrementQuestionsUsed = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(getQuestionsUsed() + 1));
  } catch {}
};

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
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
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    message?: string;
  }>({ open: false });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const seekWisdom = useCallback(
    async (question: string) => {
      // Check free limit for guests
      if (!user && getQuestionsUsed() >= FREE_QUESTION_LIMIT) {
        setAuthModal({
          open: true,
          message:
            "Your words are worth keeping. Create a free account to save your reflections and continue seeking.",
        });
        return;
      }

      setIsLoading(true);
      setIsSaved(false);

      try {
        const { data, error } = await supabase.functions.invoke("seek-wisdom", {
          body: { question, userId: user?.id || null },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setCurrentResponse({
          question,
          response: data.response,
          scriptures: data.scriptures || [],
        });
        setScreen("response");

        if (!user) incrementQuestionsUsed();
      } catch (err: any) {
        toast.error(err.message || "Could not seek wisdom at this time.");
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const reflectOnThis = useCallback(async () => {
    if (!user) {
      setAuthModal({
        open: true,
        message:
          "Create a free account to save this reflection to your journal.",
      });
      return;
    }
    if (!currentResponse) return;

    setIsSaving(true);
    try {
      // Find the most recent session matching this question/response
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
  }, [user, currentResponse]);

  const handleTabChange = (newTab: Tab) => {
    if (newTab === "journal" && !user) {
      setAuthModal({ open: true, message: "Sign in to view your journal." });
      return;
    }
    setTab(newTab);
    if (newTab === "ask") setScreen("ask");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {tab === "ask" ? (
          screen === "ask" ? (
            <AskScreen onSeekWisdom={seekWisdom} isLoading={isLoading} />
          ) : currentResponse ? (
            <ResponseScreen
              question={currentResponse.question}
              response={currentResponse.response}
              scriptures={currentResponse.scriptures}
              onAskAgain={() => {
                setScreen("ask");
                setCurrentResponse(null);
              }}
              onReflect={reflectOnThis}
              isSaving={isSaving}
              isSaved={isSaved}
            />
          ) : null
        ) : (
          <JournalScreen />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-parchment/95 backdrop-blur-sm border-t border-border">
        <div className="flex max-w-lg mx-auto">
          <button
            onClick={() => handleTabChange("ask")}
            className={`flex-1 py-4 text-center font-serif text-xs tracking-widest uppercase transition-colors ${
              tab === "ask" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            Ask
          </button>
          <button
            onClick={() => handleTabChange("journal")}
            className={`flex-1 py-4 text-center font-serif text-xs tracking-widest uppercase transition-colors ${
              tab === "journal" ? "text-gold" : "text-muted-foreground"
            }`}
          >
            Journal
          </button>
        </div>
      </nav>

      {/* User auth indicator */}
      {user && (
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out.");
          }}
          className="fixed top-4 right-4 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      )}

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false })}
        message={authModal.message}
      />
    </div>
  );
};

export default Index;
