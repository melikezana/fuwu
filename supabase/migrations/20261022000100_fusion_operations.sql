-- Additive FUWU Fusion operations. Apply to isolated/staging first; never production automatically.
begin;

-- Restore the default-customer INSERT condition lost in the older RLS consolidation.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check(id=auth.uid() and role::text='customer');
create function public.commerce_protect_profile_role() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user in ('authenticated','anon') and not public.current_user_is_admin() then
   if (TG_OP='INSERT' and new.role::text<>'customer') or (TG_OP='UPDATE' and new.role is distinct from old.role) then
     raise exception 'profile_role_forbidden' using errcode='42501';
   end if;
 end if;
 return new;
end $$;
create trigger fusion_profile_role_guard before insert or update of role on public.profiles for each row execute function public.commerce_protect_profile_role();
revoke all on function public.commerce_protect_profile_role() from public,anon,authenticated;

create function public.commerce_audit_configuration() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if TG_TABLE_NAME='profiles' then
   if old.role is distinct from new.role then insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'profile',new.id,'user.role_updated',jsonb_build_object('previous_role',old.role,'role',new.role)); end if;
 else
   if new.key='commission_rate' and (TG_OP='INSERT' or old.value is distinct from new.value) then insert into public.audit_logs(actor_user_id,entity_type,action,metadata) values(auth.uid(),'settings','settings.updated',jsonb_build_object('key',new.key,'value',new.value)); end if;
 end if;
 return new;
end $$;
create trigger fusion_profile_role_audit after update of role on public.profiles for each row execute function public.commerce_audit_configuration();
create trigger fusion_commission_audit after insert or update on public.app_settings for each row execute function public.commerce_audit_configuration();
revoke all on function public.commerce_audit_configuration() from public,anon,authenticated;

-- Historical request payments use their existing table, with a durable processor-operation claim.
alter table public.payments add column external_operation_state text not null default 'NONE'
 check(external_operation_state in ('NONE','RELEASE_IN_FLIGHT','REFUND_IN_FLIGHT','RELEASED','REFUNDED'));
create function public.commerce_claim_legacy_settlement(p_payment_id uuid,p_kind text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_kind not in ('release','refund') then raise exception 'invalid_settlement'; end if;
 update public.payments set external_operation_state=case when p_kind='release' then 'RELEASE_IN_FLIGHT' else 'REFUND_IN_FLIGHT' end
 where id=p_payment_id and status='escrow_held' and external_operation_state='NONE' and iyzico_payment_transaction_id is not null;
 return found;
end $$;
revoke all on function public.commerce_claim_legacy_settlement(uuid,text) from public,anon,authenticated;
grant execute on function public.commerce_claim_legacy_settlement(uuid,text) to service_role;

alter table public.payment_transactions add column paid_at timestamptz;
update public.payment_transactions t set paid_at=coalesce((select min(created_at) from public.order_status_events e where e.order_id=t.order_id and e.status in ('CONFIRMED','REFUND_PENDING')),t.updated_at) where t.status='SUCCEEDED';
create function public.commerce_capture_paid_at() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.status='SUCCEEDED' and old.status<>'SUCCEEDED' then new.paid_at:=now(); else new.paid_at:=old.paid_at; end if;
 return new;
end $$;
create trigger fusion_payment_time before update on public.payment_transactions for each row execute function public.commerce_capture_paid_at();

alter table public.orders add column exclusions text not null default '';
create function public.commerce_snapshot_exclusions() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 select c.exclusions into new.exclusions from public.provider_service_offerings f join public.service_catalog c on c.id=f.service_id where f.id=new.offering_id;
 return new;
end $$;
create trigger fusion_order_scope before insert on public.orders for each row execute function public.commerce_snapshot_exclusions();
revoke all on function public.commerce_snapshot_exclusions() from public,anon,authenticated;

-- There was no reusable saved-address relation. Orders keep their immutable address snapshots.
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 60),
  district_id uuid not null references public.districts(id),
  address text not null check (length(btrim(address)) between 10 and 1000),
  created_at timestamptz not null default now()
);
create index customer_addresses_owner on public.customer_addresses(customer_id);
alter table public.customer_addresses enable row level security;
create policy own_address_read on public.customer_addresses for select to authenticated using(customer_id=auth.uid());
create policy own_address_insert on public.customer_addresses for insert to authenticated with check(customer_id=auth.uid());
create policy own_address_delete on public.customer_addresses for delete to authenticated using(customer_id=auth.uid());
grant select,insert,delete on public.customer_addresses to authenticated;
grant all on public.customer_addresses to service_role;

