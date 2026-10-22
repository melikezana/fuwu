-- Apply in an isolated/staging database first. No historical review is deleted or guessed.
begin;

-- Older owner policies predate marketplace fields; protect new server-owned values too.
create function public.fusion_protect_provider_fields() returns trigger language plpgsql set search_path='' as $$
declare field text;
begin
 if current_user in ('authenticated','anon') and not public.current_user_is_admin() then
   foreach field in array array['user_id','rating','review_count','is_approved','is_verified','phone_verified','identity_verified','iyzico_submerchant_key','iyzico_submerchant_status'] loop
     if to_jsonb(new)->field is distinct from to_jsonb(old)->field then raise exception 'provider_field_forbidden' using errcode='42501'; end if;
   end loop;
 end if;
 return new;
end $$;
create trigger fusion_provider_fields before update on public.providers for each row execute function public.fusion_protect_provider_fields();
revoke all on function public.fusion_protect_provider_fields() from public,anon,authenticated;

alter table public.reviews add column order_id uuid references public.orders(id);
alter table public.reviews add column service_request_id uuid references public.service_requests(id);
alter table public.reviews add constraint review_one_source check (num_nonnulls(order_id,service_request_id)<=1);
-- Support both the production constraint name and older unnamed installations.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.reviews'::regclass and contype='u' and cardinality(conkey)=2
 and conkey @> array[(select attnum from pg_attribute where attrelid='public.reviews'::regclass and attname='provider_id'),(select attnum from pg_attribute where attrelid='public.reviews'::regclass and attname='user_id')]::smallint[]
 loop execute format('alter table public.reviews drop constraint %I',c.conname); end loop;
end $$;
create unique index reviews_order_once on public.reviews(order_id) where order_id is not null;
create unique index reviews_request_once on public.reviews(service_request_id) where service_request_id is not null;
create unique index reviews_historical_once on public.reviews(provider_id,user_id) where order_id is null and service_request_id is null;

-- Existing source-less reviews remain unchanged. Conservatively consider services completed
-- before that review covered; never invent which historical transaction produced a review.
create function public.review_eligible_sources(p_provider_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'id',id,'label',label,'completedAt',completed_at) order by completed_at desc),'[]'::jsonb)
 from (
   select 'order' kind,o.id,o.service_name label,
     coalesce((select min(e.created_at) from public.order_status_events e where e.order_id=o.id and e.status='COMPLETED'),o.updated_at) completed_at
   from public.orders o where o.provider_id=p_provider_id and o.customer_id=auth.uid() and o.status='COMPLETED'
     and o.payment_status='PAID' and not exists(select 1 from public.reviews r where r.order_id=o.id)
   union all
   select 'request',s.id,'Önceki hizmet talebi',s.updated_at
   from public.service_requests s where s.assigned_provider_id=p_provider_id and s.user_id=auth.uid() and s.status='completed'
     and not exists(select 1 from public.reviews r where r.service_request_id=s.id)
 ) sources
 where auth.uid() is not null
 and exists(select 1 from public.providers p where p.id=p_provider_id and p.user_id is distinct from auth.uid())
 and not exists(select 1 from public.reviews r where r.provider_id=p_provider_id and r.user_id=auth.uid()
   and r.order_id is null and r.service_request_id is null and (sources.kind='request' or r.created_at>=sources.completed_at))
$$;

create function public.submit_service_review(p_provider_id uuid,p_order_id uuid,p_request_id uuid,p_rating smallint,p_comment text) returns uuid
language plpgsql security definer set search_path='' as $$
declare rid uuid; source_id uuid:=coalesce(p_order_id,p_request_id); source_kind text:=case when p_order_id is not null then 'order' else 'request' end;
begin
 if auth.uid() is null then raise exception 'review-not-eligible' using errcode='42501'; end if;
 if num_nonnulls(p_order_id,p_request_id)<>1 or p_rating is null or p_rating not between 1 and 5
 or p_comment is null or length(btrim(p_comment)) not between 10 and 1000 then raise exception 'invalid_review' using errcode='22023'; end if;
 -- All review writers serialize on the same provider, including aggregate refresh.
 perform 1 from public.providers where id=p_provider_id for update;
 if not exists(select 1 from jsonb_array_elements(public.review_eligible_sources(p_provider_id)) s where s->>'id'=source_id::text and s->>'kind'=source_kind)
 then
   if exists(select 1 from public.reviews where user_id=auth.uid() and (order_id=p_order_id or service_request_id=p_request_id))
   then raise exception 'review-already-submitted' using errcode='23505'; end if;
   raise exception 'review-not-eligible' using errcode='42501';
 end if;
 -- Recheck/lock the source to exclude a concurrent dispute or refund transition.
 if p_order_id is not null then
   perform 1 from public.orders where id=p_order_id and customer_id=auth.uid() and provider_id=p_provider_id and status='COMPLETED' and payment_status='PAID' for update;
 else
   perform 1 from public.service_requests where id=p_request_id and user_id=auth.uid() and assigned_provider_id=p_provider_id and status='completed' for update;
 end if;
 if not found then raise exception 'review-not-eligible' using errcode='42501'; end if;
 insert into public.reviews(provider_id,user_id,order_id,service_request_id,rating,comment)
 values(p_provider_id,auth.uid(),p_order_id,p_request_id,p_rating,btrim(p_comment)) returning id into rid;
 return rid;
