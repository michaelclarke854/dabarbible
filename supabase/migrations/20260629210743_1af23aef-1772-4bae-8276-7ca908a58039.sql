
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paddle_customer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_paddle_customer_id_key
  ON public.profiles(paddle_customer_id) WHERE paddle_customer_id IS NOT NULL;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS paddle_subscription_id text;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paddle_subscription_id_key
  ON public.subscriptions(paddle_subscription_id) WHERE paddle_subscription_id IS NOT NULL;

INSERT INTO public.app_config (key, value) VALUES
  ('paddle_price_personal_monthly', ''),
  ('paddle_price_personal_annual',  ''),
  ('paddle_price_personal_student', ''),
  ('paddle_price_family_monthly',   ''),
  ('paddle_price_family_annual',    ''),
  ('paddle_price_community_monthly',''
)
ON CONFLICT (key) DO NOTHING;
