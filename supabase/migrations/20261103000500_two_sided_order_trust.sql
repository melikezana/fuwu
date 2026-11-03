-- FUWU çift taraflı doğrulama: müşteri tarafı.
-- 1) Sipariş yalnızca doğrulanmış e-posta veya telefonu olan, anonim olmayan hesaptan açılır.
--    Google, e-posta kodu ve SMS kodu girişleri bu şartı zaten sağlar; kural, ileride anonim giriş
--    veya onaysız kayıt açılsa bile sipariş kapısını veritabanında korur.
-- 2) Sipariş tarafları birbirinin doğrulama durumunu görür (iletişim bilgisi paylaşılmaz).
-- Mevcut tablo, veri ve akışları değiştirmez. Tekrar çalıştırmak güvenlidir.
begin;

create schema if not exists fuwu_private;

create or replace function fuwu_private.customer_contact_verified(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and coalesce(nullif(to_jsonb(u)->>'is_anonymous', '')::boolean, false) = false
      and (
        nullif(to_jsonb(u)->>'email_confirmed_at', '') is not null
        or nullif(to_jsonb(u)->>'phone_confirmed_at', '') is not null
      )
  );
$$;
revoke all on function fuwu_private.customer_contact_verified(uuid) from public, anon, authenticated;

create or replace function fuwu_private.guard_order_customer_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fuwu_private.customer_contact_verified(new.customer_id) then
    raise exception 'contact_verification_required' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke all on function fuwu_private.guard_order_customer_verified() from public, anon, authenticated;

drop trigger if exists order_customer_verified_guard on public.commerce_orders;
create trigger order_customer_verified_guard
before insert on public.commerce_orders
for each row execute function fuwu_private.guard_order_customer_verified();

-- Sipariş detayındaki "Karşılıklı doğrulama" kutusu. Yalnızca siparişin müşterisi, ustası ve admin okur.
-- Telefon numarası, e-posta adresi veya belge içeriği döndürmez; yalnızca doğrulandı/doğrulanmadı bilgisi.
create or replace function public.commerce_order_trust(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  o public.commerce_orders;
  customer_user auth.users;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into o from public.commerce_orders where id = p_order_id;
  if not found or not (
    o.customer_id = auth.uid()
    or exists(select 1 from public.providers where id = o.provider_id and user_id = auth.uid())
    or public.current_user_is_admin()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into customer_user from auth.users where id = o.customer_id;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'email_verified', nullif(to_jsonb(customer_user)->>'email_confirmed_at', '') is not null,
      'phone_verified', nullif(to_jsonb(customer_user)->>'phone_confirmed_at', '') is not null,
      'completed_orders', (select count(*) from public.commerce_orders c where c.customer_id = o.customer_id and c.status = 'COMPLETED'),
      'member_since', to_char(date_trunc('month', nullif(to_jsonb(customer_user)->>'created_at', '')::timestamptz), 'YYYY-MM')
    ),
    'provider', coalesce((
      select jsonb_build_object(
        'identity_verified', coalesce(p.identity_verified, false),
        'phone_verified', coalesce(p.phone_verified, false),
        'qualification_verified', coalesce(p.is_verified, false)
      )
      from public.providers p
      where p.id = o.provider_id
    ), '{}'::jsonb)
  );
end
$$;
revoke all on function public.commerce_order_trust(uuid) from public, anon, authenticated;
grant execute on function public.commerce_order_trust(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
