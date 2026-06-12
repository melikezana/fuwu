-- Backend Hardening RLS Policies
-- Comprehensive, secure Row Level Security for core marketplace entities.

-- Enable RLS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies
CREATE POLICY "Public can read active and approved providers" 
ON public.providers 
FOR SELECT 
USING (is_active = true AND is_approved = true);

CREATE POLICY "Public can read service categories" 
ON public.service_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Public can read districts" 
ON public.districts 
FOR SELECT 
USING (true);

-- 2. Insert Policies
CREATE POLICY "Anyone can insert provider applications" 
ON public.provider_applications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert service requests" 
ON public.service_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
);

-- 3. Service Requests Ownership
CREATE POLICY "Users can read their own service requests" 
ON public.service_requests 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- 4. Admin Policies (Using exists block checking public.profiles role)
CREATE POLICY "Admins have full access to applications" 
ON public.provider_applications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins have full access to service requests" 
ON public.service_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can create approved providers" 
ON public.providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
