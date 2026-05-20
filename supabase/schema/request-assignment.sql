-- Add assigned_provider_id to service_requests

ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS assigned_provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL;

-- Note: In a true production environment, we would also update RLS policies 
-- to ensure the assigned provider can read/update their assigned requests.
