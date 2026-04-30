-- Index to speed up notification bell queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, is_read, created_at DESC);

-- Index for admin "view all" queries
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications WHERE created_at < now() - interval '30 days';
  DELETE FROM public.notifications WHERE is_read = true AND created_at < now() - interval '7 days';
END;
$$;

-- Schedule daily cleanup at 03:00 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-notifications');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$ SELECT public.cleanup_old_notifications(); $$
);