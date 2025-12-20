-- Drop foreign key constraints to allow demo data
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_parent_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_parent_id_fkey;

-- Link tutors to subjects
INSERT INTO public.tutor_subjects (tutor_profile_id, subject_id)
SELECT DISTINCT tp.id, s.id
FROM public.tutor_profiles tp
CROSS JOIN LATERAL (SELECT id FROM public.subjects ORDER BY random() LIMIT 3) s
ON CONFLICT DO NOTHING;

-- Create 55 demo jobs
INSERT INTO public.jobs (parent_id, title, description, district_id, subject_id, class_level, student_gender, preferred_tutor_gender, days_per_week, budget_min, budget_max, teaching_mode, status)
SELECT 
  (SELECT id FROM demo_profiles ORDER BY random() LIMIT 1),
  'Need ' || s.name_en || ' Tutor',
  'Looking for experienced tutor for ' || s.name_en || '. Regular classes needed.',
  d.id,
  s.id,
  (ARRAY['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'SSC', 'HSC'])[floor(random()*7+1)],
  (ARRAY['male', 'female', 'any']::gender[])[floor(random()*3+1)],
  'any'::gender,
  floor(random()*4+2)::int,
  (3000 + floor(random()*5)*500)::int,
  (6000 + floor(random()*8)*500)::int,
  (ARRAY['online', 'in_person', 'hybrid']::teaching_mode[])[floor(random()*3+1)],
  'open'::job_status
FROM public.subjects s
CROSS JOIN (SELECT id FROM districts ORDER BY random() LIMIT 1) d
LIMIT 55;

-- Create reviews
INSERT INTO public.reviews (tutor_id, parent_id, rating, comment, is_approved)
SELECT 
  tp.id,
  (SELECT id FROM demo_profiles ORDER BY random() LIMIT 1),
  (3 + floor(random()*3))::int,
  (ARRAY['Excellent tutor!', 'Very patient teacher.', 'Highly recommend!', 'Great results.', 'My child improved a lot.'])[floor(random()*5+1)],
  true
FROM public.tutor_profiles tp
CROSS JOIN generate_series(1,2)
LIMIT 100;