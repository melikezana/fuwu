-- 13 Kasım 2026 · Usta başvurusu: SMS kurulu değilken başvuru tıkanmasın
--
-- Canlıda SMS (NetGSM + Supabase Send SMS kancası) henüz yapılandırılmadı; doğrulanmış telefon şartı yüzünden hiçbir usta
-- başvuru yapamıyordu. Başvuru artık doğrulanmamış telefonla da alınır, ama:
--  * doğrulanıp doğrulanmadığı başvuruya kaydedilir (phone_verified_on_submit) ve admin ekranında görünür;
--  * başka bir hesapta doğrulanmış bir numara kullanılamaz (başkasının numarasıyla başvuru engeli korunur);
--  * yalnızca Türkiye cep telefonu biçimi kabul edilir.
-- Yayın öncesi telefon doğrulaması ayrıca istenir (hazırlık listesindeki phone_verified). Veri silinmez.

alter table public.provider_applications add column if not exists phone_verified_on_submit boolean;
comment on column public.provider_applications.phone_verified_on_submit is
  'Başvuru anında hesabın telefonu SMS ile doğrulanmış mıydı. false: admin telefonla arayıp doğrulamalı. null: bu kolondan önceki kayıt.';

create or replace function fuwu_private.guard_application_phone() returns trigger language plpgsql security definer set search_path='' as $$
declare digits text := regexp_replace(coalesce(new.phone,''),'[^0-9]','','g');
begin
  if current_setting('role',true) in ('anon','authenticated') then
    if public.current_user_is_admin() then return new; end if;
    if digits !~ '^(90)?5[0-9]{9}$' then raise exception 'mobile_phone_required' using errcode='22023'; end if;
    digits := right(digits,10);
    new.phone_verified_on_submit := exists(
      select 1 from auth.users u where u.id=auth.uid() and new.user_id=u.id
        and nullif(to_jsonb(u)->>'phone_confirmed_at','') is not null
        and right(regexp_replace(coalesce(to_jsonb(u)->>'phone',''),'[^0-9]','','g'),10)=digits);
    if not new.phone_verified_on_submit and exists(
      select 1 from auth.users u where u.id<>auth.uid()
        and nullif(to_jsonb(u)->>'phone_confirmed_at','') is not null
        and right(regexp_replace(coalesce(to_jsonb(u)->>'phone',''),'[^0-9]','','g'),10)=digits)
    then raise exception 'phone_belongs_to_other_account' using errcode='42501'; end if;
  end if;
  return new;
end $$;
