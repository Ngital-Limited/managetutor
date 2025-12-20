-- Add name fields directly to tutor_profiles for demo data
ALTER TABLE public.tutor_profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id);

-- Update existing demo tutor profiles with names and districts
UPDATE public.tutor_profiles SET 
  display_name = CASE 
    WHEN id = '4a7b5e13-70e9-4a1f-beed-48b088424c70' THEN 'Md. Rahim Uddin'
    WHEN id = 'f371e32e-cea2-4a25-a985-82b84578f45f' THEN 'Fatima Akter'
    WHEN id = '59714942-9d28-45ed-9e40-8073ad6c192e' THEN 'Kamal Hossain'
    WHEN id = 'af2154f3-8ad1-466c-bfeb-85ffa631ba5b' THEN 'Nusrat Jahan'
    ELSE display_name
  END,
  district_id = (SELECT id FROM districts ORDER BY random() LIMIT 1)
WHERE display_name IS NULL;

-- Update all demo tutors with random names and districts
DO $$
DECLARE
  tutor_rec RECORD;
  name_list TEXT[] := ARRAY[
    'Md. Rafiq Ahmed', 'Sharmin Sultana', 'Abdul Karim', 'Nasima Begum', 'Hasan Ali',
    'Tahmina Rahman', 'Zahid Haque', 'Roksana Akter', 'Imran Khan', 'Salma Khatun',
    'Mizanur Rahman', 'Farzana Islam', 'Arif Mahmud', 'Shakila Parvin', 'Kabir Hossain',
    'Jannatul Ferdous', 'Shafiq Rahman', 'Rumana Akhter', 'Tanvir Ahmed', 'Munni Begum',
    'Saiful Islam', 'Rehana Khanam', 'Nazmul Huda', 'Papiya Sultana', 'Alamgir Kabir',
    'Shamima Nasrin', 'Delwar Hossain', 'Razia Sultana', 'Jahangir Alam', 'Hasina Akter',
    'Morshed Ali', 'Lovely Begum', 'Hafizur Rahman', 'Sultana Razia', 'Billal Hossain',
    'Momtaz Begum', 'Shahadat Hossain', 'Kamrun Nahar', 'Nurul Islam', 'Shirin Akter',
    'Rezaul Karim', 'Kohinoor Begum', 'Shamsul Haque', 'Feroza Akter', 'Mainul Islam',
    'Sabina Yasmin', 'Habibur Rahman', 'Dilruba Akter', 'Jakir Hossain', 'Parveen Sultana',
    'Ashraful Alam', 'Monowara Begum', 'Golam Rabbani', 'Sufia Khatun', 'Azizul Haque',
    'Nurjahan Begum', 'Mostafizur Rahman', 'Amena Khatun', 'Liakot Ali', 'Khadija Akter'
  ];
  name_idx INT := 1;
  district_rec RECORD;
BEGIN
  FOR tutor_rec IN SELECT id FROM tutor_profiles WHERE display_name IS NULL LOOP
    SELECT id INTO district_rec FROM districts ORDER BY random() LIMIT 1;
    UPDATE tutor_profiles 
    SET display_name = name_list[name_idx], district_id = district_rec.id
    WHERE id = tutor_rec.id;
    name_idx := name_idx + 1;
    IF name_idx > array_length(name_list, 1) THEN
      name_idx := 1;
    END IF;
  END LOOP;
END $$;