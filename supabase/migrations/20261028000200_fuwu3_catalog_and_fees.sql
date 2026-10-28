-- Review and apply to an isolated database first. Never run automatically in production.
begin;

alter table public.service_categories
 add column is_visible boolean not null default true,
 add column is_featured boolean not null default true,
 add column sort_order integer not null default 0 check(sort_order between 0 and 10000),
 add column icon_name text check(icon_name in ('air-conditioner','appliance','bolt','broom','calendar-check','box','faucet','furniture-tool','graduation-cap','home','key','paint-roller','pipe','rug','sparkles','leaf','droplets','truck','wrench')),
 add column provider_commission_bps integer check(provider_commission_bps between 0 and 10000),
 add column customer_fee_bps integer check(customer_fee_bps between 0 and 10000);
-- Preserve every existing category, active flag, slug, name and relationship.

create function public.commerce_admin_save_category(p_id uuid,p_name text,p_slug text,p_visible boolean,p_featured boolean,p_sort integer,p_icon text)
returns void language plpgsql security definer set search_path='' as $$
declare previous jsonb;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 60 or p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug)>100 or p_visible is null or p_featured is null or p_sort is null then raise exception 'invalid_category'; end if;
 select to_jsonb(c) into previous from public.service_categories c where id=p_id for update;
 if previous is null then raise exception 'category_not_found'; end if;
 update public.service_categories set name=btrim(p_name),slug=p_slug,is_visible=p_visible,is_featured=p_featured,sort_order=p_sort,icon_name=nullif(p_icon,'') where id=p_id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
 values(auth.uid(),'category',p_id,'category.presentation_updated',jsonb_build_object('previous',previous,'name',btrim(p_name),'slug',p_slug,'visible',p_visible,'featured',p_featured,'sort_order',p_sort));
end $$;
revoke all on function public.commerce_admin_save_category(uuid,text,text,boolean,boolean,integer,text) from public,anon,authenticated;
grant execute on function public.commerce_admin_save_category(uuid,text,text,boolean,boolean,integer,text) to authenticated;

create function public.commerce_category_fee_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if row(new.provider_commission_bps,new.customer_fee_bps) is distinct from row(old.provider_commission_bps,old.customer_fee_bps) then
   insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'category',new.id,'commerce.category_fee_changed',jsonb_build_object('previous_provider_bps',old.provider_commission_bps,'provider_bps',new.provider_commission_bps,'previous_customer_bps',old.customer_fee_bps,'customer_bps',new.customer_fee_bps));
 end if;
 return new;
end $$;
create trigger commerce_category_rate_audit after update of provider_commission_bps,customer_fee_bps on public.service_categories for each row execute function public.commerce_category_fee_audit();
revoke all on function public.commerce_category_fee_audit() from public,anon,authenticated;

-- New rates always use percent strings at the settings boundary; 1 means 1%, never 100%.
insert into public.app_settings(key,value) values('customer_fee_rate','0') on conflict(key) do nothing;
create function public.commerce_validate_fee_setting() returns trigger language plpgsql set search_path='' as $$
begin
 if new.key in ('commission_rate','customer_fee_rate') then
   if new.value is null or new.value !~ '^[0-9]{1,3}([.,][0-9]{1,2})?$' then raise exception 'invalid_fee_rate'; end if;
   if replace(new.value,',','.')::numeric not between 0 and 100 then raise exception 'invalid_fee_rate'; end if;
 end if;
 return new;
end $$;
create trigger commerce_fee_validation before insert or update on public.app_settings for each row execute function public.commerce_validate_fee_setting();

create function public.commerce_fee_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.key in ('commission_rate','customer_fee_rate') and (TG_OP='INSERT' or old.value is distinct from new.value) then
   insert into public.audit_logs(actor_user_id,entity_type,action,metadata) values(auth.uid(),'settings','commerce.fee_changed',jsonb_build_object('key',new.key,'previous',case when TG_OP='UPDATE' then old.value end,'value',new.value,'environment','sandbox'));
 end if;
 return new;
end $$;
create trigger commerce_fee_change_audit after insert or update on public.app_settings for each row execute function public.commerce_fee_audit();
revoke all on function public.commerce_validate_fee_setting(),public.commerce_fee_audit() from public,anon,authenticated;

