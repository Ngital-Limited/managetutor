
CREATE OR REPLACE FUNCTION public.generate_user_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _prefix TEXT;
BEGIN
  SELECT role INTO _role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  
  IF _role = 'tutor' THEN
    _prefix := 'TT-';
  ELSIF _role = 'admin' THEN
    _prefix := 'AD-';
  ELSE
    _prefix := 'PT-';
  END IF;
  
  NEW.user_reference := _prefix || LPAD(nextval('public.user_reference_seq')::text, 5, '0');
  RETURN NEW;
END;
$function$;
