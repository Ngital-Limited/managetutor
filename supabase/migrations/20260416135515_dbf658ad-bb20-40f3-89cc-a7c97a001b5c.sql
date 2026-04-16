
CREATE OR REPLACE FUNCTION public.notify_on_new_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  SELECT tp.user_id,
         'New Tuition Job Available',
         'A new job "' || NEW.title || '" has been posted in your district.',
         'new_job',
         NEW.id
  FROM public.tutor_profiles tp
  WHERE tp.district_id = NEW.district_id
    AND tp.is_available = true
    AND (
      NEW.preferred_tutor_gender IS NULL
      OR NEW.preferred_tutor_gender = 'any'::gender
      OR tp.gender = NEW.preferred_tutor_gender
    );

  RETURN NEW;
END;
$function$;
