-- Additive local preparation. Apply to isolated staging before any production rollout.
-- No business data rewrites, payment switches, historical order updates or deletes.
begin;

-- Preserve the existing FK/index/realtime metadata contract; enumerate actual tables.
alter function public.backend_health_catalog() rename to backend_health_catalog_before_marketplace3;
revoke all on function public.backend_health_catalog_before_marketplace3() from public,anon,authenticated,service_role;
create function public.backend_health_catalog() returns jsonb
language sql stable security definer set search_path='' as $$
 select public.backend_health_catalog_before_marketplace3() || jsonb_build_object('tables',(
  select coalesce(jsonb_object_agg(c.relname,jsonb_build_object('exists',true,'rlsEnabled',c.relrowsecurity,'policies',(
   select coalesce(jsonb_agg(p.policyname order by p.policyname),'[]'::jsonb) from pg_catalog.pg_policies p where p.schemaname='public' and p.tablename=c.relname
  ))),'{}'::jsonb)
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
 ))
$$;
revoke all on function public.backend_health_catalog() from public,anon,authenticated;
grant execute on function public.backend_health_catalog() to service_role;

create or replace function public.admin_control_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare readiness jsonb; capacity jsonb;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 with real_providers as materialized (
  select p.*,q.status publication_status,public.provider_is_published(p.id) published,
   (nullif(btrim(p.name),'') is null or nullif(btrim(p.phone),'') is null or coalesce(length(btrim(p.description)),0)<30
    or nullif(btrim(p.profile_image_url),'') is null or p.category_id is null or p.district_id is null
    or not exists(select 1 from public.provider_service_offerings f join public.service_catalog s on s.id=f.service_id where f.provider_id=p.id and f.is_active and s.is_active and cardinality(f.district_ids)>0)
    or not exists(select 1 from public.provider_availability a where a.provider_id=p.id)) incomplete
  from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id
  where q.record_kind='real' and p.user_id is not null
   and p.id not in (select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,13) n)
 )
 select jsonb_build_object(
  'pending_real_applications',(select count(*) from public.provider_applications a where a.status='pending' and exists(select 1 from real_providers p where p.user_id=a.user_id)),
  'ready',count(*) filter(where not incomplete and is_active and is_approved and identity_verified and phone_verified and publication_status='pending_review' and not published),
  'incomplete',count(*) filter(where incomplete),
  'missing_verification',count(*) filter(where not identity_verified or not phone_verified)
 ) into readiness from real_providers;

 with published as materialized (
  select p.id,p.district_id,p.category_id,p.identity_verified,p.phone_verified from public.providers p where public.provider_is_published(p.id)
 ), coverage as materialized (
  select distinct p.id provider_id,d.id district_id,s.category_id
  from published p join public.provider_service_offerings f on f.provider_id=p.id and f.is_active
  join public.service_catalog s on s.id=f.service_id and s.is_active
  join public.districts d on d.id=any(f.district_ids) and d.is_active
 ), interests as (
  select district_id,category_id,count(*) total from public.launch_interest where withdrawn_at is null group by district_id,category_id
 )
 select coalesce(jsonb_agg(to_jsonb(row) order by row.district,row.category),'[]'::jsonb) into capacity from (
  select d.id district_id,d.name district,c.id category_id,c.name category,
   (select count(*) from public.provider_applications a where a.district_id=d.id and a.category_id=c.id and exists(select 1 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id where p.user_id=a.user_id and q.record_kind='real')) applications,
   (select count(*) from published p where (p.district_id=d.id and p.category_id=c.id) or exists(select 1 from coverage f where f.provider_id=p.id and f.district_id=d.id and f.category_id=c.id)) published,
   (select count(*) from published p where p.identity_verified and p.phone_verified and exists(select 1 from coverage f where f.provider_id=p.id and f.district_id=d.id and f.category_id=c.id)) verified,
   (select count(*) from coverage f where f.district_id=d.id and f.category_id=c.id) stores,
   (select count(*) from coverage f where f.district_id=d.id and f.category_id=c.id and exists(select 1 from public.provider_availability a where a.provider_id=f.provider_id)) calendars,
   coalesce(i.total,0) interest
  from public.districts d cross join public.service_categories c left join interests i on i.district_id=d.id and i.category_id=c.id
  where d.is_active and c.is_active
 ) row;
 return public.admin_prelaunch_snapshot() || jsonb_build_object('version',2,'readiness',readiness,'capacity',capacity,
  'active_categories',(select count(*) from public.service_categories where is_active),
  'pending_applications',(select count(*) from public.provider_applications where status='pending'),
  'review_required',(select count(*) from public.provider_publication_reviews where status in ('pending_review','changes_requested') or record_kind='unclassified'));
