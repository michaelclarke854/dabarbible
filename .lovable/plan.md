# iOS Sign-In Fix — App Store build

## Root cause

The App Store build serves the WebView from `capacitor://localhost/`. `AuthModal.handleApple` and `handleGoogle` both call:

```ts
lovable.auth.signInWithOAuth("apple" | "google", {
  redirect_uri: `${window.location.origin}/auth/callback`,
})
```

Inside the iOS WebView, `window.location.origin` is `capacitor://localhost`. The Lovable OAuth broker (`oauth.lovable.app/~oauth/initiate`) won't redirect back into a `capacitor://` URL — the popup/SFSafariViewController opens, the user authorizes, then the redirect drops on the floor. From the user's seat: spinner → blank → "load fail". The same is true for any email-confirmation deep link.

Email/password should still hit `https://crkkimoblnrxpszehmkg.supabase.co` directly and work. If the user reports it's broken too, it's almost certainly the OAuth overlay getting stuck (the modal sets `oauthLoading=true` and never clears it because the browser tab never returns), not a real auth-API failure. We'll add diagnostics to confirm before guessing further.

## What we'll build

### 1. Native Apple Sign-In (Apple HIG / 4.8.0 — required regardless)

- Install `@capacitor-community/apple-sign-in`.
- New `src/lib/nativeAuth.ts` exporting `signInWithAppleNative()`:
  - Calls `SignInWithApple.authorize({ clientId: 'com.dabarbible.app', scopes: 'email name', state: '...', nonce: '...' })`.
  - Hands the returned `identityToken` (+ `nonce`) to `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`.
- `AuthModal.handleApple` branches on `isIOSNative()`:
  - native → `signInWithAppleNative()` (no WebView redirect, runs in-process)
  - web → existing `lovable.auth.signInWithOAuth("apple", …)` flow, unchanged.
- Xcode side: enable the **Sign In with Apple** capability on the App target (manual step — I'll list it in the close-out; I can't toggle the entitlement from here).

### 2. Native Google Sign-In

- Install `@codetrix-studio/capacitor-google-auth`.
- `signInWithGoogleNative()` in the same `nativeAuth.ts`:
  - `GoogleAuth.initialize({ clientId: '<iOS client id>', scopes: ['email','profile'], grantOfflineAccess: false })` once at app launch (inside `AuthContext` mount, native-only).
  - `const { authentication: { idToken } } = await GoogleAuth.signIn()`.
  - `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
- `AuthModal.handleGoogle` branches on `isIOSNative()` the same way.
- You'll need to create an **iOS OAuth client** in Google Cloud Console (bundle `com.dabarbible.app`) and paste the client id + reversed-client-id URL scheme. New secret: `VITE_GOOGLE_IOS_CLIENT_ID`. URL scheme goes into `ios/App/App/Info.plist` `CFBundleURLTypes`.

### 3. Always-clear the OAuth overlay on native failure

Even with native flows, wrap every `signIn*Native()` call in try/finally that resets `oauthLoading=false` and surfaces the real `err.message` in the toast (current code only clears the spinner on the web `redirected===false` path). This kills the "infinite spinner / load fail" symptom for any non-redirect failure mode.

### 4. Email confirmation deep link

`supabase.auth.signUp` currently sets `emailRedirectTo: window.location.origin + '/auth/callback'` → `capacitor://localhost/auth/callback`, which Mail.app on iOS won't open. On native, send `emailRedirectTo: 'https://dabarbible.com/auth/callback'` instead — the Android intent filter already handles `https://dabarbible.com/auth/callback`; iOS needs a matching **Associated Domains** entitlement (`applinks:dabarbible.com`) + `apple-app-site-association` file at `https://dabarbible.com/.well-known/apple-app-site-association`. I can author the AASA JSON and add the entitlement note; you'll need to host the file (it's a flat JSON, no code).

Same change for `resetPasswordForEmail.redirectTo` in `AuthModal.handleForgotPassword`.

### 5. Diagnostics surface

The current reviewer-bypass easter egg is "tap title 5×". Add a sibling: tap title 5× while holding the `email` field focused → shows a small diagnostic panel:

- `Capacitor.getPlatform()`, `isNativePlatform()`, `navigator.userAgent`
- Supabase URL (already public), result of a `fetch(SUPABASE_URL + '/auth/v1/health')`
- Last auth error message + timestamp (stored in a module-level ref)

This lets reviewers — and you — paste the actual failure mode into a screenshot instead of "load fail".

### 6. Validation

- `tsc --noEmit` clean (build runs automatically).
- I can't reproduce the native flow in the Lovable preview. After `npx cap sync ios` + Xcode run on a real device, expected results:
  - Apple button → native sheet → returns signed in.
  - Google button → Google account chooser → returns signed in.
  - Email/password → no behavior change (already works on HTTPS), spinner clears on failure.

## Files I'll touch

```text
package.json                          + 2 plugin deps
src/lib/nativeAuth.ts                 NEW
src/contexts/AuthContext.tsx          GoogleAuth.initialize() on iOS native
src/components/AuthModal.tsx          branch Apple/Google handlers; finally{} cleanup; diagnostic panel; emailRedirectTo swap
ios/App/App/Info.plist                + Google reversed-client-id URL scheme
ios/App/App/App.entitlements          + applinks:dabarbible.com (NEW file if not present)
public/.well-known/apple-app-site-association   NEW (served by the marketing site, not the WebView)
```

## What I need from you mid-flight

1. **Google iOS OAuth client id** + the reversed-client-id URL scheme (paste from Google Cloud Console). I'll request via `add_secret` for `VITE_GOOGLE_IOS_CLIENT_ID`.
2. **Confirm** you want the AASA file served from `dabarbible.com/.well-known/apple-app-site-association` (vs. skipping universal links and keeping the custom-scheme `com.dabarbible.app://auth` flow only).

## Manual steps after I'm done (Xcode-only, can't automate)

1. Xcode → target App → Signing & Capabilities → **+ Sign In with Apple**.
2. Xcode → target App → Signing & Capabilities → **+ Associated Domains** → add `applinks:dabarbible.com` (only if you confirm #2 above).
3. `npx cap sync ios && open ios/App/App.xcworkspace` → Archive → upload to TestFlight as build 83.

## Out of scope (call out explicitly)

- Email/password flow logic — only the overlay cleanup. If a confirmed real failure remains after diagnostics ship, that's a follow-up.
- RevenueCat / IAP changes — separate from auth.
- Web (browser) Apple/Google flows — unchanged; they already work.

Approve and I'll execute. If you only want a subset (e.g. just Apple native + overlay fix, defer Google), say which blocks and I'll trim.