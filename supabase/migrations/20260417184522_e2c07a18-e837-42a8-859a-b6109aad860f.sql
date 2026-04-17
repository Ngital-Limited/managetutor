
ALTER TABLE public.districts DROP COLUMN IF EXISTS name_bn, DROP COLUMN IF EXISTS division_bn;
ALTER TABLE public.areas DROP COLUMN IF EXISTS name_bn;
ALTER TABLE public.subjects DROP COLUMN IF EXISTS name_bn, DROP COLUMN IF EXISTS category_bn;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS title_bn, DROP COLUMN IF EXISTS description_bn;
ALTER TABLE public.agency_profiles DROP COLUMN IF EXISTS agency_name_bn, DROP COLUMN IF EXISTS description_bn;
ALTER TABLE public.tutor_profiles DROP COLUMN IF EXISTS bio_bn, DROP COLUMN IF EXISTS education_bn;
ALTER TABLE public.demo_profiles DROP COLUMN IF EXISTS full_name_bn;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name_bn;
