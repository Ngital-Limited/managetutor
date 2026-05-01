
-- 1. Commission records table
CREATE TABLE public.commission_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hiring_confirmation_id UUID NOT NULL REFERENCES public.hiring_confirmations(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  job_id UUID NOT NULL,
  agreed_salary INTEGER NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  commission_amount INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  amount_due INTEGER GENERATED ALWAYS AS (commission_amount - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  waive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission records"
  ON public.commission_records FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_commission_records_updated_at
  BEFORE UPDATE ON public.commission_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Commission payments table
CREATE TABLE public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID NOT NULL REFERENCES public.commission_records(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bkash',
  payment_reference TEXT,
  received_by UUID,
  notes TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission payments"
  ON public.commission_payments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add columns to hiring_confirmations
ALTER TABLE public.hiring_confirmations
  ADD COLUMN IF NOT EXISTS commission_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
