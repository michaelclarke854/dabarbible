# Public KJV passage and question pages

Two new public routes that search visitors can land on, each ending in the existing guest "ask the Bible anything" flow.

## What gets built

**1. Scripture pages — `/scripture/:book/:chapter`**
- Full KJV 1769 chapter text, fetched through the existing scripture fetch path (KJV only).
- Chapter title, previous/next chapter links, and a link back to the book list.
- Launch set: Psalms 1–150 (hand-checked, listed in the sitemap). Other valid KJV books/chapters still render if visited, but only Psalms is submitted for indexing at first.

**2. Question pages — `/questions/:slug`**
- ~20 hand-written question pages matching what people actually search ("what does the Bible say about anxiety", grief, fear, loneliness, forgiveness, purpose, doubt, money worry, waiting on God, and so on).
- Each page: the question as the single H1, 4–6 KJV passages quoted in full with references, and short reflection framing in the product's existing voice. All copy is hand-written — no generated text on the page, no invented numbers, ratings or testimonials.
- Each question page links to the scripture chapters it quotes, and to related questions.

**3. Mandatory safety block on every public page**
A shared block rendered at the foot of every scripture and question page, because a search visitor arrives with no onboarding:
- Crisis routing: call or text **988** (Suicide & Crisis Lifeline), text **HOME to 741741** (Crisis Text Line), as real `tel:`/`sms:` links.
- Framing: this is not pastoral counsel, and not medical, legal or financial advice.
- Note that scripture is quoted from the public-domain King James Version (1769), reusing the existing KJV badge.

**4. Activation**
Each page ends with one warm invitation that hands off to the existing guest ask flow on the home screen with the question pre-filled — the same `guest_question_asked` path guests already use, and the same guarded `seek-wisdom` pipeline. No new ask entry point, no second pipeline. No countdowns, no urgency, no "last chance".

**5. Discovery**
- `public/sitemap.xml` and the `dabar-sitemap` function gain the Psalms chapters and the question slugs.
- Question pages are linked from the existing articles footer area so they are crawlable from anywhere on the site.

## Technical notes

- Routes added in `src/App.tsx` above the `/:slug` contributor catch-all: `/scripture/:book/:chapter` and `/questions/:slug`.
- New files: `src/pages/ScripturePage.tsx`, `src/pages/QuestionPage.tsx`, `src/data/questionPages.ts` (hand-written content), `src/components/PublicSafetyFooter.tsx`.
- Scripture text comes from the existing `fetchScripture` + `bible-proxy` path with `kjv` fixed; no other translation is reachable from these routes.
- Per-page `<title>`, meta description, canonical and JSON-LD via the existing `SEO`/Helmet setup.
- One small change in `src/pages/Index.tsx`: read a `?q=` parameter on arrival and pre-fill the guest ask box with it. Nothing else in the ask, trial, journal, auth, billing or pricing logic changes.
- Honest limitation: this app is a client-rendered single-page app, so these pages are not server-rendered. Google renders JavaScript and will index them, but other crawlers and social previews see less. True server rendering would need the TanStack Start upgrade — [what the upgrade gives you](https://lovable.dev/blog/building-apps-using-tanstack-start) — say the word and I can look at that separately.
