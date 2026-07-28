# Project Memory

## Core
"The Voice" — spiritual wisdom app. Parchment #F5F0E8, ink #0F0D0A, gold #C4973A.
Cinzel for serif/headings, Lato for body/UI. Mobile-first, sacred minimal aesthetic.
NO gamification, NO social, NO sharing. KJV Bible only. Unified wisdom voice.
Lovable Cloud backend. AI via Lovable AI Gateway (gemini-2.5-flash).
Billing: RevenueCat (iOS native) + create-checkout web proxy. Stripe fully removed (account closed). Tiers: Free / Trial / Personal / Family / Community.
Google OAuth via Lovable Cloud managed auth.
Guest limit: 3 questions (localStorage). New signups get 30-day free trial.
Contact email: @dabarbible.com for all pages.

## Memories
- [Design tokens](mem://design/tokens) — Full color system, fonts, animations
- [App architecture](mem://features/architecture) — Ask/Response/Journal screens, auth, DOB, usage tracking
- [Pricing](mem://features/pricing) — 4 tiers + trial, student rate, Paddle price IDs in app_config
- [System prompt](mem://features/system-prompt) — Mirror/Scripture/Wisdom Bridge/Threshold Question structure
- [Youth layer](mem://features/youth-prompt) — Age-sensitive crisis routing and non-paternalistic tone rules
- [Bible versions](mem://features/bible-versions) — KJV, WEB, ASV, BBE, DRA, YLT via bible-api.com proxy
- [Language](mem://features/language) — i18n waitlist system
- [Roles](mem://features/roles) — Role/plan system with super_admin lock
- [Trial system](mem://features/trial) — 30-day free trial, nudge schedule, paywall, pg_cron expiry
