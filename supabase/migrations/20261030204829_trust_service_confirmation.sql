-- LOCAL / ISOLATED STAGING PREPARATION ONLY. Never apply automatically to production.
begin;
create schema if not exists fuwu_private;
revoke all on schema fuwu_private from public,anon,authenticated;
-- pgcrypto may already live in public or extensions. Resolve its actual namespace.
do $migration$ declare ns text; begin
 select n.nspname into strict ns from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
 execute format('create function fuwu_private.random_bytes() returns bytea language sql volatile set search_path='''' as %L',format('select %I.gen_random_bytes(3)',ns));
 execute format('create function fuwu_private.hash_code(p_code text,p_salt text default null) returns text language sql volatile set search_path='''' as %L',format('select %I.crypt(p_code,coalesce(p_salt,%I.gen_salt(''bf'',10)))',ns,ns));
end $migration$;

create table public.provider_document_types (
 code text primary key check(code ~ '^[a-z_]{3,60}$'), label text not null,
 purpose text not null check(purpose in ('identity','professional','business','payment')),
 retention_days integer not null default 365 check(retention_days between 1 and 3650), enabled boolean not null default true
);
insert into public.provider_document_types(code,label,purpose) values
 ('identity','Kimlik doğrulama kanıtı','identity'),('qualification','MYK / ustalık / eşdeğer diploma','professional'),
 ('authorized_service','Yetkili servis yetki belgesi','professional'),('business','Tacir / esnaf bilgileri','business'),
 ('hygiene','Faaliyete özgü hijyen belgesi','professional'),('payment_kyc','Ödeme kuruluşu doğrulaması','payment');
create table public.provider_document_rules (
 id uuid primary key default gen_random_uuid(), category_id uuid references public.service_categories(id), provider_id uuid references public.providers(id),
 document_type text not null references public.provider_document_types(code), stage text not null check(stage in ('application','publication','payment')),
 scope text not null default '', regulatory_rule_version text not null, source_url text not null check(source_url ~ '^https://'),
 effective_date date not null, reviewed_at timestamptz, reviewed_by uuid references public.profiles(id),
 legal_status text not null default 'draft' check(legal_status in ('draft','approved','retired')),
 required boolean not null default false, enabled boolean not null default false,
 check(not enabled or (legal_status='approved' and reviewed_at is not null and reviewed_by is not null))
);
-- Research candidates, NOT legal determinations. No draft is enforced on applicants.
insert into public.provider_document_rules(category_id,document_type,stage,scope,regulatory_rule_version,source_url,effective_date)
 select id,'qualification','publication','Alt meslek, iş kapsamı ve MYK muafiyet tablosu insan tarafından değerlendirilmeli.',
 'research-2026-10-30','https://www.myk.gov.tr/tr/page/135','2026-10-30' from public.service_categories
 where slug ~ '(elektrik|tesisat|boya|montaj|tadilat|beyaz|teknik)';

create table public.provider_document_uploads (
 path text primary key, owner_id uuid not null references public.profiles(id), mime text not null,
 size_bytes integer not null check(size_bytes between 1 and 5242880), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 scan_status text not null check(scan_status in ('unavailable','clean','blocked')), created_at timestamptz not null default now()
);
create table public.provider_document_versions (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.provider_applications(id),
 owner_id uuid not null references public.profiles(id), document_type text not null references public.provider_document_types(code),
 category_id uuid references public.service_categories(id), version integer not null check(version>0),
 storage_path text not null unique references public.provider_document_uploads(path),
 status text not null default 'uploaded' check(status in ('uploaded','in_review','approved','resubmit','rejected')),
 expires_on date, reason text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 superseded_at timestamptz, created_at timestamptz not null default now(),
 unique(application_id,document_type,version),
 check(status not in ('approved','resubmit','rejected') or (length(btrim(reason))>=10 and reviewed_by is not null and reviewed_at is not null))
);
create unique index provider_document_current on public.provider_document_versions(application_id,document_type) where superseded_at is null;
create index provider_document_queue on public.provider_document_versions(status,expires_on) where superseded_at is null;
create index provider_document_owner_evidence on public.provider_document_versions(owner_id,category_id,document_type) where superseded_at is null;
create index provider_document_upload_owner on public.provider_document_uploads(owner_id);
create index provider_document_rules_scope on public.provider_document_rules(category_id,provider_id) where enabled;

