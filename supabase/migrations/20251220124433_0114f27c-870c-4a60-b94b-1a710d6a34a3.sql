
-- Fix function search_path security issue
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_tutor_rating() SET search_path = public;
ALTER FUNCTION public.update_job_application_count() SET search_path = public;
