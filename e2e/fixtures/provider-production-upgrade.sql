-- Synthetic data only, after the exact migration versions observed in production.
insert into auth.users(id,email) values ('b1000000-0000-4000-8000-000000000001','production-shape-owner@example.invalid');
insert into public.providers(id,user_id,name,phone,description,category_id,district_id,is_active,is_approved)
 select 'b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','TEST Existing Provider','+905550000003','TEST historical provider description preserved verbatim.',c.id,d.id,true,true
 from public.service_categories c cross join public.districts d where c.is_active and d.is_active order by c.id,d.id limit 1;
insert into public.provider_applications(id,user_id,full_name,phone,category_id,district_id,status)
 select 'b1000000-0000-4000-8000-000000000003',user_id,name,phone,category_id,district_id,'approved' from public.providers where id='b1000000-0000-4000-8000-000000000002';
insert into public.service_requests(id,user_id,category_id,district_id,address,description,status)
 select 'b1000000-0000-4000-8000-000000000004',user_id,category_id,district_id,'TEST historical service address','TEST historical request preserved verbatim','pending' from public.providers where id='b1000000-0000-4000-8000-000000000002';
insert into public.reviews(id,provider_id,user_id,rating,comment)
 values ('b1000000-0000-4000-8000-000000000005','b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001',4,'TEST historical review preserved verbatim');
