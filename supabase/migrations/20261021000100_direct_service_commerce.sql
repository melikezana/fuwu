-- Additive commerce MVP. Existing requests/payments remain historical records.
-- A PENDING_PAYMENT order is itself a ten-minute slot hold; no duplicate hold table.
begin;

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id),
  slug text not null unique,
  name text not null check (length(name) between 3 and 120),
  description text not null,
  scope text not null,
  exclusions text not null default '',
  image_url text not null,
  pricing_type text not null check (pricing_type in ('FIXED_PRICE','VARIANT_BASED','DIAGNOSTIC_SERVICE')),
  is_active boolean not null default true
);
create table public.service_variants (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.service_catalog(id),
  name text not null,
  is_active boolean not null default true,
  unique(service_id, name)
);
create table public.provider_service_offerings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id),
  service_id uuid not null references public.service_catalog(id),
  variant_id uuid references public.service_variants(id),
  price_minor integer not null check (price_minor between 100 and 100000000),
  duration_minutes integer not null check (duration_minutes between 15 and 480 and duration_minutes % 15 = 0),
  district_ids uuid[] not null check (cardinality(district_ids) > 0),
  is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (provider_id, service_id, variant_id)
);
create table public.provider_availability (
  provider_id uuid not null references public.providers(id),
  weekday integer not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null check (ends_at > starts_at),
  primary key(provider_id, weekday)
);
create table public.provider_time_off (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id),
  day date not null,
  unique(provider_id, day)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  provider_id uuid not null references public.providers(id),
  offering_id uuid not null references public.provider_service_offerings(id),
  service_name text not null,
  variant_name text,
  scope text not null,
  provider_name text not null,
  district_id uuid not null references public.districts(id),
  district_name text not null,
  address text not null check (length(btrim(address)) between 10 and 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  total_minor integer not null check (total_minor > 0),
  commission_minor integer not null,
  provider_gross_minor integer not null,
  processor_fee_minor integer,
  currency text not null default 'TRY' check (currency = 'TRY'),
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PAID','FAILED','REFUND_PENDING','REFUNDED')),
  status text not null default 'PENDING_PAYMENT' check (status in ('PENDING_PAYMENT','CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED','CANCELLED','PAYMENT_FAILED','REFUND_PENDING','REFUNDED','DISPUTED')),
  expires_at timestamptz not null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, idempotency_key),
  check (commission_minor >= 0 and provider_gross_minor >= 0 and commission_minor + provider_gross_minor = total_minor)
);
create index commerce_provider_schedule on public.orders(provider_id, starts_at, ends_at);
create index commerce_customer_orders on public.orders(customer_id, created_at desc);
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  conversation_id text not null unique,
  checkout_token text unique,
  payment_page_url text,
  payment_id text unique,
  item_transaction_id text unique,
  payout_state text not null default 'NONE' check (payout_state in ('NONE','IN_FLIGHT','RELEASED')),
  refund_state text not null default 'NONE' check (refund_state in ('NONE','IN_FLIGHT','REFUNDED')),
  status text not null default 'INITIALIZING' check (status in ('INITIALIZING','AWAITING','SUCCEEDED','FAILED')),
  environment text not null default 'sandbox' check (environment = 'sandbox'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  status text not null,
  created_at timestamptz not null default now()
);
create table public.order_completion_codes (
  order_id uuid primary key references public.orders(id),
  code text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);

