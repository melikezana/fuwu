-- FUWU: Destek mesajları için admin gelen kutusu.
-- İletişim formu (/iletisim) ve asistan widget'ı support_messages tablosuna yazıyordu; ancak
-- admin tarafında durum güncelleme yetkisi ve işlem izi yoktu. Bu migration:
--   * admin notu, işleyen admin ve çözüm zamanı alanlarını ekler,
--   * yalnızca adminin durum güncellemesine izin veren RLS politikasını tanımlar,
--   * updated_at alanını otomatik günceller.
-- Mevcut insert/select politikalarına dokunmaz. Tekrar çalıştırmak güvenlidir.
begin;

alter table public.support_messages
  add column if not exists admin_note text,
  add column if not exists handled_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'support_messages_admin_note_length'
      and conrelid = 'public.support_messages'::regclass
  ) then
    alter table public.support_messages
      add constraint support_messages_admin_note_length
      check (admin_note is null or char_length(admin_note) <= 2000);
  end if;
end
$$;

create or replace function public.support_messages_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status = 'resolved' and (old.status is distinct from 'resolved') then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists support_messages_touch on public.support_messages;
create trigger support_messages_touch
  before update on public.support_messages
  for each row execute function public.support_messages_touch();

drop policy if exists support_messages_update_admin on public.support_messages;
create policy support_messages_update_admin
  on public.support_messages
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

grant update (status, admin_note, handled_by) on public.support_messages to authenticated;

commit;
