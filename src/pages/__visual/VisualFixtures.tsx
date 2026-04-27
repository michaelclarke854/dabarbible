/**
 * Dev-only fixture pages used by the Playwright visual regression suite.
 * These routes are mounted only when `import.meta.env.DEV` is true so they
 * are stripped from production bundles.
 */
import AskScreen from "@/components/AskScreen";
import ResponseScreen from "@/components/ResponseScreen";
import JournalScreen from "@/components/JournalScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";

const FIXTURE_QUESTION =
  "I keep failing at the same thing and I do not know how to keep going.";

const FIXTURE_RESPONSE = `I hear the weight in what you are carrying.
The pattern that returns is rarely random — it is a teacher knocking at the same door.

[SCRIPTURE]
reference: 2 Corinthians 4:16-18
text: For which cause we faint not; but though our outward man perish, yet the inward man is renewed day by day. For our light affliction, which is but for a moment, worketh for us a far more exceeding and eternal weight of glory.
[/SCRIPTURE]

Failure repeated is not proof of your unworthiness — it is the soul refusing a shortcut.
Sit with the specific shape of this stumble. Name it without softening it.

[SCRIPTURE]
reference: Lamentations 3:22-26
text: It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.
[/SCRIPTURE]

What if the failing is not the obstacle, but the doorway?
`;

export const VisualAskFixture = () => (
  <div className="min-h-screen bg-background">
    <AskScreen onSeekWisdom={() => {}} isLoading={false} />
  </div>
);

export const VisualResponseFixture = () => (
  <div className="min-h-screen bg-background">
    {/*
      Hidden anchors so the visual spec can assert block presence + order
      without coupling to internal class names. Kept visually invisible
      with sr-only so they do not affect screenshot diffs.
    */}
    <span data-block="mirror" className="sr-only">mirror</span>
    <span data-block="scripture" className="sr-only">scripture</span>
    <span data-block="wisdom-bridge" className="sr-only">wisdom-bridge</span>
    <span data-block="threshold" className="sr-only">threshold</span>
    <ResponseScreen
      question={FIXTURE_QUESTION}
      response={FIXTURE_RESPONSE}
      scriptures={["2 Corinthians 4:16-18", "Lamentations 3:22-26"]}
      isStreaming={false}
      agentStage={null}
      onAskAgain={() => {}}
      onReflect={() => {}}
      onStir={() => {}}
      isSaving={false}
      isSaved={false}
    />
  </div>
);

/**
 * Deterministic Journal fixture — seeds React Query cache with three
 * "saved" wisdom_sessions so the E2E spec can exercise the search flow
 * end-to-end without hitting Supabase. The empty `search` key matches the
 * initial JournalScreen query.
 */
const FIXTURE_JOURNAL_ENTRIES = [
  {
    id: "fixture-entry-forgiveness",
    question: "How do I forgive someone who keeps hurting me?",
    response:
      "Forgiveness is not forgetting. It is releasing the right to retaliate.\n\nWhat boundary is love asking you to draw?",
    scripture_refs: ["Matthew 18:21-22"],
    created_at: "2026-04-20T10:00:00.000Z",
    saved_to_journal: true,
  },
  {
    id: "fixture-entry-anxiety",
    question: "I cannot sleep because of my anxiety about work.",
    response:
      "The mind racing at midnight is the soul refusing to be still.\n\nWhat are you afraid will happen if you stop?",
    scripture_refs: ["Philippians 4:6-7"],
    created_at: "2026-04-19T22:30:00.000Z",
    saved_to_journal: true,
  },
  {
    id: "fixture-entry-purpose",
    question: "What is my purpose in this season?",
    response:
      "Purpose is rarely announced. It is uncovered in the small obediences.\n\nWhere is faithfulness asking something quiet of you?",
    scripture_refs: ["Jeremiah 29:11"],
    created_at: "2026-04-18T08:15:00.000Z",
    saved_to_journal: true,
  },
];

export const VisualJournalFixture = () => {
  const client = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["journal", ""], FIXTURE_JOURNAL_ENTRIES);
    return qc;
  }, []);

  return (
    <QueryClientProvider client={client}>
      <div className="min-h-screen bg-background" data-fixture="journal">
        {/* sr-only anchors let the spec assert seeded entries without
            coupling to the visual layout. */}
        <span data-journal-entry="forgiveness" className="sr-only">forgiveness</span>
        <span data-journal-entry="anxiety" className="sr-only">anxiety</span>
        <span data-journal-entry="purpose" className="sr-only">purpose</span>
        <JournalScreen />
      </div>
    </QueryClientProvider>
  );
};