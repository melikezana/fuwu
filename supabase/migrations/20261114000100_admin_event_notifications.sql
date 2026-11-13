-- 14 Kasım 2026 · Zil bildirimleri gerçek olaylardan üretilir
--
-- Önce: usta başvurusu gönderildiğinde uygulama yalnızca sahte (mock) bir bildirim sonucu dönüyordu; admin'e haber
-- yalnızca SMS ile gidiyordu ve SMS kurulu olmadığı için hiçbir yere ulaşmıyordu. Zil hep boş kalıyordu.
-- Şimdi: veritabanı tetikleyicileri bildirimi kaydın kendisiyle aynı yerde üretir; hangi yoldan gelirse gelsin kaçmaz.
--   * Usta başvurusu → başvurana "başvurun alındı", tüm adminlere "yeni usta başvurusu" (telefon doğrulanmadıysa belirtir).
--   * Ön kayıt talebi → adminlere ilçe/hizmet (e-posta adresi bildirimde yer almaz).
--   * Destek mesajı → adminlere konu başlığı (mesaj gövdesi ve e-posta bildirimde yer almaz).
-- Bildirim üretimi hiçbir zaman asıl kaydı engellemez: hata olursa uyarı yazılır, kayıt devam eder.

alter table public.notifications drop constraint if exists notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check
  check (entity_type in ('service_request','provider_application','provider','order','launch_interest','support_message'));

create or replace function fuwu_private.notify_admins(
  p_event text, p_title text, p_body text, p_entity_type text, p_entity_id uuid, p_metadata jsonb, p_actor uuid
) returns integer language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
  insert into public.notifications(user_id,recipient_user_id,actor_user_id,entity_id,entity_type,type,event,title,body,message,metadata)
  select p.id,p.id,p_actor,p_entity_id,p_entity_type,p_event,p_event,p_title,p_body,p_body,coalesce(p_metadata,'{}'::jsonb)
  from public.profiles p where p.role='admin';
  get diagnostics inserted = row_count;
  return inserted;
end $$;
revoke all on function fuwu_private.notify_admins(text,text,text,text,uuid,jsonb,uuid) from public,anon,authenticated;

create or replace function fuwu_private.notify_provider_application() returns trigger language plpgsql security definer set search_path='' as $$
declare category_name text; district_name text; phone_note text;
begin
  begin
    select name into category_name from public.service_categories where id=new.category_id;
    select name into district_name from public.districts where id=new.district_id;
    phone_note := case when new.phone_verified_on_submit is false then ' · Telefon doğrulanmadı, ara.' else '' end;
    if new.user_id is not null and exists(select 1 from public.profiles where id=new.user_id) then
      insert into public.notifications(user_id,recipient_user_id,actor_user_id,entity_id,entity_type,type,event,title,body,message,metadata)
      values(new.user_id,new.user_id,new.user_id,new.id,'provider_application','provider_application_submitted','provider_application_submitted',
        'Usta başvurun alındı',
        case when new.phone_verified_on_submit is false
          then 'Ekibimiz başvurunu inceliyor ve telefonunu doğrulamak için seni arayacak.'
          else 'Ekibimiz başvurunu inceliyor. Sonucu burada ve SMS ile bildireceğiz.' end,
        case when new.phone_verified_on_submit is false
          then 'Ekibimiz başvurunu inceliyor ve telefonunu doğrulamak için seni arayacak.'
          else 'Ekibimiz başvurunu inceliyor. Sonucu burada ve SMS ile bildireceğiz.' end,
        jsonb_build_object('applicationId',new.id,'url','/account/applications'));
    end if;
    perform fuwu_private.notify_admins('admin_new_provider_application','Yeni usta başvurusu',
      coalesce(nullif(btrim(new.full_name),''),'İsimsiz aday')||' · '||coalesce(category_name,'Kategori yok')||' · '||coalesce(district_name,'İlçe yok')||phone_note,
      'provider_application',new.id,jsonb_build_object('applicationId',new.id,'url','/admin/provider-applications/'||new.id),new.user_id);
  exception when others then
    raise warning 'provider application notification skipped: %', sqlstate;
  end;
  return new;
end $$;
revoke all on function fuwu_private.notify_provider_application() from public,anon,authenticated;
drop trigger if exists notify_provider_application on public.provider_applications;
create trigger notify_provider_application after insert on public.provider_applications
  for each row execute function fuwu_private.notify_provider_application();

create or replace function fuwu_private.notify_launch_interest() returns trigger language plpgsql security definer set search_path='' as $$
declare category_name text; district_name text;
begin
  begin
    select name into category_name from public.service_categories where id=new.category_id;
    select name into district_name from public.districts where id=new.district_id;
    perform fuwu_private.notify_admins('admin_new_launch_interest','Yeni ön kayıt talebi',
      coalesce(district_name,'İlçe belirtilmedi')||' · '||coalesce(category_name,'Hizmet belirtilmedi'),
      'launch_interest',new.id,jsonb_build_object('url','/admin/interest'),new.user_id);
  exception when others then
    raise warning 'launch interest notification skipped: %', sqlstate;
  end;
  return new;
end $$;
revoke all on function fuwu_private.notify_launch_interest() from public,anon,authenticated;
drop trigger if exists notify_launch_interest on public.launch_interest;
create trigger notify_launch_interest after insert on public.launch_interest
  for each row execute function fuwu_private.notify_launch_interest();

create or replace function fuwu_private.notify_support_message() returns trigger language plpgsql security definer set search_path='' as $$
begin
  begin
    perform fuwu_private.notify_admins('admin_new_support_message','Yeni destek mesajı',
      left(coalesce(nullif(btrim(new.subject),''),'Konu yok'),120),
      'support_message',new.id,jsonb_build_object('url','/admin/support'),new.user_id);
  exception when others then
    raise warning 'support notification skipped: %', sqlstate;
  end;
  return new;
end $$;
revoke all on function fuwu_private.notify_support_message() from public,anon,authenticated;
drop trigger if exists notify_support_message on public.support_messages;
create trigger notify_support_message after insert on public.support_messages
  for each row execute function fuwu_private.notify_support_message();
