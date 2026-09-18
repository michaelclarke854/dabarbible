# Roadmap

- [ ] ARIA #69 — Public indexable KJV passage (/scripture/:book/:chapter) and question (/questions/:slug) pages, with mandatory crisis + disclaimer block, guest ask handoff, sitemap. Plan awaiting approval.
- [x] ARIA #11 — Automated onboarding reflection prompts, days 1–3 plus a day-4 "we're here when you're ready" note for users who never reflected. Already shipped: `onboarding-prompts` edge function + `onboarding_prompt_log` + daily 13:00 UTC cron. Verify only.
- [x] Read-only: paste check-entitlement function + its call sites as a reference for another app.
- [x] ARIA #9 — "Your Last Reflection Was Powerful" 7/14/30-day reactivation series. Already shipped: `reflection-recall` edge function + `reflection_recall_log` + daily 16:00 UTC cron, four warm subject variants. Verified live.
