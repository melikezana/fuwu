-- 13 Kasım 2026 · Açılış talebi: aydınlatma beyanı ve ticari e-posta onayı ayrı kayıt; usta başvurusu: aydınlatma beyanı
--
-- KVKK Kurulu 2026/347 sayılı İlke Kararı: aydınlatma ile onay ayrı metin ve ayrı beyan; aydınlatma için yalnızca
-- "okudum, bilgi edindim" beyanı alınır. Ticari e-posta onayı (6563 s. Kanun) isteğe bağlı ve ayrıca kaydedilir;
-- onay alındı bildirimi ve İYS kaydı hazır olana kadar admin ayarı kapalı kalır ve veritabanı onayı reddeder.
-- Metin sürümleri src/lib/legal/notices.ts ile aynı olmalıdır.
--
-- Geriye uyumluluk: mevcut save_launch_interest(…) ve kayıtlar değişmez; yeni uygulama yalnızca _v2'yi çağırır.
-- Ekleme yalnızca kolon/fonksiyon/kural ekler; veri silmez.

alter table public.launch_interest
  add column if not exists notice_version text,
  add column if not exists notice_acknowledged_at timestamptz,
  add column if not exists marketing_email_consent boolean not null default false,
  add column if not exists marketing_consent_version text,
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists marketing_withdrawn_at timestamptz;

comment on column public.launch_interest.notice_version is 'Okunduğu beyan edilen aydınlatma metni sürümü (onay değil).';
comment on column public.launch_interest.marketing_email_consent is 'Ticari elektronik ileti (e-posta) onayı; talep kaydından bağımsız ve isteğe bağlı.';

alter table public.launch_interest_consent_events drop constraint if exists launch_interest_consent_events_event_check;
alter table public.launch_interest_consent_events add constraint launch_interest_consent_events_event_check
  check (event in ('granted','withdrawn','notice_acknowledged','marketing_granted','marketing_withdrawn'));

insert into public.app_settings(key,value) values('launch_marketing_email_enabled','false') on conflict(key) do nothing;

-- Sağlık sözleşmesi sürüm 1 olarak kalır; yalnızca ek bir alan eklenir (eski istemciler etkilenmez).
create or replace function public.launch_interest_health() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'version',1,
  'available',exists(select 1 from public.app_settings where key='launch_interest_enabled' and value='true'),
  'marketing_email',exists(select 1 from public.app_settings where key='launch_marketing_email_enabled' and value='true')
 )
$$;

