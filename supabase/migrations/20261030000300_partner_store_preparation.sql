-- Additive partner preparation. Never enables checkout or touches historical orders.
begin;
alter table public.provider_service_offerings add column scope text not null default '' check(length(scope)<=2000);
alter function public.commerce_save_store(uuid,jsonb,jsonb,jsonb) rename to commerce_save_store_before_partner;
revoke all on function public.commerce_save_store_before_partner(uuid,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.commerce_save_store(p_provider_id uuid,p_offerings jsonb,p_hours jsonb,p_days_off jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.providers where id=p_provider_id and (user_id=auth.uid() or public.current_user_is_admin())) then raise exception 'forbidden' using errcode='42501'; end if;
 if jsonb_typeof(p_offerings) is distinct from 'array' or jsonb_typeof(p_hours) is distinct from 'array' or jsonb_typeof(p_days_off) is distinct from 'array' then raise exception 'invalid_store' using errcode='22023'; end if;
 perform public.commerce_save_store_before_partner(p_provider_id,p_offerings,p_hours,p_days_off);
 for item in select * from jsonb_array_elements(p_offerings) loop
  if length(coalesce(item->>'scope',''))>2000 then raise exception 'invalid_scope' using errcode='22023'; end if;
  update public.provider_service_offerings set scope=coalesce(item->>'scope','') where provider_id=p_provider_id and service_id=(item->>'service_id')::uuid and variant_id is not distinct from nullif(item->>'variant_id','')::uuid;
 end loop;
 update public.provider_publication_reviews set status='pending_review',review_note=null,reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp() where provider_id=p_provider_id;
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider',p_provider_id,'provider.store_updated',jsonb_build_object('publication_review_required',true));
end $$;
revoke all on function public.commerce_save_store(uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_save_store(uuid,jsonb,jsonb,jsonb) to authenticated;

-- Approved scope is shown and frozen into NEW orders only; historical snapshots stay intact.
create or replace function public.commerce_offers(p_service_id uuid default null,p_district_id uuid default null,p_provider_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item||jsonb_build_object('rating',null,'review_count',0,'scope',coalesce(nullif(f.scope,''),s.scope))),'[]'::jsonb)
 from jsonb_array_elements(public.commerce_offers_before_publication(p_service_id,p_district_id,p_provider_id)) item
 join public.provider_service_offerings f on f.id=(item->>'id')::uuid join public.service_catalog s on s.id=f.service_id
 where public.provider_is_published(f.provider_id)
$$;
create function public.commerce_snapshot_partner_scope() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select coalesce(nullif(f.scope,''),s.scope) into new.scope from public.provider_service_offerings f join public.service_catalog s on s.id=f.service_id where f.id=new.offering_id;
 return new;
end $$;
revoke all on function public.commerce_snapshot_partner_scope() from public,anon,authenticated;
create trigger partner_scope_snapshot before insert on public.orders for each row execute function public.commerce_snapshot_partner_scope();

create function public.partner_save_profile(p_provider_id uuid,p_name text,p_description text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.providers where id=p_provider_id and user_id=auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 120 or p_description is null or length(btrim(p_description)) not between 30 and 2000 then raise exception 'invalid_profile' using errcode='22023'; end if;
 update public.providers set name=btrim(p_name),description=btrim(p_description) where id=p_provider_id and user_id=auth.uid();
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider',p_provider_id,'provider.profile_prepared','{}');
end $$;
revoke all on function public.partner_save_profile(uuid,text,text) from public,anon,authenticated;
grant execute on function public.partner_save_profile(uuid,text,text) to authenticated;

create function public.partner_attach_document(p_application_id uuid,p_path text) returns void
language plpgsql security definer set search_path='' as $$
declare a public.provider_applications; pid uuid;
begin
 if auth.uid() is null then raise exception 'forbidden' using errcode='42501'; end if;
 -- Same lock order as publication review. A replacement always needs a new human review.
 select id into pid from public.providers where user_id=auth.uid() order by id limit 1 for update;
 select * into a from public.provider_applications where id=p_application_id and user_id=auth.uid() for update;
 if a.id is null or p_path is null or p_path not like auth.uid()::text||'/provider-applications/%' or not exists(select 1 from storage.objects where bucket_id='provider-verification-documents' and name=p_path) then raise exception 'forbidden' using errcode='42501'; end if;
 if a.verification_document_path is not distinct from p_path then return; end if;
 update public.provider_applications set verification_document_path=p_path,verification_document_url=null,status='pending' where id=a.id;
 update public.providers set identity_verified=false,is_verified=false where user_id=auth.uid();
 update public.provider_publication_reviews set status='pending_review',verification_reference=null,review_note=null,reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp() where provider_id in (select id from public.providers where user_id=auth.uid());
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata) values(auth.uid(),'provider_application',a.id,'provider.document_submitted',jsonb_build_object('review_required',true));
end $$;
revoke all on function public.partner_attach_document(uuid,text) from public,anon,authenticated;
grant execute on function public.partner_attach_document(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
