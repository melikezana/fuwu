-- Rate limits and security audit hardening.
-- RLS stays enabled; no public write policies are introduced.

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  count integer not null default 0 check (count >= 0),
  window_start timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, action, window_start)
);

alter table public.rate_limits enable row level security;

create index if not exists rate_limits_user_action_window_idx
  on public.rate_limits (user_id, action, window_start desc);

drop policy if exists rate_limits_select_own on public.rate_limits;
drop policy if exists rate_limits_insert_own on public.rate_limits;
drop policy if exists rate_limits_update_own on public.rate_limits;
drop policy if exists rate_limits_select_admin_all on public.rate_limits;

create policy rate_limits_select_own
on public.rate_limits
for select
to authenticated
using (user_id = auth.uid());

create policy rate_limits_insert_own
on public.rate_limits
for insert
to authenticated
with check (user_id = auth.uid());

create policy rate_limits_update_own
on public.rate_limits
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy rate_limits_select_admin_all
on public.rate_limits
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists audit_logs_select_admin_only on public.audit_logs;
create policy audit_logs_select_admin_only
on public.audit_logs
for select
to authenticated
using (public.current_user_is_admin());
