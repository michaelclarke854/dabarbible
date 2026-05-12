# DABAR Apple Resubmission — Capacitor Translation Plan

Confirmed bundle ID: `com.dabarbible.app`. Stack: Capacitor 8 + React 18 + Vite + Lovable Cloud managed auth.

## Block 1 — Database migrations

Single migration adding everything not already present:

- **`support_requests`** table (new) — exact schema from prompt, with RLS: anon+auth INSERT, auth SELECT own.
- **`subscriptions`** ALTER — add `tier`, `current_period_end`, `cancel_at_period_end`, `stripe_customer_id`, `provider` (default `'stripe'`), `revenuecat_user_id`, `revenuecat_entitlement`, `apple_product_id`, `environment`, `last_webhook_event_id`, `updated_at`. Add `(user_id, provider)` unique index. Existing data left intact.
- **`processed_webhook_events`** already exists — add `provider` column if missing; otherwise skip.

## Block 2 — RevenueCat webhook edge function

`supabase/functions/revenuecat-webhook/index.ts` — exact logic from prompt. Adds `verify_jwt = false` config block. Authentication via shared-secret header (`REVENUECAT_WEBHOOK_AUTH`).

I'll request the secret via `add_secret` so you can paste a generated random value (same value goes into the RevenueCat dashboard webhook config).

## Block 3 — Reviewer premium row

The reviewer auth user already exists (created on demand by the `reviewer-signin` edge function from the bypass-code work). I'll insert/upsert an `active` Personal subscription row for `reviewer@dabarbible.com` with `current_period_end = now() + 1 year`, `provider = 'stripe'`, so all paywalled paths unlock for the reviewer.

## Block 4 — Sign in with Apple

Two-track because of Capacitor:

1. **Web / browser** (preview, dabarbible.com): use **Lovable Cloud managed Apple OAuth** via `lovable.auth.signInWithOAuth("apple", ...)`. I'll call `supabase--configure_social_auth` with `providers: ["apple"]`.
2. **Native iOS**: install `@capacitor-community/apple-sign-in`, detect `Capacitor.isNativePlatform() && platform === 'ios'`, run the native flow, then `supabase.auth.signInWithIdToken({ provider: 'apple', token })`.

Add a single **"Continue with Apple"** button in `AuthModal.tsx` *above* the Google button (Apple HIG / 4.8.0 placement requirement). Same height / weight as Google button.

You will still need to do the manual Apple Developer Portal steps (Services ID, .p8 key, return URL) — I'll list them in the close-out.

## Block 5 — `/support` page

New `src/pages/Support.tsx` (Tailwind/React, matching DABAR design tokens — parchment, ink, gold, Cinzel/Lato — not the generic stone palette in the prompt). Public route added to `src/App.tsx` above the `*` catch-all. Inserts into `support_requests`, exposes `support@dabarbible.com`, FAQ section.

## Block 6 — Strip non-iOS references

Single edit: `src/components/OnboardingScreen.tsx:232` — replace `"iOS & Android apps coming soon"` with `"Available on iOS"`. Also sweep `index.html`, blog content, and email templates to confirm nothing else slipped in.

## Block 7 — RevenueCat init (Capacitor)

Install `@revenuecat/purchases-capacitor`. Create `src/lib/revenuecat.ts` with `initRevenueCat`, `identify`, `logout` — all gated behind `Capacitor.getPlatform() === 'ios'`. No-ops on web. Hook `init` into `AuthContext` after session resolves; `identify` on SIGNED_IN; `logout` on SIGNED_OUT.

The public iOS API key goes in an env var `VITE_REVENUECAT_IOS_KEY` — you'll paste this from the RevenueCat dashboard. I'll leave a `// TODO mike` comment + warn if missing.

## Block 8 — Paywall iOS gate

In `BillingConfirmModal.tsx` / `TrialPaywall.tsx` / `PricingPage.tsx`:
- **Web (default)**: existing Stripe `create-checkout` flow stays untouched.
- **Native iOS**: replace the "Subscribe" button handler with `Purchases.purchasePackage(pkg)` from RevenueCat, plus a **Restore Purchases** button (Apple requires it). Add the **auto-renew disclosure paragraph + ToS/Privacy links** below the buy buttons (Apple 3.1.2 requirement).

`useIsPremium` / `hasFullAccess` in `AuthContext` already reads from `subscriptions` — no logic change needed once new columns exist (it'll see RC-written rows the same way it sees Stripe rows).

## Block 9 — Verification

- `tsc --noEmit` clean (build runs automatically — I'll watch console)
- DB checks: confirm new columns exist, reviewer row present
- Edge function curl with bad/good auth header
- Grep: zero remaining "Android" / "Google Play" / "Subscribe on web" in `src/`
- Native verification (Apple sign-in button, IAP flow, restore) is **deferred to you on a real iOS device** — I cannot run native code in the sandbox preview.

## Block 10 — Open items list (delivered as final message)

The Apple Developer Portal steps, App Store Connect IAP setup, RevenueCat dashboard config, secret rotation, and `eas`-equivalent (here: `npx cap sync && open ios/App/App.xcworkspace`) build/submit instructions — translated for Capacitor + Xcode (no `eas`).

---

## Risks I want you to acknowledge before I start

1. **Native plug-ins won't work in the Lovable preview** — `@capacitor-community/apple-sign-in` and `@revenuecat/purchases-capacitor` only execute inside the native iOS shell. The web preview will fall back to the existing Google + Stripe path. You must `npx cap sync` and run in Xcode/TestFlight to verify these.
2. **Lovable Cloud managed Apple OAuth** uses Lovable's Apple credentials by default. If Apple App Review needs the bundle-ID-bound flow only, you'll need BYOC (your own Services ID + .p8) — I can't configure that for you; it's a dashboard step.
3. **Subscription schema migration is additive only** — no existing rows will be rewritten. The `tier` column is added with default `'personal'` so existing trial / free rows remain valid.
4. **No `eas` here** — submission is Xcode → Archive → Distribute → App Store Connect (or `fastlane`, which is already in `ios/App/fastlane/`).

Approve and I'll execute Blocks 1–9 in order, requesting the RevenueCat webhook secret partway through.
