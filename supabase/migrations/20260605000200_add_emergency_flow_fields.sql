-- Add TAG-style emergency service flow fields safely
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS urgency_type TEXT,
ADD COLUMN IF NOT EXISTS budget_tag TEXT,
ADD COLUMN IF NOT EXISTS offered_price NUMERIC,
ADD COLUMN IF NOT EXISTS payment_preference TEXT,
ADD COLUMN IF NOT EXISTS confirmation_code TEXT,
ADD COLUMN IF NOT EXISTS estimated_arrival_text TEXT,
ADD COLUMN IF NOT EXISTS approximate_location TEXT,
ADD COLUMN IF NOT EXISTS emergency_status TEXT,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Add comments for future clarification
COMMENT ON COLUMN public.service_requests.urgency_type IS 'e.g. normal, emergency';
COMMENT ON COLUMN public.service_requests.budget_tag IS 'e.g. ekonomik, standart, premium, acil';
COMMENT ON COLUMN public.service_requests.offered_price IS 'Customer offered price for emergency request';
COMMENT ON COLUMN public.service_requests.payment_preference IS 'e.g. nakit, iban';
COMMENT ON COLUMN public.service_requests.confirmation_code IS '4-digit code for mutual verification';
COMMENT ON COLUMN public.service_requests.estimated_arrival_text IS 'e.g. 15-20 dk';
COMMENT ON COLUMN public.service_requests.emergency_status IS 'e.g. pending, accepted';
