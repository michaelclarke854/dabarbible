
-- Add deleted_at column for soft delete
ALTER TABLE public.reflection_entries
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- Create index for efficient soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_reflection_entries_deleted_at
ON public.reflection_entries (deleted_at)
WHERE deleted_at IS NULL;

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_reflection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS reflection_updated_at ON public.reflection_entries;
CREATE TRIGGER reflection_updated_at
  BEFORE UPDATE ON public.reflection_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reflection_timestamp();

-- Remove hard delete policy — soft delete only
DROP POLICY IF EXISTS "Users can delete their own reflections" ON public.reflection_entries;
