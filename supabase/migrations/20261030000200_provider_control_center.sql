-- LOCAL/STAGING ONLY. Requires the ENTIRE preceding chain, including provenance.
begin;

create table public.admin_provider_action_receipts (
 request_id uuid primary key,
 actor_id uuid not null references public.profiles(id),
 provider_id uuid not null references public.providers(id),
 input_hash text not null,
 response jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.admin_provider_action_receipts enable row level security;
revoke all on public.admin_provider_action_receipts from public,anon,authenticated;
grant select on public.admin_provider_action_receipts to service_role;

create function public.provider_control_version(p public.providers,q public.provider_publication_reviews) returns text
language sql stable set search_path='' as $$
 select md5(jsonb_build_array(to_jsonb(p),to_jsonb(q))::text)
$$;
revoke all on function public.provider_control_version(public.providers,public.provider_publication_reviews) from public,anon,authenticated;

-- New paginated API. No user supplied SQL, unrestricted identifiers or full-dataset client filtering.
create function public.admin_provider_directory(p_search text default '',p_filter text default 'all',p_page integer default 1,p_size integer default 20,p_provider_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 50 or length(coalesce(p_search,''))>120
 or p_filter is null or p_filter not in ('all','pending','published','hidden','verification','test','incomplete') then raise exception 'invalid_directory' using errcode='22023'; end if;
 with records as (
  select p.id,p.name,c.name category,d.name district,p.phone,p.whatsapp,p.description,p.average_price_min,p.average_price_max,p.working_hours,p.availability,p.response_time_minutes,p.profile_image_url,
   p.is_active,p.is_approved,p.is_verified,p.identity_verified,p.phone_verified,p.updated_at,p.user_id,
   q.status,q.record_kind,q.fingerprint,q.review_note,q.reviewed_at,q.verification_reference,
   public.provider_is_published(p.id) published,public.provider_control_version(p,q) version,
   (select count(*) from public.provider_service_offerings f where f.provider_id=p.id and f.is_active) service_count,
   (select count(*) from public.provider_availability a where a.provider_id=p.id) calendar_days,
   (nullif(btrim(p.description),'') is null or length(btrim(p.description))<30 or p.category_id is null or p.district_id is null or nullif(btrim(p.phone),'') is null or nullif(btrim(p.profile_image_url),'') is null) incomplete
  from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id
  left join public.service_categories c on c.id=p.category_id left join public.districts d on d.id=p.district_id
  where (p_provider_id is null or p.id=p_provider_id) and (coalesce(p_search,'')='' or strpos(lower(concat_ws(' ',p.name,c.name,d.name)),lower(p_search))>0)
 ), filtered as (
  select * from records where p_filter='all'
   or (p_filter='pending' and status='pending_review') or (p_filter='published' and published)
   or (p_filter='hidden' and (status='hidden' or not is_approved))
   or (p_filter='verification' and (not identity_verified or not phone_verified))
   or (p_filter='test' and record_kind='test') or (p_filter='incomplete' and (incomplete or service_count=0 or calendar_days=0))
 ), page as (select * from filtered order by updated_at desc,id offset (p_page-1)*p_size limit p_size)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page) order by updated_at desc,id) from page),'[]'::jsonb),'total',(select count(*) from filtered),'page',p_page,'size',p_size) into result;
 return result;
end $$;
revoke all on function public.admin_provider_directory(text,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_provider_directory(text,text,integer,integer,uuid) to authenticated;

create function public.admin_provider_detail(p_provider_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object(
  'state',(select jsonb_build_object('version',public.provider_control_version(p,q),'published',public.provider_is_published(p.id),'status',q.status,'active',p.is_active,'approved',p.is_approved,'verified',p.is_verified) from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id where p.id=p_provider_id),
  'services',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',s.name,'price_minor',f.price_minor,'duration_minutes',f.duration_minutes,'active',f.is_active,'scope',coalesce(nullif(to_jsonb(f)->>'scope',''),s.scope))),'[]'::jsonb) from public.provider_service_offerings f join public.service_catalog s on s.id=f.service_id where f.provider_id=p_provider_id),
  'applications',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'status',a.status,'has_document',nullif(a.verification_document_path,'') is not null)),'[]'::jsonb) from public.provider_applications a join public.providers p on p.user_id=a.user_id where p.id=p_provider_id),
  'history',(select coalesce(jsonb_agg(h),'[]'::jsonb) from (select l.id,l.actor_user_id,l.action,l.created_at,l.metadata from public.audit_logs l where l.entity_type='provider' and l.entity_id=p_provider_id order by l.created_at desc,l.id limit 30) h));
end $$;
revoke all on function public.admin_provider_detail(uuid) from public,anon,authenticated;
grant execute on function public.admin_provider_detail(uuid) to authenticated;