-- Never expose a token, payment URL, external transaction id or delivery code in participant finance reads.
create function public.commerce_order_finance(p_order_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare o public.orders; t public.payment_transactions;
begin
 select * into o from public.orders where id=p_order_id;
 if auth.uid() is null or o.id is null or not(coalesce(o.customer_id=auth.uid(),false) or
   exists(select 1 from public.providers where id=o.provider_id and user_id=auth.uid()) or public.current_user_is_admin())
 then raise exception 'forbidden' using errcode='42501'; end if;
 select * into t from public.payment_transactions where order_id=o.id;
 return jsonb_build_object('environment','sandbox','status',t.status,'payout_state',t.payout_state,'refund_state',t.refund_state);
end $$;

-- Aggregation is in PostgreSQL: PostgREST's row cap cannot silently truncate financial totals.
create function public.commerce_provider_finance(p_provider_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not(exists(select 1 from public.providers where id=p_provider_id and user_id=auth.uid()) or public.current_user_is_admin())
 then raise exception 'forbidden' using errcode='42501'; end if;
 return (select jsonb_build_object(
  'environment','sandbox',
  'completed_count',count(*) filter(where o.status='COMPLETED'),
  'gross_minor',coalesce(sum(o.total_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID'),0),
  'commission_minor',coalesce(sum(o.commission_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID'),0),
  'provider_gross_minor',coalesce(sum(o.provider_gross_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID'),0),
  'known_processor_fee_minor',coalesce(sum(o.processor_fee_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID'),0),
  'unknown_fee_count',count(*) filter(where o.status='COMPLETED' and o.payment_status='PAID' and o.processor_fee_minor is null),
  'released_minor',coalesce(sum(o.provider_gross_minor) filter(where t.payout_state='RELEASED'),0),
  'pending_minor',coalesce(sum(o.provider_gross_minor) filter(where o.status='COMPLETED' and o.payment_status='PAID' and t.payout_state is distinct from 'RELEASED'),0),
  'in_flight_count',count(*) filter(where t.payout_state='IN_FLIGHT' or t.refund_state='IN_FLIGHT')
 ) from public.orders o left join public.payment_transactions t on t.order_id=o.id where o.provider_id=p_provider_id);
end $$;

create function public.commerce_admin_summary() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return (select jsonb_build_object(
  'environment','sandbox','order_count',count(*),'completed_count',count(*) filter(where o.status='COMPLETED'),
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
  'cancelled_count',count(*) filter(where o.status='CANCELLED' or (o.status='PENDING_PAYMENT' and o.expires_at<=now())),
  'average_minor',coalesce(round(avg(o.total_minor) filter(where t.status='SUCCEEDED')),0),
  'reconciliation_count',count(*) filter(where
    (o.payment_status='PAID' and t.status is distinct from 'SUCCEEDED') or
    (o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') and o.payment_status<>'PAID') or
    (t.status='SUCCEEDED' and o.payment_status in ('UNPAID','FAILED')) or
    (t.status='INITIALIZING' and t.created_at<now()-interval '5 minutes') or
    (t.status='AWAITING' and o.expires_at<=now()) or t.refund_state='IN_FLIGHT' or t.payout_state='IN_FLIGHT'),
  'active_providers',(select count(*) from public.providers where is_active and is_approved),
  'new_customers_month',(select count(*) from public.profiles where role='customer' and created_at>=date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'),
  'repeat_customer_percent',(select coalesce(round(100.0*count(*) filter(where n>1)/nullif(count(*),0),1),0) from (select count(*) n from public.orders x join public.payment_transactions y on y.order_id=x.id and y.status='SUCCEEDED' group by x.customer_id) buyers)
 ) from public.orders o left join public.payment_transactions t on t.order_id=o.id);
end $$;

-- Admin may request a refund, but cannot mark a payment, refund or payout successful.
create function public.commerce_admin_request_refund(p_order_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 if o.payment_status<>'PAID' or o.status not in ('CONFIRMED','DISPUTED') or not exists(select 1 from public.payment_transactions where order_id=o.id and status='SUCCEEDED' and payout_state<>'IN_FLIGHT') then raise exception 'refund_not_eligible'; end if;
 update public.orders set status='REFUND_PENDING',payment_status='REFUND_PENDING',updated_at=now() where id=o.id;
end $$;

-- Reuse the existing audit log. No customer address, code, token or processor secret is logged.
create function public.commerce_admin_save_service(p_service_id uuid,p_definition jsonb,p_variants jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid:=coalesce(p_service_id,gen_random_uuid()); existing public.service_catalog; item text;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants)>20 or
    coalesce(p_definition->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_definition->>'slug')>100 or
    coalesce(p_definition->>'image_url','') !~ '^/images/services/[a-z0-9-]+\.webp$' or
    length(btrim(coalesce(p_definition->>'description','')))<10 or length(btrim(coalesce(p_definition->>'scope','')))<10
 then raise exception 'invalid_catalog'; end if;
 if not exists(select 1 from public.service_categories where id=(p_definition->>'category_id')::uuid and is_active) then raise exception 'invalid_category'; end if;
 select * into existing from public.service_catalog where id=sid for update;
 if exists(select 1 from public.provider_service_offerings where service_id=sid) and
    (existing.category_id is distinct from (p_definition->>'category_id')::uuid or existing.pricing_type is distinct from p_definition->>'pricing_type')
 then raise exception 'catalog_has_offerings'; end if;
 if p_definition->>'pricing_type'='VARIANT_BASED' and jsonb_array_length(p_variants)=0 then raise exception 'variants_required'; end if;
 insert into public.service_catalog(id,category_id,slug,name,description,scope,exclusions,image_url,pricing_type,is_active)
 values(sid,(p_definition->>'category_id')::uuid,p_definition->>'slug',p_definition->>'name',p_definition->>'description',p_definition->>'scope',coalesce(p_definition->>'exclusions',''),p_definition->>'image_url',p_definition->>'pricing_type',(p_definition->>'is_active')::boolean)
 on conflict(id) do update set category_id=excluded.category_id,slug=excluded.slug,name=excluded.name,description=excluded.description,scope=excluded.scope,exclusions=excluded.exclusions,image_url=excluded.image_url,pricing_type=excluded.pricing_type,is_active=excluded.is_active;
 update public.service_variants set is_active=false where service_id=sid;
 for item in select jsonb_array_elements_text(p_variants) loop
   if length(btrim(item)) not between 1 and 80 then raise exception 'invalid_variant'; end if;
   insert into public.service_variants(service_id,name) values(sid,btrim(item)) on conflict(service_id,name) do update set is_active=true;
 end loop;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'catalog',sid,'catalog.updated',jsonb_build_object('scope','commerce','is_active',p_definition->'is_active'));
 return sid;
end $$;

create function public.commerce_audit_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare previous jsonb:=case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(old) end; current_row jsonb:=to_jsonb(new);
begin
 if TG_OP='INSERT' or previous is distinct from current_row then
   insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
   values(auth.uid(),case when TG_TABLE_NAME='payment_transactions' then 'payment' else 'order' end,
     (case when TG_TABLE_NAME='payment_transactions' then current_row->>'order_id' else current_row->>'id' end)::uuid,
     'commerce.'||TG_TABLE_NAME||'.'||lower(TG_OP),jsonb_build_object(
       'environment','sandbox','previous_status',previous->>'status','status',current_row->>'status',
       'payment_status',current_row->>'payment_status','payout_state',current_row->>'payout_state','refund_state',current_row->>'refund_state'));
 end if;
 return new;
end $$;
create trigger fusion_order_audit after insert or update of status,payment_status on public.orders for each row execute function public.commerce_audit_change();
create trigger fusion_payment_audit after insert or update of status,payout_state,refund_state on public.payment_transactions for each row execute function public.commerce_audit_change();

alter table public.notifications drop constraint notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check check(entity_type in ('service_request','provider_application','provider','order'));
create function public.commerce_notify_order() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare owner_id uuid; recipient uuid; message_title text;
begin
 if old.status is not distinct from new.status then return new; end if;
 select user_id into owner_id from public.providers where id=new.provider_id;
 message_title:=case new.status when 'CONFIRMED' then 'Yeni hizmet randevusu' when 'COMPLETED' then 'Hizmet tamamlandı' when 'REFUND_PENDING' then 'İade incelemesi' when 'REFUNDED' then 'İade doğrulandı' when 'DISPUTED' then 'Sipariş destek incelemesinde' else 'Sipariş durumu güncellendi' end;
 foreach recipient in array array[new.customer_id,owner_id] loop
   if recipient is not null then
     insert into public.notifications(user_id,recipient_user_id,actor_user_id,provider_id,entity_id,entity_type,type,event,title,body,message,metadata)
     values(recipient,recipient,auth.uid(),new.provider_id,new.id,'order','commerce_order','commerce_order_updated',message_title,
       new.service_name||' · '||message_title,new.service_name||' · '||message_title,jsonb_build_object('order_id',new.id,'status',new.status,'url','/orders/'||new.id));
   end if;
 end loop;
 return new;
end $$;
create trigger fusion_order_notification after update of status on public.orders for each row execute function public.commerce_notify_order();

-- Notification text/recipients are server-owned; participants may only mark their messages read.
revoke update on public.notifications from authenticated;
grant update(is_read) on public.notifications to authenticated;
drop policy if exists notifications_insert_admin_or_actor on public.notifications;
create policy notifications_insert_admin_or_actor on public.notifications for insert to authenticated with check(
 public.current_user_is_admin() or (entity_type<>'order' and (user_id=auth.uid() or recipient_user_id=auth.uid() or actor_user_id=auth.uid())));

revoke all on function public.commerce_order_finance(uuid),public.commerce_provider_finance(uuid),public.commerce_admin_summary(),public.commerce_admin_request_refund(uuid),public.commerce_audit_change(),public.commerce_notify_order(),public.commerce_capture_paid_at() from public,anon,authenticated;
revoke all on function public.commerce_admin_save_service(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_admin_save_service(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.commerce_order_finance(uuid),public.commerce_provider_finance(uuid),public.commerce_admin_summary(),public.commerce_admin_request_refund(uuid) to authenticated;
commit;
