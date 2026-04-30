-- Shared server-side cache backing store
CREATE TABLE IF NOT EXISTS public.cache_entries (
  cache_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  stale_until TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_stale_until ON public.cache_entries (stale_until);

ALTER TABLE public.cache_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cache entries"
  ON public.cache_entries
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_cache_entries_updated_at
  BEFORE UPDATE ON public.cache_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cache_entries WHERE stale_until < now();
END;
$$;