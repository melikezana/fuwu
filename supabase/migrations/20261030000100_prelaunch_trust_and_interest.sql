-- LOCAL PREPARATION ONLY. Validate staging, then obtain explicit production approval.
begin;

alter table public.provider_publication_reviews
 add column record_kind text not null default 'unclassified' check(record_kind in ('unclassified','real','test'));
-- Exact provenance, not names/phone heuristics. Original provider/financial records are untouched.
update public.provider_publication_reviews set record_kind='test',status='hidden'
where provider_id in (select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,13) n);

create or replace function public.provider_is_published(p_provider_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id
 where p.id=p_provider_id and p.is_active and p.is_approved and q.status='approved' and q.record_kind='real'
 and p.id not in (select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,13) n)
 and q.fingerprint=public.provider_content_fingerprint(p))
$$;

-- Keep the original evidence checks and audit transaction; classify before calling them.
alter function public.review_provider_publication(uuid,text,text,text,text) rename to review_provider_publication_before_provenance;
revoke all on function public.review_provider_publication_before_provenance(uuid,text,text,text,text) from public,anon,authenticated,service_role;
create function public.review_provider_publication(p_provider_id uuid,p_fingerprint text,p_status text,p_note text,p_verification_reference text default null,p_record_kind text default 'unclassified')
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_record_kind is null or p_record_kind not in ('unclassified','real','test') then raise exception 'invalid_provenance' using errcode='22023'; end if;
 if p_status='approved' and (p_record_kind<>'real' or p_provider_id in (select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,13) n))
 then raise exception 'real_provider_required' using errcode='22023'; end if;
 perform public.review_provider_publication_before_provenance(p_provider_id,p_fingerprint,p_status,p_note,p_verification_reference);
 update public.provider_publication_reviews set record_kind=p_record_kind where provider_id=p_provider_id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
 values(auth.uid(),'provider',p_provider_id,'provider.provenance_reviewed',jsonb_build_object('record_kind',p_record_kind,'status',p_status));
end $$;
revoke all on function public.review_provider_publication(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.review_provider_publication(uuid,text,text,text,text,text) to authenticated;

-- Before real payments are supported, sandbox reviews cannot be customer social proof.
-- A future live-payment migration must explicitly replace this projection with verified sources.
create or replace function public.provider_publication_gate() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'record_kind',q.record_kind,'rating',null,'review_count',0,
 'verified',p.is_verified and p.identity_verified and exists(select 1 from public.provider_applications a where a.id::text=q.verification_reference and a.user_id=p.user_id and a.status='approved' and nullif(btrim(a.verification_document_path),'') is not null),
 'identity_verified',p.identity_verified and exists(select 1 from public.provider_applications a where a.id::text=q.verification_reference and a.user_id=p.user_id and a.status='approved' and nullif(btrim(a.verification_document_path),'') is not null))), '[]'::jsonb)
 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id where public.provider_is_published(p.id)
$$;
create or replace function public.public_provider_reviews(p_provider_id uuid) returns jsonb language sql stable set search_path='' as $$ select '[]'::jsonb $$;
create policy reviews_prelaunch_participants on public.reviews as restrictive for select to anon,authenticated
using(public.current_user_is_admin() or user_id=auth.uid() or exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()));
create or replace function public.commerce_offers(p_service_id uuid default null,p_district_id uuid default null,p_provider_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item||jsonb_build_object('rating',null,'review_count',0)),'[]'::jsonb)
 from jsonb_array_elements(public.commerce_offers_before_publication(p_service_id,p_district_id,p_provider_id)) item
 where public.provider_is_published((item->>'provider_id')::uuid)
$$;
create or replace function public.commerce_public_schedule(p_provider_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('weekday',a.weekday,'starts_at',a.starts_at,'ends_at',a.ends_at) order by a.weekday),'[]'::jsonb)
 from public.provider_availability a where a.provider_id=p_provider_id and public.provider_is_published(p_provider_id)
$$;

