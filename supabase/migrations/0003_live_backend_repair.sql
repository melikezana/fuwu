-- Live Backend Failure Repair (Non-destructive)
-- Resolves RLS blocks and schema constraints for public forms (Provider App & Emergency Requests)

-- 1. Ensure Provider Applications can be inserted by anyone (public forms)
DROP POLICY IF EXISTS "Anyone can insert provider applications" ON public.provider_applications;
DROP POLICY IF EXISTS "provider_applications_insert_public_pending" ON public.provider_applications;

CREATE POLICY "Anyone can insert provider applications" 
ON public.provider_applications 
FOR INSERT 
WITH CHECK (true);

-- 2. Ensure Emergency Service Requests can be inserted without strict auth checks
DROP POLICY IF EXISTS "Authenticated users can insert service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Public can insert service requests" ON public.service_requests;

-- Allow public insertion to support TAG-style unauthenticated emergency requests 
-- (spam/duplicate checks are handled at the application layer)
CREATE POLICY "Public can insert service requests"
ON public.service_requests
FOR INSERT
WITH CHECK (true);

-- Allow anonymous service requests
ALTER TABLE public.service_requests
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Relax strict budget_tag constraint to allow 'acil' if 'acil-hizmet' wasn't used historically
ALTER TABLE public.service_requests
DROP CONSTRAINT IF EXISTS service_requests_budget_tag_check;

ALTER TABLE public.service_requests
ADD CONSTRAINT service_requests_budget_tag_check
CHECK (
  budget_tag is null or 
  budget_tag in ('ekonomik', 'standart', 'premium', 'acil-hizmet', 'acil')
);

-- Relax urgency type just in case 'acil' was pushed into 'urgency'
ALTER TABLE public.service_requests
DROP CONSTRAINT IF EXISTS service_requests_urgency_check;

ALTER TABLE public.service_requests
ADD CONSTRAINT service_requests_urgency_check
CHECK (
  urgency in ('low', 'normal', 'high', 'urgent', 'acil')
);
