
-- First, update any foreign key references from duplicates to the kept record
-- Then delete the duplicates

-- For same-category duplicates, keep the first one and reassign references

-- Helper: reassign tutor_subjects and jobs references before deleting

-- Physics: keep b23acb52, delete 95d86cee and 86515bae
UPDATE tutor_subjects SET subject_id = 'b23acb52-487a-4486-a865-76c0e865c05a' WHERE subject_id IN ('95d86cee-a497-4077-b54f-e09992bb60a3', '86515bae-4450-47b5-af8f-6f8c7cb879a8');
UPDATE jobs SET subject_id = 'b23acb52-487a-4486-a865-76c0e865c05a' WHERE subject_id IN ('95d86cee-a497-4077-b54f-e09992bb60a3', '86515bae-4450-47b5-af8f-6f8c7cb879a8');
DELETE FROM subjects WHERE id IN ('95d86cee-a497-4077-b54f-e09992bb60a3', '86515bae-4450-47b5-af8f-6f8c7cb879a8');

-- Chemistry: keep 12efea5b (has tutor ref), delete others
UPDATE tutor_subjects SET subject_id = '12efea5b-226e-4803-b575-3252892bfb12' WHERE subject_id IN ('1a77d0eb-4f25-4bd3-aefa-d2fe4645720f', '5c8be0d4-18ea-4fdf-80d4-6f9ee9914a2f');
UPDATE jobs SET subject_id = '12efea5b-226e-4803-b575-3252892bfb12' WHERE subject_id IN ('1a77d0eb-4f25-4bd3-aefa-d2fe4645720f', '5c8be0d4-18ea-4fdf-80d4-6f9ee9914a2f');
DELETE FROM subjects WHERE id IN ('1a77d0eb-4f25-4bd3-aefa-d2fe4645720f', '5c8be0d4-18ea-4fdf-80d4-6f9ee9914a2f');

-- Biology: keep 3bec2231, delete others
UPDATE tutor_subjects SET subject_id = '3bec2231-bb20-4c9d-9b68-670f766f39bf' WHERE subject_id IN ('01146438-4ed6-4725-8978-3ed323aaef37', '96078db2-e604-4ff0-8579-b09737337552');
UPDATE jobs SET subject_id = '3bec2231-bb20-4c9d-9b68-670f766f39bf' WHERE subject_id IN ('01146438-4ed6-4725-8978-3ed323aaef37', '96078db2-e604-4ff0-8579-b09737337552');
DELETE FROM subjects WHERE id IN ('01146438-4ed6-4725-8978-3ed323aaef37', '96078db2-e604-4ff0-8579-b09737337552');

-- Higher Mathematics: keep 4b2638c8, delete f69595ec
UPDATE tutor_subjects SET subject_id = '4b2638c8-af80-4adb-b518-dcbc9ea1e689' WHERE subject_id = 'f69595ec-0424-4f23-8e1f-5b51ade03616';
UPDATE jobs SET subject_id = '4b2638c8-af80-4adb-b518-dcbc9ea1e689' WHERE subject_id = 'f69595ec-0424-4f23-8e1f-5b51ade03616';
DELETE FROM subjects WHERE id = 'f69595ec-0424-4f23-8e1f-5b51ade03616';

-- General Science (Science category): keep 0eb3bdb5, delete ceb714a0
UPDATE tutor_subjects SET subject_id = '0eb3bdb5-2360-437e-a952-2422bb527943' WHERE subject_id = 'ceb714a0-3df6-4264-b02e-49ca2d3a26e9';
UPDATE jobs SET subject_id = '0eb3bdb5-2360-437e-a952-2422bb527943' WHERE subject_id = 'ceb714a0-3df6-4264-b02e-49ca2d3a26e9';
DELETE FROM subjects WHERE id = 'ceb714a0-3df6-4264-b02e-49ca2d3a26e9';

-- Arabic: keep 7e25b386, delete 2ec7ab5d
UPDATE tutor_subjects SET subject_id = '7e25b386-f2fd-4def-9145-9fc0c6eabace' WHERE subject_id = '2ec7ab5d-91c4-4725-a459-883b9c319162';
UPDATE jobs SET subject_id = '7e25b386-f2fd-4def-9145-9fc0c6eabace' WHERE subject_id = '2ec7ab5d-91c4-4725-a459-883b9c319162';
DELETE FROM subjects WHERE id = '2ec7ab5d-91c4-4725-a459-883b9c319162';

