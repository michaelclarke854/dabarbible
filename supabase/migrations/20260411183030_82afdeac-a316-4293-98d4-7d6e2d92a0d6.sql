
-- Add missing UPDATE policy for saved_verses
CREATE POLICY "Users can update their own saved verses"
  ON public.saved_verses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
