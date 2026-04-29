/**
 * Dev-only fixture pages used by the Playwright **gate** E2E suite.
 *
 * Each fixture renders the real gate UI in a deterministic state so the
 * spec can assert behaviour without needing to drive Supabase auth, set
 * cookies, or mutate the database.
 *
 * These routes are mounted in src/App.tsx behind `import.meta.env.DEV`,
 * so they are tree-shaken from production builds.
 *
 * Naming: every gate marker uses a stable `data-gate="..."` attribute so
 * the spec stays decoupled from class names and copy revisions.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TrialPaywall from "@/components/TrialPaywall";
import { LandingHero } from "@/components/LandingHero";
import AskScreen from "@/components/AskScreen";
import ResponseScreen from "@/components/ResponseScreen";

// ─── Shared fixture data ─────────────────────────────────────────────────────

const FIXTURE_QUESTION = "How do I keep going when nothing changes?";
const FIXTURE_RESPONSE = `The repetition you describe is not a verdict.
It is a question the soul keeps asking until you can hear it without flinching.

[SCRIPTURE]
reference: Galatians 6:9
text: And let us not be weary in well doing: for in due season we shall reap, if we faint not.
[/SCRIPTURE]

Endurance is not the absence of fatigue — it is the willingness to remain.
Sit with the specific shape of what wears you down. Name it without softening it.

[SCRIPTURE]
reference: Isaiah 40:31
text: But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.
[/SCRIPTURE]

What would change if you stopped measuring this season by what is moving and started measuring it by who is being formed?
`;

// ─── Soft-gate card (extracted shape from Index.tsx renderSoftGate) ──────────
// Rendered identically by the GuestSoftGateFixture and GuestBlurGateFixture
// below. Kept in this file so the fixtures stay self-contained and the
// production Index.tsx code path is untouched.
const SoftGateCard = ({ variant }: { variant: "soft" | "blur" }) => {
  const responseLines = FIXTURE_RESPONSE.split("\n");
  const cutoff = Math.floor(responseLines.length * 0.4);
  return (
    <AnimatePresence>
      <motion.div
        key="soft-gate"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0 }}
        className="mt-6"
        data-gate={variant === "blur" ? "blur" : "soft"}
      >
        <div className="relative">
          <div className="soft-gate-blur" data-gate-blur-region>
            {responseLines.slice(cutoff).map((line, i) => (
              <p
                key={i}
                className="font-serif text-base leading-relaxed text-foreground mb-2"
              >
                {line}
              </p>
            ))}
          </div>
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
            transition={{ duration: 0 }}
            className="absolute inset-0 flex items-center justify-center px-4"
          >
            <div
              className="dabar-glass border border-gold/30 rounded-sm p-6 text-center max-w-sm shadow-xl"
              data-gate-card
            >
              <p className="font-serif text-lg text-foreground mb-2">
                Unlock your full answer
              </p>
              <p className="font-body text-xs text-muted-foreground mb-4 leading-relaxed">
                Start your 30-day free trial — unlimited questions, full
                responses, journal access. No card required.
              </p>
              <button
                data-gate-cta="signup"
                className="w-full font-serif text-sm tracking-widest uppercase py-3 bg-gold text-primary-foreground rounded-sm hover:bg-gold-dark transition-all mb-3"
              >
                Start free trial
              </button>
              <p className="text-xs font-body text-muted-foreground">
                Already have an account?{" "}
                <button data-gate-cta="signin" className="text-gold hover:underline">
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

// ─── Fixture 1: guest soft gate (3rd guest question) ─────────────────────────

export const GuestSoftGateFixture = () => (
  <div className="min-h-screen bg-background" data-fixture="guest-soft-gate">
    <ResponseScreen
      question={FIXTURE_QUESTION}
      response={FIXTURE_RESPONSE}
      scriptures={["Galatians 6:9", "Isaiah 40:31"]}
      isStreaming={false}
      agentStage={null}
      onAskAgain={() => {}}
      onReflect={() => {}}
      onStir={() => {}}
      isSaving={false}
      isSaved={false}
    />
    <SoftGateCard variant="soft" />
  </div>
);

// ─── Fixture 2: guest blur gate (4th+ guest question) ────────────────────────

export const GuestBlurGateFixture = () => (
  <div className="min-h-screen bg-background" data-fixture="guest-blur-gate">
    <ResponseScreen
      question={FIXTURE_QUESTION}
      response={FIXTURE_RESPONSE}
      scriptures={["Galatians 6:9", "Isaiah 40:31"]}
      isStreaming={false}
      agentStage={null}
      onAskAgain={() => {}}
      onReflect={() => {}}
      onStir={() => {}}
      isSaving={false}
      isSaved={false}
    />
    <SoftGateCard variant="blur" />
  </div>
);

// ─── Fixture 3: trial-expired paywall (signed-in user, plan=trial, ended) ────

export const TrialExpiredPaywallFixture = () => (
  <div data-fixture="trial-expired-paywall">
    <TrialPaywall
      questionCount={47}
      onUpgrade={() => {}}
      onFreePlan={async () => {}}
    />
  </div>
);

// ─── Fixture 4: free user — locked tab UI (Lock icons in nav) ────────────────
// Renders only the bottom-nav shape that Index.tsx emits when user is signed
// in but `hasFullAccess === false` (plan='free'). Pure presentational copy.

export const FreeUserLockedNavFixture = () => (
  <div
    className="min-h-screen bg-background flex flex-col"
    data-fixture="free-user-locked-nav"
  >
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center px-6">
        <p className="font-serif text-lg text-foreground mb-2">
          Free plan — 3 questions per day
        </p>
        <p className="font-body text-sm text-muted-foreground">
          Scripture, History, and Journal require an upgrade.
        </p>
      </div>
    </main>
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 bg-nav/95 backdrop-blur-sm border-t border-gold/15 z-30"
      data-fixture-nav
    >
      <div className="flex max-w-lg mx-auto" role="tablist">
        <button role="tab" data-tab="ask" data-locked="false" className="flex-1 py-3 text-gold">
          <span className="font-serif text-[10px] tracking-widest uppercase">Ask</span>
        </button>
        <button role="tab" data-tab="scripture" data-locked="true" className="flex-1 py-3 text-muted-foreground">
          <span className="font-serif text-[10px] tracking-widest uppercase">🔒 Scripture</span>
        </button>
        <button role="tab" data-tab="history" data-locked="true" className="flex-1 py-3 text-muted-foreground">
          <span className="font-serif text-[10px] tracking-widest uppercase">🔒 History</span>
        </button>
        <button role="tab" data-tab="journal" data-locked="true" className="flex-1 py-3 text-muted-foreground">
          <span className="font-serif text-[10px] tracking-widest uppercase">🔒 Journal</span>
        </button>
      </div>
    </nav>
  </div>
);

// ─── Fixture 5: subscribed user — unlocked tab UI ────────────────────────────
// Mirror of fixture 4 but with all tabs unlocked (hasFullAccess === true).

export const SubscribedUserUnlockedNavFixture = () => (
  <div
    className="min-h-screen bg-background flex flex-col"
    data-fixture="subscribed-user-unlocked-nav"
  >
    <main className="flex-1 flex items-center justify-center">
      <p className="font-serif text-lg text-foreground">Personal plan — full access</p>
    </main>
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 bg-nav/95 backdrop-blur-sm border-t border-gold/15 z-30"
      data-fixture-nav
    >
      <div className="flex max-w-lg mx-auto" role="tablist">
        <button role="tab" data-tab="ask" data-locked="false" className="flex-1 py-3 text-gold">
          <span className="font-serif text-[10px] tracking-widest uppercase">Ask</span>
        </button>
        <button role="tab" data-tab="scripture" data-locked="false" className="flex-1 py-3 text-muted-foreground">
          <span className="font-serif text-[10px] tracking-widest uppercase">Scripture</span>
        </button>
        <button role="tab" data-tab="history" data-locked="false" className="flex-1 py-3 text-muted-foreground">
          <span className="font-serif text-[10px] tracking-widest uppercase">History</span>
        </button>
        <button role="tab" data-tab="journal" data-locked="false" className="flex-1 py-3 text-muted-foreground">
          <span className="font-serif text-[10px] tracking-widest uppercase">Journal</span>
        </button>
      </div>
    </nav>
  </div>
);

// ─── Fixture 6: guest landing hero (first visit, before any question) ────────

export const GuestLandingHeroFixture = () => {
  // LandingHero handles its own animation timers; nothing else to do.
  useEffect(() => {}, []);
  return (
    <div data-fixture="guest-landing-hero">
      <LandingHero onSeekWisdom={() => {}} isLoading={false} onSignIn={() => {}} />
    </div>
  );
};

// ─── Fixture 7: guest empty AskScreen (post-landing, pre-first-question) ─────

export const GuestAskOpenFixture = () => (
  <div className="min-h-screen bg-background" data-fixture="guest-ask-open">
    <AskScreen onSeekWisdom={() => {}} isLoading={false} />
  </div>
);