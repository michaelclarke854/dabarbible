# Pastoral Outreach Email Copy Refresh

## Goal

Rewrite the three cold-outreach templates in `supabase/functions/pastoral-outreach/index.ts` so the first sentence and the value proposition name the actual DABAR differentiator: the unified voice of prophets, disciples, and Jesus answering a specific question, grounded in KJV scripture. Keep the same honest, low-pressure tone because the sender is a founder, not a marketer, and the recipients are clergy.

## Current templates and the gaps

| Template | Current subject | Current lead | Gap |
|---|---|---|---|
| `initial_outreach` | "Free tool for your congregation's scripture reflection — honest ask" | "a scripture reflection app that helps people bring their hardest questions to the Bible and receive responses grounded in the Word" | Never names the unified-voice mechanism or the specific question/answer format. Could describe YouVersion, a devotional app, or any Bible-study tool. |
| `follow_up_1` | "Re: DABAR — quick follow-up" | Adds the pastor dashboard / themes | Good, but assumes the first email landed. Should briefly restate the differentiated hook for pastors who skim. |
| `follow_up_2` | "DABAR — last note" | Soft close | Fine structurally, but misses a final chance to state the unique benefit in one line. |

## What we'll change

### 1. `initial_outreach`

Lead with the product mechanism, not the category. Proposed arc:

1. One-sentence mechanism statement: DABAR answers a specific question in the unified voice of the prophets, disciples, and Jesus, grounded in KJV scripture. (Not "a Bible app.")
2. The ask: 5 minutes, ask it a question you'd expect from your flock, then tell me if it's theologically trustworthy enough to recommend.
3. Optional congregation offer: free access + pastor dashboard showing themes, not individual questions.
4. Links: app, doctrinal statement, unsubscribe.
5. Signature: Mike Clarke, Founder, DABAR, mike@dabarbible.com.

Subject line options to test (keep one):

- "A question-answering tool for your flock, grounded in KJV scripture — honest ask"
- "Not a Bible-reading app — a tool that answers questions in the voice of scripture"

Recommendation: use the first subject because it is concrete and avoids negation; keep the second as a fallback if open rates are low.

### 2. `follow_up_1`

Keep the pastor-dashboard detail, but add one sentence at the top that re-anchors the differentiated value: e.g., "The response your congregant gets is not a reading plan or a verse-of-the-day; it's a single answer shaped from the prophets, disciples, and Jesus, with KJV scripture quoted in full." Then the dashboard paragraph. Keep the soft opt-out.

### 3. `follow_up_2`

Keep the final-note framing. Add one short closing line: "If you ever want to revisit, DABAR is at dabarbible.com — a place to bring one hard question and hear the unified voice of scripture answer it." Then doctrinal link and sign-off.

## Static vs. dynamic: recommendation

### Keep it static, but with verified-variable insertion only.

Reasoning:

- **Fabrication risk is real.** A pastor receiving an email that claims something false about their church, city, or congregation is a credibility destroyer. AI can easily hallucinate a denomination stance, a recent sermon theme, or a local event.
- **Volume is small.** The function only contacts leads in `pastoral_leads` and caps at 20 per run. Manual review is feasible if volume grows, we can add a human approval queue later.
- **Clergy have low tolerance for synthetic tone.** A generic AI-cold email is recognizable and damages the "honest ask" positioning.
- **What we can safely personalize** is only the fields already captured in `pastoral_leads` and verified by a human: `name`, `church_name`, `city`, `state`, `denomination`, `church_size`. These can be interpolated into the static templates, e.g., "Hi {name}," or "I noticed {church_name} is in {city}."

### Optional future path: AI-assisted drafting with mandatory human approval.

If the user later wants more personalization, the safe architecture is:

- AI generates a draft from a strict prompt that explicitly forbids inventing facts.
- The draft is stored in a `pending_outreach_drafts` table.
- A human approves each draft before the `run_cadence` action sends it.
- Out of scope for this plan.

## Implementation approach

### Option A (recommended): rewrite the existing string literals in place.

- Edit `supabase/functions/pastoral-outreach/index.ts` only.
- Keep the `EMAIL_TEMPLATES` object structure.
- Interpolate only verified `Lead` fields (`name`, `church_name`, `city`, `state`, `denomination`, `church_size`).
- No new dependencies or tables.
- Deploy the function.
- Send a test via the admin "Run cadence now" button or a direct function invocation with a test lead first.

### Option B (longer-term hygiene): move templates to the `email_templates` table.

- The project already uses `email_templates` for `send-pastoral-approval`.
- Pros: non-engineers can edit copy, versioned in the DB, consistent with existing pastoral email flow.
- Cons: adds a migration + DB read on every send, requires a small refactor of the cadence loop, and needs a manual row insert for each template before deployment.
- Recommendation: defer unless the user wants marketing to own copy going forward.

### Styling note (optional)

The current templates are bare HTML `<p>` tags. The auth emails and pastoral approval email use the DABAR brand (parchment, gold, Cinzel). For consistency, we could optionally convert the outreach templates to the same React Email components or at least add inline brand styles. This is a polish step, not required for the copy rewrite.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Fabrication about a pastor's church | Use static copy + only verified fields. No AI generation in this phase. |
| Subject line hurts deliverability | Keep subject under 60 chars, no spammy words, include "honest ask" or founder framing. Test one variant at a time. |
| Tone becomes too salesy | Preserve the founder-to-pastor voice: short sentences, one ask, explicit opt-out. |
| Theological claim oversteps | Avoid saying DABAR "teaches" or "preaches"; keep it as "a reflection tool" and link to the doctrinal statement. |
| Spam/ unsubscribe complaints | The templates already include an unsubscribe link and a reason for contact. Keep both. |
| Brand mismatch | Align the new copy with the in-app system prompt: "unified voice of biblical wisdom — prophets, disciples, and Jesus." |

## Validation

1. Read the new templates aloud to confirm they sound like Mike Clarke, not marketing copy.
2. Run the function against a test lead with a real email address the team owns.
3. Check deliverability/rendering in Gmail and Outlook.
4. After the first batch of ~20 real pastors, check the reply rate and adjust the subject line if reply rate drops.

## Out of scope

- Adding AI-generated per-lead personalization in this phase.
- Moving templates to `email_templates` table or React Email unless explicitly requested.
- Changing the cadence timing (7 days between sends), the `run_cadence` logic, or the lead status machine.
- Modifying the unsubscribe flow or the public `unsubscribe` action.

## Files I would touch

```text
supabase/functions/pastoral-outreach/index.ts   (template strings only)
```

No other files unless we choose Option B (table-backed templates) or the optional styling pass.
