-- Additive; validate on isolated PostgreSQL and hosted staging before production.
begin;

create table public.commerce_settlement_operations (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id),
 kind text not null check(kind in ('release','refund')),
 operation_reference text not null unique,
 state text not null check(state in ('IN_FLIGHT','MANUAL_REVIEW','VERIFIED','COMPLETED')),
 failure_class text check(failure_class in ('processor_timeout','processor_rejected','processor_unverified','processor_transport','persistence_failed','historical_in_flight')),
 request_id uuid,
 review_evidence_reference text check(length(review_evidence_reference) between 3 and 100),
 reviewed_by uuid references public.profiles(id),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(order_id,kind)
);
alter table public.commerce_settlement_operations enable row level security;
revoke all on public.commerce_settlement_operations from public,anon,authenticated;
grant all on public.commerce_settlement_operations to service_role;
-- Deliberately no direct browser SELECT: queue RPC returns only safe operational fields.
create index commerce_settlement_pending_idx on public.commerce_settlement_operations(created_at,id) where state<>'COMPLETED';
create index commerce_status_events_order_idx on public.order_status_events(order_id,created_at);
create index commerce_offerings_service_idx on public.provider_service_offerings(service_id);
create index commerce_offerings_variant_idx on public.provider_service_offerings(variant_id) where variant_id is not null;
create index commerce_reviews_provider_idx on public.reviews(provider_id,created_at desc);

