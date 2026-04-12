-- Add presentment columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS presentment_currency TEXT,
  ADD COLUMN IF NOT EXISTS presentment_amount INTEGER;

-- Populate app_config with Stripe price IDs
INSERT INTO public.app_config (key, value) VALUES
  ('stripe_price_personal_monthly',  'price_1TL42uEGixGZ7aNIrHGLw1MZ'),
  ('stripe_price_personal_annual',   'price_1TL42wEGixGZ7aNILBZ1H2tk'),
  ('stripe_price_personal_student',  'price_1TL42yEGixGZ7aNIucix1x42'),
  ('stripe_price_family_monthly',    'price_1TL42zEGixGZ7aNI48OQpeRo'),
  ('stripe_price_family_annual',     'price_1TL430EGixGZ7aNIYTOBUomg'),
  ('stripe_price_community_monthly', 'price_1TL431EGixGZ7aNIiFgz6a5n'),
  ('stripe_price_gift_annual',       'price_1TL434EGixGZ7aNIvRSJ4qEX')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();