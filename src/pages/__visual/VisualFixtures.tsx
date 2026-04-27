/**
 * Dev-only fixture pages used by the Playwright visual regression suite.
 * These routes are mounted only when `import.meta.env.DEV` is true so they
 * are stripped from production bundles.
 */
import AskScreen from "@/components/AskScreen";
import ResponseScreen from "@/components/ResponseScreen";

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