alter table public.provider_document_types enable row level security;
alter table public.provider_document_rules enable row level security;
alter table public.provider_document_uploads enable row level security;
alter table public.provider_document_versions enable row level security;
revoke all on public.provider_document_types,public.provider_document_rules,public.provider_document_uploads,public.provider_document_versions from public,anon,authenticated;
grant select on public.provider_document_types,public.provider_document_rules to authenticated;
create policy document_types_read on public.provider_document_types for select to authenticated using(enabled or public.current_user_is_admin());
create policy document_rules_read on public.provider_document_rules for select to authenticated using((enabled and legal_status='approved') or public.current_user_is_admin());
grant select,insert on public.provider_document_uploads to service_role;
grant select on public.provider_document_versions to service_role;
grant all on public.provider_document_types,public.provider_document_rules to service_role;

-- Private files can only be transferred by the server, after byte-level validation.
drop policy if exists provider_verification_documents_select_owner_or_admin on storage.objects;
drop policy if exists provider_verification_documents_insert_own_path on storage.objects;

create function public.trust_attach_document(p_application_id uuid,p_path text,p_type text,p_expires_on date default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.provider_applications; did uuid; v integer;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 -- Consistent provider -> application -> document lock order.
 perform 1 from public.providers where user_id=auth.uid() order by id for update;
 select * into a from public.provider_applications where id=p_application_id and user_id=auth.uid() for update;
 if a.id is null or not exists(select 1 from public.provider_document_types where code=p_type and enabled and purpose<>'payment')
 or not exists(select 1 from public.provider_document_uploads u join storage.objects o on o.name=u.path and o.bucket_id='provider-verification-documents'
  where u.path=p_path and u.owner_id=auth.uid() and u.scan_status<>'blocked' and u.path like auth.uid()::text||'/provider-applications/%')
 then raise exception 'forbidden' using errcode='42501'; end if;
 if p_expires_on is not null and p_expires_on<current_date then raise exception 'document_expired' using errcode='22023'; end if;
 select id into did from public.provider_document_versions where storage_path=p_path and application_id=a.id and owner_id=auth.uid() and document_type=p_type;
 if did is not null then return did; end if;
 select coalesce(max(version),0)+1 into v from public.provider_document_versions where application_id=a.id and document_type=p_type;
 update public.provider_document_versions set superseded_at=now() where owner_id=auth.uid() and document_type=p_type and (p_type='identity' or category_id=a.category_id) and superseded_at is null;
 insert into public.provider_document_versions(application_id,owner_id,document_type,category_id,version,storage_path,expires_on)
 values(a.id,auth.uid(),p_type,a.category_id,v,p_path,p_expires_on) returning id into did;
 update public.provider_applications set verification_document_path=p_path,verification_document_url=null,status='pending' where id=a.id;
 update public.providers set identity_verified=case when p_type='identity' then false else identity_verified end,
  is_verified=case when p_type in ('qualification','authorized_service','hygiene') then false else is_verified end where user_id=auth.uid();
 update public.provider_publication_reviews set status='pending_review',review_note=null,reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp()
 where provider_id in(select id from public.providers where user_id=auth.uid());
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider_document',did,'trust.document.uploaded',jsonb_build_object('application_id',a.id,'version',v,'document_type',p_type));
 return did;
end $$;
-- Close the legacy path that bypassed document type/version evidence.
create or replace function public.partner_attach_document(p_application_id uuid,p_path text) returns void
language plpgsql security definer set search_path='' as $$ begin
 perform public.trust_attach_document(p_application_id,p_path,'qualification',null);
end $$;

create function public.trust_review_document(p_id uuid,p_version integer,p_status text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare d public.provider_document_versions;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.providers where user_id=(select owner_id from public.provider_document_versions where id=p_id) order by id for update;
 perform 1 from public.provider_applications where id=(select application_id from public.provider_document_versions where id=p_id) for update;
 select * into d from public.provider_document_versions where id=p_id for update;
 if d.id is null or d.owner_id=auth.uid() then raise exception 'forbidden' using errcode='42501'; end if;
 if d.version is distinct from p_version or d.superseded_at is not null then raise exception 'document_version_conflict' using errcode='40001'; end if;
 if p_status is null or p_status not in ('in_review','approved','resubmit','rejected') or p_reason is null or length(btrim(p_reason)) not between 10 and 1000 then raise exception 'invalid_selection' using errcode='22023'; end if;
 if p_status='approved' and ((d.expires_on is not null and d.expires_on<current_date) or not exists(select 1 from storage.objects where bucket_id='provider-verification-documents' and name=d.storage_path)) then raise exception 'document_unavailable' using errcode='22023'; end if;
 if p_status='approved' and d.document_type<>'identity' and exists(select 1 from public.providers where user_id=d.owner_id)
 and not exists(select 1 from public.providers where user_id=d.owner_id and category_id=d.category_id) then raise exception 'document_category_mismatch' using errcode='22023'; end if;
 if d.status=p_status and d.reason=btrim(p_reason) then return; end if;
 update public.provider_document_versions set status=p_status,reason=btrim(p_reason),reviewed_by=auth.uid(),reviewed_at=now() where id=d.id;
 if d.document_type='identity' then update public.providers set identity_verified=(p_status='approved') where user_id=d.owner_id; end if;
 if d.document_type='qualification' then update public.providers set is_verified=(p_status='approved') where user_id=d.owner_id; end if;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider_document',d.id,'trust.document.reviewed',
 jsonb_build_object('application_id',d.application_id,'version',d.version,'before',d.status,'after',p_status,'reason',btrim(p_reason),'document_type',d.document_type));
end $$;

create function fuwu_private.document_valid(p_owner uuid,p_category uuid,p_type text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.provider_document_versions d where d.owner_id=p_owner and d.document_type=p_type
 and (p_type='identity' or d.category_id=p_category) and d.superseded_at is null and d.status='approved'
 and (d.expires_on is null or d.expires_on>=current_date) and exists(select 1 from storage.objects o where o.bucket_id='provider-verification-documents' and o.name=d.storage_path))
$$;
create function fuwu_private.guard_verification() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.identity_verified and not coalesce(old.identity_verified,false) and not fuwu_private.document_valid(new.user_id,new.category_id,'identity') then raise exception 'verification_evidence_required' using errcode='22023'; end if;
 if new.is_verified and not coalesce(old.is_verified,false) and not fuwu_private.document_valid(new.user_id,new.category_id,'qualification') then raise exception 'verification_evidence_required' using errcode='22023'; end if;
 return new;
end $$;
create trigger trust_verification_evidence before insert or update on public.providers for each row execute function fuwu_private.guard_verification();
create function fuwu_private.guard_application_phone() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if current_setting('role',true) in ('anon','authenticated') then
  if not public.current_user_is_admin() and not exists(select 1 from auth.users u where u.id=auth.uid() and new.user_id=u.id
   and nullif(to_jsonb(u)->>'phone_confirmed_at','') is not null and regexp_replace(coalesce(to_jsonb(u)->>'phone',''),'[^0-9]','','g')=regexp_replace(new.phone,'[^0-9]','','g'))
  then raise exception 'verified_phone_required' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger trust_application_phone before insert on public.provider_applications for each row execute function fuwu_private.guard_application_phone();
create function fuwu_private.guard_publication_documents() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.providers; begin
 select * into p from public.providers where id=new.provider_id;
 if new.status='approved' and exists(select 1 from public.provider_document_rules r where r.enabled and r.required and r.legal_status='approved'
 and r.stage='publication' and r.effective_date<=current_date and (r.category_id is null or r.category_id=p.category_id) and (r.provider_id is null or r.provider_id=p.id)
 and not fuwu_private.document_valid(p.user_id,p.category_id,r.document_type)) then raise exception 'required_document_missing' using errcode='22023'; end if;
 return new;
end $$;
create trigger trust_publication_documents before insert or update on public.provider_publication_reviews for each row execute function fuwu_private.guard_publication_documents();

create function public.trust_application_file(p_application_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.provider_applications; docs jsonb;
begin
 select * into a from public.provider_applications where id=p_application_id;
 if auth.uid() is null or a.id is null or (a.user_id is distinct from auth.uid() and not public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'document_type',d.document_type,'label',t.label,'version',d.version,'status',d.status,
 'expires_on',d.expires_on,'reason',d.reason,'reviewed_by',d.reviewed_by,'reviewed_at',d.reviewed_at,'created_at',d.created_at,
 'superseded',d.superseded_at is not null,'storage_missing',not exists(select 1 from storage.objects o where o.bucket_id='provider-verification-documents' and o.name=d.storage_path)) order by d.created_at desc),'[]'::jsonb)
 into docs from public.provider_document_versions d join public.provider_document_types t on t.code=d.document_type where d.application_id=a.id;
 return jsonb_build_object('id',a.id,'name',a.full_name,'phone',a.phone,'status',a.status,'bound',a.user_id is not null,
 'category_id',a.category_id,'district_id',a.district_id,'documents',docs,
 'legacy_status',case when nullif(a.verification_document_path,'') is null then case when exists(select 1 from public.provider_document_uploads u where u.owner_id=a.user_id and not exists(select 1 from public.provider_document_versions d where d.storage_path=u.path)) then 'unmatched_application' when nullif(a.verification_document_url,'') is null then 'not_uploaded' else 'legacy_schema' end
 when not exists(select 1 from storage.objects o where o.bucket_id='provider-verification-documents' and o.name=a.verification_document_path) then 'storage_missing'
 when not exists(select 1 from public.provider_document_versions d where d.application_id=a.id and d.storage_path=a.verification_document_path) then 'legacy_schema' else 'versioned' end,
 'phone_verified',exists(select 1 from auth.users u where u.id=a.user_id and nullif(to_jsonb(u)->>'phone_confirmed_at','') is not null
 and regexp_replace(coalesce(to_jsonb(u)->>'phone',''),'[^0-9]','','g')=regexp_replace(a.phone,'[^0-9]','','g')),
 'identity_verified',fuwu_private.document_valid(a.user_id,a.category_id,'identity'),
 'rules',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.provider_document_rules r where (r.category_id=a.category_id or r.category_id is null) and (r.provider_id is null or r.provider_id in(select id from public.providers where user_id=a.user_id)) and r.enabled and r.legal_status='approved'),
 'history',(select coalesce(jsonb_agg(to_jsonb(h)),'[]'::jsonb) from (select l.actor_user_id,l.action,l.created_at,l.metadata from public.audit_logs l
 where (l.entity_type='provider_document' and l.entity_id in(select id from public.provider_document_versions where application_id=a.id)) or (l.entity_type='provider_application' and l.entity_id=a.id) order by l.created_at desc limit 40) h));
