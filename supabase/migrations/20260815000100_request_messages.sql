-- Request-scoped customer/provider in-app messaging.

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),

  constraint request_messages_sender_role_check
    check (sender_role in ('customer', 'provider')),
  constraint request_messages_message_length_check
    check (char_length(message) <= 2000),
  constraint request_messages_message_not_blank_check
    check (btrim(message) <> '')
);

comment on table public.request_messages is
  'Stores request-scoped customer/provider chat messages.';

comment on column public.request_messages.read_at is
  'Set when the recipient side has opened/read this message.';

alter table public.request_messages
  add column if not exists sender_id uuid;

alter table public.request_messages
  alter column sender_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'request_messages_sender_id_fkey'
      and conrelid = 'public.request_messages'::regclass
  ) then
    alter table public.request_messages
      add constraint request_messages_sender_id_fkey
      foreign key (sender_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end $$;

alter table public.request_messages
  drop constraint if exists request_messages_sender_role_check;

alter table public.request_messages
  add constraint request_messages_sender_role_check
  check (sender_role in ('customer', 'provider'));

alter table public.request_messages
  drop constraint if exists request_messages_message_length_check;

alter table public.request_messages
  add constraint request_messages_message_length_check
  check (char_length(message) <= 2000);

alter table public.request_messages
  drop constraint if exists request_messages_message_not_blank_check;

alter table public.request_messages
  add constraint request_messages_message_not_blank_check
  check (btrim(message) <> '');

create index if not exists request_messages_request_created_idx
  on public.request_messages (request_id, created_at asc, id asc);

create index if not exists request_messages_sender_id_created_idx
  on public.request_messages (sender_id, created_at desc);

create index if not exists request_messages_request_unread_idx
  on public.request_messages (request_id, sender_role, created_at desc)
  where read_at is null;

alter table public.request_messages enable row level security;

drop policy if exists request_messages_select_participant on public.request_messages;
drop policy if exists request_messages_select_participants on public.request_messages;
create policy request_messages_select_participants
on public.request_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.service_requests request
    where request.id = request_messages.request_id
      and request.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.service_requests request
    join public.providers provider
      on provider.id = request.assigned_provider_id
      or provider.id = request.accepted_provider_id
    where request.id = request_messages.request_id
      and provider.user_id = auth.uid()
      and provider.is_active = true
      and provider.is_approved = true
  )
  or public.current_user_is_admin()
);

drop policy if exists request_messages_insert_participant on public.request_messages;
drop policy if exists request_messages_insert_customer on public.request_messages;
create policy request_messages_insert_customer
on public.request_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and sender_role = 'customer'
  and exists (
    select 1
    from public.service_requests request
    where request.id = request_messages.request_id
      and request.user_id = auth.uid()
      and request.status in ('assigned', 'accepted', 'in_progress', 'completed')
  )
);

drop policy if exists request_messages_insert_provider on public.request_messages;
create policy request_messages_insert_provider
on public.request_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and sender_role = 'provider'
  and exists (
    select 1
    from public.service_requests request
    join public.providers provider
      on provider.id = request.assigned_provider_id
      or provider.id = request.accepted_provider_id
    where request.id = request_messages.request_id
      and request.status in ('assigned', 'accepted', 'in_progress', 'completed')
      and provider.user_id = auth.uid()
      and provider.is_active = true
      and provider.is_approved = true
  )
);

drop policy if exists request_messages_update_mark_read on public.request_messages;
drop policy if exists request_messages_mark_customer_read on public.request_messages;
create policy request_messages_mark_customer_read
on public.request_messages
for update
to authenticated
using (
  sender_role = 'provider'
  and read_at is null
  and exists (
    select 1
    from public.service_requests request
    where request.id = request_messages.request_id
      and request.user_id = auth.uid()
  )
)
with check (
  sender_role = 'provider'
  and exists (
    select 1
    from public.service_requests request
    where request.id = request_messages.request_id
      and request.user_id = auth.uid()
  )
);

drop policy if exists request_messages_mark_provider_read on public.request_messages;
create policy request_messages_mark_provider_read
on public.request_messages
for update
to authenticated
using (
  sender_role = 'customer'
  and read_at is null
  and exists (
    select 1
    from public.service_requests request
    join public.providers provider
      on provider.id = request.assigned_provider_id
      or provider.id = request.accepted_provider_id
    where request.id = request_messages.request_id
      and provider.user_id = auth.uid()
      and provider.is_active = true
      and provider.is_approved = true
  )
)
with check (
  sender_role = 'customer'
  and exists (
    select 1
    from public.service_requests request
    join public.providers provider
      on provider.id = request.assigned_provider_id
      or provider.id = request.accepted_provider_id
    where request.id = request_messages.request_id
      and provider.user_id = auth.uid()
      and provider.is_active = true
      and provider.is_approved = true
  )
);

revoke all privileges on table public.request_messages from anon, authenticated;
grant select, insert on table public.request_messages to authenticated;
grant update (read_at) on table public.request_messages to authenticated;
grant all privileges on table public.request_messages to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.request_messages';
  end if;
end $$;
