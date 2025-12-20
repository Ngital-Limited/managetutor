-- Drop the foreign key constraint on tutor_profiles.user_id to allow demo data
-- This is safe because the constraint was referencing auth.users which we can't insert into
ALTER TABLE public.tutor_profiles DROP CONSTRAINT IF EXISTS tutor_profiles_user_id_fkey;

-- Also need to handle profiles table - drop the foreign key if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Now insert tutor profiles with generated UUIDs
INSERT INTO public.tutor_profiles (id, user_id, gender, bio, bio_bn, education, education_bn, experience_years, hourly_rate_min, hourly_rate_max, teaching_mode, is_available, verification_status, is_featured, average_rating, total_reviews, total_students)
SELECT 
  dp.id, -- Use demo_profile id as tutor_profile id for easy linking
  dp.id, -- Use same id for user_id (not linked to auth)
  CASE WHEN rn % 2 = 0 THEN 'male'::gender ELSE 'female'::gender END,
  CASE (rn % 5)::int
    WHEN 0 THEN 'Passionate educator with proven track record in helping students achieve academic excellence. I focus on building strong fundamentals and critical thinking skills.'
    WHEN 1 THEN 'Dedicated tutor specializing in making complex subjects simple and engaging. I believe every student can succeed with the right guidance.'
    WHEN 2 THEN 'Experienced teacher committed to personalized learning. I adapt my teaching style to match each students unique needs and learning pace.'
    WHEN 3 THEN 'Results-oriented tutor with expertise in exam preparation. I help students develop effective study strategies and boost confidence.'
    ELSE 'Enthusiastic educator passionate about inspiring young minds. My interactive teaching methods make learning fun and effective.'
  END,
  CASE (rn % 5)::int
    WHEN 0 THEN 'শিক্ষার্থীদের একাডেমিক শ্রেষ্ঠত্ব অর্জনে সাহায্য করার প্রমাণিত ট্র্যাক রেকর্ড সহ উৎসাহী শিক্ষাবিদ।'
    WHEN 1 THEN 'জটিল বিষয়গুলোকে সহজ এবং আকর্ষণীয় করে তুলতে বিশেষজ্ঞ নিবেদিত টিউটর।'
    WHEN 2 THEN 'ব্যক্তিগতকৃত শিক্ষার প্রতি প্রতিশ্রুতিবদ্ধ অভিজ্ঞ শিক্ষক।'
    WHEN 3 THEN 'পরীক্ষার প্রস্তুতিতে দক্ষতা সহ ফলাফল-ভিত্তিক টিউটর।'
    ELSE 'তরুণ মনকে অনুপ্রাণিত করতে উৎসাহী শিক্ষাবিদ।'
  END,
  CASE (rn % 8)::int
    WHEN 0 THEN 'BSc in Computer Science, BUET'
    WHEN 1 THEN 'MSc in Physics, Dhaka University'
    WHEN 2 THEN 'BA in English Literature, Jagannath University'
    WHEN 3 THEN 'BBA from IBA, Dhaka University'
    WHEN 4 THEN 'BSc in Mathematics, Chittagong University'
    WHEN 5 THEN 'MBBS, Dhaka Medical College'
    WHEN 6 THEN 'MA in Economics, Rajshahi University'
    ELSE 'BSc in EEE, KUET'
  END,
  CASE (rn % 8)::int
    WHEN 0 THEN 'বিএসসি কম্পিউটার সায়েন্স, বুয়েট'
    WHEN 1 THEN 'এমএসসি পদার্থবিজ্ঞান, ঢাকা বিশ্ববিদ্যালয়'
    WHEN 2 THEN 'বিএ ইংরেজি সাহিত্য, জগন্নাথ বিশ্ববিদ্যালয়'
    WHEN 3 THEN 'বিবিএ, আইবিএ ঢাকা বিশ্ববিদ্যালয়'
    WHEN 4 THEN 'বিএসসি গণিত, চট্টগ্রাম বিশ্ববিদ্যালয়'
    WHEN 5 THEN 'এমবিবিএস, ঢাকা মেডিকেল কলেজ'
    WHEN 6 THEN 'এমএ অর্থনীতি, রাজশাহী বিশ্ববিদ্যালয়'
    ELSE 'বিএসসি ইইই, কুয়েট'
  END,
  (rn % 10 + 1)::int,
  ((rn % 5 + 3) * 100)::int,
  ((rn % 8 + 8) * 100)::int,
  CASE (rn % 3)::int
    WHEN 0 THEN 'online'::teaching_mode
    WHEN 1 THEN 'in_person'::teaching_mode
    ELSE 'hybrid'::teaching_mode
  END,
  true,
  CASE WHEN (rn % 5) < 4 THEN 'approved'::verification_status ELSE 'pending'::verification_status END,
  (rn % 7) = 0,
  ROUND((3.0 + (rn % 20) / 10.0)::numeric, 1),
  (rn % 50 + 5)::int,
  (rn % 100 + 10)::int
FROM (SELECT id, ROW_NUMBER() OVER () as rn FROM public.demo_profiles) dp;