end $$;

create function public.trust_document_access(p_id uuid) returns text
language plpgsql security definer set search_path='' as $$ declare d public.provider_document_versions; begin
 select * into d from public.provider_document_versions where id=p_id;
 if auth.uid() is null or d.id is null or (d.owner_id is distinct from auth.uid() and not public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects where bucket_id='provider-verification-documents' and name=d.storage_path) then raise exception 'document_unavailable'; end if;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider_document',d.id,'trust.document.access',jsonb_build_object('version',d.version));
 -- Path is only consumed by the server route; file transfer needs the server-only key.
 return d.storage_path;
end $$;

create function public.trust_save_rule(p_rule jsonb,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$ declare rid uuid; begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 1000 or jsonb_typeof(p_rule) is distinct from 'object'
 or length(btrim(coalesce(p_rule->>'regulatory_rule_version',''))) not between 1 and 120 or length(coalesce(p_rule->>'scope',''))>2000
 or coalesce(p_rule->>'source_url','') !~* '^https://([a-z0-9-]+\.)*gov\.tr(/|$)'
 or (p_rule->>'stage'='application' and (p_rule->>'required')::boolean) then raise exception 'invalid_selection'; end if;
 rid:=coalesce(nullif(p_rule->>'id','')::uuid,gen_random_uuid());
 insert into public.provider_document_rules(id,category_id,provider_id,document_type,stage,scope,regulatory_rule_version,source_url,effective_date,reviewed_at,reviewed_by,legal_status,required,enabled)
 values(rid,nullif(p_rule->>'category_id','')::uuid,nullif(p_rule->>'provider_id','')::uuid,p_rule->>'document_type',p_rule->>'stage',coalesce(p_rule->>'scope',''),p_rule->>'regulatory_rule_version',p_rule->>'source_url',(p_rule->>'effective_date')::date,
 case when p_rule->>'legal_status'='approved' then now() end,case when p_rule->>'legal_status'='approved' then auth.uid() end,p_rule->>'legal_status',(p_rule->>'required')::boolean,(p_rule->>'enabled')::boolean)
 on conflict(id) do update set category_id=excluded.category_id,provider_id=excluded.provider_id,document_type=excluded.document_type,stage=excluded.stage,scope=excluded.scope,
 regulatory_rule_version=excluded.regulatory_rule_version,source_url=excluded.source_url,effective_date=excluded.effective_date,reviewed_at=excluded.reviewed_at,reviewed_by=excluded.reviewed_by,legal_status=excluded.legal_status,required=excluded.required,enabled=excluded.enabled;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'document_rule',rid,'trust.rule.saved',jsonb_build_object('rule',(select to_jsonb(r) from public.provider_document_rules r where r.id=rid),'reason',btrim(p_reason)));
 return rid;