-- Bangla (Languages): keep 2b5fe059, delete c733af5f (Core Compulsory one stays separate)
UPDATE tutor_subjects SET subject_id = '2b5fe059-f208-4a44-b78b-98e29de95e6a' WHERE subject_id = 'c733af5f-957f-40e4-a2f6-28d69812d7ac';
UPDATE jobs SET subject_id = '2b5fe059-f208-4a44-b78b-98e29de95e6a' WHERE subject_id = 'c733af5f-957f-40e4-a2f6-28d69812d7ac';
DELETE FROM subjects WHERE id = 'c733af5f-957f-40e4-a2f6-28d69812d7ac';

-- English (Languages): keep 2fae8f10, delete 292a49e0 (Core Compulsory one stays separate)
UPDATE tutor_subjects SET subject_id = '2fae8f10-88d1-45af-acf5-5a5b954932c6' WHERE subject_id = '292a49e0-db3d-4887-9021-89ddd8336ae5';
UPDATE jobs SET subject_id = '2fae8f10-88d1-45af-acf5-5a5b954932c6' WHERE subject_id = '292a49e0-db3d-4887-9021-89ddd8336ae5';
DELETE FROM subjects WHERE id = '292a49e0-db3d-4887-9021-89ddd8336ae5';

-- Computer Science: keep 37bb8565 (has tutor ref), delete 9da4065e
UPDATE tutor_subjects SET subject_id = '37bb8565-d960-479f-a662-de6cc234754a' WHERE subject_id = '9da4065e-a0e6-414d-8c7b-b7de57183c2d';
UPDATE jobs SET subject_id = '37bb8565-d960-479f-a662-de6cc234754a' WHERE subject_id = '9da4065e-a0e6-414d-8c7b-b7de57183c2d';
DELETE FROM subjects WHERE id = '9da4065e-a0e6-414d-8c7b-b7de57183c2d';

-- ICT (Technology): keep e84e7fad, delete 090a12a2 (Core Compulsory one stays separate)
UPDATE tutor_subjects SET subject_id = 'e84e7fad-bd6d-4ca5-b2c2-daf7e8e6d7be' WHERE subject_id = '090a12a2-67ef-454e-9d39-0e8e1f91986b';
UPDATE jobs SET subject_id = 'e84e7fad-bd6d-4ca5-b2c2-daf7e8e6d7be' WHERE subject_id = '090a12a2-67ef-454e-9d39-0e8e1f91986b';
DELETE FROM subjects WHERE id = '090a12a2-67ef-454e-9d39-0e8e1f91986b';

-- Programming: keep e15004e0, delete ab10c2c7
UPDATE tutor_subjects SET subject_id = 'e15004e0-60e3-4252-8796-3cf887af0c9a' WHERE subject_id = 'ab10c2c7-9134-413d-b90c-f8bcd7530198';
UPDATE jobs SET subject_id = 'e15004e0-60e3-4252-8796-3cf887af0c9a' WHERE subject_id = 'ab10c2c7-9134-413d-b90c-f8bcd7530198';
DELETE FROM subjects WHERE id = 'ab10c2c7-9134-413d-b90c-f8bcd7530198';

-- Cross-category duplicates: merge Arts into Humanities (keep Humanities versions)
-- Civics: keep 39335fe7 (Humanities), delete 40e1e761 (Arts)
UPDATE tutor_subjects SET subject_id = '39335fe7-ff49-48de-9b3c-4975f51d579b' WHERE subject_id = '40e1e761-eccb-4a49-b1d7-ed6b9548f17a';
UPDATE jobs SET subject_id = '39335fe7-ff49-48de-9b3c-4975f51d579b' WHERE subject_id = '40e1e761-eccb-4a49-b1d7-ed6b9548f17a';
DELETE FROM subjects WHERE id = '40e1e761-eccb-4a49-b1d7-ed6b9548f17a';