end $$;

create or replace function public.commerce_submit_review(p_order_id uuid,p_rating smallint,p_comment text) returns uuid
language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 select provider_id into pid from public.orders where id=p_order_id and customer_id=auth.uid();
 return public.submit_service_review(pid,p_order_id,null,p_rating,p_comment);
end $$;

-- Retain the old RPC signature for existing clients, under the same policy.
create or replace function public.submit_provider_review(p_provider_id uuid,p_rating smallint,p_comment text) returns uuid
language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 select (s->>'id')::uuid into sid from jsonb_array_elements(public.review_eligible_sources(p_provider_id)) s where s->>'kind'='request' limit 1;
 if sid is null then raise exception 'review-not-eligible' using errcode='42501'; end if;
 return public.submit_service_review(p_provider_id,null,sid,p_rating,p_comment);
end $$;

create function public.refresh_review_summary() returns trigger language plpgsql security definer set search_path='' as $$
declare pid uuid:=case when TG_OP='DELETE' then old.provider_id else new.provider_id end;
begin
 perform 1 from public.providers where id=pid for update;
 update public.providers set rating=coalesce((select round(avg(rating),1) from public.reviews where provider_id=pid),0),
 review_count=(select count(*) from public.reviews where provider_id=pid) where id=pid;
 if TG_OP='UPDATE' and old.provider_id is distinct from new.provider_id then
   update public.providers set rating=coalesce((select round(avg(rating),1) from public.reviews where provider_id=old.provider_id),0),
   review_count=(select count(*) from public.reviews where provider_id=old.provider_id) where id=old.provider_id;
 end if;
 return null;
end $$;
create trigger fusion_review_summary after insert or update or delete on public.reviews for each row execute function public.refresh_review_summary();
update public.providers p set rating=coalesce((select round(avg(rating),1) from public.reviews r where r.provider_id=p.id),0),review_count=(select count(*) from public.reviews r where r.provider_id=p.id);
revoke insert,update on public.reviews from anon,authenticated;
drop policy if exists reviews_insert_own on public.reviews;

-- Source identifiers are private to the author/admin. Public display uses a narrow RPC.
drop policy if exists reviews_select_public on public.reviews;
alter table public.reviews enable row level security;
create policy reviews_select_participant on public.reviews for select to authenticated using(user_id=auth.uid() or public.current_user_is_admin() or exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()));
create function public.public_provider_reviews(p_provider_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'provider_id',provider_id,'rating',rating,'comment',comment,'created_at',created_at) order by created_at desc),'[]'::jsonb) from public.reviews where provider_id=p_provider_id
$$;

-- Public profile hours come from the same weekly rows used by slot calculation.
create function public.commerce_public_schedule(p_provider_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('weekday',a.weekday,'starts_at',a.starts_at,'ends_at',a.ends_at) order by a.weekday),'[]'::jsonb)
 from public.provider_availability a join public.providers p on p.id=a.provider_id where p.id=p_provider_id and p.is_active and p.is_approved
$$;