end $$;

-- Reuse the existing publication predicate. Applicable reviewed rules are fail-closed.
create or replace function public.provider_is_published(p_provider_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id
 where p.id=p_provider_id and p.is_active and p.is_approved and q.status='approved' and q.record_kind='real'
 and p.id not in (select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,13) n)
 and q.fingerprint=public.provider_content_fingerprint(p) and not exists(select 1 from public.provider_document_rules r
 where r.enabled and r.legal_status='approved' and r.required and r.stage='publication' and r.effective_date<=current_date
 and (r.category_id is null or r.category_id=p.category_id) and (r.provider_id is null or r.provider_id=p.id) and not fuwu_private.document_valid(p.user_id,p.category_id,r.document_type)))
$$;
revoke all on function public.provider_is_published(uuid) from public;
grant execute on function public.provider_is_published(uuid) to anon,authenticated,service_role;
create or replace function public.provider_publication_gate() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'record_kind',q.record_kind,'rating',null,'review_count',0,
 'verified',p.is_verified and fuwu_private.document_valid(p.user_id,p.category_id,'qualification'),
 'identity_verified',p.identity_verified and fuwu_private.document_valid(p.user_id,p.category_id,'identity'))),'[]'::jsonb)
 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id where public.provider_is_published(p.id)
$$;

