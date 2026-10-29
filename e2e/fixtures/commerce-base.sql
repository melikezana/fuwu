-- Isolated contract fixture for pre-existing Supabase relations, NEVER production seed data.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create table public.profiles(id uuid primary key, role text not null, created_at timestamptz not null default now());
create table public.rate_limits(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),action text not null,count integer not null default 0,window_start timestamptz not null,updated_at timestamptz default now(),unique(user_id,action,window_start));
alter table public.rate_limits enable row level security;
create function public.current_user_is_admin() returns boolean language sql stable security definer as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create table public.service_categories(id uuid primary key,name text,slug text,is_active boolean default true);
create table public.districts(id uuid primary key,name text,is_active boolean default true);
create table public.providers(id uuid primary key,user_id uuid references public.profiles(id),name text,category_id uuid references public.service_categories(id),profile_image_url text,is_active boolean default true,is_approved boolean default true,availability text default 'müsait',iyzico_submerchant_status text default 'active',iyzico_submerchant_key text default 'sandbox-test',rating numeric default 0,review_count integer default 0);
-- Editorial fields mirror the real provider schema for publication regression tests.
alter table public.providers add column description text, add column district_id uuid references public.districts(id) default '20000000-0000-4000-8000-000000000001', add column experience_years integer, add column is_verified boolean not null default false, add column identity_verified boolean not null default false, add column phone_verified boolean not null default false;
alter table public.providers add column payout_iban text,add column tax_identity_number text,add column tax_office text,add column legal_name text,add column payout_address text,add column iyzico_submerchant_conversation_id text;
create table public.reviews(id uuid primary key default gen_random_uuid(),provider_id uuid references public.providers(id),user_id uuid references public.profiles(id),rating smallint,comment text,created_at timestamptz not null default now(),unique(provider_id,user_id));
create table public.provider_applications(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),status text not null default 'pending',verification_document_path text);
create table public.service_requests(id uuid primary key default gen_random_uuid(),assigned_provider_id uuid,accepted_provider_id uuid,status text,preferred_date date,preferred_time time,user_id uuid references profiles(id),updated_at timestamptz not null default now());
create table public.app_settings(key text primary key,value text);
create table public.payments(id uuid primary key default gen_random_uuid(),request_id uuid,status text,iyzico_payment_transaction_id text,iyzico_checkout_token text,iyzico_conversation_id text,updated_at timestamptz default now());
grant all on public.payments to service_role;
grant select on public.providers,public.districts,public.service_categories,public.reviews to anon,authenticated;
alter table public.providers enable row level security;
create policy fixture_provider_read on public.providers for select using(true);
create policy fixture_provider_update on public.providers for update to authenticated using(user_id=auth.uid() or public.current_user_is_admin()) with check(user_id=auth.uid() or public.current_user_is_admin());
grant update on public.providers to authenticated;
insert into public.profiles(id,role) values
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

create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_user_id uuid references profiles(id),entity_type text not null,entity_id uuid,action text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
alter table public.audit_logs enable row level security;
create policy audit_admin on public.audit_logs for select to authenticated using(public.current_user_is_admin());
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.current_user_is_admin());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid() or public.current_user_is_admin());
grant select,insert,update on public.profiles to authenticated;
grant select on public.audit_logs to authenticated;
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),recipient_user_id uuid not null references profiles(id),actor_user_id uuid references profiles(id),provider_id uuid references providers(id),request_id uuid references service_requests(id),entity_id uuid,entity_type text not null,type text not null,event text not null,title text not null,body text not null,message text not null,metadata jsonb not null default '{}',is_read boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),constraint notifications_entity_type_check check(entity_type in ('service_request','provider_application','provider')));
alter table public.notifications enable row level security;
create policy notification_read on public.notifications for select to authenticated using(user_id=auth.uid() or recipient_user_id=auth.uid() or public.current_user_is_admin());
create policy notification_update on public.notifications for update to authenticated using(user_id=auth.uid() or recipient_user_id=auth.uid());
grant select,insert,update on public.notifications to authenticated;
