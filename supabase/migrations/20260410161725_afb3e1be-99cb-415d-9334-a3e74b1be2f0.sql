
ALTER TABLE public.tutor_profiles
  ADD COLUMN father_phone text,
  ADD COLUMN mother_phone text,
  ADD COLUMN emergency_contact_name text,
  ADD COLUMN emergency_contact_phone text,
  ADD COLUMN education_detail text,
  ADD COLUMN present_address text,
  ADD COLUMN permanent_address text;
