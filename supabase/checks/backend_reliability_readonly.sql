-- Operator-run metadata comparison. No application rows, secrets or mutation RPCs.
begin transaction isolation level repeatable read read only;
select current_setting('server_version') as server_version;

-- If orders exists with this contract missing, STOP: do not replay CREATE TABLE orders,
-- rename/drop it, fabricate migration ledger entries or import test fixtures.
select to_regclass('public.orders') is not null as orders_exists,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='offering_id') as commerce_offering_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='total_minor') as commerce_total_column;

select table_name,column_name,data_type,is_nullable
from information_schema.columns where table_schema='public' and table_name in
 ('orders','payment_transactions','payments','service_catalog','service_variants','provider_service_offerings','reviews','customer_favorite_providers','commerce_settlement_operations')
order by table_name,ordinal_position;

select c.relname table_name,c.relrowsecurity rls_enabled,k.conname,pg_get_constraintdef(k.oid) constraint_definition
from pg_class c join pg_namespace n on n.oid=c.relnamespace left join pg_constraint k on k.conrelid=c.oid
where n.nspname='public' and c.relname in ('orders','payment_transactions','payments','reviews','service_variants','provider_service_offerings','commerce_settlement_operations') order by c.relname,k.conname;

select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('orders','payment_transactions','payments','reviews','providers','profiles','customer_favorite_providers','commerce_settlement_operations') order by tablename,policyname;

select p.proname,pg_get_function_identity_arguments(p.oid) arguments,p.prosecdef security_definer,p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'commerce_%' order by p.proname;

select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename in
 ('orders','payment_transactions','payments','reviews','provider_service_offerings','commerce_settlement_operations') order by tablename,indexname;
commit;