end $$;
revoke all on function public.admin_control_snapshot() from public,anon,authenticated;
grant execute on function public.admin_control_snapshot() to authenticated;

-- Application status is independent of profile readiness and publication.
alter function public.provider_partner_readiness(uuid) rename to provider_partner_readiness_before_marketplace3;
revoke all on function public.provider_partner_readiness_before_marketplace3(uuid) from public,anon,authenticated,service_role;
create function public.provider_partner_readiness(p_provider_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result := public.provider_partner_readiness_before_marketplace3(p_provider_id);
 return result || jsonb_build_object('application_status',(
  select a.status from public.provider_applications a join public.providers p on p.user_id=a.user_id
  where p.id=p_provider_id order by a.created_at desc,a.id limit 1
 ));
end $$;
revoke all on function public.provider_partner_readiness(uuid) from public,anon,authenticated;
grant execute on function public.provider_partner_readiness(uuid) to authenticated;
-- Independent mobile screens must not overwrite each other's stale form snapshots.
create function public.partner_save_services(p_provider_id uuid,p_offerings jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare p public.providers; hours jsonb; days_off jsonb;
begin
 select * into p from public.providers where id=p_provider_id for update;
 if auth.uid() is null or p.id is null or (p.user_id is distinct from auth.uid() and not public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 if not (public.consume_user_rate_limit('partner:services',20,60000)->>'allowed')::boolean then raise exception 'rate_limit' using errcode='P0001'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('weekday',a.weekday,'starts_at',a.starts_at,'ends_at',a.ends_at) order by a.weekday),'[]'::jsonb) into hours from public.provider_availability a where a.provider_id=p.id;
 select coalesce(jsonb_agg(d.day order by d.day),'[]'::jsonb) into days_off from public.provider_time_off d where d.provider_id=p.id;
 perform public.commerce_save_store(p.id,p_offerings,hours,days_off);
end $$;
revoke all on function public.partner_save_services(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.partner_save_services(uuid,jsonb) to authenticated;

create function public.partner_save_calendar(p_provider_id uuid,p_hours jsonb,p_days_off jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare p public.providers;
begin
 select * into p from public.providers where id=p_provider_id for update;
 if auth.uid() is null or p.id is null or (p.user_id is distinct from auth.uid() and not public.current_user_is_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 if jsonb_typeof(p_hours) is distinct from 'array' or jsonb_typeof(p_days_off) is distinct from 'array' or jsonb_array_length(p_hours)>7 or jsonb_array_length(p_days_off)>100 then raise exception 'invalid_hours' using errcode='22023'; end if;
 if not (public.consume_user_rate_limit('partner:calendar',20,60000)->>'allowed')::boolean then raise exception 'rate_limit' using errcode='P0001'; end if;
 delete from public.provider_availability where provider_id=p.id;
 insert into public.provider_availability(provider_id,weekday,starts_at,ends_at)
 select p.id,(h->>'weekday')::integer,(h->>'starts_at')::time,(h->>'ends_at')::time from jsonb_array_elements(p_hours) h;
 delete from public.provider_time_off where provider_id=p.id;
 insert into public.provider_time_off(provider_id,day) select p.id,d::date from jsonb_array_elements_text(p_days_off) d;
 update public.provider_publication_reviews set status='pending_review',review_note=null,reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp() where provider_id=p.id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider',p.id,'provider.calendar_updated',jsonb_build_object('publication_review_required',true));
end $$;
revoke all on function public.partner_save_calendar(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.partner_save_calendar(uuid,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
