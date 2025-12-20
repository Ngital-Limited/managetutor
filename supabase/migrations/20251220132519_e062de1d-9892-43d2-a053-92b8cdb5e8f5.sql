-- Insert Areas for major districts (using subqueries for district IDs)
INSERT INTO public.areas (id, district_id, name_en, name_bn) 
SELECT gen_random_uuid(), d.id, a.name_en, a.name_bn
FROM (
  SELECT 'Dhanmondi' as name_en, 'ধানমন্ডি' as name_bn, 'Dhaka' as district UNION ALL
  SELECT 'Gulshan', 'গুলশান', 'Dhaka' UNION ALL
  SELECT 'Banani', 'বনানী', 'Dhaka' UNION ALL
  SELECT 'Mirpur', 'মিরপুর', 'Dhaka' UNION ALL
  SELECT 'Uttara', 'উত্তরা', 'Dhaka' UNION ALL
  SELECT 'Mohammadpur', 'মোহাম্মদপুর', 'Dhaka' UNION ALL
  SELECT 'Bashundhara', 'বসুন্ধরা', 'Dhaka' UNION ALL
  SELECT 'Motijheel', 'মতিঝিল', 'Dhaka' UNION ALL
  SELECT 'Tejgaon', 'তেজগাঁও', 'Dhaka' UNION ALL
  SELECT 'Farmgate', 'ফার্মগেট', 'Dhaka' UNION ALL
  SELECT 'Shyamoli', 'শ্যামলী', 'Dhaka' UNION ALL
  SELECT 'Lalmatia', 'লালমাটিয়া', 'Dhaka' UNION ALL
  SELECT 'Badda', 'বাড্ডা', 'Dhaka' UNION ALL
  SELECT 'Rampura', 'রামপুরা', 'Dhaka' UNION ALL
  SELECT 'Khilgaon', 'খিলগাঁও', 'Dhaka' UNION ALL
  SELECT 'Agrabad', 'আগ্রাবাদ', 'Chattogram' UNION ALL
  SELECT 'GEC Circle', 'জিইসি সার্কেল', 'Chattogram' UNION ALL
  SELECT 'Nasirabad', 'নাসিরাবাদ', 'Chattogram' UNION ALL
  SELECT 'Panchlaish', 'পাঁচলাইশ', 'Chattogram' UNION ALL
  SELECT 'Kotwali', 'কোতোয়ালী', 'Chattogram' UNION ALL
  SELECT 'Halishahar', 'হালিশহর', 'Chattogram' UNION ALL
  SELECT 'Kazir Dewri', 'কাজীর দেউড়ি', 'Chattogram' UNION ALL
  SELECT 'Khulshi', 'খুলশী', 'Chattogram' UNION ALL
  SELECT 'Bohoddarhat', 'বহদ্দারহাট', 'Rajshahi' UNION ALL
  SELECT 'Shaheb Bazar', 'সাহেব বাজার', 'Rajshahi' UNION ALL
  SELECT 'Upashahar', 'উপশহর', 'Rajshahi' UNION ALL
  SELECT 'Kazla', 'কাজলা', 'Rajshahi' UNION ALL
  SELECT 'Sonadanga', 'সোনাডাঙ্গা', 'Khulna' UNION ALL
  SELECT 'Boyra', 'বয়রা', 'Khulna' UNION ALL
  SELECT 'Daulatpur', 'দৌলতপুর', 'Khulna' UNION ALL
  SELECT 'Khalishpur', 'খালিশপুর', 'Khulna' UNION ALL
  SELECT 'Zindabazar', 'জিন্দাবাজার', 'Sylhet' UNION ALL
  SELECT 'Amberkhana', 'আম্বরখানা', 'Sylhet' UNION ALL
  SELECT 'Shahjalal Upashahar', 'শাহজালাল উপশহর', 'Sylhet' UNION ALL
  SELECT 'Subid Bazar', 'সুবিদ বাজার', 'Sylhet' UNION ALL
  SELECT 'Central Road', 'সেন্ট্রাল রোড', 'Rangpur' UNION ALL
  SELECT 'Dhap', 'ধাপ', 'Rangpur' UNION ALL
  SELECT 'Shapla Chattar', 'শাপলা চত্বর', 'Rangpur' UNION ALL
  SELECT 'Kachari Bazar', 'কাচারী বাজার', 'Rangpur'
) a
JOIN public.districts d ON d.name_en = a.district
LIMIT 50
ON CONFLICT DO NOTHING;

-- Update subscription plans with better details
UPDATE public.subscription_plans SET
  description = 'Perfect for new tutors starting out',
  max_applications_per_month = 10,
  featured_profile = false,
  priority_support = false
WHERE name = 'Free';

UPDATE public.subscription_plans SET
  description = 'Ideal for active tutors seeking more opportunities',
  max_applications_per_month = 50,
  featured_profile = false,
  priority_support = false
WHERE name = 'Basic';

UPDATE public.subscription_plans SET
  description = 'Best value for professional tutors',
  max_applications_per_month = 200,
  featured_profile = true,
  priority_support = true
WHERE name = 'Premium';