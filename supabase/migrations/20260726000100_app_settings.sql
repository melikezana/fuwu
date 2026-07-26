-- Platform ayarları için basit anahtar-değer tablosu (admin yönetir).
create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select_admin on public.app_settings;
create policy app_settings_select_admin
  on public.app_settings
  for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists app_settings_write_admin on public.app_settings;
create policy app_settings_write_admin
  on public.app_settings
  for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant select, insert, update on table public.app_settings to authenticated;
