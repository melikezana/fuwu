-- FUWU · Ön Bilgilendirme Formu ve Mesafeli Hizmet Sözleşmesi (6502 s. TKHK m.48, Mesafeli Sözleşmeler Yönetmeliği).
--
-- 1) Sipariş, ancak hizmeti sunan ustanın (sağlayıcı) ve FUWU'nun (aracı hizmet sağlayıcı) kimlik ve iletişim bilgileri
--    tamamsa verilebilir (Yön. m.5/1-b,c). Usta bilgileri usta panelindeki "Satıcı bilgileri"nden, FUWU bilgileri admin
--    ayarlarından gelir. Eksikse ilgili usta satışta görünmez, sipariş `legal_identity_incomplete` ile reddedilir.
-- 2) Tüketici ön bilgileri onaylamadan sözleşme kurulmaz (Yön. m.7): sipariş, metin sürümü ve onay zamanıyla kaydedilir;
--    tarafların o anki kimlik bilgileri siparişe değiştirilemez anlık görüntü olarak yazılır (ispat yükü, m.5/6).
-- 3) Cayma süresi (14 gün) dolmadan başlayacak randevuda tüketicinin açık onayı istenir (Yön. m.15/1-h).
-- 4) Cayma hakkı hizmete başlanana kadar kullanılabilir: müşteri "usta yolda" iken de ücretsiz iptal edebilir.
-- Mevcut kayıtlar değişmez. Tekrar çalıştırmak güvenlidir.
begin;

-- 1 · Sipariş üzerinde yasal onay kaydı ----------------------------------------------------------------
alter table public.commerce_orders
 add column if not exists legal_version text,
 add column if not exists legal_accepted_at timestamptz,
 add column if not exists early_start_consent_at timestamptz,
 add column if not exists legal_parties jsonb;

create or replace function public.commerce_protect_purchase_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.payment_method,new.base_price_minor,new.addons,new.addons_minor,new.customer_note)
   is distinct from row(old.payment_method,old.base_price_minor,old.addons,old.addons_minor,old.customer_note) then
  raise exception 'immutable_order_price';
 end if;
 if old.door_payment_collected_at is not null and new.door_payment_collected_at is distinct from old.door_payment_collected_at then
  raise exception 'immutable_order_price';
 end if;
 -- Onaylanan sözleşme metni ve taraf bilgileri sonradan değiştirilemez.
 if row(new.legal_version,new.legal_accepted_at,new.early_start_consent_at,new.legal_parties)
   is distinct from row(old.legal_version,old.legal_accepted_at,old.early_start_consent_at,old.legal_parties) then
  raise exception 'immutable_legal_record';
 end if;
 return new;
end $$;

-- 2 · Taraf bilgileri --------------------------------------------------------------------------------------
-- FUWU (aracı hizmet sağlayıcı) kimliği admin ayarlarındadır; değerler boş başlar, admin panelinden girilir.
insert into public.app_settings(key,value) values
 ('legal_intermediary_name','Melike Dağkesen (FUWU)'),
 ('legal_intermediary_tax_id',''),
 ('legal_intermediary_tax_office',''),
 ('legal_intermediary_mersis',''),
 ('legal_intermediary_address',''),
 ('legal_intermediary_phone',''),
 ('legal_intermediary_email','fuwuhizmet@gmail.com')
on conflict(key) do nothing;

