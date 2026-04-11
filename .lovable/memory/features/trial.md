---
name: 30-day trial system
description: Free trial flow — signup sets plan=trial for 30 days, nudge schedule at day 14/21/28, paywall on expiry
type: feature
---
## Trial Flow
- New signups: plan='trial', role='personal', trial_started_at=now(), trial_ends_at=now()+30d
- Full Personal access during trial (unlimited questions, journal, scripture, history)
- No credit card collected during trial

## Trial Columns (profiles)
- trial_started_at, trial_ends_at, trial_converted, trial_nudge_sent (jsonb)

## Nudge Schedule
- Day 14: dismissable thin banner
- Day 21: full-screen interstitial with personalized stats
- Day 28: persistent banner
- Day 30: paywall screen (TrialPaywall component)

## Expiry
- Edge function: expire-trials (called daily at 9am UTC via pg_cron)
- Downgrades plan→free, role→free, sets expires_at on wisdom_sessions (90 days)

## Guest Limit
- GUEST_LIMIT = 3 (localStorage tracked)
- After 3 guest questions → auth modal with 30-day trial messaging

## Components
- TrialBadge — header badge showing days left
- TrialNudgeBanner — day 14 and day 28 banners
- TrialInterstitial — day 21 full-screen modal
- TrialPaywall — day 30 paywall