-- Nullable additions preserve historical rows byte for byte. NULL means historical snapshot unavailable.
alter table public.orders
 add column service_price_minor integer,
 add column customer_fee_minor integer,
 add column provider_commission_bps integer,
 add column customer_fee_bps integer,
 add column fee_consent_at timestamptz,
 add column fee_terms_version text,
 add column provider_processor_fee_minor integer check(provider_processor_fee_minor>=0);
-- Constraint names depend on earlier cross-column checks. Locate only the old money balance;
-- never drop the independent ends_at > starts_at constraint.
do $$ declare item record; begin
 for item in select conname from pg_catalog.pg_constraint where conrelid='public.orders'::regclass and contype='c'
   and position('commission_minor + provider_gross_minor' in pg_catalog.pg_get_constraintdef(oid))>0
   and position('total_minor' in pg_catalog.pg_get_constraintdef(oid))>0
 loop execute format('alter table public.orders drop constraint %I',item.conname); end loop;
end $$;
alter table public.orders add constraint commerce_order_price_balance check(
 commission_minor>=0 and provider_gross_minor>=0 and
 ((service_price_minor is null and customer_fee_minor is null and provider_commission_bps is null and customer_fee_bps is null and commission_minor+provider_gross_minor=total_minor)
 or (service_price_minor is not null and customer_fee_minor is not null and provider_commission_bps is not null and customer_fee_bps is not null
 and service_price_minor>0 and customer_fee_minor>=0 and provider_commission_bps between 0 and 10000 and customer_fee_bps between 0 and 10000
 and service_price_minor+customer_fee_minor=total_minor and commission_minor+provider_gross_minor=service_price_minor
 and commission_minor=round(service_price_minor::numeric*provider_commission_bps/10000)
 and customer_fee_minor=round(service_price_minor::numeric*customer_fee_bps/10000)
 and fee_terms_version is not null and fee_terms_version='fuwu-fees-v1' and (customer_fee_minor=0 or fee_consent_at is not null))));