-- Reuse the existing code row and order state machine: arrival consumes the code;
-- completion is a separate, explicit customer decision. No second code system.
alter table public.order_completion_codes alter column code drop not null;
alter table public.order_completion_codes add column code_hash text, add column issued_at timestamptz,
 add column expires_at timestamptz, add column consumed_at timestamptz, add column issued_provider_id uuid references public.providers(id);
revoke all on public.order_completion_codes from anon,authenticated;
-- Old checkout still inserts a code: erase it before persistence. New codes are on demand.
create function fuwu_private.erase_legacy_code() returns trigger language plpgsql set search_path='' as $$ begin new.code:=null; return new; end $$;
create trigger trust_no_plaintext_code before insert or update on public.order_completion_codes for each row execute function fuwu_private.erase_legacy_code();
-- Freeze legacy browser payment confirmations while prelaunch checkout is closed.
-- Verified processor callbacks use service_role and retain their existing reconciliation.
create function fuwu_private.block_legacy_confirmation() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if current_setting('role',true) in ('anon','authenticated') and new.status='confirmed' and (TG_OP='INSERT' or old.status is distinct from new.status)
 then raise exception 'online_purchase_closed' using errcode='42501'; end if;
 return new;
end $$;
create trigger trust_legacy_payment_closed before insert or update on public.payments for each row execute function fuwu_private.block_legacy_confirmation();
alter table public.orders add column arrival_verified_at timestamptz,add column service_completed_at timestamptz,add column customer_confirmed_at timestamptz;