-- Public reads expose product information, never addresses, checkout tokens or codes.
alter table public.service_catalog enable row level security;
alter table public.service_variants enable row level security;
alter table public.provider_service_offerings enable row level security;
alter table public.provider_availability enable row level security;
alter table public.provider_time_off enable row level security;
alter table public.orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.order_status_events enable row level security;
alter table public.order_completion_codes enable row level security;
create policy catalog_read on public.service_catalog for select using (is_active or public.current_user_is_admin());
create policy variant_read on public.service_variants for select using (is_active or public.current_user_is_admin());
create policy offering_owner_read on public.provider_service_offerings for select to authenticated using (exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()) or public.current_user_is_admin());
create policy availability_owner_read on public.provider_availability for select to authenticated using (exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()) or public.current_user_is_admin());
create policy time_off_owner_read on public.provider_time_off for select to authenticated using (exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()) or public.current_user_is_admin());
create policy order_participant_read on public.orders for select to authenticated using (customer_id=auth.uid() or exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()) or public.current_user_is_admin());
create policy event_participant_read on public.order_status_events for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id));
create policy code_customer_read on public.order_completion_codes for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy transaction_admin_read on public.payment_transactions for select to authenticated using (public.current_user_is_admin());
grant select on public.service_catalog, public.service_variants to anon, authenticated;
grant select on public.provider_service_offerings, public.provider_availability, public.provider_time_off, public.orders, public.order_status_events, public.order_completion_codes, public.payment_transactions to authenticated;
grant all on public.service_catalog, public.service_variants, public.provider_service_offerings, public.provider_availability, public.provider_time_off, public.orders, public.order_status_events, public.order_completion_codes, public.payment_transactions to service_role;
-- No authenticated INSERT/UPDATE/DELETE policies or grants: every mutation uses an RPC.

create function public.commerce_record_status() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if TG_OP='INSERT' or old.status is distinct from new.status then
    insert into public.order_status_events(order_id,status) values(new.id,new.status);
  end if;
  return new;
end $$;
create trigger commerce_status_history after insert or update of status on public.orders for each row execute function public.commerce_record_status();

create function public.commerce_offers(p_service_id uuid default null, p_district_id uuid default null, p_provider_id uuid default null)
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
 where f.is_active and c.is_active and cat.is_active and p.is_active and p.is_approved and p.availability <> 'çevrimdışı'
 and p.iyzico_submerchant_status='active' and p.iyzico_submerchant_key is not null
 and ((c.pricing_type='VARIANT_BASED' and v.is_active and v.service_id=c.id) or (c.pricing_type<>'VARIANT_BASED' and f.variant_id is null))
 and (p_service_id is null or f.service_id=p_service_id)
 and (p_district_id is null or p_district_id=any(f.district_ids))
 and (p_provider_id is null or p.id=p_provider_id)
$$;