create function public.commerce_quote(p_offering_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.provider_service_offerings; cat public.service_categories; provider_bps integer; customer_bps integer; val text; fee integer; commission integer;
begin
 select * into f from public.provider_service_offerings where id=p_offering_id;
 if f.id is null or not exists(select 1 from jsonb_array_elements(public.commerce_offers(f.service_id,null,f.provider_id)) item where item->>'id'=f.id::text) then raise exception 'offering_unavailable'; end if;
 select c.* into cat from public.service_categories c join public.service_catalog s on s.category_id=c.id where s.id=f.service_id;
 if not cat.is_visible then raise exception 'offering_unavailable'; end if;
 select value into val from public.app_settings where key='commission_rate';
 if val is not null and (val !~ '^[0-9]{1,3}([.,][0-9]{1,2})?$' or replace(val,',','.')::numeric not between 0 and 100) then raise exception 'invalid_fee_rate'; end if;
 provider_bps:=coalesce(cat.provider_commission_bps,(replace(val,',','.')::numeric*100)::integer,1000);
 select value into val from public.app_settings where key='customer_fee_rate';
 if val is not null and (val !~ '^[0-9]{1,3}([.,][0-9]{1,2})?$' or replace(val,',','.')::numeric not between 0 and 100) then raise exception 'invalid_fee_rate'; end if;
 customer_bps:=coalesce(cat.customer_fee_bps,(replace(val,',','.')::numeric*100)::integer,0);
 fee:=round(f.price_minor::numeric*customer_bps/10000)::integer;
 commission:=round(f.price_minor::numeric*provider_bps/10000)::integer;
 return jsonb_build_object('service_price_minor',f.price_minor,'customer_fee_minor',fee,'total_minor',f.price_minor+fee,'commission_minor',commission,'provider_gross_minor',f.price_minor-commission,'provider_commission_bps',provider_bps,'customer_fee_bps',customer_bps,'terms_version','fuwu-fees-v1');
end $$;
revoke all on function public.commerce_quote(uuid) from public,anon,authenticated;
grant execute on function public.commerce_quote(uuid) to anon,authenticated;

create function public.commerce_hold_order_priced(p_offering_id uuid,p_starts_at timestamptz,p_district_id uuid,p_address text,p_idempotency_key uuid,p_expected_price_minor integer,p_expected_total_minor integer,p_fee_consent boolean,p_terms_version text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.provider_service_offerings; p public.providers; c public.service_catalog; o public.orders; slot_end timestamptz; q jsonb;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_idempotency_key is null or p_address is null or length(btrim(p_address)) not between 10 and 1000 then raise exception 'invalid_address'; end if;
 select * into f from public.provider_service_offerings where id=p_offering_id;
 if not found then raise exception 'offering_unavailable'; end if;
 select * into p from public.providers where id=f.provider_id for update;
 select * into o from public.orders where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then
   if o.offering_id<>p_offering_id or o.starts_at<>p_starts_at or o.address<>btrim(p_address) or o.district_id<>p_district_id
     or o.total_minor is distinct from p_expected_total_minor or coalesce(o.service_price_minor,o.total_minor) is distinct from p_expected_price_minor then raise exception 'idempotency_conflict'; end if;
   return to_jsonb(o);
 end if;
 if (select count(*) from public.orders where customer_id=auth.uid() and status='PENDING_PAYMENT' and expires_at>clock_timestamp())>=3 then raise exception 'too_many_holds'; end if;
 select * into f from public.provider_service_offerings where id=p_offering_id;
 if f.price_minor is distinct from p_expected_price_minor then raise exception 'price_changed'; end if;
 select * into c from public.service_catalog where id=f.service_id;
 select s.ends_at into slot_end from public.commerce_slots(p_offering_id,(p_starts_at at time zone 'Europe/Istanbul')::date,p_district_id) s where s.starts_at=p_starts_at and s.starts_at>clock_timestamp()+interval '30 minutes';
 if slot_end is null then raise exception 'slot_unavailable'; end if;
 q:=public.commerce_quote(p_offering_id);
 if (q->>'total_minor')::integer is distinct from p_expected_total_minor then raise exception 'fee_changed'; end if;
 if (q->>'customer_fee_minor')::integer>0 and (p_fee_consent is distinct from true or p_terms_version is distinct from 'fuwu-fees-v1') then raise exception 'fee_consent_required'; end if;
 insert into public.orders(customer_id,provider_id,offering_id,service_name,variant_name,scope,provider_name,district_id,district_name,address,starts_at,ends_at,total_minor,commission_minor,provider_gross_minor,expires_at,idempotency_key,service_price_minor,customer_fee_minor,provider_commission_bps,customer_fee_bps,fee_consent_at,fee_terms_version)
 values(auth.uid(),p.id,f.id,c.name,(select name from public.service_variants where id=f.variant_id),c.scope,p.name,p_district_id,(select name from public.districts where id=p_district_id),btrim(p_address),p_starts_at,slot_end,(q->>'total_minor')::integer,(q->>'commission_minor')::integer,(q->>'provider_gross_minor')::integer,clock_timestamp()+interval '10 minutes',p_idempotency_key,f.price_minor,(q->>'customer_fee_minor')::integer,(q->>'provider_commission_bps')::integer,(q->>'customer_fee_bps')::integer,case when p_fee_consent then clock_timestamp() end,'fuwu-fees-v1') returning * into o;
 insert into public.order_completion_codes(order_id,code) values(o.id,((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint % 900000)+100000)::text);
 return to_jsonb(o);
end $$;
-- Old clients can continue only when they displayed the correct total (zero customer fee).
create or replace function public.commerce_hold_order(p_offering_id uuid,p_starts_at timestamptz,p_district_id uuid,p_address text,p_idempotency_key uuid,p_expected_price_minor integer)
returns jsonb language sql security definer set search_path='' as $$
 select public.commerce_hold_order_priced(p_offering_id,p_starts_at,p_district_id,p_address,p_idempotency_key,p_expected_price_minor,p_expected_price_minor,false,'fuwu-fees-v1');
$$;
revoke all on function public.commerce_hold_order_priced(uuid,timestamptz,uuid,text,uuid,integer,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.commerce_hold_order_priced(uuid,timestamptz,uuid,text,uuid,integer,integer,boolean,text) to authenticated;

-- Existing order amounts, terms and applied rates cannot be rewritten by lifecycle updates.
create function public.commerce_protect_price_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.total_minor,new.commission_minor,new.provider_gross_minor,new.service_price_minor,new.customer_fee_minor,new.provider_commission_bps,new.customer_fee_bps,new.fee_consent_at,new.fee_terms_version)
 is distinct from row(old.total_minor,old.commission_minor,old.provider_gross_minor,old.service_price_minor,old.customer_fee_minor,old.provider_commission_bps,old.customer_fee_bps,old.fee_consent_at,old.fee_terms_version) then raise exception 'immutable_order_price'; end if;
 return new;
end $$;
create trigger commerce_immutable_price before update on public.orders for each row execute function public.commerce_protect_price_snapshot();
revoke all on function public.commerce_protect_price_snapshot() from public,anon,authenticated;

-- Additional function definitions follow, generated from the current audited implementations.

alter table public.providers add column daily_order_limit integer check(daily_order_limit between 1 and 30);
create or replace function public.commerce_offers(p_service_id uuid default null, p_district_id uuid default null, p_provider_id uuid default null)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',f.id,'service_id',f.service_id,'variant_id',f.variant_id,'variant_name',v.name,
  'provider_id',p.id,'provider_name',p.name,'profile_image_url',p.profile_image_url,
  'price_minor',f.price_minor,'duration_minutes',f.duration_minutes,'district_ids',f.district_ids,
  'rating',(select round(avg(r.rating),1) from public.reviews r where r.provider_id=p.id),
  'review_count',(select count(*) from public.reviews r where r.provider_id=p.id)
 ) order by f.price_minor), '[]'::jsonb)
 from public.provider_service_offerings f
 join public.providers p on p.id=f.provider_id
 join public.service_catalog c on c.id=f.service_id
 join public.service_categories cat on cat.id=c.category_id
 left join public.service_variants v on v.id=f.variant_id
 where f.is_active and c.is_active and cat.is_active and cat.is_visible and p.is_active and p.is_approved and p.availability <> 'çevrimdışı'
 and p.iyzico_submerchant_status='active' and p.iyzico_submerchant_key is not null
 and ((c.pricing_type='VARIANT_BASED' and v.is_active and v.service_id=c.id) or (c.pricing_type<>'VARIANT_BASED' and f.variant_id is null))
 and (p_service_id is null or f.service_id=p_service_id)
 and (p_district_id is null or p_district_id=any(f.district_ids))
 and (p_provider_id is null or p.id=p_provider_id)