create function public.commerce_provider_operations(p_provider_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not(exists(select 1 from public.providers where id=p_provider_id and user_id=auth.uid()) or public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 return (select jsonb_build_object(
 'today_count',count(*) filter(where status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS') and (starts_at at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date),
 'new_count',count(*) filter(where status='CONFIRMED'),
 'upcoming_count',count(*) filter(where status='CONFIRMED' and starts_at>now()),
 'active_count',count(*) filter(where status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS')),
 'overdue_count',count(*) filter(where status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS') and ends_at<now())
 ) from public.orders where provider_id=p_provider_id);
end $$;

revoke all on function public.review_eligible_sources(uuid),public.submit_service_review(uuid,uuid,uuid,smallint,text),public.refresh_review_summary(),public.public_provider_reviews(uuid),public.commerce_public_schedule(uuid),public.commerce_provider_operations(uuid) from public,anon,authenticated;
grant execute on function public.review_eligible_sources(uuid),public.submit_service_review(uuid,uuid,uuid,smallint,text),public.commerce_provider_operations(uuid) to authenticated;
grant execute on function public.public_provider_reviews(uuid),public.commerce_public_schedule(uuid) to anon,authenticated,service_role;
revoke all on function public.submit_provider_review(uuid,smallint,text),public.commerce_submit_review(uuid,smallint,text) from public,anon;
grant execute on function public.submit_provider_review(uuid,smallint,text),public.commerce_submit_review(uuid,smallint,text) to authenticated;
create or replace function public.commerce_admin_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return (select jsonb_build_object(
  'environment','sandbox','paid_count',count(*) filter(where t.status='SUCCEEDED'),'overdue_count',count(*) filter(where o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS') and o.ends_at<now()),'scheduled_count',count(*) filter(where t.status='SUCCEEDED'),'order_count',count(*),'completed_count',count(*) filter(where o.status='COMPLETED'),
  'daily_gmv_minor',coalesce(sum(o.total_minor) filter(where t.status='SUCCEEDED' and (t.paid_at at time zone 'Europe/Istanbul')::date=(now() at time zone 'Europe/Istanbul')::date),0),
  'monthly_gmv_minor',coalesce(sum(o.total_minor) filter(where t.status='SUCCEEDED' and date_trunc('month',t.paid_at at time zone 'Europe/Istanbul')=date_trunc('month',now() at time zone 'Europe/Istanbul')),0),
  'gmv_minor',coalesce(sum(o.total_minor) filter(where t.status='SUCCEEDED'),0),
  'commission_minor',coalesce(sum(o.commission_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID'),0),
  'pending_count',count(*) filter(where o.status='PENDING_PAYMENT' and o.expires_at>now()),
  'failed_count',count(*) filter(where o.payment_status='FAILED'),
  'refund_pending_count',count(*) filter(where o.status='REFUND_PENDING'),
  'refunded_minor',coalesce(sum(o.total_minor) filter(where o.payment_status='REFUNDED'),0),
  'payout_pending_minor',coalesce(sum(o.provider_gross_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.payout_state is distinct from 'RELEASED'),0),
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


create or replace function public.commerce_resolve_payment(p_order_id uuid,p_token text,p_payment_id text,p_success boolean,p_fee_minor integer default null,p_item_transaction_id text default null)
returns text language plpgsql security definer set search_path='' as $$
declare o public.orders; t public.payment_transactions; next_status text;
begin
 -- Provider first, then order: same lock order as reservation and lifecycle RPCs.
 perform 1 from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 select * into t from public.payment_transactions where order_id=p_order_id for update;
 if t.id is null or t.checkout_token is distinct from p_token then raise exception 'payment_token_mismatch'; end if;
 if t.status='SUCCEEDED' then
   if p_success then
     if p_payment_id is distinct from t.payment_id or p_item_transaction_id is null or length(btrim(p_item_transaction_id))=0
       or (t.item_transaction_id is not null and t.item_transaction_id is distinct from p_item_transaction_id)
     then raise exception 'payment_identity_mismatch'; end if;
     -- Repair an older missing item identity only from a fresh verified server retrieval.
     if t.item_transaction_id is null then update public.payment_transactions set item_transaction_id=p_item_transaction_id,updated_at=now() where id=t.id; end if;
   end if;
   return o.status;
 end if;
 if p_success and (p_item_transaction_id is null or length(btrim(p_item_transaction_id))=0) then raise exception 'payment_item_missing'; end if;
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


-- A paginated reconciliation queue must filter in SQL before applying a page limit.
create function public.commerce_admin_reconciliation(p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 with flagged as (
   select o.*,jsonb_build_object('status',t.status,'payout_state',t.payout_state,'refund_state',t.refund_state,'environment',t.environment,'created_at',t.created_at,'has_item_transaction',t.item_transaction_id is not null) payment_transactions
   from public.orders o left join public.payment_transactions t on t.order_id=o.id
   where (o.payment_status='PAID' and t.status is distinct from 'SUCCEEDED')
   or (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') and o.payment_status<>'PAID')
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
commit;