create or replace function fuwu_private.intermediary_legal_party() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s jsonb;
begin
 select coalesce(jsonb_object_agg(key,btrim(value)),'{}'::jsonb) into s from public.app_settings where key like 'legal_intermediary_%';
 return jsonb_build_object(
  'name',nullif(s->>'legal_intermediary_name',''),
  'tax_id',nullif(s->>'legal_intermediary_tax_id',''),
  'tax_office',nullif(s->>'legal_intermediary_tax_office',''),
  'mersis',nullif(s->>'legal_intermediary_mersis',''),
  'address',nullif(s->>'legal_intermediary_address',''),
  'phone',nullif(s->>'legal_intermediary_phone',''),
  'email',nullif(s->>'legal_intermediary_email',''),
  'ready',length(coalesce(s->>'legal_intermediary_name',''))>=3
   and (coalesce(s->>'legal_intermediary_tax_id','') ~ '^[0-9]{10,11}$' or coalesce(s->>'legal_intermediary_mersis','') ~ '^[0-9]{16}$')
   and length(coalesce(s->>'legal_intermediary_address',''))>=10
   and length(regexp_replace(coalesce(s->>'legal_intermediary_phone',''),'[^0-9]','','g'))>=10
   and coalesce(s->>'legal_intermediary_email','') ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
end $$;
revoke all on function fuwu_private.intermediary_legal_party() from public,anon,authenticated;

-- Usta (sağlayıcı): ad/unvan, vergi kimlik no (şahısta T.C. kimlik no), açık adres, telefon.
create or replace function fuwu_private.provider_legal_party(p_provider_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'name',coalesce(nullif(btrim(p.legal_name),''),p.name),
  'display_name',p.name,
  'tax_id',nullif(btrim(p.tax_identity_number),''),
  'tax_office',nullif(btrim(p.tax_office),''),
  'address',nullif(btrim(p.payout_address),''),
  'phone',nullif(btrim(p.phone),''),
  'ready',length(btrim(coalesce(p.legal_name,'')))>=3
   and coalesce(p.tax_identity_number,'') ~ '^[0-9]{10,11}$'
   and length(btrim(coalesce(p.payout_address,'')))>=5
   and length(regexp_replace(coalesce(p.phone,''),'[^0-9]','','g'))>=10)
 from public.providers p where p.id=p_provider_id
$$;
revoke all on function fuwu_private.provider_legal_party(uuid) from public,anon,authenticated;

-- 3 · Satıcı bilgisi eksik usta satışta görünmez ---------------------------------------------------------
create or replace function public.commerce_offers_before_publication(p_service_id uuid default null, p_district_id uuid default null, p_provider_id uuid default null)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',f.id,'service_id',f.service_id,'variant_id',f.variant_id,'variant_name',v.name,
  'provider_id',p.id,'provider_name',p.name,'profile_image_url',p.profile_image_url,
  'price_minor',f.price_minor,'duration_minutes',f.duration_minutes,'district_ids',f.district_ids,
  'card_payment',(p.iyzico_submerchant_status='active' and p.iyzico_submerchant_key is not null),
  'rating',(select round(avg(r.rating),1) from public.reviews r where r.provider_id=p.id),
  'review_count',(select count(*) from public.reviews r where r.provider_id=p.id)
 ) order by f.price_minor), '[]'::jsonb)
 from public.provider_service_offerings f
 join public.providers p on p.id=f.provider_id
 join public.service_catalog c on c.id=f.service_id
 join public.service_categories cat on cat.id=c.category_id
 left join public.service_variants v on v.id=f.variant_id
 where f.is_active and c.is_active and cat.is_active and cat.is_visible and p.is_active and p.is_approved and p.availability <> 'çevrimdışı'
 and ((c.pricing_type='VARIANT_BASED' and v.is_active and v.service_id=c.id) or (c.pricing_type<>'VARIANT_BASED' and f.variant_id is null))
 and (fuwu_private.provider_legal_party(p.id)->>'ready')::boolean
 and (p_service_id is null or f.service_id=p_service_id)
 and (p_district_id is null or p_district_id=any(f.district_ids))
 and (p_provider_id is null or p.id=p_provider_id)
$$;
revoke all on function public.commerce_offers_before_publication(uuid,uuid,uuid) from public,anon,authenticated,service_role;

