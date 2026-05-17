-- Audit log foundation for admin and operational actions.
-- This table stores append-only event records. It does not store secrets.

create extension if not exists "pgcrypto";

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint audit_logs_action_not_blank_check
    check (btrim(action) <> ''),
  constraint audit_logs_entity_type_not_blank_check
    check (btrim(entity_type) <> '')
);

comment on table public.audit_logs is
  'Append-only audit trail for Fuwu admin actions and sensitive workflow changes.';

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_insert_admin on public.audit_logs;
create policy audit_logs_insert_admin
on public.audit_logs
for insert
to authenticated
with check (public.current_user_is_admin());

comment on policy audit_logs_insert_admin on public.audit_logs is
  'Admins can append audit events from server actions while using their normal Supabase session.';

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using (public.current_user_is_admin());

comment on policy audit_logs_select_admin on public.audit_logs is
  'Only admins can inspect audit events.';
