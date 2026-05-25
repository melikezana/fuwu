-- Audit Logs Table Migration
-- Safe, non-breaking SQL to establish the audit_logs foundation.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    actor_user_id UUID NOT NULL,
    entity_id UUID,
    entity_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- RLS: Only admins can view audit logs. Inserts are typically handled by service role or authenticated admins.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
