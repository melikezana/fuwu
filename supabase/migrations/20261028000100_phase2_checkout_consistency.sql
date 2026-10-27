-- Apply to an isolated/staging database first. Reuses orders and payment_transactions.
begin;

-- Private processor identity, frozen when the one initializer is claimed.
-- Historical sessions remain NULL; their original amount/token/identity checks still apply.
alter table public.payment_transactions add column submerchant_key text;

create or replace function public.commerce_begin_payment(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders; t public.payment_transactions; p public.providers; n integer;
begin
 select * into p from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null or o.status<>'PENDING_PAYMENT' or o.expires_at<=clock_timestamp() then raise exception 'hold_expired'; end if;
 if p.id is null or not p.is_active or not p.is_approved or p.iyzico_submerchant_status<>'active' or nullif(btrim(p.iyzico_submerchant_key),'') is null then raise exception 'offering_unavailable'; end if;
 insert into public.payment_transactions(order_id,conversation_id,submerchant_key)
 values(o.id,'order-'||o.id,p.iyzico_submerchant_key) on conflict(order_id) do nothing;
 get diagnostics n=row_count;
 select * into t from public.payment_transactions where order_id=o.id;
 return to_jsonb(t)||jsonb_build_object('claimed',n=1);
end $$;

create or replace function public.commerce_resolve_payment(p_order_id uuid,p_token text,p_payment_id text,p_success boolean,p_fee_minor integer default null,p_item_transaction_id text default null)
returns text language plpgsql security definer set search_path='' as $$
declare o public.orders; t public.payment_transactions; next_status text;
begin
 -- Provider -> order -> transaction: same order as reservation and lifecycle RPCs.
 perform 1 from public.providers where id=(select provider_id from public.orders where id=p_order_id) for update;
 select * into o from public.orders where id=p_order_id for update;
 select * into t from public.payment_transactions where order_id=p_order_id for update;
 if t.id is null or p_token is null or t.checkout_token is distinct from p_token then raise exception 'payment_token_mismatch'; end if;
 if t.status='SUCCEEDED' then
   if p_success then
     if p_payment_id is distinct from t.payment_id or p_item_transaction_id is null or length(btrim(p_item_transaction_id))=0
       or (t.item_transaction_id is not null and t.item_transaction_id is distinct from p_item_transaction_id)
     then raise exception 'payment_identity_mismatch'; end if;
     if t.item_transaction_id is null then update public.payment_transactions set item_transaction_id=p_item_transaction_id,updated_at=clock_timestamp() where id=t.id; end if;
   end if;
   return o.status;
 end if;
 if p_success and nullif(btrim(p_item_transaction_id),'') is null then raise exception 'payment_item_missing'; end if;
 if p_success and nullif(btrim(p_payment_id),'') is null then raise exception 'payment_id_missing'; end if;
 update public.payment_transactions set status=case when p_success then 'SUCCEEDED' else 'FAILED' end,
   payment_id=coalesce(p_payment_id,payment_id),item_transaction_id=coalesce(p_item_transaction_id,item_transaction_id),updated_at=clock_timestamp() where id=t.id;
 if p_success then
   -- now() is the transaction start time and can be stale after waiting on a lock.
   -- A delayed payment never revives an expired or overlapping appointment.
   next_status:=case when o.status='PENDING_PAYMENT' and o.expires_at>clock_timestamp() and o.starts_at>clock_timestamp()
     and not exists(select 1 from public.orders other where other.id<>o.id and other.provider_id=o.provider_id
       and (other.status in ('CONFIRMED','PROVIDER_ON_THE_WAY','IN_PROGRESS','COMPLETED','DISPUTED') or (other.status='PENDING_PAYMENT' and other.expires_at>clock_timestamp()))
       and tstzrange(other.starts_at,other.ends_at,'[)') && tstzrange(o.starts_at,o.ends_at,'[)'))
     then 'CONFIRMED' else 'REFUND_PENDING' end;
   update public.orders set status=next_status,payment_status=case when next_status='CONFIRMED' then 'PAID' else 'REFUND_PENDING' end,
     processor_fee_minor=p_fee_minor,updated_at=clock_timestamp() where id=o.id;
 else
   if o.status='PENDING_PAYMENT' then update public.orders set status='PAYMENT_FAILED',payment_status='FAILED',updated_at=clock_timestamp() where id=o.id; end if;
 end if;
 return (select status from public.orders where id=o.id);
end $$;

-- CREATE OR REPLACE retains ACLs; state them explicitly for review and drift safety.
revoke all on function public.commerce_begin_payment(uuid), public.commerce_resolve_payment(uuid,text,text,boolean,integer,text) from public,anon,authenticated;
grant execute on function public.commerce_begin_payment(uuid), public.commerce_resolve_payment(uuid,text,text,boolean,integer,text) to service_role;
commit;
