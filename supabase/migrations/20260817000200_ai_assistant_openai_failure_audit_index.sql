-- Supports AI assistant OpenAI failure health checks over recent audit rows.

create index if not exists audit_logs_action_created_at_idx
  on public.audit_logs (action, created_at desc);