-- Recheck sale eligibility at payment start while retaining the order's frozen price.
create or replace function public.commerce_begin_payment(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders; t public.payment_transactions; p public.providers; n integer;
begin
 select * into p from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null or o.status<>'PENDING_PAYMENT' or o.expires_at<=clock_timestamp() then raise exception 'hold_expired'; end if;
 if p.id is null or not p.is_active or not p.is_approved or p.iyzico_submerchant_status<>'active' or nullif(btrim(p.iyzico_submerchant_key),'') is null
   or not exists(select 1 from public.provider_service_offerings f join public.service_catalog s on s.id=f.service_id join public.service_categories c on c.id=s.category_id left join public.service_variants v on v.id=f.variant_id
     where f.id=o.offering_id and f.provider_id=o.provider_id and f.is_active and s.is_active and c.is_active and c.is_visible
       and ((s.pricing_type='VARIANT_BASED' and v.is_active and v.service_id=s.id) or (s.pricing_type<>'VARIANT_BASED' and f.variant_id is null)))
 then raise exception 'offering_unavailable'; end if;
 insert into public.payment_transactions(order_id,conversation_id,submerchant_key) values(o.id,'order-'||o.id,p.iyzico_submerchant_key) on conflict(order_id) do nothing;
 get diagnostics n=row_count;
 select * into t from public.payment_transactions where order_id=o.id;
 return to_jsonb(t)||jsonb_build_object('claimed',n=1);
end $$;

-- Existing uncertain claims remain blocked; never reset IN_FLIGHT to NONE.
insert into public.commerce_settlement_operations(order_id,kind,operation_reference,state,failure_class)
select t.order_id,k.kind,k.kind||'-'||t.order_id,'MANUAL_REVIEW','historical_in_flight'
from public.payment_transactions t cross join lateral (values ('release',t.payout_state),('refund',t.refund_state)) k(kind,state)
where k.state='IN_FLIGHT';

create function public.commerce_audit_settlement() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
 values(auth.uid(),'order',new.order_id,'commerce.settlement_'||lower(new.state),jsonb_build_object(
   'operation_reference',new.operation_reference,'kind',new.kind,'state',new.state,'failure_class',new.failure_class,'request_id',new.request_id));
 return new;
end $$;
create trigger commerce_settlement_audit after insert or update on public.commerce_settlement_operations for each row execute function public.commerce_audit_settlement();

create or replace function public.commerce_claim_settlement(p_order_id uuid,p_kind text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders; t public.payment_transactions; op public.commerce_settlement_operations;
begin
 if p_kind is null or p_kind not in ('release','refund') then raise exception 'invalid_settlement'; end if;
 select * into o from public.orders where id=p_order_id for update;
 select * into t from public.payment_transactions where order_id=p_order_id for update;
 select * into op from public.commerce_settlement_operations where order_id=p_order_id and kind=p_kind;
 if op.id is not null then return jsonb_build_object('claimed',false,'operation_reference',op.operation_reference,'state',op.state); end if;
 if t.status is distinct from 'SUCCEEDED' or nullif(btrim(t.item_transaction_id),'') is null then return jsonb_build_object('claimed',false); end if;
 if p_kind='release' and o.status='COMPLETED' and t.payout_state='NONE' and t.refund_state='NONE' then
   update public.payment_transactions set payout_state='IN_FLIGHT',updated_at=clock_timestamp() where id=t.id;
 elsif p_kind='refund' and o.status='REFUND_PENDING' and t.refund_state='NONE' and t.payout_state<>'IN_FLIGHT' then
   update public.payment_transactions set refund_state='IN_FLIGHT',updated_at=clock_timestamp() where id=t.id;
 else return jsonb_build_object('claimed',false); end if;
 insert into public.commerce_settlement_operations(order_id,kind,operation_reference,state)
 values(o.id,p_kind,p_kind||'-'||o.id,'IN_FLIGHT') returning * into op;
 return jsonb_build_object('claimed',true,'operation_reference',op.operation_reference,'item_transaction_id',t.item_transaction_id,'total_minor',o.total_minor);
end $$;

-- Service-only result recording. The application must verify the authenticated processor
-- response before passing VERIFIED. No token, bank payload or free-form error is persisted.
create function public.commerce_record_settlement_result(p_order_id uuid,p_kind text,p_operation_reference text,p_outcome text,p_failure_class text default null,p_request_id uuid default null,p_item_transaction_id text default null,p_conversation_id text default null,p_amount_minor integer default null,p_currency text default null)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; t public.payment_transactions; op public.commerce_settlement_operations;
begin
 select * into o from public.orders where id=p_order_id for update;
 select * into t from public.payment_transactions where order_id=p_order_id for update;
 select * into op from public.commerce_settlement_operations where order_id=p_order_id and kind=p_kind for update;
 if op.id is null or op.operation_reference is distinct from p_operation_reference then raise exception 'settlement_reference_mismatch'; end if;
 if p_outcome is null or p_outcome not in ('VERIFIED','MANUAL_REVIEW') then raise exception 'invalid_settlement_result'; end if;
 if p_outcome='VERIFIED' and (t.status is distinct from 'SUCCEEDED' or t.item_transaction_id is distinct from p_item_transaction_id
   or op.operation_reference is distinct from p_conversation_id
   or (p_kind='refund' and (p_amount_minor is distinct from o.total_minor or p_currency is distinct from 'TRY')))
 then raise exception 'settlement_verification_failed'; end if;
 if op.state='COMPLETED' or (op.state='VERIFIED' and p_outcome='MANUAL_REVIEW') then return; end if;
 update public.commerce_settlement_operations set state=p_outcome,failure_class=case when p_outcome='MANUAL_REVIEW' then p_failure_class end,request_id=p_request_id,updated_at=clock_timestamp() where id=op.id;
end $$;

create or replace function public.commerce_finish_settlement(p_order_id uuid,p_kind text) returns void
language plpgsql security definer set search_path='' as $$
declare op public.commerce_settlement_operations;
begin
 perform 1 from public.orders where id=p_order_id for update;
 perform 1 from public.payment_transactions where order_id=p_order_id for update;
 select * into op from public.commerce_settlement_operations where order_id=p_order_id and kind=p_kind for update;
 if op.state='COMPLETED' then return; end if;
 if op.id is null or op.state<>'VERIFIED' then raise exception 'settlement_not_verified'; end if;
 if p_kind='release' then
   update public.payment_transactions set payout_state='RELEASED',updated_at=clock_timestamp() where order_id=p_order_id and payout_state='IN_FLIGHT' and status='SUCCEEDED';
 elsif p_kind='refund' then
   update public.payment_transactions set refund_state='REFUNDED',updated_at=clock_timestamp() where order_id=p_order_id and refund_state='IN_FLIGHT' and status='SUCCEEDED';
 else raise exception 'invalid_settlement'; end if;
 if not found then raise exception 'settlement_state_conflict'; end if;
 if p_kind='refund' then
   update public.orders set status='REFUNDED',payment_status='REFUNDED',updated_at=clock_timestamp() where id=p_order_id and status='REFUND_PENDING';
   if not found then raise exception 'settlement_state_conflict'; end if;
 end if;
 update public.commerce_settlement_operations set state='COMPLETED',updated_at=clock_timestamp() where id=op.id;
end $$;

create function public.commerce_admin_settlement_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('order_id',order_id,'kind',kind,'operation_reference',operation_reference,'state',state,'failure_class',failure_class,'request_id',request_id,'created_at',created_at,'updated_at',updated_at,'review_evidence_reference',review_evidence_reference) order by created_at,id),'[]'::jsonb) from public.commerce_settlement_operations where state<>'COMPLETED');
end $$;
-- Human review records a support/processor evidence reference, NEVER grants payment success.
create function public.commerce_review_settlement(p_operation_reference text,p_evidence_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_evidence_reference is null or p_evidence_reference !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{2,99}$' then raise exception 'invalid_evidence_reference'; end if;
 update public.commerce_settlement_operations set review_evidence_reference=p_evidence_reference,reviewed_by=auth.uid(),updated_at=clock_timestamp() where operation_reference=p_operation_reference and state<>'COMPLETED';
 if not found then raise exception 'settlement_not_found'; end if;
end $$;

-- Freeze legacy checkout before any external initialization. Existing sessions stay attached.
alter table public.payments add column checkout_initialization_state text not null default 'NONE' check(checkout_initialization_state in ('NONE','IN_FLIGHT','ATTACHED'));
alter table public.payments add column iyzico_submerchant_key_snapshot text;
update public.payments set checkout_initialization_state='ATTACHED' where iyzico_checkout_token is not null or iyzico_conversation_id is not null;

create function public.commerce_audit_legacy_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.checkout_initialization_state in ('IN_FLIGHT','ATTACHED') and (TG_OP='INSERT' or old.checkout_initialization_state is distinct from new.checkout_initialization_state) then
   insert into public.audit_logs(actor_user_id,entity_type,entity_id,action,metadata)
   values(auth.uid(),'payment',new.id,'commerce.legacy_checkout_state',jsonb_build_object('operation_reference','request-'||new.request_id,'state',new.checkout_initialization_state));
 end if;
 return new;
end $$;
create trigger commerce_legacy_checkout_audit after insert or update of checkout_initialization_state on public.payments for each row execute function public.commerce_audit_legacy_checkout();
create index commerce_legacy_initializing_idx on public.payments(updated_at,id) where checkout_initialization_state='IN_FLIGHT';
create function public.commerce_admin_legacy_checkout_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.current_user_is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('payment_id',id,'operation_reference','request-'||request_id,'state',checkout_initialization_state,'updated_at',updated_at) order by updated_at,id),'[]'::jsonb) from public.payments where checkout_initialization_state='IN_FLIGHT');
end $$;
revoke all on function public.commerce_audit_legacy_checkout(),public.commerce_admin_legacy_checkout_queue() from public,anon,authenticated;
grant execute on function public.commerce_admin_legacy_checkout_queue() to authenticated;