create function public.trust_issue_service_code(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders; c public.order_completion_codes; secret text; bytes bytea; n integer;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null or o.customer_id<>auth.uid() or o.status not in ('CONFIRMED','PROVIDER_ON_THE_WAY') or o.arrival_verified_at is not null
 or now()<o.starts_at-interval '2 hours' or now()>o.ends_at+interval '2 hours' then raise exception 'transition_forbidden' using errcode='42501'; end if;
 insert into public.order_completion_codes(order_id,code) values(o.id,null) on conflict do nothing;
 select * into c from public.order_completion_codes where order_id=o.id for update;
 if c.consumed_at is not null or (c.issued_at is not null and c.issued_at>now()-interval '15 minutes') then return jsonb_build_object('error','code_locked'); end if;
 -- Rejection sampling avoids modulo bias. gen_random_bytes is pgcrypto CSPRNG.
 loop
  bytes:=fuwu_private.random_bytes(); n:=get_byte(bytes,0)*65536+get_byte(bytes,1)*256+get_byte(bytes,2);
  exit when n<16200000;
 end loop;
 secret:=lpad(((n%900000)+100000)::text,6,'0');
 update public.order_completion_codes set code_hash=fuwu_private.hash_code(secret),issued_at=now(),expires_at=now()+interval '15 minutes',
 issued_provider_id=o.provider_id,failed_attempts=0,locked_until=null where order_id=o.id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.code.issued','{}');
 return jsonb_build_object('code',secret,'expires_at',now()+interval '15 minutes');
end $$;

create or replace function public.commerce_transition_order(p_order_id uuid,p_status text,p_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; p public.providers; c public.order_completion_codes; next_status text;
begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 select * into p from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null or (o.customer_id is distinct from auth.uid() and p.user_id is distinct from auth.uid()) then raise exception 'transition_forbidden' using errcode='42501'; end if;
 next_status:=p_status;
 if p_status='CANCELLED' and o.customer_id=auth.uid() and o.status in ('PENDING_PAYMENT','CONFIRMED') and o.starts_at>now() then
  if o.payment_status='PAID' then next_status:='REFUND_PENDING'; end if;
 elsif p_status='DISPUTED' and o.customer_id=auth.uid() and o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') then null;
 elsif p.user_id=auth.uid() and o.customer_id<>auth.uid() and o.status='CONFIRMED' and p_status='PROVIDER_ON_THE_WAY' then null;
 elsif p.user_id=auth.uid() and o.customer_id<>auth.uid() and o.status='PROVIDER_ON_THE_WAY' and p_status='IN_PROGRESS' then
  select * into c from public.order_completion_codes where order_id=o.id for update;
  if c.order_id is null or c.code_hash is null or c.consumed_at is not null or c.expires_at<=now() or c.issued_provider_id is distinct from o.provider_id or c.failed_attempts>=5 or c.locked_until>now() then return jsonb_build_object('error','invalid_service_code'); end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' or fuwu_private.hash_code(p_code,c.code_hash)<>c.code_hash then
   update public.order_completion_codes set failed_attempts=failed_attempts+1,locked_until=case when failed_attempts>=4 then expires_at else null end where order_id=o.id;
   insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.code.failed','{}');
   return jsonb_build_object('error','invalid_service_code');
  end if;
  update public.order_completion_codes set consumed_at=now(),code_hash=null where order_id=o.id;
  update public.orders set arrival_verified_at=now() where id=o.id;
 elsif p_status='COMPLETED' and o.status='IN_PROGRESS' and o.customer_id=auth.uid() and o.service_completed_at is not null then
  update public.orders set customer_confirmed_at=now() where id=o.id;
 elsif p_status='COMPLETED' and o.status='IN_PROGRESS' and p.user_id=auth.uid() and o.customer_id<>auth.uid() then
  if o.service_completed_at is null then
   update public.orders set service_completed_at=now(),updated_at=now() where id=o.id;
   insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.completion.requested','{}');
  end if;
  return jsonb_build_object('status','IN_PROGRESS','awaiting_customer',true);
 else raise exception 'transition_forbidden' using errcode='42501'; end if;
 update public.orders set status=next_status,payment_status=case when next_status='REFUND_PENDING' then 'REFUND_PENDING' else payment_status end,updated_at=now() where id=o.id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.order.transition',jsonb_build_object('from',o.status,'to',next_status));
 return jsonb_build_object('status',next_status);
end $$;

create table public.trust_safety_cases (
 id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id), provider_id uuid references public.providers(id), reporter_id uuid not null references public.profiles(id),
 reporter_side text not null check(reporter_side in ('customer','provider')), kind text not null check(kind in ('safety','complaint','appeal','no_show','unreachable','suspicious_account')),
 reason text not null check(length(reason) between 10 and 2000), status text not null default 'open' check(status in ('open','reviewing','resolved','reopened')),
 resolution text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(), check(order_id is not null or provider_id is not null)
);
alter table public.trust_safety_cases enable row level security;
revoke all on public.trust_safety_cases from public,anon,authenticated;
grant select on public.trust_safety_cases to authenticated;
create policy safety_cases_read on public.trust_safety_cases for select to authenticated using(reporter_id=auth.uid() or public.current_user_is_admin());
create index safety_case_reporter on public.trust_safety_cases(reporter_id,created_at);
create index safety_case_order on public.trust_safety_cases(order_id,status);
create index safety_case_provider on public.trust_safety_cases(provider_id) where provider_id is not null;
create index trust_overdue_completion on public.orders(service_completed_at) where status='IN_PROGRESS' and service_completed_at is not null;
create function public.trust_report_case(p_order_id uuid,p_kind text,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$ declare o public.orders; side text; cid uuid; begin
 select * into o from public.orders where id=p_order_id;
 if auth.uid() is null or o.id is null then raise exception 'forbidden' using errcode='42501'; end if;
 if o.customer_id=auth.uid() then side:='customer'; elsif exists(select 1 from public.providers where id=o.provider_id and user_id=auth.uid()) then side:='provider'; else raise exception 'forbidden' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('safety','complaint','appeal','no_show','unreachable') or length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'invalid_selection'; end if;
 if not (public.consume_user_rate_limit('trust:case',5,3600000)->>'allowed')::boolean then raise exception 'rate_limit'; end if;
 insert into public.trust_safety_cases(order_id,reporter_id,reporter_side,kind,reason) values(o.id,auth.uid(),side,p_kind,btrim(p_reason)) returning id into cid;
 if side='customer' and o.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED') then perform public.commerce_transition_order(o.id,'DISPUTED',null); end if;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'safety_case',cid,'trust.case.opened',jsonb_build_object('order_id',o.id,'kind',p_kind,'side',side)); return cid;
end $$;
create function public.trust_report_account(p_provider_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$ declare cid uuid; begin
 if auth.uid() is null or not exists(select 1 from public.providers where id=p_provider_id and user_id is distinct from auth.uid() and public.provider_is_published(id)) then raise exception 'forbidden' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'invalid_selection'; end if;
 if not (public.consume_user_rate_limit('trust:account_report',5,3600000)->>'allowed')::boolean then raise exception 'rate_limit'; end if;
 insert into public.trust_safety_cases(provider_id,reporter_id,reporter_side,kind,reason) values(p_provider_id,auth.uid(),'customer','suspicious_account',btrim(p_reason)) returning id into cid;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'safety_case',cid,'trust.account.reported',jsonb_build_object('provider_id',p_provider_id));
 return cid;
end $$;
revoke all on function public.trust_report_account(uuid,text) from public,anon,authenticated;
grant execute on function public.trust_report_account(uuid,text) to authenticated;
create function public.trust_resolve_case(p_id uuid,p_status text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_status is null or p_status not in ('reviewing','resolved','reopened') or length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'invalid_selection'; end if;
 update public.trust_safety_cases set status=p_status,resolution=btrim(p_reason),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 if not found then raise exception 'invalid_selection'; end if;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'safety_case',p_id,'trust.case.reviewed',jsonb_build_object('status',p_status,'reason',btrim(p_reason)));
 -- A case decision never impersonates customer consent or releases funds.
end $$;

create function public.trust_admin_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object('documents',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select d.id,d.application_id,a.full_name,d.document_type,d.status,d.version,d.expires_on,d.reason from public.provider_document_versions d join public.provider_applications a on a.id=d.application_id where d.superseded_at is null order by d.created_at limit 100) x),
 'cases',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from public.trust_safety_cases order by created_at desc limit 100) x),
 'overdue_confirmations',(select count(*) from public.orders where status='IN_PROGRESS' and service_completed_at<now()-interval '48 hours'),
 'unmatched_uploads',(select count(*) from public.provider_document_uploads u where not exists(select 1 from public.provider_document_versions where storage_path=u.path)),
 'review_requests',(select count(*) from public.provider_publication_reviews where status in ('pending_review','changes_requested')));
