-- Add assigned_provider_id to service_requests

ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS assigned_provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_requests_update_admin_assignment ON public.service_requests;
CREATE POLICY service_requests_update_admin_assignment
ON public.service_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

COMMENT ON POLICY service_requests_update_admin_assignment ON public.service_requests IS
  'Admins can update service request assignment and status from server-side admin actions while RLS remains enabled.';
