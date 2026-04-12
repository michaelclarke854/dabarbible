# DABAR — Deployment Notes

## Stripe Setup

### Live Mode (Required before launch)
1. Swap `STRIPE_SECRET_KEY` to `sk_live_...` in Supabase Edge Function secrets
2. Create a live webhook endpoint in Stripe Dashboard subscribed to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. Set the live `STRIPE_WEBHOOK_SECRET` (`whsec_...`) in Supabase Edge Function secrets
4. Enable Adaptive Pricing: Dashboard → Settings → Payment Methods → Checkout Settings

### FX Quotes API (Non-blocking)
Request access at:
https://docs.stripe.com/payments/currencies/localize-prices/fx-quotes-api

Until granted, the pricing page shows USD for all users.
Stripe Adaptive Pricing still charges in local currency at checkout regardless.

## Supabase Setup
- Enable SSL enforcement
- Configure custom SMTP (SendGrid/SES/Resend) + DKIM/DMARC/SPF
- Enable MFA on Supabase account
- Upgrade to Pro plan
- Set production Site URL in Auth settings
- Add production domain to Google OAuth redirect URIs
