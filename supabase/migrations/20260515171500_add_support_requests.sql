CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL CHECK (category IN ('billing', 'technical', 'content', 'account', 'other')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create support requests" ON public.support_requests;
CREATE POLICY "Anyone can create support requests"
  ON public.support_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own support requests" ON public.support_requests;
CREATE POLICY "Users can view own support requests"
  ON public.support_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view support requests" ON public.support_requests;
CREATE POLICY "Admins can view support requests"
  ON public.support_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX IF NOT EXISTS support_requests_user_id_idx ON public.support_requests(user_id);
CREATE INDEX IF NOT EXISTS support_requests_status_idx ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS support_requests_created_at_idx ON public.support_requests(created_at DESC);
