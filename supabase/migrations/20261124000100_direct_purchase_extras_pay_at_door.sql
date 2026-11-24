-- FUWU doğrudan satın alma (Trendyol / Migros Hemen modeli).
--
-- 1) Ekstralar: her hizmete FUWU'nun tanımladığı, fiyatı baştan belli ek işler (fırın içi, ütü, ek kilit…).
--    Müşteri sepete ekler; fiyat sunucuda hesaplanır ve siparişte değiştirilemez anlık görüntü olarak saklanır.
-- 2) Ödeme yöntemi: CARD (iyzico, mevcut akış) veya PAY_AT_DOOR (kapıda nakit/kart, iş bitince ustaya).
--    Kapıda ödemeli sipariş ödeme beklemeden CONFIRMED olur; müşteri işi onaylayınca PAID sayılır.
--    FUWU para tutmaz; komisyon siparişte kayıtlıdır ve usta hesabında "FUWU payı" olarak görünür.
-- 3) Kapıda ödemeyle satış iyzico alt üye hesabı gerektirmez; kartla ödeme yalnızca hesabı aktif ustada açılır.
--
-- Mevcut tablolar, kayıtlar ve kartlı ödeme akışı değişmez. Tekrar çalıştırmak güvenlidir.
begin;

-- 1 · Ekstralar --------------------------------------------------------------------------------
create table if not exists public.service_addons (
 id uuid primary key default gen_random_uuid(),
 service_id uuid not null references public.service_catalog(id) on delete cascade,
 slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=60),
 name text not null check(length(btrim(name)) between 3 and 80),
 description text check(description is null or length(description)<=240),
 price_minor integer not null check(price_minor between 100 and 10000000),
 max_quantity integer not null default 1 check(max_quantity between 1 and 20),
 is_active boolean not null default true,
 sort_order integer not null default 0 check(sort_order between 0 and 10000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(service_id,slug)
);
create index if not exists service_addons_service on public.service_addons(service_id,sort_order) where is_active;
alter table public.service_addons enable row level security;
revoke all on public.service_addons from public,anon,authenticated;
grant select on public.service_addons to anon,authenticated;
grant all on public.service_addons to service_role;
drop policy if exists service_addons_read on public.service_addons;
create policy service_addons_read on public.service_addons for select to anon,authenticated
 using(is_active or public.current_user_is_admin());

-- 2 · Sipariş anlık görüntüsü ------------------------------------------------------------------
alter table public.commerce_orders
 add column if not exists payment_method text not null default 'CARD',
 add column if not exists base_price_minor integer,
 add column if not exists addons jsonb not null default '[]'::jsonb,
 add column if not exists addons_minor integer not null default 0,
 add column if not exists customer_note text,
 add column if not exists door_payment_collected_at timestamptz;

do $$ begin
 if not exists(select 1 from pg_constraint where conname='commerce_order_payment_method' and conrelid='public.commerce_orders'::regclass) then
  alter table public.commerce_orders add constraint commerce_order_payment_method check(payment_method in ('CARD','PAY_AT_DOOR'));
 end if;
 if not exists(select 1 from pg_constraint where conname='commerce_order_addons_balance' and conrelid='public.commerce_orders'::regclass) then
  alter table public.commerce_orders add constraint commerce_order_addons_balance check(
   jsonb_typeof(addons)='array' and jsonb_array_length(addons)<=10 and addons_minor between 0 and 100000000
   and (customer_note is null or length(customer_note)<=500)
   and ((base_price_minor is null and addons_minor=0 and addons='[]'::jsonb)
    or (base_price_minor>0 and service_price_minor is not null and base_price_minor+addons_minor=service_price_minor)));
 end if;
end $$;
create index if not exists commerce_door_orders on public.commerce_orders(customer_id,status) where payment_method='PAY_AT_DOOR';

