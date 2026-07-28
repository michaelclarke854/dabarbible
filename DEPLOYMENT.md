# DABAR — Deployment Notes

## Billing Setup

- **iOS:** native purchases via RevenueCat.
- **Web:** the `create-checkout` edge function proxies to the external billing
  service (requires the `BILLING_SHARED_SECRET` project secret).
- **Subscription changes/cancellations on web:** handled manually via
  support@dabarbible.com — there is no self-serve billing portal.
- **Currency:** all plans are quoted and charged in USD; `get-localized-pricing`
  no longer performs live FX conversion.

## Supabase Setup
- Enable SSL enforcement
- Configure custom SMTP (SendGrid/SES/Resend) + DKIM/DMARC/SPF
- Enable MFA on Supabase account
- Upgrade to Pro plan
- Set production Site URL in Auth settings
- Add production domain to Google OAuth redirect URIs