create function public.commerce_slots(p_offering_id uuid, p_day date, p_district_id uuid)
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
 where f.id=p_offering_id and f.is_active and c.is_active and cat.is_active and p.is_active and p.is_approved
 and p.availability<>'çevrimdışı' and p.iyzico_submerchant_status='active' and p.iyzico_submerchant_key is not null
 and ((c.pricing_type='VARIANT_BASED' and v.is_active and v.service_id=c.id) or (c.pricing_type<>'VARIANT_BASED' and f.variant_id is null))
 and p_district_id=any(f.district_ids) and exists(select 1 from public.districts d where d.id=p_district_id and d.is_active)
 and p_day between (now() at time zone 'Europe/Istanbul')::date and (now() at time zone 'Europe/Istanbul')::date+30
 and s.start_time > now()+interval '30 minutes'
 and not exists(select 1 from public.provider_time_off t where t.provider_id=p.id and t.day=p_day)
 and not exists(select 1 from public.orders o where o.provider_id=p.id
   and (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED','DISPUTED') or (o.status='PENDING_PAYMENT' and o.expires_at>now()))
   and tstzrange(o.starts_at,o.ends_at,'[)') && tstzrange(s.start_time,s.start_time+make_interval(mins=>f.duration_minutes),'[)'))
 -- Legacy requests have no trustworthy duration: reserve their whole day until reconciled.
 and not exists(select 1 from public.service_requests r where coalesce(r.accepted_provider_id,r.assigned_provider_id)=p.id
   and r.status in ('assigned','accepted','on_the_way','in_progress','ustaya_yonlendirildi')
   and (r.preferred_date is null or r.preferred_date=p_day))
$$;

create function public.commerce_hold_order(p_offering_id uuid, p_starts_at timestamptz, p_district_id uuid, p_address text, p_idempotency_key uuid, p_expected_price_minor integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.provider_service_offerings; p public.providers; c public.service_catalog; o public.orders; slot_end timestamptz; rate numeric:=0.10;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_idempotency_key is null or p_address is null or length(btrim(p_address)) not between 10 and 1000 then raise exception 'invalid_address'; end if;
 select * into f from public.provider_service_offerings where id=p_offering_id;
 if not found then raise exception 'offering_unavailable'; end if;
 -- All reservation/schedule/legacy assignment mutations take this same lock.
 select * into p from public.providers where id=f.provider_id for update;
 select * into o from public.orders where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then
   if o.offering_id<>p_offering_id or o.starts_at<>p_starts_at or o.address<>btrim(p_address) or o.district_id<>p_district_id then raise exception 'idempotency_conflict'; end if;
   return to_jsonb(o);
 end if;
 if (select count(*) from public.orders where customer_id=auth.uid() and status='PENDING_PAYMENT' and expires_at>now())>=3 then raise exception 'too_many_holds'; end if;
 select * into f from public.provider_service_offerings where id=p_offering_id;
 if f.price_minor is distinct from p_expected_price_minor then raise exception 'price_changed'; end if;
 select * into c from public.service_catalog where id=f.service_id;
 select s.ends_at into slot_end from public.commerce_slots(p_offering_id,(p_starts_at at time zone 'Europe/Istanbul')::date,p_district_id) s where s.starts_at=p_starts_at;
 if slot_end is null then raise exception 'slot_unavailable'; end if;
 select case when replace(value,',','.') ~ '^[0-9]+(\.[0-9]+)?$' then least(1,case when replace(value,',','.')::numeric>1 then replace(value,',','.')::numeric/100 else replace(value,',','.')::numeric end) else 0.10 end into rate from public.app_settings where key='commission_rate';
 rate:=coalesce(rate,0.10);
 insert into public.orders(customer_id,provider_id,offering_id,service_name,variant_name,scope,provider_name,district_id,district_name,address,starts_at,ends_at,total_minor,commission_minor,provider_gross_minor,expires_at,idempotency_key)
 values(auth.uid(),p.id,f.id,c.name,(select name from public.service_variants where id=f.variant_id),c.scope,p.name,p_district_id,(select name from public.districts where id=p_district_id),btrim(p_address),p_starts_at,slot_end,f.price_minor,round(f.price_minor*rate)::int,f.price_minor-round(f.price_minor*rate)::int,now()+interval '10 minutes',p_idempotency_key) returning * into o;
 insert into public.order_completion_codes(order_id,code) values(o.id,((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint % 900000)+100000)::text);
 return to_jsonb(o);
end $$;

create function public.commerce_expire_holds() returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 update public.orders set status='CANCELLED',updated_at=now() where status='PENDING_PAYMENT' and expires_at<=now();
 get diagnostics n=row_count; return n;
end $$;

create function public.commerce_begin_payment(p_order_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; t public.payment_transactions; n integer;
begin
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null or o.status<>'PENDING_PAYMENT' or o.expires_at<=now() then raise exception 'hold_expired'; end if;
 insert into public.payment_transactions(order_id,conversation_id) values(o.id,'order-'||o.id) on conflict(order_id) do nothing;
 get diagnostics n=row_count;
 select * into t from public.payment_transactions where order_id=o.id;
 return to_jsonb(t)||jsonb_build_object('claimed',n=1);
end $$;

create function public.commerce_attach_payment(p_order_id uuid,p_token text,p_url text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.payment_transactions set checkout_token=p_token,payment_page_url=p_url,status='AWAITING',updated_at=now() where order_id=p_order_id and status='INITIALIZING' and checkout_token is null;
 if not found then raise exception 'payment_session_conflict'; end if;
end $$;

create function public.commerce_resolve_payment(p_order_id uuid,p_token text,p_payment_id text,p_success boolean,p_fee_minor integer default null,p_item_transaction_id text default null)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; t public.payment_transactions; next_status text;
begin
 -- Provider first, then order: same lock order as reservation and lifecycle RPCs.
 perform 1 from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 select * into t from public.payment_transactions where order_id=p_order_id for update;
 if t.id is null or t.checkout_token is distinct from p_token then raise exception 'payment_token_mismatch'; end if;
 if t.status='SUCCEEDED' then return o.status; end if;
 if p_success and (p_payment_id is null or length(p_payment_id)=0) then raise exception 'payment_id_missing'; end if;
 update public.payment_transactions set status=case when p_success then 'SUCCEEDED' else 'FAILED' end,payment_id=coalesce(p_payment_id,payment_id),item_transaction_id=coalesce(p_item_transaction_id,item_transaction_id),updated_at=now() where id=t.id;
 if p_success then
   next_status:=case when o.status='PENDING_PAYMENT' and o.expires_at>now() then 'CONFIRMED' else 'REFUND_PENDING' end;
   update public.orders set status=next_status,payment_status=case when next_status='CONFIRMED' then 'PAID' else 'REFUND_PENDING' end,processor_fee_minor=p_fee_minor,updated_at=now() where id=o.id;
 else
   if o.status='PENDING_PAYMENT' then update public.orders set status='PAYMENT_FAILED',payment_status='FAILED',updated_at=now() where id=o.id; end if;
 end if;
 return (select status from public.orders where id=o.id);
end $$;

-- Durable claims prevent duplicate external approval/refund requests. Ambiguous
-- processor timeouts stay IN_FLIGHT for reconciliation rather than being retried blindly.
create function public.commerce_claim_settlement(p_order_id uuid,p_kind text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; t public.payment_transactions;
begin
 select * into o from public.orders where id=p_order_id for update;
 select * into t from public.payment_transactions where order_id=p_order_id for update;
 if t.status is distinct from 'SUCCEEDED' or t.item_transaction_id is null then return jsonb_build_object('claimed',false); end if;
 if p_kind='release' and o.status='COMPLETED' and t.payout_state='NONE' and t.refund_state='NONE' then
   update public.payment_transactions set payout_state='IN_FLIGHT',updated_at=now() where id=t.id;
 elsif p_kind='refund' and o.status='REFUND_PENDING' and t.refund_state='NONE' and t.payout_state<>'IN_FLIGHT' then
   update public.payment_transactions set refund_state='IN_FLIGHT',updated_at=now() where id=t.id;
 else return jsonb_build_object('claimed',false); end if;
 return jsonb_build_object('claimed',true,'item_transaction_id',t.item_transaction_id,'total_minor',o.total_minor);
end $$;
create function public.commerce_finish_settlement(p_order_id uuid,p_kind text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.orders where id=p_order_id for update;
 if p_kind='release' then
   update public.payment_transactions set payout_state='RELEASED',updated_at=now() where order_id=p_order_id and payout_state='IN_FLIGHT';
 elsif p_kind='refund' then
   update public.payment_transactions set refund_state='REFUNDED',updated_at=now() where order_id=p_order_id and refund_state='IN_FLIGHT';
   if found then update public.orders set status='REFUNDED',payment_status='REFUNDED',updated_at=now() where id=p_order_id and status='REFUND_PENDING'; end if;
 else raise exception 'invalid_settlement'; end if;
end $$;

create function public.commerce_transition_order(p_order_id uuid,p_status text,p_code text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; p public.providers; secret public.order_completion_codes; next_status text;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 select * into p from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null then raise exception 'order_not_found'; end if;
 next_status:=p_status;
 if p_status='CANCELLED' and o.customer_id=auth.uid() and o.status in ('PENDING_PAYMENT','CONFIRMED') and o.starts_at>now() then
   if o.payment_status='PAID' then next_status:='REFUND_PENDING'; end if;
 elsif p_status='DISPUTED' and o.customer_id=auth.uid() and o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') then null;
 elsif p.user_id=auth.uid() and ((o.status='CONFIRMED' and p_status='PROVIDER_ON_THE_WAY') or (o.status='PROVIDER_ON_THE_WAY' and p_status='IN_PROGRESS') or (o.status='IN_PROGRESS' and p_status='COMPLETED')) then
   if p_status='COMPLETED' then
     select * into secret from public.order_completion_codes where order_id=o.id for update;
     if secret.locked_until>now() then return jsonb_build_object('error','code_locked'); end if;
     if p_code is distinct from secret.code then
       update public.order_completion_codes set failed_attempts=failed_attempts+1,locked_until=case when failed_attempts>=4 then now()+interval '15 minutes' else null end where order_id=o.id;
       return jsonb_build_object('error','invalid_completion_code');
     end if;
   end if;
 else raise exception 'transition_forbidden' using errcode='42501'; end if;
 update public.orders set status=next_status,payment_status=case when next_status='REFUND_PENDING' then 'REFUND_PENDING' else payment_status end,updated_at=now() where id=o.id;
 return jsonb_build_object('status',next_status);
end $$;

create function public.commerce_save_store(p_provider_id uuid,p_offerings jsonb,p_hours jsonb,p_days_off jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.providers; item jsonb; sid uuid; vid uuid;
begin
 select * into p from public.providers where id=p_provider_id for update;
 if p.id is null or auth.uid() is null or not (coalesce(p.user_id=auth.uid(),false) or public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 if jsonb_array_length(p_offerings)>100 or jsonb_array_length(p_hours)>7 or jsonb_array_length(p_days_off)>100 then raise exception 'store_limit'; end if;
 for item in select * from jsonb_array_elements(p_offerings) loop
   sid:=(item->>'service_id')::uuid; vid:=nullif(item->>'variant_id','')::uuid;
   if not exists(select 1 from public.service_catalog c where c.id=sid and c.is_active and c.category_id=p.category_id and ((c.pricing_type='VARIANT_BASED' and exists(select 1 from public.service_variants v where v.id=vid and v.service_id=c.id and v.is_active)) or (c.pricing_type<>'VARIANT_BASED' and vid is null))) then raise exception 'invalid_service_variant'; end if;
   if exists(select 1 from jsonb_array_elements_text(item->'district_ids') d where not exists(select 1 from public.districts x where x.id=d::uuid and x.is_active)) then raise exception 'invalid_district'; end if;
   insert into public.provider_service_offerings(provider_id,service_id,variant_id,price_minor,duration_minutes,district_ids,is_active)
   values(p.id,sid,vid,(item->>'price_minor')::int,(item->>'duration_minutes')::int,array(select jsonb_array_elements_text(item->'district_ids'))::uuid[],(item->>'is_active')::boolean)
   on conflict(provider_id,service_id,variant_id) do update set price_minor=excluded.price_minor,duration_minutes=excluded.duration_minutes,district_ids=excluded.district_ids,is_active=excluded.is_active,updated_at=now();
 end loop;
 delete from public.provider_availability where provider_id=p.id;
 insert into public.provider_availability(provider_id,weekday,starts_at,ends_at) select p.id,(h->>'weekday')::int,(h->>'starts_at')::time,(h->>'ends_at')::time from jsonb_array_elements(p_hours) h;
 delete from public.provider_time_off where provider_id=p.id;
 insert into public.provider_time_off(provider_id,day) select p.id,d::date from jsonb_array_elements_text(p_days_off) d;
end $$;

-- Prevent newly assigned legacy jobs from bypassing the commerce provider lock.
create function public.commerce_guard_legacy_booking() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid:=coalesce(new.accepted_provider_id,new.assigned_provider_id);
begin
 if pid is not null and new.status in ('assigned','accepted','on_the_way','in_progress','ustaya_yonlendirildi') then
   perform 1 from public.providers where id=pid for update;
   if exists(select 1 from public.orders o where o.provider_id=pid
      and (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','DISPUTED') or (o.status='PENDING_PAYMENT' and o.expires_at>now()))
      and (new.preferred_date is null or (o.starts_at at time zone 'Europe/Istanbul')::date=new.preferred_date)) then raise exception 'commerce_booking_conflict'; end if;
 end if;
 return new;
end $$;
create trigger commerce_legacy_booking_guard before insert or update of assigned_provider_id,accepted_provider_id,status,preferred_date,preferred_time on public.service_requests for each row execute function public.commerce_guard_legacy_booking();

create function public.commerce_submit_review(p_order_id uuid,p_rating smallint,p_comment text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; rid uuid;
begin
 select * into o from public.orders where id=p_order_id and customer_id=auth.uid() and status='COMPLETED';
 if o.id is null then raise exception 'review_not_eligible' using errcode='42501'; end if;
 if p_rating not between 1 and 5 or p_comment is null or length(btrim(p_comment)) not between 10 and 1000 then raise exception 'invalid_review'; end if;
 perform 1 from public.providers where id=o.provider_id for update;
 insert into public.reviews(provider_id,user_id,rating,comment) values(o.provider_id,auth.uid(),p_rating,btrim(p_comment)) returning id into rid;
 update public.providers set rating=(select round(avg(rating),1) from public.reviews where provider_id=o.provider_id),review_count=(select count(*) from public.reviews where provider_id=o.provider_id) where id=o.provider_id;
 return rid;
end $$;

-- Explicit function ACLs: Postgres grants EXECUTE to PUBLIC by default.
revoke all on function public.commerce_record_status(), public.commerce_offers(uuid,uuid,uuid), public.commerce_slots(uuid,date,uuid), public.commerce_hold_order(uuid,timestamptz,uuid,text,uuid,integer), public.commerce_expire_holds(), public.commerce_begin_payment(uuid), public.commerce_attach_payment(uuid,text,text), public.commerce_resolve_payment(uuid,text,text,boolean,integer,text), public.commerce_claim_settlement(uuid,text), public.commerce_finish_settlement(uuid,text), public.commerce_transition_order(uuid,text,text), public.commerce_save_store(uuid,jsonb,jsonb,jsonb), public.commerce_guard_legacy_booking(), public.commerce_submit_review(uuid,smallint,text) from public,anon,authenticated;
grant execute on function public.commerce_offers(uuid,uuid,uuid), public.commerce_slots(uuid,date,uuid) to anon,authenticated,service_role;
grant execute on function public.commerce_hold_order(uuid,timestamptz,uuid,text,uuid,integer), public.commerce_transition_order(uuid,text,text), public.commerce_save_store(uuid,jsonb,jsonb,jsonb), public.commerce_submit_review(uuid,smallint,text) to authenticated;
grant execute on function public.commerce_expire_holds(), public.commerce_begin_payment(uuid), public.commerce_attach_payment(uuid,text,text), public.commerce_resolve_payment(uuid,text,text,boolean,integer,text), public.commerce_claim_settlement(uuid,text), public.commerce_finish_settlement(uuid,text) to service_role;

-- Product definitions have scope, but intentionally NO invented provider prices or hours.
insert into public.service_catalog(category_id,slug,name,description,scope,exclusions,image_url,pricing_type)
select id,'musluk-montaji','Musluk montajı','Yeni musluğunuz, ustasının elinde.','Bir adet standart lavabo veya mutfak musluğunun sökülmesi, montajı ve sızdırmazlık kontrolü.','Musluk ve yedek parçalar; tesisat hattı yenileme dahil değildir.','/images/services/plumbing-work.webp','FIXED_PRICE' from public.service_categories where slug='tesisat';
insert into public.service_catalog(category_id,slug,name,description,scope,exclusions,image_url,pricing_type)
select id,'klima-bakimi','Klima bakımı','Mevsime hazır, daha ferah bir ev.','Seçilen sayıdaki ev tipi split klimanın filtre temizliği ve rutin bakım kontrolü.','Gaz dolumu, parça değişimi ve arıza onarımı dahil değildir.','/images/services/climate.webp','VARIANT_BASED' from public.service_categories where slug='klima-beyaz-esya';
insert into public.service_variants(service_id,name) select id,n from public.service_catalog cross join unnest(array['1 klima','2 klima','3 klima']) n where slug='klima-bakimi';
insert into public.service_catalog(category_id,slug,name,description,scope,exclusions,image_url,pricing_type)
select id,'elektrik-ariza-tespiti','Elektrik arıza tespiti','Sorunun kaynağını birlikte bulalım.','Tek adreste elektrik arızasının yerinde incelenmesi ve yapılacak işin raporlanması.','Onarım, malzeme ve ek işçilik dahil değildir. Ek iş için ayrı onay gerekir.','/images/services/electrical.webp','DIAGNOSTIC_SERVICE' from public.service_categories where slug='elektrik-hizmeti';
insert into public.service_catalog(category_id,slug,name,description,scope,exclusions,image_url,pricing_type)
select id,'mobilya-montaji','Mobilya montajı','Kutudan çıkıp evinizin bir parçası olsun.','Bir adet standart çalışma masasının kurulum kılavuzuna göre montajı.','Duvara sabitleme, özel üretim, dolap ve eksik parça temini dahil değildir.','/images/services/furniture.webp','FIXED_PRICE' from public.service_categories where slug='mobilya-montaj';
commit;