-- 4 · Ödeme adımında ön bilgilendirme verisi --------------------------------------------------------------
-- Yalnızca giriş yapmış kişi, yalnızca satıştaki bir hizmet için ve saatlik sınırla görür.
create or replace function public.commerce_checkout_legal(p_offering_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.provider_service_offerings; provider jsonb; intermediary jsonb;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 select * into f from public.provider_service_offerings where id=p_offering_id and is_active;
 if f.id is null or not public.provider_is_published(f.provider_id) then raise exception 'offering_unavailable'; end if;
 provider:=fuwu_private.provider_legal_party(f.provider_id);
 intermediary:=fuwu_private.intermediary_legal_party();
 return jsonb_build_object('version','mesafeli-hizmet-2026-11-24','provider',provider,'intermediary',intermediary,
  'ready',coalesce((provider->>'ready')::boolean,false) and coalesce((intermediary->>'ready')::boolean,false));
end $$;
revoke all on function public.commerce_checkout_legal(uuid) from public,anon,authenticated;
grant execute on function public.commerce_checkout_legal(uuid) to authenticated;

-- 5 · Sipariş: ön bilgilendirme onayı, sözleşme sürümü ve erken ifa onayıyla --------------------------------
drop function if exists public.commerce_place_order(uuid,timestamptz,uuid,text,uuid,integer,jsonb,text,text,boolean,text);
create or replace function public.commerce_place_order(p_offering_id uuid,p_starts_at timestamptz,p_district_id uuid,p_address text,p_idempotency_key uuid,
 p_expected_total_minor integer,p_addons jsonb,p_payment_method text,p_note text,p_fee_consent boolean,p_terms_version text,
 p_legal_version text,p_early_start_consent boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.provider_service_offerings; p public.providers; c public.service_catalog; o public.commerce_orders; slot_end timestamptz; q jsonb; note text;
 provider jsonb; intermediary jsonb; early boolean;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_payment_method is null or p_payment_method not in ('CARD','PAY_AT_DOOR') then raise exception 'invalid_payment_method'; end if;
 if p_idempotency_key is null or p_address is null or length(btrim(p_address)) not between 10 and 1000 then raise exception 'invalid_address'; end if;
 note:=nullif(btrim(regexp_replace(coalesce(p_note,''),'[[:cntrl:]]',' ','g')),'');
 if note is not null and length(note)>500 then raise exception 'invalid_note'; end if;
 select * into f from public.provider_service_offerings where id=p_offering_id;
 if not found then raise exception 'offering_unavailable'; end if;
 -- Usta satırı kilitlenir: aynı saate iki sipariş aynı anda yazılamaz.
 select * into p from public.providers where id=f.provider_id for update;
 select * into o from public.commerce_orders where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then
  if o.offering_id<>p_offering_id or o.starts_at<>p_starts_at or o.address<>btrim(p_address) or o.district_id<>p_district_id
   or o.total_minor is distinct from p_expected_total_minor or o.payment_method is distinct from p_payment_method then raise exception 'idempotency_conflict'; end if;
  return to_jsonb(o);
 end if;
 -- Ön bilgilendirme: sürüm güncel olmalı, taraf bilgileri eksiksiz olmalı (Yön. m.5, m.7).
 if p_legal_version is distinct from 'mesafeli-hizmet-2026-11-24' then raise exception 'legal_version_changed'; end if;
 provider:=fuwu_private.provider_legal_party(p.id);
 intermediary:=fuwu_private.intermediary_legal_party();
 if not coalesce((provider->>'ready')::boolean,false) or not coalesce((intermediary->>'ready')::boolean,false) then raise exception 'legal_identity_incomplete'; end if;
 -- Cayma süresi içinde başlayacak hizmet için açık onay (Yön. m.15/1-h).
 early:=p_starts_at < clock_timestamp()+interval '14 days';
 if early and p_early_start_consent is distinct from true then raise exception 'early_start_consent_required'; end if;
 if p_payment_method='PAY_AT_DOOR' then
  if coalesce((select value from public.app_settings where key='pay_at_door_enabled'),'true')<>'true' then raise exception 'pay_at_door_closed'; end if;
  -- Takvimi sahte siparişle kilitlemeyi önler: aynı anda en fazla 3 açık kapıda ödemeli sipariş.
  if (select count(*) from public.commerce_orders where customer_id=auth.uid() and payment_method='PAY_AT_DOOR' and status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS'))>=3 then raise exception 'too_many_open_orders'; end if;
 end if;
 if (select count(*) from public.commerce_orders where customer_id=auth.uid() and status='PENDING_PAYMENT' and expires_at>clock_timestamp())>=3 then raise exception 'too_many_holds'; end if;
 if not (public.consume_user_rate_limit('commerce:place_order',10,3600000)->>'allowed')::boolean then raise exception 'rate_limit'; end if;
 select * into c from public.service_catalog where id=f.service_id;
 select s.ends_at into slot_end from public.commerce_slots(p_offering_id,(p_starts_at at time zone 'Europe/Istanbul')::date,p_district_id) s where s.starts_at=p_starts_at and s.starts_at>clock_timestamp()+interval '30 minutes';
 if slot_end is null then raise exception 'slot_unavailable'; end if;
 q:=public.commerce_quote_basket(p_offering_id,p_addons);
 if (q->>'total_minor')::integer is distinct from p_expected_total_minor then raise exception 'price_changed'; end if;
 if (q->>'customer_fee_minor')::integer>0 and (p_fee_consent is distinct from true or p_terms_version is distinct from 'fuwu-fees-v1') then raise exception 'fee_consent_required'; end if;
 insert into public.commerce_orders(customer_id,provider_id,offering_id,service_name,variant_name,scope,provider_name,district_id,district_name,address,starts_at,ends_at,
  total_minor,commission_minor,provider_gross_minor,expires_at,idempotency_key,service_price_minor,customer_fee_minor,provider_commission_bps,customer_fee_bps,fee_consent_at,fee_terms_version,
  payment_method,base_price_minor,addons,addons_minor,customer_note,legal_version,legal_accepted_at,early_start_consent_at,legal_parties)
 values(auth.uid(),p.id,f.id,c.name,(select name from public.service_variants where id=f.variant_id),c.scope,p.name,p_district_id,(select name from public.districts where id=p_district_id),btrim(p_address),p_starts_at,slot_end,
  (q->>'total_minor')::integer,(q->>'commission_minor')::integer,(q->>'provider_gross_minor')::integer,clock_timestamp()+interval '10 minutes',p_idempotency_key,
  (q->>'service_price_minor')::integer,(q->>'customer_fee_minor')::integer,(q->>'provider_commission_bps')::integer,(q->>'customer_fee_bps')::integer,
  case when p_fee_consent then clock_timestamp() end,'fuwu-fees-v1',
  p_payment_method,(q->>'base_price_minor')::integer,q->'addons',(q->>'addons_minor')::integer,note,
  'mesafeli-hizmet-2026-11-24',clock_timestamp(),case when early then clock_timestamp() end,
  jsonb_build_object('provider',provider-'ready','intermediary',intermediary-'ready','exclusions',c.exclusions,'within_withdrawal_period',early)) returning * into o;
 insert into public.order_completion_codes(order_id,code) values(o.id,null) on conflict do nothing;
 if p_payment_method='PAY_AT_DOOR' then
  -- Ödeme beklenmez: randevu hemen kesinleşir; durum tetikleyicileri ustaya ve müşteriye bildirim yazar.
  update public.commerce_orders set status='CONFIRMED',updated_at=now() where id=o.id returning * into o;
 end if;
 return to_jsonb(o);
end $$;
revoke all on function public.commerce_place_order(uuid,timestamptz,uuid,text,uuid,integer,jsonb,text,text,boolean,text,text,boolean) from public,anon,authenticated;
grant execute on function public.commerce_place_order(uuid,timestamptz,uuid,text,uuid,integer,jsonb,text,text,boolean,text,text,boolean) to authenticated;

-- 6 · Cayma: hizmete başlanana kadar müşteri ücretsiz iptal edebilir --------------------------------------
create or replace function public.commerce_transition_order(p_order_id uuid,p_status text,p_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.commerce_orders; p public.providers; c public.order_completion_codes; next_status text;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 select * into p from public.providers where id=(select provider_id from public.commerce_orders where id=p_order_id) for update;
 select * into o from public.commerce_orders where id=p_order_id for update;
 if o.id is null or (o.customer_id is distinct from auth.uid() and p.user_id is distinct from auth.uid()) then raise exception 'transition_forbidden' using errcode='42501'; end if;
 next_status:=p_status;
 -- Cayma hakkı (Yön. m.9, m.15/1-h): hizmetin ifasına başlanmadıkça müşteri ücretsiz vazgeçebilir; usta yolda olsa da.
 if p_status='CANCELLED' and o.customer_id=auth.uid() and (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY') or (o.status='PENDING_PAYMENT' and o.starts_at>now())) then
  if o.payment_status='PAID' then next_status:='REFUND_PENDING'; end if;
 elsif p_status='DISPUTED' and o.customer_id=auth.uid() and o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') then null;
 elsif p.user_id=auth.uid() and o.customer_id<>auth.uid() and o.status='CONFIRMED' and p_status='PROVIDER_ON_THE_WAY' then null;
 elsif p.user_id=auth.uid() and o.customer_id<>auth.uid() and o.status='PROVIDER_ON_THE_WAY' and p_status='IN_PROGRESS' then
  select * into c from public.order_completion_codes where order_id=o.id for update;
  if c.order_id is null or c.code_hash is null or c.consumed_at is not null or c.expires_at<=now() or c.issued_provider_id is distinct from o.provider_id or c.failed_attempts>=5 or c.locked_until>now() then return jsonb_build_object('error','invalid_service_code'); end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' or fuwu_private.hash_code(p_code,c.code_hash)<>c.code_hash then
   update public.order_completion_codes set failed_attempts=failed_attempts+1,locked_until=case when failed_attempts>=4 then expires_at else null end where order_id=o.id;
   insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.code.failed','{}');
   return jsonb_build_object('error','invalid_service_code');
  end if;
  update public.order_completion_codes set consumed_at=now(),code_hash=null where order_id=o.id;
  update public.commerce_orders set arrival_verified_at=now() where id=o.id;
 elsif p_status='COMPLETED' and o.status='IN_PROGRESS' and o.customer_id=auth.uid() and o.service_completed_at is not null then
  update public.commerce_orders set customer_confirmed_at=now() where id=o.id;
 elsif p_status='COMPLETED' and o.status='IN_PROGRESS' and p.user_id=auth.uid() and o.customer_id<>auth.uid() then
  if o.service_completed_at is null then
   update public.commerce_orders set service_completed_at=now(),updated_at=now() where id=o.id;
   insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.completion.requested','{}');
  end if;
  return jsonb_build_object('status','IN_PROGRESS','awaiting_customer',true);
 else raise exception 'transition_forbidden' using errcode='42501'; end if;
 update public.commerce_orders set status=next_status,payment_status=case when next_status='REFUND_PENDING' then 'REFUND_PENDING' else payment_status end,updated_at=now() where id=o.id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.order.transition',jsonb_build_object('from',o.status,'to',next_status));
 return jsonb_build_object('status',next_status);
end $$;

notify pgrst,'reload schema';
commit;