-- Geography: keep ee52fe62 (Humanities), delete b75b3e6f (Arts)
UPDATE tutor_subjects SET subject_id = 'ee52fe62-8517-428f-ba56-3ff4ce32fd13' WHERE subject_id = 'b75b3e6f-17d2-4cde-8322-e61e3bc0510b';
UPDATE jobs SET subject_id = 'ee52fe62-8517-428f-ba56-3ff4ce32fd13' WHERE subject_id = 'b75b3e6f-17d2-4cde-8322-e61e3bc0510b';
DELETE FROM subjects WHERE id = 'b75b3e6f-17d2-4cde-8322-e61e3bc0510b';

-- History: keep 55525277 (Humanities), delete 11a309a8 (Arts)
UPDATE tutor_subjects SET subject_id = '55525277-72b2-41b9-9b1b-edc99a21ad79' WHERE subject_id = '11a309a8-dfe2-412d-a094-0d88ca7e2c66';
UPDATE jobs SET subject_id = '55525277-72b2-41b9-9b1b-edc99a21ad79' WHERE subject_id = '11a309a8-dfe2-412d-a094-0d88ca7e2c66';
DELETE FROM subjects WHERE id = '11a309a8-dfe2-412d-a094-0d88ca7e2c66';

-- Social Science: keep 56288b70 (Humanities), delete 51468fff (Arts)
UPDATE tutor_subjects SET subject_id = '56288b70-32c1-4213-a455-1458d8456276' WHERE subject_id = '51468fff-6f6d-4237-b96b-fdf815eb1aa2';
UPDATE jobs SET subject_id = '56288b70-32c1-4213-a455-1458d8456276' WHERE subject_id = '51468fff-6f6d-4237-b96b-fdf815eb1aa2';
DELETE FROM subjects WHERE id = '51468fff-6f6d-4237-b96b-fdf815eb1aa2';

-- Drawing: keep 2fa973cb (Creative), delete 072fd2a9 (Arts)
UPDATE tutor_subjects SET subject_id = '2fa973cb-dfda-4019-9b95-fefa2ab539c4' WHERE subject_id = '072fd2a9-6036-4cbb-8337-3029016c5d9a';
UPDATE jobs SET subject_id = '2fa973cb-dfda-4019-9b95-fefa2ab539c4' WHERE subject_id = '072fd2a9-6036-4cbb-8337-3029016c5d9a';
DELETE FROM subjects WHERE id = '072fd2a9-6036-4cbb-8337-3029016c5d9a';

-- Music: keep 9a2b7d5b (Creative), delete 2391479a (Arts)
UPDATE tutor_subjects SET subject_id = '9a2b7d5b-f5db-4287-b35c-308474723f81' WHERE subject_id = '2391479a-13e2-438f-807f-72e51ed78c9b';
UPDATE jobs SET subject_id = '9a2b7d5b-f5db-4287-b35c-308474723f81' WHERE subject_id = '2391479a-13e2-438f-807f-72e51ed78c9b';
DELETE FROM subjects WHERE id = '2391479a-13e2-438f-807f-72e51ed78c9b';

-- Islamic Studies: keep a238c8a5 (Arts→Religious merged), delete efe22115 (Religious)
UPDATE tutor_subjects SET subject_id = 'a238c8a5-1532-45ea-b457-c5cba03abe83' WHERE subject_id = 'efe22115-3624-4ad1-8dad-3fbcfe09ff8a';
UPDATE jobs SET subject_id = 'a238c8a5-1532-45ea-b457-c5cba03abe83' WHERE subject_id = 'efe22115-3624-4ad1-8dad-3fbcfe09ff8a';
DELETE FROM subjects WHERE id = 'efe22115-3624-4ad1-8dad-3fbcfe09ff8a';
-- Update kept one to Religious category
UPDATE subjects SET category_en = 'Religious', category_bn = 'ধর্মীয়' WHERE id = 'a238c8a5-1532-45ea-b457-c5cba03abe83';

-- Commerce duplicates: merge Business into Commerce
-- Accounting: keep ac6cacfe (Commerce), delete f6dece0c (Business)
UPDATE tutor_subjects SET subject_id = 'ac6cacfe-1c8c-4783-b0aa-b22b14956756' WHERE subject_id = 'f6dece0c-5381-49fe-bcaa-9453b92731f3';
UPDATE jobs SET subject_id = 'ac6cacfe-1c8c-4783-b0aa-b22b14956756' WHERE subject_id = 'f6dece0c-5381-49fe-bcaa-9453b92731f3';
DELETE FROM subjects WHERE id = 'f6dece0c-5381-49fe-bcaa-9453b92731f3';