create function public.save_launch_interest_v2(
  p_district_id uuid default null,
  p_category_id uuid default null,
  p_notice_version text default '',
  p_notice_acknowledged boolean default false,
  p_marketing_email boolean default false,
  p_marketing_version text default ''
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  account_email text; entry public.launch_interest; rate jsonb;
  wants_marketing boolean := coalesce(p_marketing_email,false);
  had_marketing boolean := false; old_marketing_version text;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  if not exists(select 1 from public.app_settings where key='launch_interest_enabled' and value='true') then raise exception 'interest_closed' using errcode='42501'; end if;
  select lower(email) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if account_email is null or account_email='' then raise exception 'verified_email_required' using errcode='42501'; end if;
  if p_notice_acknowledged is distinct from true or p_notice_version is distinct from 'aydinlatma-acilis-2026-11-13' then
    raise exception 'notice_required' using errcode='22023';
  end if;
  if wants_marketing and (
    not exists(select 1 from public.app_settings where key='launch_marketing_email_enabled' and value='true')
    or p_marketing_version is distinct from 'eti-eposta-2026-11-13'
  ) then raise exception 'marketing_closed' using errcode='22023'; end if;
  if (p_district_id is not null and not exists(select 1 from public.districts where id=p_district_id and is_active))
  or (p_category_id is not null and not exists(select 1 from public.service_categories where id=p_category_id and is_active)) then
    raise exception 'invalid_preference' using errcode='22023';
  end if;
  rate:=public.consume_user_rate_limit('launch_interest.save',5,3600000);
  if not coalesce((rate->>'allowed')::boolean,false) then raise exception 'rate_limited' using errcode='P0001'; end if;

  select i.marketing_email_consent and i.withdrawn_at is null, i.marketing_consent_version
    into had_marketing, old_marketing_version
    from public.launch_interest i where i.user_id=auth.uid();
  had_marketing := coalesce(had_marketing,false);

  insert into public.launch_interest(user_id,email,district_id,category_id,consent_version,notice_version,notice_acknowledged_at)
  values(auth.uid(),account_email,p_district_id,p_category_id,p_notice_version,p_notice_version,now())
  on conflict(user_id) do update set email=excluded.email,district_id=excluded.district_id,category_id=excluded.category_id,
    consent_version=excluded.consent_version,consent_at=now(),withdrawn_at=null,
    notice_version=excluded.notice_version,notice_acknowledged_at=now(),updated_at=now()
  returning * into entry;
  insert into public.launch_interest_consent_events(interest_id,event,version)
  values(entry.id,'granted',p_notice_version),(entry.id,'notice_acknowledged',p_notice_version);

  if wants_marketing and not had_marketing then
    update public.launch_interest set marketing_email_consent=true,marketing_consent_version=p_marketing_version,
      marketing_consent_at=now(),marketing_withdrawn_at=null,updated_at=now() where id=entry.id;
    insert into public.launch_interest_consent_events(interest_id,event,version) values(entry.id,'marketing_granted',p_marketing_version);
  elsif not wants_marketing and had_marketing then
    update public.launch_interest set marketing_email_consent=false,marketing_withdrawn_at=now(),updated_at=now() where id=entry.id;
    insert into public.launch_interest_consent_events(interest_id,event,version) values(entry.id,'marketing_withdrawn',coalesce(old_marketing_version,p_marketing_version,''));
  end if;
  return entry.id;
end $$;
revoke all on function public.save_launch_interest_v2(uuid,uuid,text,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.save_launch_interest_v2(uuid,uuid,text,boolean,boolean,text) to authenticated;

-- Talebi kaldırmak e-posta onayını da sona erdirir; ikisi ayrı olaylar olarak kaydedilir.
create or replace function public.withdraw_launch_interest() returns boolean language plpgsql security definer set search_path='' as $$
declare entry public.launch_interest;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into entry from public.launch_interest where user_id=auth.uid() and withdrawn_at is null for update;
  if entry.id is null then return true; end if;
  update public.launch_interest set withdrawn_at=now(),updated_at=now(),marketing_email_consent=false,
    marketing_withdrawn_at=case when entry.marketing_email_consent then now() else marketing_withdrawn_at end
  where id=entry.id;
  insert into public.launch_interest_consent_events(interest_id,event,version) values(entry.id,'withdrawn',entry.consent_version);
  if entry.marketing_email_consent then
    insert into public.launch_interest_consent_events(interest_id,event,version) values(entry.id,'marketing_withdrawn',coalesce(entry.marketing_consent_version,''));
  end if;
  return true;
end $$;

create function public.withdraw_launch_marketing_consent() returns boolean language plpgsql security definer set search_path='' as $$
declare entry public.launch_interest;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  update public.launch_interest set marketing_email_consent=false,marketing_withdrawn_at=now(),updated_at=now()
  where user_id=auth.uid() and marketing_email_consent returning * into entry;
  if entry.id is not null then
    insert into public.launch_interest_consent_events(interest_id,event,version) values(entry.id,'marketing_withdrawn',coalesce(entry.marketing_consent_version,''));
  end if;
  return true;
end $$;
revoke all on function public.withdraw_launch_marketing_consent() from public,anon,authenticated;
grant execute on function public.withdraw_launch_marketing_consent() to authenticated;

-- Usta başvurusu: son kullanıcı (API rolleri) aydınlatma metnini okuduğunu beyan etmeden başvuru oluşturamaz.
-- Sunucu/admin betikleri (service_role) etkilenmez; beyan zamanı istemciden değil veritabanı saatinden yazılır.
alter table public.provider_applications
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_acknowledged_at timestamptz;

create function fuwu_private.guard_application_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if current_setting('role',true) in ('anon','authenticated') then
    if new.privacy_notice_version is distinct from 'aydinlatma-usta-2026-11-13' then
      raise exception 'privacy_notice_required' using errcode='22023';
    end if;
    new.privacy_notice_acknowledged_at := now();
  elsif new.privacy_notice_version is not null and new.privacy_notice_acknowledged_at is null then
    new.privacy_notice_acknowledged_at := now();
  end if;
  return new;
end $$;
revoke all on function fuwu_private.guard_application_notice() from public,anon,authenticated;
drop trigger if exists trust_application_privacy_notice on public.provider_applications;
create trigger trust_application_privacy_notice before insert on public.provider_applications
  for each row execute function fuwu_private.guard_application_notice();
