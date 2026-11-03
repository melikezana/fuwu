-- Synthetic evidence only. Monetary values deliberately include fractional TRY.
insert into public.providers(id,name,phone,description,category_id,district_id,iyzico_submerchant_status)
select 'b3000000-0000-4000-8000-000000000003','TEST Legacy Pending Provider','+905550000004','TEST preserve pending onboarding without activation.',category_id,district_id,'pending'
from public.providers where id='b1000000-0000-4000-8000-000000000002';
insert into public.app_settings(key,value) values('commission_rate','10'),('preserve_me','synthetic legacy setting');
insert into public.orders(id,request_id,customer_id,provider_id,amount,commission_rate,commission_amount,provider_net_amount,status)
values('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000004','b1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002',1234.56,0.10,123.46,1111.10,'APPROVED');
insert into public.order_payments(id,order_id,paid_price,status,raw_response,iyzico_token)
values('b2000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001',1234.56,'SUCCESS','{"synthetic":true}','TEST-synthetic-legacy-token');
insert into public.payouts(id,order_id,provider_id,amount,status)
values('b2000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002',1111.10,'PENDING');
insert into public.disputes(id,order_id,opened_by,reason,status)
values('b2000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000001','customer','Synthetic historical resolved dispute','CLOSED');
insert into public.webhook_events(id,event_type,order_id,payload,status)
values('b2000000-0000-4000-8000-000000000005','synthetic.payment','b2000000-0000-4000-8000-000000000001','{"synthetic":true}','processed');
insert into public.request_reassignment_log(id,request_id,reason,metadata)
values('b2000000-0000-4000-8000-000000000006','b1000000-0000-4000-8000-000000000004','max_reassignment_limit_reached','{"synthetic":true}');
insert into public.audit_logs(id,entity_type,entity_id,action,metadata)
values('b2000000-0000-4000-8000-000000000007','service_request','b1000000-0000-4000-8000-000000000004','synthetic.legacy.preserved','{"synthetic":true}');
-- Represent the observed current catalog, rather than an obsolete historical flag.
insert into public.service_categories(name,slug,is_active)
select 'E2E Category '||slug,slug,true from unnest(array[
'bahce-bakimi','boya-badana','cilingir','elektrik-hizmeti','hali-yikama','havuz-bakimi','klima-beyaz-esya','mobilya-montaj','nakliye-yardimi','temizlik','tesisat']) slug
on conflict(slug) do nothing;
update public.service_categories set is_active=true where slug in
('bahce-bakimi','boya-badana','cilingir','elektrik-hizmeti','hali-yikama','havuz-bakimi','klima-beyaz-esya','mobilya-montaj','nakliye-yardimi','temizlik','tesisat');
