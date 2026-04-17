-- Add slug column to tutor_profiles
ALTER TABLE public.tutor_profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Function to slugify text
CREATE OR REPLACE FUNCTION public.slugify(_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _result TEXT;
BEGIN
  _result := lower(coalesce(_text, ''));
  _result := regexp_replace(_result, '[^a-z0-9\s-]', '', 'g');
  _result := regexp_replace(_result, '[\s-]+', '-', 'g');
  _result := trim(both '-' from _result);
  IF _result = '' THEN _result := 'tutor'; END IF;
  RETURN _result;
END;
$$;

-- Function to ensure unique slug
CREATE OR REPLACE FUNCTION public.generate_unique_tutor_slug(_base TEXT, _exclude_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _slug TEXT := public.slugify(_base);
  _candidate TEXT := _slug;
  _i INT := 1;
BEGIN
  WHILE EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE slug = _candidate AND (_exclude_id IS NULL OR id <> _exclude_id)
  ) LOOP
    _i := _i + 1;
    _candidate := _slug || '-' || _i;
  END LOOP;
  RETURN _candidate;
END;
$$;

-- Trigger to auto-set slug on insert/update
CREATE OR REPLACE FUNCTION public.set_tutor_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name TEXT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    _name := COALESCE(NEW.display_name, (SELECT full_name FROM public.profiles WHERE id = NEW.user_id), 'tutor');
    NEW.slug := public.generate_unique_tutor_slug(_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_tutor_slug ON public.tutor_profiles;
CREATE TRIGGER trg_set_tutor_slug
BEFORE INSERT OR UPDATE ON public.tutor_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_tutor_slug();

-- Backfill slugs for existing tutors
DO $$
DECLARE
  _r RECORD;
  _name TEXT;
BEGIN
  FOR _r IN SELECT id, user_id, display_name FROM public.tutor_profiles WHERE slug IS NULL OR slug = '' LOOP
    _name := COALESCE(_r.display_name, (SELECT full_name FROM public.profiles WHERE id = _r.user_id), 'tutor');
    UPDATE public.tutor_profiles SET slug = public.generate_unique_tutor_slug(_name, _r.id) WHERE id = _r.id;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_slug ON public.tutor_profiles(slug);