-- Isolated contract fixture for pre-existing Supabase relations, NEVER production seed data.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create table public.profiles(id uuid primary key, role text not null);
create function public.current_user_is_admin() returns boolean language sql stable security definer as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create table public.service_categories(id uuid primary key,name text,slug text,is_active boolean default true);
create table public.districts(id uuid primary key,name text,is_active boolean default true);
create table public.providers(id uuid primary key,user_id uuid references public.profiles(id),name text,category_id uuid references public.service_categories(id),profile_image_url text,is_active boolean default true,is_approved boolean default true,availability text default 'müsait',iyzico_submerchant_status text default 'active',iyzico_submerchant_key text default 'sandbox-test',rating numeric default 0,review_count integer default 0);
create table public.reviews(id uuid primary key default gen_random_uuid(),provider_id uuid references public.providers(id),user_id uuid references public.profiles(id),rating smallint,comment text,unique(provider_id,user_id));
create table public.service_requests(id uuid primary key default gen_random_uuid(),assigned_provider_id uuid,accepted_provider_id uuid,status text,preferred_date date,preferred_time time);
create table public.app_settings(key text primary key,value text);
grant select on public.providers,public.districts,public.service_categories,public.reviews to anon,authenticated;
insert into public.profiles values
('00000000-0000-4000-8000-000000000001','customer'),
('00000000-0000-4000-8000-000000000002','customer'),
('00000000-0000-4000-8000-000000000003','provider'),
('00000000-0000-4000-8000-000000000004','provider'),
('00000000-0000-4000-8000-000000000005','admin');
insert into public.service_categories(id,name,slug) values
('10000000-0000-4000-8000-000000000001','Tesisat','tesisat'),
('10000000-0000-4000-8000-000000000002','Klima','klima-beyaz-esya'),
('10000000-0000-4000-8000-000000000003','Elektrik','elektrik-hizmeti'),
('10000000-0000-4000-8000-000000000004','Mobilya','mobilya-montaj');
insert into public.districts(id,name) values('20000000-0000-4000-8000-000000000001','Kadıköy'),('20000000-0000-4000-8000-000000000002','Beşiktaş');
insert into public.providers(id,user_id,name,category_id) values
('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','TEST Tesisat Ustası','10000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','TEST Klima Ustası','10000000-0000-4000-8000-000000000002'),
('30000000-0000-4000-8000-000000000003',null,'TEST Sahipsiz Profil','10000000-0000-4000-8000-000000000001');
insert into public.app_settings values('commission_rate','10');