$$;

create or replace function public.commerce_slots(p_offering_id uuid, p_day date, p_district_id uuid)
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
 and p.availability<>'çevrimdışı' and p.iyzico_submerchant_status='active' and p.iyzico_submerchant_key is not null
 and ((c.pricing_type='VARIANT_BASED' and v.is_active and v.service_id=c.id) or (c.pricing_type<>'VARIANT_BASED' and f.variant_id is null))
 and p_district_id=any(f.district_ids) and exists(select 1 from public.districts d where d.id=p_district_id and d.is_active)
 and p_day between (now() at time zone 'Europe/Istanbul')::date and (now() at time zone 'Europe/Istanbul')::date+30
 and s.start_time > clock_timestamp()+interval '30 minutes'
 and (p.daily_order_limit is null or (select count(*) from public.orders cap where cap.provider_id=p.id and (cap.starts_at at time zone 'Europe/Istanbul')::date=p_day and (cap.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED','DISPUTED') or (cap.status='PENDING_PAYMENT' and cap.expires_at>clock_timestamp())))<p.daily_order_limit)
 and not exists(select 1 from public.provider_time_off t where t.provider_id=p.id and t.day=p_day)
 and not exists(select 1 from public.orders o where o.provider_id=p.id
   and (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED','DISPUTED') or (o.status='PENDING_PAYMENT' and o.expires_at>now()))
   and tstzrange(o.starts_at,o.ends_at,'[)') && tstzrange(s.start_time,s.start_time+make_interval(mins=>f.duration_minutes),'[)'))
 -- Legacy requests have no trustworthy duration: reserve their whole day until reconciled.
 and not exists(select 1 from public.service_requests r where coalesce(r.accepted_provider_id,r.assigned_provider_id)=p.id
   and r.status in ('assigned','accepted','on_the_way','in_progress','ustaya_yonlendirildi')
   and (r.preferred_date is null or r.preferred_date=p_day))
 order by s.start_time
$$;

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
  'in_flight_count',count(*) filter(where t.payout_state='IN_FLIGHT' or t.refund_state='IN_FLIGHT')
 ) from public.orders o left join public.payment_transactions t on t.order_id=o.id where o.provider_id=p_provider_id);
end $$;

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
    (o.payment_status='PAID' and t.status is distinct from 'SUCCEEDED') or
    (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') and o.payment_status<>'PAID') or
    (t.status='SUCCEEDED' and o.payment_status in ('UNPAID','FAILED')) or
    (t.status='INITIALIZING' and t.created_at<now()-interval '5 minutes') or
    (t.status='AWAITING' and o.expires_at<=now()) or (t.status='SUCCEEDED' and t.item_transaction_id is null) or t.refund_state='IN_FLIGHT' or t.payout_state='IN_FLIGHT'),
  'active_providers',(select count(*) from public.providers where is_active and is_approved),
  'new_customers_month',(select count(*) from public.profiles where role='customer' and created_at>=date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'),
  'repeat_customer_percent',(select coalesce(round(100.0*count(*) filter(where n>1)/nullif(count(*),0),1),0) from (select count(*) n from public.orders x join public.payment_transactions y on y.order_id=x.id and y.status='SUCCEEDED' group by x.customer_id) buyers)
 ) from public.orders o left join public.payment_transactions t on t.order_id=o.id);
end $$;

create function public.commerce_set_daily_limit(p_provider_id uuid,p_limit integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.providers where id=p_provider_id and user_id=auth.uid() and is_approved) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 30 then raise exception 'invalid_capacity'; end if;
 perform 1 from public.providers where id=p_provider_id for update;
 update public.providers set daily_order_limit=p_limit where id=p_provider_id;
end $$;
revoke all on function public.commerce_set_daily_limit(uuid,integer) from public,anon,authenticated;
grant execute on function public.commerce_set_daily_limit(uuid,integer) to authenticated;

create function public.commerce_ceo_insights() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare category_rows jsonb; district_rows jsonb; repeat_rows jsonb;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(cats) order by cats.paid_orders desc,cats.name),'[]'::jsonb) into category_rows from (
   select cat.id,cat.name,
    (select count(*) from public.orders o join public.provider_service_offerings f on f.id=o.offering_id join public.service_catalog s on s.id=f.service_id join public.payment_transactions t on t.order_id=o.id where s.category_id=cat.id and t.status='SUCCEEDED') paid_orders,
    (select count(distinct f.provider_id) from public.provider_service_offerings f join public.service_catalog s on s.id=f.service_id join public.providers p on p.id=f.provider_id where s.category_id=cat.id and f.is_active and s.is_active and p.is_active and p.is_approved) offering_providers
   from public.service_categories cat where cat.is_active and cat.is_visible
 ) cats;
 select coalesce(jsonb_agg(to_jsonb(areas) order by areas.completed_orders desc,areas.name),'[]'::jsonb) into district_rows from (
   select d.id district_id,d.name,count(*) paid_orders,count(*) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED') completed_orders,
    round(100.0*count(*) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.status='SUCCEEDED')/nullif(count(*),0),1) completion_percent
   from public.orders o join public.districts d on d.id=o.district_id join public.payment_transactions t on t.order_id=o.id and t.status='SUCCEEDED' group by d.id,d.name
 ) areas;
 select coalesce(jsonb_agg(to_jsonb(repeats) order by repeats.repeat_customers desc,repeats.name),'[]'::jsonb) into repeat_rows from (
   select service_id,name,count(*) filter(where n>1) repeat_customers,count(*) customers from (
    select s.id service_id,s.name,o.customer_id,count(*) n from public.orders o join public.provider_service_offerings f on f.id=o.offering_id join public.service_catalog s on s.id=f.service_id join public.payment_transactions t on t.order_id=o.id and t.status='SUCCEEDED' where o.status='COMPLETED' and o.payment_status='PAID' group by s.id,s.name,o.customer_id
   ) purchases group by service_id,name
 ) repeats;
 return jsonb_build_object('environment','sandbox','categories',category_rows,'districts',district_rows,'repeat_services',repeat_rows);
end $$;
revoke all on function public.commerce_ceo_insights() from public,anon,authenticated;
grant execute on function public.commerce_ceo_insights() to authenticated;
commit;
