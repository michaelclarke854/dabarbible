-- Passkeys tables
CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key    text NOT NULL,
  counter       bigint NOT NULL DEFAULT 0,
  device_name   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  challenge  text NOT NULL UNIQUE,
  type       text NOT NULL CHECK (type IN ('registration','authentication')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webauthn_challenges_expires_idx ON public.webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS user_passkeys_user_idx ON public.user_passkeys(user_id);

-- Grants (Data API). webauthn_challenges is service-role only.
GRANT SELECT, DELETE ON public.user_passkeys TO authenticated;
GRANT ALL ON public.user_passkeys TO service_role;
GRANT ALL ON public.webauthn_challenges TO service_role;

ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_passkeys"
  ON public.user_passkeys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_passkeys"
  ON public.user_passkeys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);