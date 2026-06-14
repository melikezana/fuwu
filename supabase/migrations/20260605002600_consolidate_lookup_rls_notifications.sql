-- Consolidate lookup-table RLS and notification storage into the migration chain.
-- These definitions replace ad-hoc schema/policies files with idempotent migrations.

alter table public.service_categories enable row level security;
alter table public.districts enable row level security;

drop policy if exists "Public can read service categories" on public.service_categories;
drop policy if exists service_categories_select_public_active on public.service_categories;
create policy service_categories_select_public_active
on public.service_categories
for select
to anon, authenticated
using (is_active = true);

comment on policy service_categories_select_public_active on public.service_categories is
  'Anyone can read active service categories used by public browsing and forms.';

drop policy if exists "Public can read districts" on public.districts;
drop policy if exists districts_select_public_active on public.districts;
create policy districts_select_public_active
on public.districts
for select
to anon, authenticated
using (is_active = true);

comment on policy districts_select_public_active on public.districts is
  'Anyone can read active service districts used by public browsing and forms.';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  request_id uuid references public.service_requests(id) on delete cascade,
  entity_id uuid,
  entity_type text not null default 'service_request',
  type text not null,
  event text not null,
  title text not null,
  body text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notifications_entity_type_check
    check (entity_type in ('service_request', 'provider_application', 'provider')),
  constraint notifications_title_not_blank_check
    check (btrim(title) <> ''),
  constraint notifications_body_not_blank_check
    check (btrim(body) <> ''),
  constraint notifications_message_not_blank_check
    check (btrim(message) <> ''),
  constraint notifications_type_not_blank_check
    check (btrim(type) <> ''),
  constraint notifications_event_not_blank_check
    check (btrim(event) <> '')
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists notifications_request_id_idx
  on public.notifications (request_id);

create index if not exists notifications_provider_id_idx
  on public.notifications (provider_id);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_user_id, is_read, created_at desc);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or recipient_user_id = auth.uid()
  or public.current_user_is_admin()
);

drop policy if exists notifications_insert_admin_or_actor on public.notifications;
create policy notifications_insert_admin_or_actor
on public.notifications
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or user_id = auth.uid()
  or recipient_user_id = auth.uid()
  or actor_user_id = auth.uid()
);

drop policy if exists notifications_update_own_read_state on public.notifications;
create policy notifications_update_own_read_state
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
  or recipient_user_id = auth.uid()
  or public.current_user_is_admin()
)
with check (
  user_id = auth.uid()
  or recipient_user_id = auth.uid()
  or public.current_user_is_admin()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'notifications_set_updated_at'
      and tgrelid = 'public.notifications'::regclass
  ) then
    create trigger notifications_set_updated_at
      before update on public.notifications
      for each row
      execute function public.set_updated_at();
  end if;
end $$;