-- Earlier legacy policies permitted a provider to INSERT a fabricated online payment,
-- and customers could read their checkout tokens with SELECT *. Keep offline flows,
-- but all online financial mutations must come from the verified server adapter.
create function public.commerce_guard_legacy_payment() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') then
   if to_jsonb(new)->>'payment_method'='iyzico'
     or (TG_OP='UPDATE' and to_jsonb(old)->>'payment_method'='iyzico')
     or nullif(to_jsonb(new)->>'iyzico_checkout_token','') is not null
     or nullif(to_jsonb(new)->>'iyzico_payment_id','') is not null
     or nullif(to_jsonb(new)->>'iyzico_payment_transaction_id','') is not null
     or nullif(to_jsonb(new)->>'iyzico_submerchant_key_snapshot','') is not null
     or new.status in ('escrow_held','escrow_released','escrow_refunded')
   then raise exception 'server_payment_only' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger commerce_legacy_payment_guard before insert or update on public.payments for each row execute function public.commerce_guard_legacy_payment();
revoke all on function public.commerce_guard_legacy_payment() from public,anon,authenticated;
revoke select on public.payments from public,anon,authenticated;
revoke select(iyzico_checkout_token,iyzico_submerchant_key_snapshot) on public.payments from public,anon,authenticated;
do $$ declare field text; begin
 for field in select column_name from information_schema.columns where table_schema='public' and table_name='payments' and column_name not in ('iyzico_checkout_token','iyzico_submerchant_key_snapshot')
 loop execute format('grant select(%I) on public.payments to authenticated',field); end loop;
end $$;

revoke all on function public.commerce_audit_settlement(),public.commerce_claim_settlement(uuid,text),public.commerce_finish_settlement(uuid,text),public.commerce_record_settlement_result(uuid,text,text,text,text,uuid,text,text,integer,text),public.commerce_admin_settlement_queue(),public.commerce_review_settlement(text,text) from public,anon,authenticated;
grant execute on function public.commerce_claim_settlement(uuid,text),public.commerce_finish_settlement(uuid,text),public.commerce_record_settlement_result(uuid,text,text,text,text,uuid,text,text,integer,text) to service_role;
grant execute on function public.commerce_admin_settlement_queue(),public.commerce_review_settlement(text,text) to authenticated;
commit;
