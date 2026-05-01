CREATE OR REPLACE FUNCTION public.transfer_user_role(_target_user_id uuid, _new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old_role text;
  _old_prefix text;
  _new_prefix text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can transfer roles';
  END IF;

  IF _new_role NOT IN ('parent', 'tutor') THEN
    RAISE EXCEPTION 'Can only transfer to parent or tutor role';
  END IF;

  SELECT role::text INTO _old_role
  FROM public.user_roles
  WHERE user_id = _target_user_id
  LIMIT 1;

  IF _old_role IS NULL THEN
    RAISE EXCEPTION 'User has no role assigned';
  END IF;

  IF _old_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot transfer admin accounts';
  END IF;

  IF _old_role = _new_role THEN
    RAISE EXCEPTION 'User already has this role';
  END IF;

  -- Delete old role and insert new
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role::app_role);

  -- Update user_reference prefix
  IF _old_role = 'parent' THEN _old_prefix := 'PT-'; ELSE _old_prefix := 'TT-'; END IF;
  IF _new_role = 'parent' THEN _new_prefix := 'PT-'; ELSE _new_prefix := 'TT-'; END IF;

  UPDATE public.profiles
  SET user_reference = _new_prefix || SUBSTRING(user_reference FROM 4)
  WHERE id = _target_user_id
    AND user_reference LIKE _old_prefix || '%';

  -- Handle profile transitions
  IF _old_role = 'tutor' AND _new_role = 'parent' THEN
    UPDATE public.tutor_profiles SET is_available = false WHERE user_id = _target_user_id;
  ELSIF _new_role = 'tutor' THEN
    INSERT INTO public.tutor_profiles (user_id, gender)
    VALUES (_target_user_id, 'male')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;