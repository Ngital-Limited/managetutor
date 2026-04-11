-- Create job_subjects junction table for multi-subject support
CREATE TABLE public.job_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(job_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.job_subjects ENABLE ROW LEVEL SECURITY;

-- Everyone can view job subjects
CREATE POLICY "Job subjects are viewable by everyone"
ON public.job_subjects FOR SELECT
USING (true);

-- Parents can add subjects to their own jobs
CREATE POLICY "Parents can add subjects to own jobs"
ON public.job_subjects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_subjects.job_id
    AND jobs.parent_id = auth.uid()
  )
);

-- Parents can delete subjects from their own jobs
CREATE POLICY "Parents can delete subjects from own jobs"
ON public.job_subjects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_subjects.job_id
    AND jobs.parent_id = auth.uid()
  )
);

-- Admins can manage all job subjects
CREATE POLICY "Admins can manage job subjects"
ON public.job_subjects FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing subject_id data to junction table
INSERT INTO public.job_subjects (job_id, subject_id)
SELECT id, subject_id FROM public.jobs WHERE subject_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create index for performance
CREATE INDEX idx_job_subjects_job_id ON public.job_subjects(job_id);
CREATE INDEX idx_job_subjects_subject_id ON public.job_subjects(subject_id);