-- Business Studies: keep d3e61bd4 (Commerce), delete 86e14c9d (Business)
UPDATE tutor_subjects SET subject_id = 'd3e61bd4-398a-4b6b-9d22-73f5b511ffce' WHERE subject_id = '86e14c9d-2a88-48a5-847d-70660241e11f';
UPDATE jobs SET subject_id = 'd3e61bd4-398a-4b6b-9d22-73f5b511ffce' WHERE subject_id = '86e14c9d-2a88-48a5-847d-70660241e11f';
DELETE FROM subjects WHERE id = '86e14c9d-2a88-48a5-847d-70660241e11f';

-- Economics: keep 1fb6b914 (Commerce), delete 21927715 (Business)
UPDATE tutor_subjects SET subject_id = '1fb6b914-de7b-4b49-adae-de428ee95f25' WHERE subject_id = '21927715-6b66-43f1-a632-cf34d8da7694';
UPDATE jobs SET subject_id = '1fb6b914-de7b-4b49-adae-de428ee95f25' WHERE subject_id = '21927715-6b66-43f1-a632-cf34d8da7694';
DELETE FROM subjects WHERE id = '21927715-6b66-43f1-a632-cf34d8da7694';

-- Mathematics & Statistics: keep Mathematics cc730582, delete 7f7c24b9 (Science)
UPDATE tutor_subjects SET subject_id = 'cc730582-c1bd-4fb9-8309-41444534018e' WHERE subject_id = '7f7c24b9-37d4-4641-87e2-572f6155bf6e';
UPDATE jobs SET subject_id = 'cc730582-c1bd-4fb9-8309-41444534018e' WHERE subject_id = '7f7c24b9-37d4-4641-87e2-572f6155bf6e';
DELETE FROM subjects WHERE id = '7f7c24b9-37d4-4641-87e2-572f6155bf6e';

-- Statistics: keep 2fbbc796 (Mathematics), delete 1538c003 (Science)
UPDATE tutor_subjects SET subject_id = '2fbbc796-4812-446e-b1bd-55dac63b9f57' WHERE subject_id = '1538c003-2f6e-4477-81c0-032901966022';
UPDATE jobs SET subject_id = '2fbbc796-4812-446e-b1bd-55dac63b9f57' WHERE subject_id = '1538c003-2f6e-4477-81c0-032901966022';
DELETE FROM subjects WHERE id = '1538c003-2f6e-4477-81c0-032901966022';

-- Agriculture: keep 050bbce7 (Vocational), delete d065d99f (Optional)
UPDATE tutor_subjects SET subject_id = '050bbce7-1b8f-45dc-893c-594618930bc6' WHERE subject_id = 'd065d99f-14d3-4a9d-847a-0b31ba28e852';
UPDATE jobs SET subject_id = '050bbce7-1b8f-45dc-893c-594618930bc6' WHERE subject_id = 'd065d99f-14d3-4a9d-847a-0b31ba28e852';
DELETE FROM subjects WHERE id = 'd065d99f-14d3-4a9d-847a-0b31ba28e852';

-- Home Science: keep 7e552d9b (Vocational), delete 49b4ddf7 (Optional)
UPDATE tutor_subjects SET subject_id = '7e552d9b-c671-492f-ab58-813b0c2cf6e5' WHERE subject_id = '49b4ddf7-2376-49a5-90cb-b79337f55d1f';
UPDATE jobs SET subject_id = '7e552d9b-c671-492f-ab58-813b0c2cf6e5' WHERE subject_id = '49b4ddf7-2376-49a5-90cb-b79337f55d1f';
DELETE FROM subjects WHERE id = '49b4ddf7-2376-49a5-90cb-b79337f55d1f';

-- Finance: keep 6a668aa8 (Business→Commerce), delete and update category
UPDATE subjects SET category_en = 'Commerce', category_bn = 'বাণিজ্য' WHERE id = '6a668aa8-03e6-4b8f-80df-5bfff3a3d8bc';

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_unique_name_category ON subjects (name_en, category_en);
