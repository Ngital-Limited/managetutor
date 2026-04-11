
-- Create sequence for user references
CREATE SEQUENCE IF NOT EXISTS public.user_reference_seq START WITH 1 INCREMENT BY 1;

-- Add user_reference column
ALTER TABLE public.profiles ADD COLUMN user_reference TEXT UNIQUE;

-- Create function to generate user reference on profile creation
CREATE OR REPLACE FUNCTION public.generate_user_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
  _prefix TEXT;
BEGIN
  SELECT role INTO _role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  
  IF _role = 'tutor' THEN
    _prefix := 'TT-';
  ELSIF _role = 'agency' THEN
    _prefix := 'AG-';
  ELSIF _role = 'admin' THEN
    _prefix := 'AD-';
  ELSE
    _prefix := 'PT-';
  END IF;
  
  NEW.user_reference := _prefix || LPAD(nextval('public.user_reference_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER generate_user_reference_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_user_reference();

-- Backfill existing profiles
UPDATE public.profiles p
SET user_reference = sub.ref
FROM (
  SELECT 
    p2.id,
    COALESCE(
      CASE ur.role
        WHEN 'tutor' THEN 'TT-'
        WHEN 'agency' THEN 'AG-'
        WHEN 'admin' THEN 'AD-'
        ELSE 'PT-'
      END,
      'PT-'
    ) || LPAD(nextval('public.user_reference_seq')::text, 5, '0') AS ref
  FROM public.profiles p2
  LEFT JOIN public.user_roles ur ON ur.user_id = p2.id
  WHERE p2.user_reference IS NULL
) sub
WHERE p.id = sub.id;
