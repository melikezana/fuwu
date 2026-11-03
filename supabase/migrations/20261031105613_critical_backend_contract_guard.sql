-- Created with `supabase migration new critical_backend_contract_guard`.
-- Local/staging only until the production plan receives separate approval.
begin;
do $$
declare relation text; target oid; field record;
begin
 for field in select * from (values
  ('app_settings','key','text'),('app_settings','value','text'),('app_settings','updated_at','timestamp with time zone'),
  ('request_reassignment_log','id','uuid'),('request_reassignment_log','request_id','uuid'),
  ('request_reassignment_log','previous_provider_id','uuid'),('request_reassignment_log','new_provider_id','uuid'),
  ('request_reassignment_log','reason','text'),('request_reassignment_log','metadata','jsonb'),
  ('request_reassignment_log','is_dry_run','boolean'),('request_reassignment_log','created_at','timestamp with time zone')
 ) expected(relation_name,column_name,data_type) loop
  if not exists(select 1 from information_schema.columns c where c.table_schema='public'
   and c.table_name=field.relation_name and c.column_name=field.column_name and c.data_type=field.data_type) then
   raise exception 'legacy_support_contract_missing: %.%',field.relation_name,field.column_name;
  end if;
 end loop;
 if to_regclass('public.commerce_orders') is null or not exists(
  select 1 from information_schema.columns where table_schema='public' and table_name='commerce_orders' and column_name='total_minor'
 ) then raise exception 'commerce_order_contract_missing'; end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='offering_id') then
  raise exception 'existing_commerce_orders_requires_reviewed_transition';
 end if;
 foreach relation in array array['payment_transactions','order_status_events','order_completion_codes','commerce_settlement_operations'] loop
  if not exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('public.'||relation)
   and contype='f' and confrelid='public.commerce_orders'::regclass) then
   raise exception 'commerce_fk_contract_missing: %',relation;
  end if;
 end loop;
 if to_regclass('public.orders') is not null then
  foreach relation in array array['order_payments','payouts','disputes','webhook_events'] loop
   target:=to_regclass('public.'||relation);
   if target is not null and not exists(select 1 from pg_catalog.pg_constraint where conrelid=target
    and contype='f' and confrelid='public.orders'::regclass) then
    raise exception 'legacy_fk_contract_missing: %',relation;
   end if;
  end loop;
 end if;
 -- These trigger helpers were individually reviewed in the read-only inventory.
 -- Their bodies and privileges stay intact; only name resolution is fixed.
 if to_regprocedure('public.set_updated_at()') is not null then
  alter function public.set_updated_at() set search_path=pg_catalog,public,pg_temp;
 end if;
 if to_regprocedure('public.enforce_payout_preconditions()') is not null then
  alter function public.enforce_payout_preconditions() set search_path=pg_catalog,public,pg_temp;
 end if;
 if to_regprocedure('public.set_service_request_assigned_at()') is not null then
  alter function public.set_service_request_assigned_at() set search_path=pg_catalog,public,pg_temp;
 end if;
end $$;

-- Capacity is owner/admin operational data. Do not restore SELECT * or expose
-- financial columns merely to render the Partner store's capacity control.
create or replace function public.commerce_provider_capacity(p_provider_id uuid) returns integer
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.providers p where p.id=p_provider_id
  and (p.user_id=auth.uid() or public.current_user_is_admin())) then
  raise exception 'forbidden' using errcode='42501';
 end if;
 return (select daily_order_limit from public.providers where id=p_provider_id);
end $$;
revoke all on function public.commerce_provider_capacity(uuid) from public,anon,authenticated;
grant execute on function public.commerce_provider_capacity(uuid) to authenticated;

-- The gallery was created after the old blanket grants. New Supabase projects
-- require explicit privileges in addition to the already enabled owner/public RLS.
grant select on public.provider_gallery_images to anon,authenticated;
grant insert,delete on public.provider_gallery_images to authenticated;
grant all on public.provider_gallery_images to service_role;
alter function public.check_gallery_limit() set search_path=pg_catalog,public,pg_temp;
revoke all on function public.check_gallery_limit() from public,anon,authenticated;

-- The untracked legacy financial graph has participant SELECT policies. RLS
-- restricts rows, not columns: its observed table-wide SELECT also exposed
-- processor tokens/raw responses to the customer and payout owner. Preserve
-- the graph and its write policies; browser readers receive summaries only.
-- Explicit column revokes also cover independent grants left by older repairs.
do $$ begin
 if to_regclass('public.order_payments') is not null then
  revoke select on public.order_payments from public,anon,authenticated;
  revoke select (iyzico_payment_id,iyzico_conversation_id,iyzico_token,
   iyzico_payment_transaction_id,refund_id,raw_response,error_code,error_message)
   on public.order_payments from public,anon,authenticated;
  grant select (id,order_id,paid_price,installment,card_last_four,status,
   created_at,updated_at,refunded_amount,refunded_at)
   on public.order_payments to authenticated;
 end if;
 if to_regclass('public.payouts') is not null then
  revoke select on public.payouts from public,anon,authenticated;
  revoke select (iyzico_transfer_id,raw_response,failure_reason)
   on public.payouts from public,anon,authenticated;
  grant select (id,order_id,provider_id,amount,currency,status,
   initiated_at,completed_at,created_at,updated_at)
   on public.payouts to authenticated;
 end if;
end $$;
commit;
