-- Phase 3. Additive data changes; apply to staging first. See docs/phase3-migration-runbook.md.
begin;

alter table public.service_variants add column provider_id uuid references public.providers(id);
alter table public.service_variants drop constraint service_variants_service_id_name_key;
alter table public.service_variants add constraint service_variants_owner_name_key unique nulls not distinct(service_id,provider_id,name);

create function public.commerce_create_variant(p_provider_id uuid,p_service_id uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare vid uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.providers p join public.service_catalog s on s.category_id=p.category_id
   where p.id=p_provider_id and p.user_id=auth.uid() and p.is_approved and s.id=p_service_id and s.is_active and s.pricing_type='VARIANT_BASED')
 then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.providers where id=p_provider_id for update;
 if p_name is null or length(btrim(p_name)) not between 2 and 80 then raise exception 'invalid_variant'; end if;
 if (select count(*) from public.service_variants where provider_id=p_provider_id)>=100 then raise exception 'store_limit'; end if;
 insert into public.service_variants(service_id,provider_id,name) values(p_service_id,p_provider_id,btrim(p_name))
 on conflict on constraint service_variants_owner_name_key do update set is_active=true returning id into vid;
 return vid;
end $$;
revoke all on function public.commerce_create_variant(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.commerce_create_variant(uuid,uuid,text) to authenticated;

-- Preserve the lifecycle; fail closed if a customer code or verified payment is missing.
create or replace function public.commerce_transition_order(p_order_id uuid,p_status text,p_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
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
 elsif p.user_id=auth.uid() and p.is_approved and o.payment_status='PAID'
   and exists(select 1 from public.payment_transactions t where t.order_id=o.id and t.status='SUCCEEDED')
   and ((o.status='CONFIRMED' and p_status='PROVIDER_ON_THE_WAY') or (o.status='PROVIDER_ON_THE_WAY' and p_status='IN_PROGRESS') or (o.status='IN_PROGRESS' and p_status='COMPLETED')) then
   if p_status='COMPLETED' then
     select * into secret from public.order_completion_codes where order_id=o.id for update;
     if not found then return jsonb_build_object('error','completion_code_unavailable'); end if;
     if secret.locked_until>now() then return jsonb_build_object('error','code_locked'); end if;
     if p_code is null or p_code !~ '^[0-9]{6}$' or p_code is distinct from secret.code then
       update public.order_completion_codes set failed_attempts=failed_attempts+1,locked_until=case when failed_attempts>=4 then now()+interval '15 minutes' else null end where order_id=o.id;
       return jsonb_build_object('error','invalid_completion_code');
     end if;
   end if;
 else raise exception 'transition_forbidden' using errcode='42501'; end if;
 update public.orders set status=next_status,payment_status=case when next_status='REFUND_PENDING' then 'REFUND_PENDING' else payment_status end,updated_at=now() where id=o.id;
 return jsonb_build_object('status',next_status);
end $$;

-- Bounded evidence, no raw responses, payment tokens, secrets or personal data.
create table public.operations_health_checks (
 name text primary key check(name in ('supabase','schema','google','iyzico','cron','audit')),
 passed boolean not null,
 detail text not null check(length(detail)<=500),
 checked_at timestamptz not null default now(),
 last_success_at timestamptz
);
alter table public.operations_health_checks enable row level security;
create policy operations_health_admin_read on public.operations_health_checks for select to authenticated using(public.current_user_is_admin());
grant select on public.operations_health_checks to authenticated;
grant all on public.operations_health_checks to service_role;
create function public.commerce_record_health(p_name text,p_passed boolean,p_detail text) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.operations_health_checks(name,passed,detail,last_success_at) values(p_name,p_passed,left(p_detail,500),case when p_passed then now() end)
 on conflict(name) do update set passed=excluded.passed,detail=excluded.detail,checked_at=now(),last_success_at=case when excluded.passed then now() else public.operations_health_checks.last_success_at end;
end $$;
revoke all on function public.commerce_record_health(text,boolean,text) from public,anon,authenticated;
grant execute on function public.commerce_record_health(text,boolean,text) to service_role;

create function public.commerce_admin_health() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare missing text[]:='{}'; item text;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 foreach item in array array['orders','payment_transactions','order_completion_codes','order_status_events','reviews','review_submission_receipts','customer_addresses','provider_service_offerings','provider_availability','provider_time_off','operations_health_checks','audit_logs'] loop
   if not coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.'||item)),false) then missing:=array_append(missing,item||': RLS'); end if;
 end loop;
 foreach item in array array['commerce_hold_order(uuid,timestamp with time zone,uuid,text,uuid,integer)','commerce_transition_order(uuid,text,text)','review_eligible_sources(uuid)','submit_service_review(uuid,uuid,uuid,smallint,text)','commerce_create_variant(uuid,uuid,text)','commerce_provider_private(uuid)','commerce_admin_reconciliation(integer)'] loop
   if to_regprocedure('public.'||item) is null then missing:=array_append(missing,item); end if;
 end loop;
 if not exists(select 1 from pg_attribute where attrelid='public.reviews'::regclass and attname='order_id' and not attisdropped) then missing:=array_append(missing,'reviews.order_id'); end if;
 if not exists(select 1 from pg_indexes where schemaname='public' and indexname='reviews_order_once') then missing:=array_append(missing,'reviews_order_once'); end if;
 if has_column_privilege('anon','public.providers','iyzico_submerchant_key','SELECT') or has_column_privilege('authenticated','public.providers','iyzico_submerchant_key','SELECT') then missing:=array_append(missing,'providers: private column access'); end if;
 if has_table_privilege('authenticated','public.orders','UPDATE') then missing:=array_append(missing,'orders: direct client updates'); end if;
 return jsonb_build_object('checked_at',now(),'contract_ok',cardinality(missing)=0,'missing_contracts',missing,
   'audit_last_event_at',(select max(created_at) from public.audit_logs),
   'probes',(select coalesce(jsonb_agg(to_jsonb(h) order by name),'[]'::jsonb) from public.operations_health_checks h));
end $$;
revoke all on function public.commerce_admin_health() from public,anon,authenticated;
grant execute on function public.commerce_admin_health() to authenticated;
create or replace function public.commerce_save_store(p_provider_id uuid,p_offerings jsonb,p_hours jsonb,p_days_off jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.providers; item jsonb; sid uuid; vid uuid;
begin
 select * into p from public.providers where id=p_provider_id for update;
 if p.id is null or auth.uid() is null or not (coalesce(p.user_id=auth.uid(),false) or public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 if not p.is_approved and not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if jsonb_typeof(p_offerings) is distinct from 'array' or jsonb_typeof(p_hours) is distinct from 'array' or jsonb_typeof(p_days_off) is distinct from 'array' then raise exception 'invalid_store'; end if;
 if jsonb_array_length(p_offerings)>100 or jsonb_array_length(p_hours)>7 or jsonb_array_length(p_days_off)>100 then raise exception 'store_limit'; end if;
 update public.provider_service_offerings set is_active=false,updated_at=now() where provider_id=p.id;
 for item in select * from jsonb_array_elements(p_offerings) loop
   sid:=(item->>'service_id')::uuid; vid:=nullif(item->>'variant_id','')::uuid;
   if not exists(select 1 from public.service_catalog c where c.id=sid and c.is_active and c.category_id=p.category_id and ((c.pricing_type='VARIANT_BASED' and exists(select 1 from public.service_variants v where v.id=vid and v.service_id=c.id and v.is_active and (v.provider_id is null or v.provider_id=p.id))) or (c.pricing_type<>'VARIANT_BASED' and vid is null))) then raise exception 'invalid_service_variant'; end if;
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


create or replace function public.commerce_admin_save_service(p_service_id uuid,p_definition jsonb,p_variants jsonb) returns uuid
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
 update public.service_variants set is_active=false where service_id=sid and provider_id is null;
 for item in select jsonb_array_elements_text(p_variants) loop
   if length(btrim(item)) not between 1 and 80 then raise exception 'invalid_variant'; end if;
   insert into public.service_variants(service_id,name) values(sid,btrim(item)) on conflict on constraint service_variants_owner_name_key do update set is_active=true;
 end loop;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'catalog',sid,'catalog.updated',jsonb_build_object('scope','commerce','is_active',p_definition->'is_active'));
 return sid;
end $$;


-- Price and schedule changes must leave atomic evidence, without private payloads.
create function public.commerce_audit_store() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb:=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
 values(auth.uid(),'provider',(row_data->>'provider_id')::uuid,'provider.store_updated',jsonb_build_object('table',TG_TABLE_NAME,'operation',TG_OP,
 'price_minor',row_data->'price_minor','duration_minutes',row_data->'duration_minutes','is_active',row_data->'is_active'));
 return new;
end $$;
create trigger phase3_offering_audit after insert or update on public.provider_service_offerings for each row execute function public.commerce_audit_store();
create trigger phase3_variant_audit after insert or update on public.service_variants for each row when(new.provider_id is not null) execute function public.commerce_audit_store();
create trigger phase3_hours_audit after insert or update or delete on public.provider_availability for each row execute function public.commerce_audit_store();
create trigger phase3_time_off_audit after insert or update or delete on public.provider_time_off for each row execute function public.commerce_audit_store();
revoke all on function public.commerce_audit_store() from public,anon,authenticated;
commit;