create function public.admin_provider_action(p_provider_id uuid,p_action text,p_reason text,p_expected_version text,p_request_id uuid,p_fingerprint text default null,p_verification_reference text default null,p_record_kind text default null,p_details jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.providers; q public.provider_publication_reviews; receipt public.admin_provider_action_receipts; payload_hash text; result jsonb; before_state jsonb; before_content jsonb; rate jsonb;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_request_id is null or p_provider_id is null or p_expected_version is null or p_expected_version !~ '^[a-f0-9]{32}$'
 or p_action is null or p_action not in ('activate','deactivate','approve','unpublish','unverify','verify','approve_quality','changes_requested','pending_review','mark_test','mark_real','edit_profile')
 or p_reason is null or length(btrim(p_reason)) not between 10 and 1000 or length(coalesce(p_verification_reference,''))>500
 then raise exception 'invalid_action' using errcode='22023'; end if;
 payload_hash:=md5(jsonb_build_array(p_provider_id,p_action,btrim(p_reason),p_expected_version,p_fingerprint,p_verification_reference,p_record_kind,p_details)::text);
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into receipt from public.admin_provider_action_receipts where request_id=p_request_id;
 if found then
  if receipt.actor_id<>auth.uid() or receipt.input_hash<>payload_hash then raise exception 'idempotency_conflict' using errcode='22023'; end if;
  return receipt.response||jsonb_build_object('replayed',true);
 end if;
 rate:=public.consume_user_rate_limit('admin:provider.control',30,60000);
 if not coalesce((rate->>'allowed')::boolean,false) then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
 -- Lock order is identical to the existing review RPC: provider, then review.
 select * into p from public.providers where id=p_provider_id for update;
 select * into q from public.provider_publication_reviews where provider_id=p_provider_id for update;
 if p.id is null or q.provider_id is null then raise exception 'provider_not_found' using errcode='22023'; end if;
 if public.provider_control_version(p,q)<>p_expected_version then raise exception 'version_conflict' using errcode='40001'; end if;
 before_state:=jsonb_build_object('active',p.is_active,'approved',p.is_approved,'verified',p.is_verified,'status',q.status,'record_kind',q.record_kind);
 before_content:=jsonb_build_array(p.name,p.description,p.category_id,p.district_id,p.experience_years,p.profile_image_url);
 if p_action='unpublish' then
  -- Publication and account approval/activation are independent.
  update public.provider_publication_reviews set status='hidden',review_note=btrim(p_reason),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where provider_id=p.id;
 elsif p_action='mark_test' or p_action='mark_real' then
  update public.provider_publication_reviews set record_kind=case when p_action='mark_test' then 'test' else 'real' end,status=case when p_action='mark_test' then 'hidden' else 'pending_review' end,review_note=btrim(p_reason),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where provider_id=p.id;
 elsif p_action in ('approve_quality','changes_requested','pending_review') then
  perform public.review_provider_publication(p.id,p_fingerprint,case when p_action='approve_quality' then 'approved' else p_action end,p_reason,p_verification_reference,coalesce(p_record_kind,q.record_kind));
 elsif p_action='edit_profile' then
  if jsonb_typeof(p_details) is distinct from 'object' or length(btrim(coalesce(p_details->>'name',''))) not between 2 and 120
   or (p_details->>'availability') is null or (p_details->>'availability') not in ('müsait','yoğun','çevrimdışı')
   or (p_details->>'working_hours') is null or (p_details->>'working_hours') not in ('09:00-18:00','09:00-22:00','7/24')
   or coalesce((p_details->>'average_price_min')::integer,-1) not between 0 and 1000000
   or coalesce((p_details->>'average_price_max')::integer,-1) not between (p_details->>'average_price_min')::integer and 1000000
   or (nullif(p_details->>'response_time_minutes','') is not null and (p_details->>'response_time_minutes')::integer not between 1 and 1440)
   or jsonb_typeof(p_details->'is_verified') is distinct from 'boolean' or jsonb_typeof(p_details->'identity_verified') is distinct from 'boolean' or jsonb_typeof(p_details->'phone_verified') is distinct from 'boolean'
  then raise exception 'invalid_profile' using errcode='22023'; end if;
  if (((p_details->>'is_verified')::boolean and not p.is_verified) or ((p_details->>'identity_verified')::boolean and not p.identity_verified) or ((p_details->>'phone_verified')::boolean and not p.phone_verified))
   and not exists(select 1 from public.provider_applications a where a.id::text=p_verification_reference and a.user_id=p.user_id and a.status='approved' and nullif(btrim(a.verification_document_path),'') is not null and exists(select 1 from storage.objects o where o.bucket_id='provider-verification-documents' and o.name=a.verification_document_path))
  then raise exception 'verification_evidence_required' using errcode='22023'; end if;
  update public.providers set name=btrim(p_details->>'name'),average_price_min=(p_details->>'average_price_min')::integer,average_price_max=(p_details->>'average_price_max')::integer,
   availability=p_details->>'availability',working_hours=p_details->>'working_hours',response_time_minutes=nullif(p_details->>'response_time_minutes','')::integer,
   is_verified=(p_details->>'is_verified')::boolean,identity_verified=(p_details->>'identity_verified')::boolean,phone_verified=(p_details->>'phone_verified')::boolean where id=p.id;
 elsif p_action='verify' then
  if not exists(select 1 from public.provider_applications a where a.id::text=p_verification_reference and a.user_id=p.user_id and a.status='approved' and nullif(btrim(a.verification_document_path),'') is not null and exists(select 1 from storage.objects o where o.bucket_id='provider-verification-documents' and o.name=a.verification_document_path)) then raise exception 'verification_evidence_required' using errcode='22023'; end if;
  update public.providers set is_verified=true where id=p.id;
 else
  if p_action='approve' then update public.profiles set role='provider' where id=p.user_id and role='customer'; end if;
  update public.providers set
   is_active=case when p_action='activate' then true when p_action='deactivate' then false else is_active end,
   is_approved=case when p_action='approve' then true else is_approved end,
   is_verified=case when p_action='unverify' then false else is_verified end
  where id=p.id;
 end if;
 select * into p from public.providers where id=p_provider_id;
 -- Verification changes alone must not withdraw editorial publication approval.
 -- The content trigger updates the fingerprint; preserve the prior human decision
 -- only when every editorial field is unchanged. A document replacement still requeues.
 if p_action in ('verify','unverify','edit_profile') and before_content=jsonb_build_array(p.name,p.description,p.category_id,p.district_id,p.experience_years,p.profile_image_url) then
  update public.provider_publication_reviews set status=q.status,fingerprint=public.provider_content_fingerprint(p),review_note=q.review_note,
   verification_reference=case when p_action='unverify' then q.verification_reference else coalesce(nullif(p_verification_reference,''),q.verification_reference) end,reviewed_by=q.reviewed_by,reviewed_at=q.reviewed_at,updated_at=clock_timestamp()
  where provider_id=p.id;
 end if;
 select * into q from public.provider_publication_reviews where provider_id=p_provider_id;
 if p_action in ('unpublish','mark_test','deactivate') and public.provider_is_published(p.id) then raise exception 'publication_assertion_failed'; end if;
 result:=jsonb_build_object('ok',true,'provider_id',p.id,'action',p_action,'published',public.provider_is_published(p.id),'version',public.provider_control_version(p,q),'replayed',false);
 -- Failure of either insert rolls back the entire operation, including provider changes.
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider',p.id,'provider.control.'||p_action,jsonb_build_object('request_id',p_request_id,'reason',btrim(p_reason),'before',before_state,'after',jsonb_build_object('active',p.is_active,'approved',p.is_approved,'verified',p.is_verified,'status',q.status,'record_kind',q.record_kind)));
 insert into public.admin_provider_action_receipts(request_id,actor_id,provider_id,input_hash,response) values(p_request_id,auth.uid(),p.id,payload_hash,result);
 return result;
end $$;
revoke all on function public.admin_provider_action(uuid,text,text,text,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_provider_action(uuid,text,text,text,uuid,text,text,text,jsonb) to authenticated;

-- Owners see only their own publication/readiness; private document paths never leave this RPC.
create function public.provider_partner_readiness(p_provider_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.providers; q public.provider_publication_reviews;
begin
 select * into p from public.providers where id=p_provider_id;
 if auth.uid() is null or p.id is null or (p.user_id is distinct from auth.uid() and not public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 select * into q from public.provider_publication_reviews where provider_id=p.id;
 return jsonb_build_object('status',q.status,'published',public.provider_is_published(p.id),'record_kind',q.record_kind,'active',p.is_active,'approved',p.is_approved,
 'identity_verified',p.identity_verified,'phone_verified',p.phone_verified,'professional_verified',p.is_verified,
 'description',p.description,'phone',p.phone,'photo',p.profile_image_url,'category_id',p.category_id,'district_id',p.district_id,
 'service_count',(select count(*) from public.provider_service_offerings f where f.provider_id=p.id and f.is_active),
 'calendar_days',(select count(*) from public.provider_availability a where a.provider_id=p.id),
 'districts',(select coalesce(jsonb_agg(d.name order by d.name),'[]'::jsonb) from public.districts d where d.id in (select unnest(f.district_ids) from public.provider_service_offerings f where f.provider_id=p.id and f.is_active)),
 'has_document',exists(select 1 from public.provider_applications a where a.user_id=p.user_id and nullif(a.verification_document_path,'') is not null));
end $$;
revoke all on function public.provider_partner_readiness(uuid) from public,anon,authenticated;
grant execute on function public.provider_partner_readiness(uuid) to authenticated;
create function public.admin_control_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return public.admin_prelaunch_snapshot()||jsonb_build_object('active_categories',(select count(*) from public.service_categories where is_active),'pending_applications',(select count(*) from public.provider_applications where status='pending'),'review_required',(select count(*) from public.provider_publication_reviews where status in ('pending_review','changes_requested') or record_kind='unclassified'));
end $$;
revoke all on function public.admin_control_snapshot() from public,anon,authenticated;
grant execute on function public.admin_control_snapshot() to authenticated;
notify pgrst,'reload schema';
commit;
