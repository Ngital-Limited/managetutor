INSERT INTO public.subjects (name_en, name_bn, category_en, category_bn)
SELECT 'All Subjects', 'সকল বিষয়', 'General', 'সাধারণ'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects WHERE name_en = 'All Subjects' AND (category_en = 'General' OR category_en IS NULL)
);