-- Satın alma anlık görüntüsü sonradan değiştirilemez (fiyat korumasıyla aynı kural).
create or replace function public.commerce_protect_purchase_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.payment_method,new.base_price_minor,new.addons,new.addons_minor,new.customer_note)
   is distinct from row(old.payment_method,old.base_price_minor,old.addons,old.addons_minor,old.customer_note) then
  raise exception 'immutable_order_price';
 end if;
 if old.door_payment_collected_at is not null and new.door_payment_collected_at is distinct from old.door_payment_collected_at then
  raise exception 'immutable_order_price';
 end if;
 return new;
end $$;
drop trigger if exists commerce_immutable_purchase on public.commerce_orders;
create trigger commerce_immutable_purchase before update on public.commerce_orders for each row execute function public.commerce_protect_purchase_snapshot();
revoke all on function public.commerce_protect_purchase_snapshot() from public,anon,authenticated;

-- Kapıda ödeme: müşteri işi onaylayıp sipariş COMPLETED olduğunda bedel ustaya ödenmiş sayılır.
create or replace function public.commerce_door_payment_collected() returns trigger language plpgsql set search_path='' as $$
begin
 if new.payment_method='PAY_AT_DOOR' and new.status='COMPLETED' and old.status is distinct from 'COMPLETED' and new.payment_status='UNPAID' then
  new.payment_status:='PAID';
  new.door_payment_collected_at:=now();
 end if;
 return new;
end $$;
drop trigger if exists commerce_door_payment on public.commerce_orders;
create trigger commerce_door_payment before update of status on public.commerce_orders for each row execute function public.commerce_door_payment_collected();
revoke all on function public.commerce_door_payment_collected() from public,anon,authenticated;

-- 3 · Teklif ve saatler: kapıda ödeme iyzico alt üye hesabı gerektirmez ----------------------------
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
 and (p_service_id is null or f.service_id=p_service_id)
 and (p_district_id is null or p_district_id=any(f.district_ids))
 and (p_provider_id is null or p.id=p_provider_id)
