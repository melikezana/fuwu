-- Keep one-review-per-service invariant even after an admin moderation deletion.
-- Existing source-less historical reviews are not guessed or altered.
begin;
create table public.review_submission_receipts (
 id uuid primary key default gen_random_uuid(),
 order_id uuid unique references public.orders(id),
 service_request_id uuid unique references public.service_requests(id),
 user_id uuid not null references public.profiles(id),
 provider_id uuid not null references public.providers(id),
 submitted_at timestamptz not null default now(),
 check(num_nonnulls(order_id,service_request_id)=1)
);
alter table public.review_submission_receipts enable row level security;
create policy review_receipt_admin_read on public.review_submission_receipts for select to authenticated using(public.current_user_is_admin());
grant select on public.review_submission_receipts to authenticated;
grant all on public.review_submission_receipts to service_role;
insert into public.review_submission_receipts(order_id,service_request_id,user_id,provider_id,submitted_at)
 select order_id,service_request_id,user_id,provider_id,created_at from public.reviews where num_nonnulls(order_id,service_request_id)=1;
create function public.record_review_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if num_nonnulls(new.order_id,new.service_request_id)=1 then
   insert into public.review_submission_receipts(order_id,service_request_id,user_id,provider_id) values(new.order_id,new.service_request_id,new.user_id,new.provider_id);
 end if;
 return new;
end $$;
create trigger phase3_review_receipt before insert on public.reviews for each row execute function public.record_review_receipt();
revoke all on function public.record_review_receipt() from public,anon,authenticated;
create or replace function public.review_eligible_sources(p_provider_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'id',id,'label',label,'completedAt',completed_at) order by completed_at desc),'[]'::jsonb)
 from (
   select 'order' kind,o.id,o.service_name label,
     coalesce((select min(e.created_at) from public.order_status_events e where e.order_id=o.id and e.status='COMPLETED'),o.updated_at) completed_at
   from public.orders o where o.provider_id=p_provider_id and o.customer_id=auth.uid() and o.status='COMPLETED'
     and o.payment_status='PAID' and not exists(select 1 from public.review_submission_receipts r where r.order_id=o.id)
   union all
   select 'request',s.id,'Önceki hizmet talebi',s.updated_at
   from public.service_requests s where s.assigned_provider_id=p_provider_id and s.user_id=auth.uid() and s.status='completed'
     and not exists(select 1 from public.review_submission_receipts r where r.service_request_id=s.id)
 ) sources
 where auth.uid() is not null
 and exists(select 1 from public.providers p where p.id=p_provider_id and p.user_id is distinct from auth.uid())
 and not exists(select 1 from public.reviews r where r.provider_id=p_provider_id and r.user_id=auth.uid()
   and r.order_id is null and r.service_request_id is null and (sources.kind='request' or r.created_at>=sources.completed_at))
$$;

create or replace function public.submit_service_review(p_provider_id uuid,p_order_id uuid,p_request_id uuid,p_rating smallint,p_comment text) returns uuid
language plpgsql security definer set search_path='' as $$
declare rid uuid; source_id uuid:=coalesce(p_order_id,p_request_id); source_kind text:=case when p_order_id is not null then 'order' else 'request' end;
begin
 if auth.uid() is null then raise exception 'review-not-eligible' using errcode='42501'; end if;
 if num_nonnulls(p_order_id,p_request_id)<>1 or p_rating is null or p_rating not between 1 and 5
 or p_comment is null or length(btrim(p_comment)) not between 10 and 1000 then raise exception 'invalid_review' using errcode='22023'; end if;
 -- All review writers serialize on the same provider, including aggregate refresh.
 perform 1 from public.providers where id=p_provider_id for update;
 if not exists(select 1 from jsonb_array_elements(public.review_eligible_sources(p_provider_id)) s where s->>'id'=source_id::text and s->>'kind'=source_kind)
 then
   if exists(select 1 from public.review_submission_receipts where user_id=auth.uid() and (order_id=p_order_id or service_request_id=p_request_id))
   then raise exception 'review-already-submitted' using errcode='23505'; end if;
   raise exception 'review-not-eligible' using errcode='42501';
 end if;
 -- Recheck/lock the source to exclude a concurrent dispute or refund transition.
 if p_order_id is not null then
   perform 1 from public.orders where id=p_order_id and customer_id=auth.uid() and provider_id=p_provider_id and status='COMPLETED' and payment_status='PAID' for update;
 else
   perform 1 from public.service_requests where id=p_request_id and user_id=auth.uid() and assigned_provider_id=p_provider_id and status='completed' for update;
 end if;
 if not found then raise exception 'review-not-eligible' using errcode='42501'; end if;
 insert into public.reviews(provider_id,user_id,order_id,service_request_id,rating,comment)
 values(p_provider_id,auth.uid(),p_order_id,p_request_id,p_rating,btrim(p_comment)) returning id into rid;
 return rid;
end $$;


commit;
