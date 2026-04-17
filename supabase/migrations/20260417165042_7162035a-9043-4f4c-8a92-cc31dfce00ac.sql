-- Add slug column to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_slug ON public.jobs(slug) WHERE slug IS NOT NULL;

-- Function to generate a unique job slug from title + area + reference
CREATE OR REPLACE FUNCTION public.generate_unique_job_slug(
  _title text,
  _area_id uuid,
  _district_id uuid,
  _job_reference text,
  _exclude_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _area_name text;
  _ref_part text;
  _base text;
  _candidate text;
  _n int := 1;
BEGIN
  -- Get area name (fall back to district)
  SELECT name_en INTO _area_name FROM public.areas WHERE id = _area_id;
  IF _area_name IS NULL THEN
    SELECT name_en INTO _area_name FROM public.districts WHERE id = _district_id;
  END IF;

  _ref_part := COALESCE(REPLACE(_job_reference, '-', ''), '');

  _base := public.slugify(
    COALESCE(_title, 'job') ||
    CASE WHEN _area_name IS NOT NULL THEN ' ' || _area_name ELSE '' END ||
    CASE WHEN _ref_part <> '' THEN ' ' || _ref_part ELSE '' END
  );

  IF _base IS NULL OR _base = '' THEN
    _base := 'job';
  END IF;

  _candidate := _base;
  WHILE EXISTS (
    SELECT 1 FROM public.jobs
    WHERE slug = _candidate
      AND (_exclude_id IS NULL OR id <> _exclude_id)
  ) LOOP
    _n := _n + 1;
    _candidate := _base || '-' || _n;
  END LOOP;

  RETURN _candidate;
END;
$$;

-- Trigger to auto-set slug on insert/update
CREATE OR REPLACE FUNCTION public.set_job_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL
     OR NEW.slug = ''
     OR (TG_OP = 'UPDATE' AND (
          NEW.title IS DISTINCT FROM OLD.title
       OR NEW.area_id IS DISTINCT FROM OLD.area_id
       OR NEW.district_id IS DISTINCT FROM OLD.district_id
       OR NEW.job_reference IS DISTINCT FROM OLD.job_reference
     )) THEN
    NEW.slug := public.generate_unique_job_slug(
      NEW.title, NEW.area_id, NEW.district_id, NEW.job_reference, NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_job_slug ON public.jobs;
CREATE TRIGGER trg_set_job_slug
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_job_slug();

-- Backfill existing jobs
UPDATE public.jobs
SET slug = public.generate_unique_job_slug(title, area_id, district_id, job_reference, id)
WHERE slug IS NULL OR slug = '';