end $$;

-- Every callable definer has explicit grants and actor checks; private helpers have none.
alter function public.provider_partner_readiness(uuid) rename to provider_partner_readiness_before_trust;
revoke all on function public.provider_partner_readiness_before_trust(uuid) from public,anon,authenticated,service_role;
create function public.provider_partner_readiness(p_provider_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; p public.providers; missing jsonb; begin
 result:=public.provider_partner_readiness_before_trust(p_provider_id);
 select * into p from public.providers where id=p_provider_id;
 select coalesce(jsonb_agg(distinct t.label),'[]'::jsonb) into missing from public.provider_document_rules r join public.provider_document_types t on t.code=r.document_type
 where r.enabled and r.required and r.legal_status='approved' and r.stage='publication' and r.effective_date<=current_date
 and (r.category_id is null or r.category_id=p.category_id) and (r.provider_id is null or r.provider_id=p.id) and not fuwu_private.document_valid(p.user_id,p.category_id,r.document_type);
 return result||jsonb_build_object('identity_verified',p.identity_verified and fuwu_private.document_valid(p.user_id,p.category_id,'identity'),
 'phone_verified',exists(select 1 from auth.users u where u.id=p.user_id and nullif(to_jsonb(u)->>'phone_confirmed_at','') is not null and regexp_replace(coalesce(to_jsonb(u)->>'phone',''),'[^0-9]','','g')=regexp_replace(p.phone,'[^0-9]','','g')),
 'trust_missing',missing);
end $$;
revoke all on function public.provider_partner_readiness(uuid) from public,anon,authenticated;
grant execute on function public.provider_partner_readiness(uuid) to authenticated;
create table public.order_scope_changes (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 scope text not null check(length(scope) between 10 and 2000), extra_minor integer not null check(extra_minor between 0 and 100000000),
 status text not null default 'proposed' check(status in ('proposed','accepted','declined')),
 proposed_by uuid not null references public.profiles(id), decided_by uuid references public.profiles(id), decided_at timestamptz, created_at timestamptz not null default now()
);
alter table public.order_scope_changes enable row level security;
revoke all on public.order_scope_changes from public,anon,authenticated;
grant select on public.order_scope_changes to authenticated;
create policy scope_participants_read on public.order_scope_changes for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or exists(select 1 from public.providers p where p.id=o.provider_id and p.user_id=auth.uid()) or public.current_user_is_admin())));
create unique index scope_one_proposal on public.order_scope_changes(order_id) where status='proposed';
create index scope_order_history on public.order_scope_changes(order_id,created_at);
create function public.trust_scope_change(p_order_id uuid,p_scope text default null,p_extra_minor integer default null,p_change_id uuid default null,p_accept boolean default null) returns void
language plpgsql security definer set search_path='' as $$ declare o public.orders; pid uuid; cid uuid; begin
 select user_id into pid from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 if auth.uid() is null or o.id is null or o.status<>'IN_PROGRESS' or o.service_completed_at is not null then raise exception 'transition_forbidden' using errcode='42501'; end if;
 if p_change_id is null then
  if pid is distinct from auth.uid() or o.customer_id=auth.uid() then raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.order_scope_changes(order_id,scope,extra_minor,proposed_by) values(o.id,p_scope,p_extra_minor,auth.uid()) returning id into cid;
 else
  if o.customer_id is distinct from auth.uid() or p_accept is null then raise exception 'forbidden' using errcode='42501'; end if;
  update public.order_scope_changes set status=case when p_accept then 'accepted' else 'declined' end,decided_by=auth.uid(),decided_at=now() where id=p_change_id and order_id=o.id and status='proposed' returning id into cid;
  if cid is null then raise exception 'transition_forbidden' using errcode='42501'; end if;
 end if;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'order',o.id,'trust.scope.decision',jsonb_build_object('change_id',cid,'accepted',p_accept));
 -- No automatic charge; original paid order snapshots are immutable.