alter function public.admin_provider_quality_queue() rename to admin_provider_quality_queue_before_provenance;
revoke all on function public.admin_provider_quality_queue_before_provenance() from public,anon,authenticated,service_role;
create function public.admin_provider_quality_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(item||jsonb_build_object('record_kind',q.record_kind)),'[]'::jsonb)
 from jsonb_array_elements(public.admin_provider_quality_queue_before_provenance()) item join public.provider_publication_reviews q on q.provider_id=(item->>'id')::uuid);
end $$;
revoke all on function public.admin_provider_quality_queue() from public,anon,authenticated;
grant execute on function public.admin_provider_quality_queue() to authenticated;

-- Verified account email prevents registration/withdrawal of somebody else's address.
create table public.launch_interest (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.profiles(id),
 email text not null,
 district_id uuid references public.districts(id),
 category_id uuid references public.service_categories(id),
 consent_version text not null,
 consent_at timestamptz not null default now(),
 withdrawn_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.launch_interest_consent_events (
 id uuid primary key default gen_random_uuid(),
 interest_id uuid not null references public.launch_interest(id),
 event text not null check(event in ('granted','withdrawn')),
 version text not null,
 created_at timestamptz not null default now()
);
alter table public.launch_interest enable row level security;
alter table public.launch_interest_consent_events enable row level security;
revoke all on public.launch_interest,public.launch_interest_consent_events from public,anon,authenticated;
grant all on public.launch_interest,public.launch_interest_consent_events to service_role;
grant select on public.launch_interest to authenticated;
create policy launch_interest_owner_read on public.launch_interest for select to authenticated using(user_id=auth.uid() or public.current_user_is_admin());

create function public.launch_interest_health() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('version',1,'available',exists(select 1 from public.app_settings where key='launch_interest_enabled' and value='true')) $$;
revoke all on function public.launch_interest_health() from public,anon,authenticated;
grant execute on function public.launch_interest_health() to anon,authenticated;

create function public.save_launch_interest(p_district_id uuid default null,p_category_id uuid default null,p_consent boolean default false,p_version text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare account_email text; interest_id uuid; rate jsonb;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 if not exists(select 1 from public.app_settings where key='launch_interest_enabled' and value='true') then raise exception 'interest_closed' using errcode='42501'; end if;
 select lower(email) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null or account_email='' then raise exception 'verified_email_required' using errcode='42501'; end if;
 if p_consent is distinct from true or p_version is distinct from 'prelaunch-2026-10-30' then raise exception 'consent_required' using errcode='22023'; end if;
 if (p_district_id is not null and not exists(select 1 from public.districts where id=p_district_id and is_active))
 or (p_category_id is not null and not exists(select 1 from public.service_categories where id=p_category_id and is_active)) then raise exception 'invalid_preference' using errcode='22023'; end if;
 rate:=public.consume_user_rate_limit('launch_interest.save',5,3600000);
 if not coalesce((rate->>'allowed')::boolean,false) then raise exception 'rate_limited' using errcode='P0001'; end if;
 insert into public.launch_interest(user_id,email,district_id,category_id,consent_version)
 values(auth.uid(),account_email,p_district_id,p_category_id,p_version)
 on conflict(user_id) do update set email=excluded.email,district_id=excluded.district_id,category_id=excluded.category_id,consent_version=excluded.consent_version,consent_at=now(),withdrawn_at=null,updated_at=now()
 returning id into interest_id;
 insert into public.launch_interest_consent_events(interest_id,event,version) values(interest_id,'granted',p_version);
 return interest_id;
end $$;
revoke all on function public.save_launch_interest(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.save_launch_interest(uuid,uuid,boolean,text) to authenticated;

create function public.withdraw_launch_interest() returns boolean language plpgsql security definer set search_path='' as $$
declare entry public.launch_interest;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 update public.launch_interest set withdrawn_at=now(),updated_at=now() where user_id=auth.uid() and withdrawn_at is null returning * into entry;
 if entry.id is not null then insert into public.launch_interest_consent_events(interest_id,event,version) values(entry.id,'withdrawn',entry.consent_version); end if;
 return true;
end $$;
revoke all on function public.withdraw_launch_interest() from public,anon,authenticated;
grant execute on function public.withdraw_launch_interest() to authenticated;

-- Atomic, compare-and-clear admin action. No maintenance/fee setting is touched.
create function public.clear_legacy_announcement(p_expected text) returns boolean language plpgsql security definer set search_path='' as $$
declare cleared boolean;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_expected is null or translate(lower(translate(p_expected,'İIŞ','iiş')),'ı','i') not like '%geliştiriyoruz%' then raise exception 'not_legacy_announcement' using errcode='22023'; end if;
 update public.app_settings set value='',updated_at=now() where key='announcement_banner' and value=p_expected;
 cleared:=found;
 if cleared then insert into public.audit_logs(actor_user_id,entity_type,action,metadata) values(auth.uid(),'settings','settings.legacy_announcement_cleared',jsonb_build_object('key','announcement_banner')); end if;
 return cleared;
end $$;
revoke all on function public.clear_legacy_announcement(text) from public,anon,authenticated;
grant execute on function public.clear_legacy_announcement(text) to authenticated;

-- Manual evidence is scoped to readiness; none of these values opens payment processing.
insert into public.app_settings(key,value) values
 ('launch_company_status','Şirketleşme bekleniyor'),('launch_payment_status','Canlı ödeme kapalı'),
 ('launch_iyzico_evidence',''),('launch_google_evidence',''),('launch_migration_evidence',''),('launch_security_blockers',''),('launch_interest_enabled','false')
on conflict(key) do nothing;

create function public.admin_prelaunch_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object(
 'version',1,
 'network',jsonb_build_object(
   'applications',(select count(*) from public.provider_applications a where exists(select 1 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id where p.user_id=a.user_id and q.record_kind='real')),
   'pending',(select count(*) from public.provider_publication_reviews where status='pending_review' and record_kind='real'),
   'unclassified',(select count(*) from public.provider_publication_reviews where record_kind='unclassified'),
   'published',(select count(*) from public.providers where public.provider_is_published(id)),
   'verified',(select count(*) from jsonb_array_elements(public.provider_publication_gate()) g where (g->>'verified')::boolean),
   'stores',(select count(distinct f.provider_id) from public.provider_service_offerings f where f.is_active and public.provider_is_published(f.provider_id)),
   'calendars',(select count(distinct a.provider_id) from public.provider_availability a where public.provider_is_published(a.provider_id))),
 'interest',(select count(*) from public.launch_interest where withdrawn_at is null),
 'pilot',(select coalesce(jsonb_agg(row),'[]'::jsonb) from (
   select d.id district_id,d.name district,c.id category_id,c.name category,
   (select count(*) from public.provider_applications a where a.district_id=d.id and a.category_id=c.id and exists(select 1 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id where p.user_id=a.user_id and q.record_kind='real')) applications,
   (select count(*) from public.providers p where p.district_id=d.id and p.category_id=c.id and public.provider_is_published(p.id)) published,
   (select count(*) from public.providers p where p.district_id=d.id and p.category_id=c.id and exists(select 1 from jsonb_array_elements(public.provider_publication_gate()) g where (g->>'id')::uuid=p.id and (g->>'verified')::boolean)) verified,
   (select count(distinct f.provider_id) from public.provider_service_offerings f join public.service_catalog s on s.id=f.service_id where d.id=any(f.district_ids) and s.category_id=c.id and f.is_active and public.provider_is_published(f.provider_id)) stores,
   (select count(distinct a.provider_id) from public.provider_availability a where public.provider_is_published(a.provider_id) and exists(select 1 from public.provider_service_offerings f join public.service_catalog s on s.id=f.service_id where f.provider_id=a.provider_id and d.id=any(f.district_ids) and s.category_id=c.id and f.is_active)) calendars,
   (select count(*) from public.launch_interest i where i.district_id=d.id and i.category_id=c.id and i.withdrawn_at is null) interest
   from public.districts d cross join public.service_categories c
   where d.name in ('Kadıköy','Üsküdar','Ataşehir') and d.is_active and c.is_active and c.slug in ('tesisat','klima-beyaz-esya','elektrik-hizmeti','mobilya-montaj','tamirat','ev-tadilati')
 ) row),
 'settings',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from public.app_settings where key like 'launch_%'));
end $$;
revoke all on function public.admin_prelaunch_snapshot() from public,anon,authenticated;
grant execute on function public.admin_prelaunch_snapshot() to authenticated;
commit;
