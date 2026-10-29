-- Prepared locally only. Apply to isolated staging and review before production.
-- Editorial decisions live separately; no historical provider/review/order is rewritten.
begin;
create table public.provider_publication_reviews (
 provider_id uuid primary key references public.providers(id) on delete cascade,
 status text not null default 'pending_review' check(status in ('pending_review','approved','changes_requested','hidden')),
 fingerprint text not null,
 review_note text,
 verification_reference text,
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.provider_publication_reviews enable row level security;
revoke all on public.provider_publication_reviews from public,anon,authenticated;
grant all on public.provider_publication_reviews to service_role;

create function public.provider_content_fingerprint(p public.providers) returns text
language sql immutable set search_path='' as $$
 select md5(jsonb_build_array((p).name,(p).description,(p).category_id,(p).district_id,(p).experience_years,(p).profile_image_url,(p).is_verified,(p).identity_verified,(p).phone_verified)::text)
$$;
revoke all on function public.provider_content_fingerprint(public.providers) from public,anon,authenticated;

-- Backfill the separate queue only. Existing user content and financial state are preserved.
insert into public.provider_publication_reviews(provider_id,fingerprint)
select id,public.provider_content_fingerprint(p) from public.providers p;

create function public.queue_provider_publication() returns trigger language plpgsql security definer set search_path='' as $$
declare fp text:=public.provider_content_fingerprint(new);
begin
 if TG_OP='INSERT' or fp is distinct from public.provider_content_fingerprint(old) then
  insert into public.provider_publication_reviews(provider_id,fingerprint) values(new.id,fp)
  on conflict(provider_id) do update set status='pending_review',fingerprint=excluded.fingerprint,review_note=null,verification_reference=null,reviewed_by=null,reviewed_at=null,updated_at=now();
  insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
  values(auth.uid(),'provider',new.id,'provider.quality_queued',jsonb_build_object('reason','content_changed'));
 end if;
 return new;
end $$;
create trigger provider_publication_changed after insert or update on public.providers for each row execute function public.queue_provider_publication();
revoke all on function public.queue_provider_publication() from public,anon,authenticated;

create function public.provider_is_published(p_provider_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id
 where p.id=p_provider_id and p.is_active and p.is_approved and q.status='approved' and q.fingerprint=public.provider_content_fingerprint(p))
$$;
revoke all on function public.provider_is_published(uuid) from public,anon,authenticated;
grant execute on function public.provider_is_published(uuid) to anon,authenticated,service_role;
create policy provider_publication_gate on public.providers as restrictive for select to anon,authenticated
using(public.current_user_is_admin() or user_id=auth.uid() or public.provider_is_published(id));

create function public.provider_publication_gate() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'rating',r.rating,'review_count',r.count,
 'verified',p.is_verified and p.identity_verified and exists(select 1 from public.provider_applications a where a.id::text=q.verification_reference and a.user_id=p.user_id and a.status='approved' and nullif(btrim(a.verification_document_path),'') is not null),
 'identity_verified',p.identity_verified and exists(select 1 from public.provider_applications a where a.id::text=q.verification_reference and a.user_id=p.user_id and a.status='approved' and nullif(btrim(a.verification_document_path),'') is not null))), '[]'::jsonb)
 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id
 cross join lateral(select count(*) count,round(avg(rating),1) rating from public.reviews where provider_id=p.id) r
 where public.provider_is_published(p.id)
$$;
revoke all on function public.provider_publication_gate() from public,anon,authenticated;
grant execute on function public.provider_publication_gate() to anon,authenticated,service_role;

create function public.admin_provider_quality_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,
 'category_id',p.category_id,'district_id',p.district_id,'experience_years',p.experience_years,
 'is_verified',p.is_verified,'identity_verified',p.identity_verified,'rating',p.rating,'review_count',p.review_count,
 'actual_rating',r.rating,'actual_review_count',r.count,'status',q.status,'fingerprint',q.fingerprint,
 'review_note',q.review_note,'reviewed_at',q.reviewed_at) order by q.updated_at desc),'[]'::jsonb)
 from public.providers p join public.provider_publication_reviews q on q.provider_id=p.id
 cross join lateral(select count(*) count,round(avg(rating),1) rating from public.reviews where provider_id=p.id) r);
