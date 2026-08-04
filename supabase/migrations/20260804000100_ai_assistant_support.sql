-- Fuwu Akilli Asistan: optional signed-in conversation history and support form inbox.

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  selected_category text,
  district text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  message_id uuid references public.ai_messages(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  analysis_json jsonb not null,
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  email text not null,
  message text not null,
  analysis_summary text,
  image_reference text,
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_created_idx
  on public.ai_conversations(user_id, created_at desc);

create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages(conversation_id, created_at asc);

create index if not exists ai_analyses_conversation_created_idx
  on public.ai_analyses(conversation_id, created_at desc);

create index if not exists support_messages_status_created_idx
  on public.support_messages(status, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists ai_conversations_select_own_or_admin on public.ai_conversations;
create policy ai_conversations_select_own_or_admin
  on public.ai_conversations
  for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists ai_conversations_insert_own on public.ai_conversations;
create policy ai_conversations_insert_own
  on public.ai_conversations
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists ai_messages_select_own_or_admin on public.ai_messages;
create policy ai_messages_select_own_or_admin
  on public.ai_messages
  for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_own
  on public.ai_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.ai_conversations conversation
      where conversation.id = conversation_id
        and conversation.user_id = auth.uid()
    )
  );

drop policy if exists ai_analyses_select_own_or_admin on public.ai_analyses;
create policy ai_analyses_select_own_or_admin
  on public.ai_analyses
  for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists ai_analyses_insert_own on public.ai_analyses;
create policy ai_analyses_insert_own
  on public.ai_analyses
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.ai_conversations conversation
      where conversation.id = conversation_id
        and conversation.user_id = auth.uid()
    )
  );

drop policy if exists support_messages_insert_public on public.support_messages;
create policy support_messages_insert_public
  on public.support_messages
  for insert
  to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or user_id = auth.uid()
  );

drop policy if exists support_messages_select_own_or_admin on public.support_messages;
create policy support_messages_select_own_or_admin
  on public.support_messages
  for select
  to authenticated
  using (
    (user_id is not null and user_id = auth.uid())
    or public.current_user_is_admin()
  );

drop policy if exists support_messages_update_admin on public.support_messages;
create policy support_messages_update_admin
  on public.support_messages
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant select, insert
on table
  public.ai_conversations,
  public.ai_messages,
  public.ai_analyses
to authenticated;

grant insert on table public.support_messages to anon, authenticated;
grant select, update on table public.support_messages to authenticated;
grant all privileges on table public.ai_conversations, public.ai_messages, public.ai_analyses, public.support_messages to service_role;

