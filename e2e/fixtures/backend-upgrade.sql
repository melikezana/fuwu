-- Fictional records, disposable PostgreSQL only. Never load into a hosted project.
insert into auth.users(id,email) values('91000000-0000-4000-8000-000000000001','customer@fixture.invalid'),('91000000-0000-4000-8000-000000000002','provider@fixture.invalid');
insert into service_categories(id,name,slug) values('92000000-0000-4000-8000-000000000001','TEST Schema Category','test-schema-category');
insert into districts(id,name,slug) values('93000000-0000-4000-8000-000000000001','TEST Schema District','test-schema-district');
insert into providers(id,user_id,name,category_id,district_id,phone,is_active,is_approved)
values('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','TEST Schema Provider','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','0000000000',true,true);
insert into service_catalog(id,category_id,slug,name,description,scope,image_url,pricing_type)
values('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','test-schema-service','TEST Schema Service','TEST','TEST','/test.webp','FIXED_PRICE');
insert into provider_service_offerings(id,provider_id,service_id,price_minor,duration_minutes,district_ids)
values('96000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',10000,60,array['93000000-0000-4000-8000-000000000001']::uuid[]);
insert into orders(id,customer_id,provider_id,offering_id,service_name,scope,provider_name,district_id,district_name,address,starts_at,ends_at,total_minor,commission_minor,provider_gross_minor,payment_status,status,expires_at,idempotency_key)
values('97000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000001','TEST Service','TEST Original scope','TEST Provider','93000000-0000-4000-8000-000000000001','TEST District','TEST Isolated address only',now()+interval '2 days',now()+interval '2 days 1 hour',10000,1000,9000,'PAID','COMPLETED',now()+interval '10 minutes','98000000-0000-4000-8000-000000000001');
insert into reviews(provider_id,user_id,rating,comment) values('94000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',4,'TEST historical review preserved');
insert into payment_transactions(order_id,conversation_id,checkout_token,payment_id,item_transaction_id,status,payout_state)
values('97000000-0000-4000-8000-000000000001','order-fixture-upgrade','token-fixture-upgrade','payment-fixture-upgrade','item-fixture-upgrade','SUCCEEDED','IN_FLIGHT');