end $$;
revoke all on function public.admin_provider_quality_queue() from public,anon,authenticated;
grant execute on function public.admin_provider_quality_queue() to authenticated;

create function public.review_provider_publication(p_provider_id uuid,p_fingerprint text,p_status text,p_note text,p_verification_reference text default null)
returns void language plpgsql security definer set search_path='' as $$
declare p public.providers; q public.provider_publication_reviews;
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_status is null or p_status not in ('approved','changes_requested','hidden','pending_review') or p_note is null or length(btrim(p_note)) not between 10 and 1000
 or length(coalesce(p_verification_reference,''))>500 then raise exception 'invalid_review' using errcode='22023'; end if;
 select * into p from public.providers where id=p_provider_id for update;
 select * into q from public.provider_publication_reviews where provider_id=p_provider_id for update;
 if p.id is null or q.provider_id is null or q.fingerprint is distinct from p_fingerprint or p_fingerprint is distinct from public.provider_content_fingerprint(p)
 then raise exception 'profile_changed' using errcode='40001'; end if;
 if p_status='approved' and (length(btrim(coalesce(p.description,'')))<30 or p.category_id is null or p.district_id is null or not p.is_active or not p.is_approved)
 then raise exception 'profile_incomplete' using errcode='22023'; end if;
 if p_status='approved' and (p.is_verified or p.identity_verified) and not exists(select 1 from public.provider_applications a where a.id::text=btrim(p_verification_reference) and a.user_id=p.user_id and a.status='approved' and nullif(btrim(a.verification_document_path),'') is not null)
 then raise exception 'verification_evidence_required' using errcode='22023'; end if;
 update public.provider_publication_reviews set status=p_status,review_note=btrim(p_note),verification_reference=nullif(btrim(p_verification_reference),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where provider_id=p_provider_id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider',p_provider_id,'provider.publication_reviewed',jsonb_build_object('status',p_status,'fingerprint',p_fingerprint,'verification_evidence_present',nullif(btrim(p_verification_reference),'') is not null));
end $$;
revoke all on function public.review_provider_publication(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.review_provider_publication(uuid,text,text,text,text) to authenticated;

-- Preserve the existing commerce implementations and financial/security contracts.
alter function public.commerce_offers(uuid,uuid,uuid) rename to commerce_offers_before_publication;
revoke all on function public.commerce_offers_before_publication(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function public.commerce_offers(p_service_id uuid default null,p_district_id uuid default null,p_provider_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item),'[]'::jsonb) from jsonb_array_elements(public.commerce_offers_before_publication(p_service_id,p_district_id,p_provider_id)) item
 where public.provider_is_published((item->>'provider_id')::uuid)
$$;
revoke all on function public.commerce_offers(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.commerce_offers(uuid,uuid,uuid) to anon,authenticated,service_role;

alter function public.commerce_slots(uuid,date,uuid) rename to commerce_slots_before_publication;
revoke all on function public.commerce_slots_before_publication(uuid,date,uuid) from public,anon,authenticated,service_role;
create function public.commerce_slots(p_offering_id uuid,p_day date,p_district_id uuid) returns table(starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path='' as $$
 select s.* from public.commerce_slots_before_publication(p_offering_id,p_day,p_district_id) s
 where exists(select 1 from public.provider_service_offerings f where f.id=p_offering_id and public.provider_is_published(f.provider_id))
$$;
revoke all on function public.commerce_slots(uuid,date,uuid) from public,anon,authenticated;
grant execute on function public.commerce_slots(uuid,date,uuid) to anon,authenticated,service_role;

create function public.guard_unpublished_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.orders o where o.id=new.order_id and public.provider_is_published(o.provider_id))
 then raise exception 'offering_unavailable' using errcode='22023'; end if;
 return new;
end $$;
create trigger publication_checkout_guard before insert on public.payment_transactions for each row execute function public.guard_unpublished_checkout();
revoke all on function public.guard_unpublished_checkout() from public,anon,authenticated;
commit;
