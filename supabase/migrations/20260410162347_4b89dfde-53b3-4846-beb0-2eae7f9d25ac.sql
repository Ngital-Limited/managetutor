
-- Create a sequence for job reference numbers
CREATE SEQUENCE IF NOT EXISTS public.job_reference_seq START WITH 1;

-- Add job_reference column
ALTER TABLE public.jobs ADD COLUMN job_reference text UNIQUE;

-- Create function to auto-generate job reference
CREATE OR REPLACE FUNCTION public.generate_job_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.job_reference := 'MT-' || LPAD(nextval('public.job_reference_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_job_reference
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_job_reference();

-- Backfill existing jobs with references
UPDATE public.jobs SET job_reference = 'MT-' || LPAD(nextval('public.job_reference_seq')::text, 5, '0') WHERE job_reference IS NULL;