$$;
revoke all on function public.commerce_offers_before_publication(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.commerce_slots_before_publication(p_offering_id uuid, p_day date, p_district_id uuid)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select s.start_time, s.start_time + make_interval(mins=>f.duration_minutes)
 from public.provider_service_offerings f
 join public.providers p on p.id=f.provider_id
 join public.service_catalog c on c.id=f.service_id
 join public.service_categories cat on cat.id=c.category_id
 left join public.service_variants v on v.id=f.variant_id
 join public.provider_availability a on a.provider_id=p.id and a.weekday=extract(dow from p_day)::integer
 cross join lateral generate_series(
   (p_day+a.starts_at) at time zone 'Europe/Istanbul',
   (p_day+a.ends_at) at time zone 'Europe/Istanbul' - make_interval(mins=>f.duration_minutes),
   interval '15 minutes'
 ) s(start_time)
 where f.id=p_offering_id and f.is_active and c.is_active and cat.is_active and cat.is_visible and p.is_active and p.is_approved
 and p.availability<>'çevrimdışı'
 and ((c.pricing_type='VARIANT_BASED' and v.is_active and v.service_id=c.id) or (c.pricing_type<>'VARIANT_BASED' and f.variant_id is null))
 and p_district_id=any(f.district_ids) and exists(select 1 from public.districts d where d.id=p_district_id and d.is_active)
 and p_day between (now() at time zone 'Europe/Istanbul')::date and (now() at time zone 'Europe/Istanbul')::date+30
 and s.start_time > clock_timestamp()+interval '30 minutes'
 and (p.daily_order_limit is null or (select count(*) from public.commerce_orders cap where cap.provider_id=p.id and (cap.starts_at at time zone 'Europe/Istanbul')::date=p_day and (cap.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED','DISPUTED') or (cap.status='PENDING_PAYMENT' and cap.expires_at>clock_timestamp())))<p.daily_order_limit)
 and not exists(select 1 from public.provider_time_off t where t.provider_id=p.id and t.day=p_day)
 and not exists(select 1 from public.commerce_orders o where o.provider_id=p.id
   and (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED','DISPUTED') or (o.status='PENDING_PAYMENT' and o.expires_at>now()))
   and tstzrange(o.starts_at,o.ends_at,'[)') && tstzrange(s.start_time,s.start_time+make_interval(mins=>f.duration_minutes),'[)'))
 -- Legacy requests have no trustworthy duration: reserve their whole day until reconciled.
 and not exists(select 1 from public.service_requests r where coalesce(r.accepted_provider_id,r.assigned_provider_id)=p.id
   and r.status in ('assigned','accepted','on_the_way','in_progress','ustaya_yonlendirildi')
   and (r.preferred_date is null or r.preferred_date=p_day))
 order by s.start_time
$$;
revoke all on function public.commerce_slots_before_publication(uuid,date,uuid) from public,anon,authenticated,service_role;

-- 4 · Sepet fiyatı: hizmet + ekstralar, ücret oranları commerce_quote ile aynı ----------------------
create or replace function public.commerce_quote_basket(p_offering_id uuid,p_addons jsonb default '[]'::jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare q jsonb; f public.provider_service_offerings; a public.service_addons; item jsonb; qty integer;
 seen uuid[]:='{}'; lines jsonb:='[]'::jsonb; addons_total integer:=0; base integer; price integer; pbps integer; cbps integer;
begin
 q:=public.commerce_quote(p_offering_id);
 select * into f from public.provider_service_offerings where id=p_offering_id;
 if p_addons is null then p_addons:='[]'::jsonb; end if;
 if jsonb_typeof(p_addons)<>'array' or jsonb_array_length(p_addons)>10 then raise exception 'invalid_addons'; end if;
 for item in select value from jsonb_array_elements(p_addons) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(item->>'quantity','') !~ '^[0-9]{1,2}$' then raise exception 'invalid_addons'; end if;
  qty:=(item->>'quantity')::integer;
  select * into a from public.service_addons where id=(item->>'id')::uuid and service_id=f.service_id and is_active;
  if a.id is null or qty<1 or qty>a.max_quantity or a.id=any(seen) then raise exception 'invalid_addons'; end if;
  seen:=seen||a.id;
  lines:=lines||jsonb_build_object('id',a.id,'name',a.name,'quantity',qty,'unit_price_minor',a.price_minor,'total_minor',a.price_minor*qty,'sort',a.sort_order);
  addons_total:=addons_total+a.price_minor*qty;
 end loop;
 select coalesce(jsonb_agg(x-'sort' order by (x->>'sort')::integer,x->>'name'),'[]'::jsonb) into lines from jsonb_array_elements(lines) x;
 base:=(q->>'service_price_minor')::integer; pbps:=(q->>'provider_commission_bps')::integer; cbps:=(q->>'customer_fee_bps')::integer;
 price:=base+addons_total;
 if price>100000000 then raise exception 'invalid_addons'; end if;
 return jsonb_build_object('base_price_minor',base,'addons',lines,'addons_minor',addons_total,'service_price_minor',price,
  'customer_fee_minor',round(price::numeric*cbps/10000)::integer,'total_minor',price+round(price::numeric*cbps/10000)::integer,
  'commission_minor',round(price::numeric*pbps/10000)::integer,'provider_gross_minor',price-round(price::numeric*pbps/10000)::integer,
  'provider_commission_bps',pbps,'customer_fee_bps',cbps,'terms_version','fuwu-fees-v1');
end $$;
revoke all on function public.commerce_quote_basket(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_quote_basket(uuid,jsonb) to anon,authenticated;

-- 5 · Siparişi ver ----------------------------------------------------------------------------
insert into public.app_settings(key,value) values('pay_at_door_enabled','true') on conflict(key) do nothing;

create or replace function public.commerce_place_order(p_offering_id uuid,p_starts_at timestamptz,p_district_id uuid,p_address text,p_idempotency_key uuid,
 p_expected_total_minor integer,p_addons jsonb,p_payment_method text,p_note text,p_fee_consent boolean,p_terms_version text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.provider_service_offerings; p public.providers; c public.service_catalog; o public.commerce_orders; slot_end timestamptz; q jsonb; note text;
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
  payment_method,base_price_minor,addons,addons_minor,customer_note)
 values(auth.uid(),p.id,f.id,c.name,(select name from public.service_variants where id=f.variant_id),c.scope,p.name,p_district_id,(select name from public.districts where id=p_district_id),btrim(p_address),p_starts_at,slot_end,
  (q->>'total_minor')::integer,(q->>'commission_minor')::integer,(q->>'provider_gross_minor')::integer,clock_timestamp()+interval '10 minutes',p_idempotency_key,
  (q->>'service_price_minor')::integer,(q->>'customer_fee_minor')::integer,(q->>'provider_commission_bps')::integer,(q->>'customer_fee_bps')::integer,
  case when p_fee_consent then clock_timestamp() end,'fuwu-fees-v1',
  p_payment_method,(q->>'base_price_minor')::integer,q->'addons',(q->>'addons_minor')::integer,note) returning * into o;
 insert into public.order_completion_codes(order_id,code) values(o.id,null) on conflict do nothing;
 if p_payment_method='PAY_AT_DOOR' then
  -- Ödeme beklenmez: randevu hemen kesinleşir; durum tetikleyicileri ustaya ve müşteriye bildirim yazar.
  update public.commerce_orders set status='CONFIRMED',updated_at=now() where id=o.id returning * into o;
 end if;
 return to_jsonb(o);
end $$;
revoke all on function public.commerce_place_order(uuid,timestamptz,uuid,text,uuid,integer,jsonb,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.commerce_place_order(uuid,timestamptz,uuid,text,uuid,integer,jsonb,text,text,boolean,text) to authenticated;

-- 6 · Finans ve mutabakat: kapıda ödeme kart işlemi beklemez ---------------------------------------
create or replace function public.commerce_admin_reconciliation(p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 with flagged as (
   select o.*,jsonb_build_object('status',t.status,'payout_state',t.payout_state,'refund_state',t.refund_state,'environment',t.environment,'created_at',t.created_at,'has_item_transaction',t.item_transaction_id is not null) payment_transactions
   from public.commerce_orders o left join public.payment_transactions t on t.order_id=o.id
   where (o.payment_status='PAID' and t.status is distinct from 'SUCCEEDED' and o.payment_method<>'PAY_AT_DOOR')
   or (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') and o.payment_status<>'PAID' and o.payment_method<>'PAY_AT_DOOR')
   or (t.status='SUCCEEDED' and o.payment_status in ('UNPAID','FAILED'))
   or (t.status='INITIALIZING' and t.created_at<now()-interval '5 minutes')
   or (t.status='AWAITING' and o.expires_at<=now())
   or (t.status='SUCCEEDED' and t.item_transaction_id is null)
   or t.refund_state='IN_FLIGHT' or t.payout_state='IN_FLIGHT'
 ), page_rows as (select * from flagged order by created_at desc,id limit 25 offset ((greatest(1,least(coalesce(p_page,1),10000))-1)*25))
 select jsonb_build_object('count',(select count(*) from flagged),'orders',coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.commerce_admin_reconciliation(integer) from public,anon,authenticated;
grant execute on function public.commerce_admin_reconciliation(integer) to authenticated;

create or replace function public.commerce_admin_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return (select jsonb_build_object(
  'environment','sandbox',
  'customer_fee_minor',coalesce(sum(coalesce(o.customer_fee_minor,0)) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'platform_gross_minor',coalesce(sum(o.commission_minor+coalesce(o.customer_fee_minor,0)) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'processor_fee_minor',coalesce(sum(o.processor_fee_minor) filter(where t.status='SUCCEEDED'),0),
  'unknown_processor_fee_count',count(*) filter(where t.status='SUCCEEDED' and o.processor_fee_minor is null),
  'customer_collected_minor',coalesce(sum(o.total_minor) filter(where t.status='SUCCEEDED'),0),
  'net_contribution_minor',null,
'paid_count',count(*) filter(where t.status='SUCCEEDED'),'overdue_count',count(*) filter(where o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS') and o.ends_at<now()),'scheduled_count',count(*) filter(where t.status='SUCCEEDED'),'order_count',count(*),'completed_count',count(*) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),
  'daily_gmv_minor',coalesce(sum(coalesce(o.service_price_minor,o.total_minor)) filter(where t.status='SUCCEEDED' and (t.paid_at at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date),0),
  'monthly_gmv_minor',coalesce(sum(coalesce(o.service_price_minor,o.total_minor)) filter(where t.status='SUCCEEDED' and date_trunc('month',t.paid_at at time zone 'Europe/Istanbul')=date_trunc('month',now() at time zone 'Europe/Istanbul')),0),
  'gmv_minor',coalesce(sum(coalesce(o.service_price_minor,o.total_minor)) filter(where t.status='SUCCEEDED'),0),
  'commission_minor',coalesce(sum(o.commission_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'pending_count',count(*) filter(where o.status='PENDING_PAYMENT' and o.expires_at>now()),
  'failed_count',count(*) filter(where o.payment_status='FAILED'),
  'refund_pending_count',count(*) filter(where o.status='REFUND_PENDING'),
  'refunded_minor',coalesce(sum(o.total_minor) filter(where o.payment_status='REFUNDED'),0),
  'payout_pending_minor',coalesce(sum(o.provider_gross_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED' and t.payout_state is distinct from 'RELEASED'),0),
  'disputed_count',count(*) filter(where o.status='DISPUTED'),
  'cancelled_count',count(*) filter(where o.status='CANCELLED' or (o.status='PENDING_PAYMENT' and o.expires_at<=now())
    or (o.status in ('REFUND_PENDING','REFUNDED') and not exists(select 1 from public.order_status_events e where e.order_id=o.id and e.status='COMPLETED'))),
  'average_minor',coalesce(round(avg(o.total_minor) filter(where t.status='SUCCEEDED')),0),
  'reconciliation_count',count(*) filter(where
    (o.payment_status='PAID' and t.status is distinct from 'SUCCEEDED' and o.payment_method<>'PAY_AT_DOOR') or
    (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') and o.payment_status<>'PAID' and o.payment_method<>'PAY_AT_DOOR') or
    (t.status='SUCCEEDED' and o.payment_status in ('UNPAID','FAILED')) or
    (t.status='INITIALIZING' and t.created_at<now()-interval '5 minutes') or
    (t.status='AWAITING' and o.expires_at<=now()) or (t.status='SUCCEEDED' and t.item_transaction_id is null) or t.refund_state='IN_FLIGHT' or t.payout_state='IN_FLIGHT'),
  'door_open_count',count(*) filter(where o.payment_method='PAY_AT_DOOR' and o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS')),
  'door_completed_count',count(*) filter(where o.payment_method='PAY_AT_DOOR' and o.status='COMPLETED' and o.payment_status='PAID'),
  'door_collected_minor',coalesce(sum(o.total_minor) filter(where o.payment_method='PAY_AT_DOOR' and o.status='COMPLETED' and o.payment_status='PAID'),0),
  'door_platform_due_minor',coalesce(sum(o.commission_minor+coalesce(o.customer_fee_minor,0)) filter(where o.payment_method='PAY_AT_DOOR' and o.status='COMPLETED' and o.payment_status='PAID'),0),
  'active_providers',(select count(*) from public.providers where is_active and is_approved),
  'new_customers_month',(select count(*) from public.profiles where role='customer' and created_at>=date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'),
  'repeat_customer_percent',(select coalesce(round(100.0*count(*) filter(where n>1)/nullif(count(*),0),1),0) from (select count(*) n from public.commerce_orders x where exists(select 1 from public.payment_transactions y where y.order_id=x.id and y.status='SUCCEEDED') or (x.payment_method='PAY_AT_DOOR' and x.status='COMPLETED') group by x.customer_id) buyers)
 ) from public.commerce_orders o left join public.payment_transactions t on t.order_id=o.id);
end $$;
revoke all on function public.commerce_admin_summary() from public,anon,authenticated;
grant execute on function public.commerce_admin_summary() to authenticated;

create or replace function public.commerce_provider_finance(p_provider_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not(exists(select 1 from public.providers where id=p_provider_id and user_id=auth.uid()) or public.current_user_is_admin())
 then raise exception 'forbidden' using errcode='42501'; end if;
 return (select jsonb_build_object(
  'environment','sandbox',
  'provider_processor_fee_minor',coalesce(sum(o.provider_processor_fee_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'unconfirmed_provider_fee_count',count(*) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED' and o.provider_processor_fee_minor is null),
  'refunded_service_minor',coalesce(sum(coalesce(o.service_price_minor,o.total_minor)) filter(where o.payment_status='REFUNDED'),0),
  'completed_count',count(*) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),
  'gross_minor',coalesce(sum(coalesce(o.service_price_minor,o.total_minor)) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'commission_minor',coalesce(sum(o.commission_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'provider_gross_minor',coalesce(sum(o.provider_gross_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'known_processor_fee_minor',coalesce(sum(o.processor_fee_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED'),0),
  'unknown_fee_count',count(*) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED' and o.processor_fee_minor is null),
  'released_minor',coalesce(sum(o.provider_gross_minor) filter(where t.payout_state='RELEASED'),0),
  'pending_minor',coalesce(sum(o.provider_gross_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED' and t.payout_state is distinct from 'RELEASED'),0),
  'in_flight_count',count(*) filter(where t.payout_state='IN_FLIGHT' or t.refund_state='IN_FLIGHT'),
  'door_upcoming_count',count(*) filter(where o.payment_method='PAY_AT_DOOR' and o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS')),
  'door_upcoming_minor',coalesce(sum(o.total_minor) filter(where o.payment_method='PAY_AT_DOOR' and o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS')),0),
  'door_completed_count',count(*) filter(where o.payment_method='PAY_AT_DOOR' and o.status='COMPLETED' and o.payment_status='PAID'),
  'door_collected_minor',coalesce(sum(o.total_minor) filter(where o.payment_method='PAY_AT_DOOR' and o.status='COMPLETED' and o.payment_status='PAID'),0),
  'door_platform_due_minor',coalesce(sum(o.commission_minor+coalesce(o.customer_fee_minor,0)) filter(where o.payment_method='PAY_AT_DOOR' and o.status='COMPLETED' and o.payment_status='PAID'),0)
 ) from public.commerce_orders o left join public.payment_transactions t on t.order_id=o.id where o.provider_id=p_provider_id);
end $$;
revoke all on function public.commerce_provider_finance(uuid) from public,anon,authenticated;
grant execute on function public.commerce_provider_finance(uuid) to authenticated;

-- 7 · Admin: ekstraları yönet (her değişiklik denetim kaydına yazılır) ---------------------------
create or replace function public.commerce_admin_save_addon(p_addon jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare aid uuid; sid uuid;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if jsonb_typeof(p_addon)<>'object' or coalesce(p_addon->>'service_id','') !~ '^[0-9a-f-]{36}$'
  or coalesce(p_addon->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_addon->>'slug')>60
  or length(btrim(coalesce(p_addon->>'name',''))) not between 3 and 80 or length(coalesce(p_addon->>'description',''))>240
  or coalesce(p_addon->>'price_minor','') !~ '^[0-9]{3,8}$' or coalesce(p_addon->>'max_quantity','1') !~ '^[0-9]{1,2}$'
  or coalesce(p_addon->>'sort_order','0') !~ '^[0-9]{1,5}$' or jsonb_typeof(coalesce(p_addon->'is_active','true'::jsonb))<>'boolean'
 then raise exception 'invalid_addon'; end if;
 sid:=(p_addon->>'service_id')::uuid;
 if not exists(select 1 from public.service_catalog where id=sid) then raise exception 'invalid_addon'; end if;
 insert into public.service_addons(service_id,slug,name,description,price_minor,max_quantity,is_active,sort_order)
 values(sid,p_addon->>'slug',btrim(p_addon->>'name'),nullif(btrim(coalesce(p_addon->>'description','')),''),(p_addon->>'price_minor')::integer,
  coalesce(p_addon->>'max_quantity','1')::integer,coalesce((p_addon->>'is_active')::boolean,true),coalesce(p_addon->>'sort_order','0')::integer)
 on conflict(service_id,slug) do update set name=excluded.name,description=excluded.description,price_minor=excluded.price_minor,
  max_quantity=excluded.max_quantity,is_active=excluded.is_active,sort_order=excluded.sort_order,updated_at=now()
 returning id into aid;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
 values(auth.uid(),'catalog',sid,'catalog.addon.saved',jsonb_build_object('addon_id',aid,'slug',p_addon->>'slug','price_minor',(p_addon->>'price_minor')::integer,'is_active',coalesce((p_addon->>'is_active')::boolean,true)));
 return aid;
end $$;
revoke all on function public.commerce_admin_save_addon(jsonb) from public,anon,authenticated;
grant execute on function public.commerce_admin_save_addon(jsonb) to authenticated;

-- 8 · Başlangıç ekstraları (FUWU varsayılanları; admin panelinden değiştirilebilir) ------------------
-- Fiyatlar kuruş cinsindendir ve işçilik içindir; malzeme ayrıca belirtilmedikçe dahil değildir.
with defs(service_slug,slug,name,description,price_minor,max_quantity,sort_order) as (values
 ('ev-temizligi','firin-ici','Fırın içi temizliği','Ankastre ya da set üstü fırının içi, raflar ve cam kapak.',35000,1,10),
 ('ev-temizligi','buzdolabi-ici','Buzdolabı içi temizliği','Raflar, çekmeceler ve conta; buzdolabı boşaltılmış olmalı.',30000,1,20),
 ('ev-temizligi','cam-silme','Cam silme (iç-dış, oda başına)','Ulaşılabilir pencerelerin iç ve dış yüzü; dış cephe ve iskele gerektiren camlar hariç.',15000,8,30),
 ('ev-temizligi','balkon','Balkon temizliği','Zemin, korkuluk ve balkon camı iç yüzü.',30000,2,40),
 ('ev-temizligi','utu','Ütü (1 saat)','Evdeki ütü ve masa ile bir saat ütü.',40000,3,50),
 ('detayli-ev-temizligi','firin-ici','Fırın içi temizliği','Ankastre ya da set üstü fırının içi, raflar ve cam kapak.',35000,1,10),
 ('detayli-ev-temizligi','buzdolabi-ici','Buzdolabı içi temizliği','Raflar, çekmeceler ve conta; buzdolabı boşaltılmış olmalı.',30000,1,20),
 ('detayli-ev-temizligi','balkon','Balkon temizliği','Zemin, korkuluk ve balkon camı iç yüzü.',30000,2,30),
 ('detayli-ev-temizligi','utu','Ütü (1 saat)','Evdeki ütü ve masa ile bir saat ütü.',40000,3,40),
 ('musluk-montaji','ek-musluk','Ek musluk ya da batarya montajı','Aynı adreste bir musluk daha; ürün müşteriden.',45000,3,10),
 ('musluk-montaji','ara-musluk','Ara musluk (ankastre vana) değişimi','Adet başına işçilik; vana müşteriden ya da ustadan ayrıca.',30000,4,20),
 ('musluk-montaji','spiral','Bağlantı hortumu (spiral) değişimi','Adet başına işçilik.',15000,4,30),
 ('klima-bakimi','dis-unite','Dış ünite yıkama','Kondenser peteklerinin basınçlı suyla temizliği (klima başına).',30000,4,10),
 ('klima-bakimi','gaz-kontrol','Gaz basıncı ölçümü','Manometreyle basınç ölçümü; gaz dolumu dahil değildir.',25000,4,20),
 ('elektrik-ariza-tespiti','priz-anahtar','Priz ya da anahtar değişimi','Adet başına işçilik; ürün müşteriden.',15000,10,10),
 ('elektrik-ariza-tespiti','avize','Avize ya da aplik montajı','Adet başına; mevcut tesisata bağlantı.',30000,5,20),
 ('mobilya-montaji','duvara-sabitleme','Devrilme önleyici duvara sabitleme','Dolap ya da kitaplığı duvara sabitleme (adet başına).',20000,5,10),
 ('mobilya-montaji','tv-duvar','TV duvar montajı','Askı aparatıyla duvara montaj; aparat müşteriden.',60000,2,20),
 ('mobilya-montaji','ambalaj','Ambalaj atıklarını toplama','Kutu ve ambalajların toplanıp bina çöpüne bırakılması.',15000,1,30),
 ('oda-boyama','tavan','Tavan boyama (oda başına)','Seçilen odanın tavanının iki kat boyanması; boya ayrıca.',90000,6,10),
 ('oda-boyama','alci-macun','Alçı ve macun rötuşu (oda başına)','Küçük çatlak ve deliklerin düzeltilmesi.',60000,6,20),
 ('oda-boyama','kapi-pervaz','Kapı ve pervaz boyama (adet)','Ahşap kapı ve pervazın boyanması; boya ayrıca.',50000,6,30),
 ('kapi-acma','barel','Barel değişimi (işçilik)','Kapı açıldıktan sonra barelin yenilenmesi; barel ayrıca.',30000,1,10),
 ('kilit-degisimi','ek-kilit','Ek kilit değişimi','Aynı adreste bir kilit daha (işçilik).',30000,3,10),
 ('kilit-degisimi','kapi-kolu','Kapı kolu değişimi','Adet başına işçilik; ürün müşteriden.',20000,3,20),
 ('hali-yikama','leke','Leke ön işlemi (halı başına)','Yoğun lekeler için ön uygulama; kalıcı leke garantisi yoktur.',15000,10,10),
 ('hali-yikama','antialerjik','Antialerjik yıkama (halı başına)','Akar ve alerjen giderici ürünle yıkama.',20000,10,20),
 ('koltuk-yikama','minder','Yastık ve minder yıkama (5 adet)','Koltuk yastıkları ve minderleri.',20000,4,10),
 ('koltuk-yikama','yatak','Yatak yıkama (tek kişilik)','Yerinde vakumlu yıkama.',50000,4,20),
 ('havuz-temizligi','sok-dozu','Şok klorlama','Yeşillenmiş ya da bulanık suda şok uygulama; kimyasal dahil.',60000,1,10),
 ('havuz-temizligi','fayans','Su hattı fayans fırçalama','Su hattındaki kireç ve yosunun fırçalanması.',50000,1,20),
 ('esya-tasima-yardimi','ek-tasiyici','Ek taşıyıcı (1 kişi)','Ağır ya da çok parçalı eşya için bir kişi daha.',100000,3,10),
 ('esya-tasima-yardimi','paketleme','Paketleme malzemesi','Koli, streç ve köpük (paket başına).',60000,3,20),
 ('esya-tasima-yardimi','asansorsuz','Asansörsüz kat (kat başına)','Asansör yoksa ya da eşyaya uygun değilse kat başına.',15000,10,30),
 ('cim-bicme','kenar','Kenar düzeltme','Yürüyüş yolu ve tarh kenarlarının düzeltilmesi.',30000,1,10),
 ('cim-bicme','atik','Çim atıklarını götürme','Biçilen çimin torbalanıp götürülmesi.',40000,1,20),
 ('cit-budama','atik','Budama atıklarını götürme','Dal ve yaprakların torbalanıp götürülmesi.',40000,1,10),
 ('cit-budama','agac','Ağaç budama (3 m''ye kadar, adet)','Merdivenle ulaşılabilen ağaçlar.',50000,5,20)
)
insert into public.service_addons(service_id,slug,name,description,price_minor,max_quantity,sort_order)
select s.id,d.slug,d.name,d.description,d.price_minor,d.max_quantity,d.sort_order
from defs d join public.service_catalog s on s.slug=d.service_slug
on conflict(service_id,slug) do nothing;

notify pgrst,'reload schema';
commit;