end $$;
create function fuwu_private.guard_pending_scope() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.service_completed_at is not null and old.service_completed_at is null and exists(select 1 from public.order_scope_changes where order_id=new.id and status='proposed') then raise exception 'scope_approval_required' using errcode='22023'; end if;
 return new;
end $$;
create trigger trust_pending_scope before update on public.orders for each row execute function fuwu_private.guard_pending_scope();
create function public.trust_save_document_type(p_type jsonb,p_reason text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 1000 or length(btrim(coalesce(p_type->>'label',''))) not between 3 and 120 then raise exception 'invalid_selection'; end if;
 insert into public.provider_document_types(code,label,purpose,retention_days,enabled) values(p_type->>'code',p_type->>'label',p_type->>'purpose',(p_type->>'retention_days')::integer,(p_type->>'enabled')::boolean)
 on conflict(code) do update set label=excluded.label,retention_days=excluded.retention_days,enabled=excluded.enabled;
 insert into public.audit_logs(actor_user_id,entity_type,action,metadata) values(auth.uid(),'document_type','trust.document_type.saved',jsonb_build_object('type',(select to_jsonb(t) from public.provider_document_types t where t.code=p_type->>'code'),'reason',p_reason));
end $$;
revoke all on function public.trust_scope_change(uuid,text,integer,uuid,boolean),public.trust_save_document_type(jsonb,text) from public,anon,authenticated;
grant execute on function public.trust_scope_change(uuid,text,integer,uuid,boolean),public.trust_save_document_type(jsonb,text) to authenticated;
create function public.trust_application_summaries(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if cardinality(p_ids)>500 then raise exception 'invalid_selection'; end if;
 return (select coalesce(jsonb_object_agg(a.id,case
 when exists(select 1 from public.provider_document_versions d where d.application_id=a.id and d.superseded_at is null and not exists(select 1 from storage.objects where bucket_id='provider-verification-documents' and name=d.storage_path)) then 'technical_error'
 when exists(select 1 from public.provider_document_versions where application_id=a.id and superseded_at is null and (status='resubmit' or expires_on<current_date)) then 'resubmit'
 when exists(select 1 from public.provider_document_versions where application_id=a.id and superseded_at is null and status='rejected') then 'rejected'
 when exists(select 1 from public.provider_document_versions where application_id=a.id and superseded_at is null and status='in_review') then 'in_review'
 when exists(select 1 from public.provider_document_versions where application_id=a.id and superseded_at is null and status='uploaded') then 'uploaded'
 when exists(select 1 from public.provider_document_versions where application_id=a.id and superseded_at is null and status='approved') then 'approved'
 when nullif(a.verification_document_path,'') is not null or nullif(a.verification_document_url,'') is not null then 'technical_error' else 'not_uploaded' end),'{}'::jsonb)
 from public.provider_applications a where a.id=any(p_ids));
end $$;
revoke all on function public.trust_application_summaries(uuid[]) from public,anon,authenticated;
grant execute on function public.trust_application_summaries(uuid[]) to authenticated;
revoke all on all functions in schema fuwu_private from public,anon,authenticated,service_role;
revoke all on function public.trust_attach_document(uuid,text,text,date),public.trust_review_document(uuid,integer,text,text),public.trust_application_file(uuid),public.trust_document_access(uuid),public.trust_save_rule(jsonb,text),public.trust_issue_service_code(uuid),public.trust_report_case(uuid,text,text),public.trust_resolve_case(uuid,text,text),public.trust_admin_queue() from public,anon,authenticated;
grant execute on function public.trust_attach_document(uuid,text,text,date),public.trust_review_document(uuid,integer,text,text),public.trust_application_file(uuid),public.trust_document_access(uuid),public.trust_save_rule(jsonb,text),public.trust_issue_service_code(uuid),public.trust_report_case(uuid,text,text),public.trust_resolve_case(uuid,text,text),public.trust_admin_queue() to authenticated;
notify pgrst,'reload schema';
commit;
