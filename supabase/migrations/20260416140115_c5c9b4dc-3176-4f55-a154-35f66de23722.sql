
CREATE TABLE public.tutor_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  category text NOT NULL DEFAULT 'general',
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tutor notes"
  ON public.tutor_admin_notes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tutor_admin_notes_updated_at
  BEFORE UPDATE ON public.tutor_admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
