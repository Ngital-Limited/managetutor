
-- For each set of duplicates, pick the one with smallest id::text as the "keeper"
-- First update jobs referencing duplicates
UPDATE jobs SET area_id = keeper.id
FROM (
  SELECT a.id as dup_id, (
    SELECT a2.id FROM areas a2 
    WHERE a2.district_id = a.district_id AND a2.name_en = a.name_en 
    ORDER BY a2.id::text LIMIT 1
  ) as id
  FROM areas a
  WHERE a.id::text != (
    SELECT MIN(a3.id::text) FROM areas a3 
    WHERE a3.district_id = a.district_id AND a3.name_en = a.name_en
  )
) keeper
WHERE jobs.area_id = keeper.dup_id;

-- Update profiles referencing duplicates
UPDATE profiles SET area_id = keeper.id
FROM (
  SELECT a.id as dup_id, (
    SELECT a2.id FROM areas a2 
    WHERE a2.district_id = a.district_id AND a2.name_en = a.name_en 
    ORDER BY a2.id::text LIMIT 1
  ) as id
  FROM areas a
  WHERE a.id::text != (
    SELECT MIN(a3.id::text) FROM areas a3 
    WHERE a3.district_id = a.district_id AND a3.name_en = a.name_en
  )
) keeper
WHERE profiles.area_id = keeper.dup_id;

-- Now delete duplicates
DELETE FROM areas
WHERE id::text NOT IN (
  SELECT MIN(id::text)
  FROM areas
  GROUP BY district_id, name_en
);
