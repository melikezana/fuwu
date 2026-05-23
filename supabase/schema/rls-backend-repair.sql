-- RLS Backend Repair Policies

-- 1. Enable RLS on core tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 2. Providers Policies
CREATE POLICY "Public can read active and approved providers" 
ON public.providers 
FOR SELECT 
USING (is_active = true AND is_approved = true);

CREATE POLICY "Admins have full access to providers" 
ON public.providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Provider Applications Policies
CREATE POLICY "Anyone can insert provider applications" 
ON public.provider_applications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins have full access to applications" 
ON public.provider_applications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Service Requests Policies
CREATE POLICY "Authenticated users can insert service requests" 
ON public.service_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read their own service requests" 
ON public.service_requests 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to service requests" 
ON public.service_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
