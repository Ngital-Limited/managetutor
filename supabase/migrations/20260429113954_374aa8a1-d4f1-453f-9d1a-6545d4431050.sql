-- Add ID document fields to tutor_profiles
ALTER TABLE public.tutor_profiles
  ADD COLUMN IF NOT EXISTS id_document_type TEXT,
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS id_document_uploaded_at TIMESTAMPTZ;

-- Storage RLS policies for verification-documents (private bucket)
-- Tutors upload to a folder named after their user id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Tutors can upload own verification docs') THEN
    CREATE POLICY "Tutors can upload own verification docs"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'verification-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Tutors can view own verification docs') THEN
    CREATE POLICY "Tutors can view own verification docs"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'verification-documents'
        AND (
          auth.uid()::text = (storage.foldername(name))[1]
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Tutors can update own verification docs') THEN
    CREATE POLICY "Tutors can update own verification docs"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'verification-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Tutors can delete own verification docs') THEN
    CREATE POLICY "Tutors can delete own verification docs"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'verification-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;