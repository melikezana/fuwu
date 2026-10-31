-- DDL observed read-only on 2026-10-31. No production rows or secrets.
-- Apply ONLY after the 46 recorded migrations in a disposable database.

create table public."app_settings" (
 "key" text not null,
 "value" text default ''::text not null,
 "updated_at" timestamp with time zone default now() not null
);
alter table public."app_settings" add constraint "app_settings_pkey" PRIMARY KEY (key);
alter table public."app_settings" enable row level security;

create table public."request_reassignment_log" (
 "id" uuid default gen_random_uuid() not null,
 "request_id" uuid not null,
 "previous_provider_id" uuid,
 "new_provider_id" uuid,
 "reason" text default 'sla_breach'::text not null,
 "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
 "is_dry_run" boolean default false not null,
 "metadata" jsonb default '{}'::jsonb not null
);
alter table public."request_reassignment_log" add constraint "request_reassignment_log_new_provider_id_fkey" FOREIGN KEY (new_provider_id) REFERENCES providers(id) ON DELETE SET NULL;
alter table public."request_reassignment_log" add constraint "request_reassignment_log_pkey" PRIMARY KEY (id);
alter table public."request_reassignment_log" add constraint "request_reassignment_log_previous_provider_id_fkey" FOREIGN KEY (previous_provider_id) REFERENCES providers(id) ON DELETE SET NULL;
alter table public."request_reassignment_log" add constraint "request_reassignment_log_reason_check" CHECK ((reason = ANY (ARRAY['sla_breach_dry_run'::text, 'no_eligible_provider_dry_run'::text, 'sla_breach_reassigned'::text, 'no_eligible_provider'::text, 'max_reassignment_limit_reached'::text])));
alter table public."request_reassignment_log" add constraint "request_reassignment_log_request_id_fkey" FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE;
alter table public."request_reassignment_log" enable row level security;

create table public."orders" (
 "id" uuid default gen_random_uuid() not null,
 "request_id" uuid not null,
 "customer_id" uuid not null,
 "provider_id" uuid not null,
 "amount" numeric(10,2) not null,
 "currency" text default 'TRY'::text not null,
 "commission_rate" numeric(5,4) not null,
 "commission_amount" numeric(10,2) not null,
 "provider_net_amount" numeric(10,2) not null,
 "status" text default 'PENDING_PAYMENT'::text not null,
 "paid_at" timestamp with time zone,
 "completed_at" timestamp with time zone,
 "approved_at" timestamp with time zone,
 "auto_approve_at" timestamp with time zone,
 "closed_at" timestamp with time zone,
 "cancelled_at" timestamp with time zone,
 "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
 "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public."orders" add constraint "orders_amount_check" CHECK ((amount >= (0)::numeric));
alter table public."orders" add constraint "orders_amount_split_check" CHECK (((commission_amount + provider_net_amount) <= (amount + 0.01)));
alter table public."orders" add constraint "orders_commission_amount_check" CHECK ((commission_amount >= (0)::numeric));
alter table public."orders" add constraint "orders_commission_rate_check" CHECK (((commission_rate >= (0)::numeric) AND (commission_rate <= (1)::numeric)));
alter table public."orders" add constraint "orders_currency_check" CHECK ((currency = 'TRY'::text));
alter table public."orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public."orders" add constraint "orders_pkey" PRIMARY KEY (id);
alter table public."orders" add constraint "orders_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;
alter table public."orders" add constraint "orders_provider_net_amount_check" CHECK ((provider_net_amount >= (0)::numeric));
alter table public."orders" add constraint "orders_request_id_fkey" FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE RESTRICT;
alter table public."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['PENDING_PAYMENT'::text, 'PAID'::text, 'IN_PROGRESS'::text, 'COMPLETED_PENDING_APPROVAL'::text, 'APPROVED'::text, 'CLOSED'::text, 'PAYMENT_FAILED'::text, 'CANCELLED'::text, 'DISPUTED'::text])));
alter table public."orders" enable row level security;

create table public."order_payments" (
 "id" uuid default gen_random_uuid() not null,
 "order_id" uuid not null,
 "iyzico_payment_id" text,
 "iyzico_conversation_id" text,
 "iyzico_token" text,
 "paid_price" numeric(10,2),
 "installment" integer default 1 not null,
 "card_last_four" text,
 "status" text default 'INITIATED'::text not null,
 "error_code" text,
 "error_message" text,
 "raw_response" jsonb default '{}'::jsonb not null,
 "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
 "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
 "iyzico_payment_transaction_id" text,
 "refund_id" text,
 "refunded_amount" numeric(10,2),
 "refunded_at" timestamp with time zone
);
alter table public."order_payments" add constraint "order_payments_installment_check" CHECK (((installment >= 1) AND (installment <= 12)));
alter table public."order_payments" add constraint "order_payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
alter table public."order_payments" add constraint "order_payments_paid_price_check" CHECK (((paid_price IS NULL) OR (paid_price >= (0)::numeric)));
alter table public."order_payments" add constraint "order_payments_pkey" PRIMARY KEY (id);
alter table public."order_payments" add constraint "order_payments_refunded_amount_check" CHECK (((refunded_amount IS NULL) OR (refunded_amount >= (0)::numeric)));
alter table public."order_payments" add constraint "order_payments_status_check" CHECK ((status = ANY (ARRAY['INITIATED'::text, 'SUCCESS'::text, 'FAILURE'::text, 'REFUNDED'::text, 'PARTIAL_REFUNDED'::text])));
alter table public."order_payments" enable row level security;

create table public."payouts" (
 "id" uuid default gen_random_uuid() not null,
 "order_id" uuid not null,
 "provider_id" uuid not null,
 "amount" numeric(10,2) not null,
 "currency" text default 'TRY'::text not null,
 "iyzico_transfer_id" text,
 "status" text default 'PENDING'::text not null,
 "failure_reason" text,
 "raw_response" jsonb default '{}'::jsonb not null,
 "initiated_at" timestamp with time zone,
 "completed_at" timestamp with time zone,
 "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
 "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public."payouts" add constraint "payouts_amount_check" CHECK ((amount >= (0)::numeric));
alter table public."payouts" add constraint "payouts_currency_check" CHECK ((currency = 'TRY'::text));
alter table public."payouts" add constraint "payouts_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;
alter table public."payouts" add constraint "payouts_pkey" PRIMARY KEY (id);
alter table public."payouts" add constraint "payouts_provider_id_fkey" FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;
alter table public."payouts" add constraint "payouts_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'PROCESSING'::text, 'COMPLETED'::text, 'FAILED'::text])));
alter table public."payouts" enable row level security;

create table public."disputes" (
 "id" uuid default gen_random_uuid() not null,
 "order_id" uuid not null,
 "opened_by" text not null,
 "opened_by_user_id" uuid,
 "reason" text not null,
 "status" text default 'OPEN'::text not null,
 "resolution_note" text,
 "resolved_by" uuid,
 "resolved_at" timestamp with time zone,
 "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
 "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public."disputes" add constraint "disputes_opened_by_check" CHECK ((opened_by = ANY (ARRAY['customer'::text, 'provider'::text, 'admin'::text])));
alter table public."disputes" add constraint "disputes_opened_by_user_id_fkey" FOREIGN KEY (opened_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."disputes" add constraint "disputes_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;
alter table public."disputes" add constraint "disputes_pkey" PRIMARY KEY (id);
alter table public."disputes" add constraint "disputes_reason_not_blank_check" CHECK ((btrim(reason) <> ''::text));
alter table public."disputes" add constraint "disputes_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."disputes" add constraint "disputes_status_check" CHECK ((status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text, 'RESOLVED_CUSTOMER'::text, 'RESOLVED_PROVIDER'::text, 'CLOSED'::text])));
alter table public."disputes" enable row level security;

create table public."webhook_events" (
 "id" uuid default gen_random_uuid() not null,
 "provider" text default 'iyzico'::text not null,
 "event_type" text not null,
 "external_event_id" text,
 "order_id" uuid,
 "payload" jsonb default '{}'::jsonb not null,
 "status" text default 'received'::text not null,
 "error" text,
 "processed_at" timestamp with time zone,
 "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public."webhook_events" add constraint "webhook_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
alter table public."webhook_events" add constraint "webhook_events_pkey" PRIMARY KEY (id);
alter table public."webhook_events" add constraint "webhook_events_status_check" CHECK ((status = ANY (ARRAY['received'::text, 'processed'::text, 'failed'::text, 'ignored'::text])));
alter table public."webhook_events" enable row level security;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_payout_preconditions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_status text;
  v_open_dispute integer;
begin
  select status into v_status
  from public.orders
  where id = new.order_id;

  if v_status is null then
    raise exception 'Payout icin order bulunamadi (order_id=%).', new.order_id;
  end if;

  if v_status <> 'APPROVED' then
    raise exception 'Payout yalnizca APPROVED order icin olusturulabilir (mevcut durum=%).', v_status;
  end if;

  select count(*) into v_open_dispute
  from public.disputes
  where order_id = new.order_id
    and status in ('OPEN', 'UNDER_REVIEW');

  if v_open_dispute > 0 then
    raise exception 'Acik dispute varken payout olusturulamaz (order_id=%).', new.order_id;
  end if;

  return new;
end;
$function$
;

CREATE TRIGGER disputes_set_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER order_payments_set_updated_at BEFORE UPDATE ON public.order_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payouts_enforce_preconditions BEFORE INSERT ON public.payouts FOR EACH ROW EXECUTE FUNCTION enforce_payout_preconditions();

CREATE TRIGGER payouts_set_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

create policy "app_settings_select_admin" on public."app_settings" as PERMISSIVE for SELECT to "authenticated" using (current_user_is_admin());

create policy "app_settings_write_admin" on public."app_settings" as PERMISSIVE for ALL to "authenticated" using (current_user_is_admin()) with check (current_user_is_admin());

create policy "disputes_insert_related" on public."disputes" as PERMISSIVE for INSERT to "authenticated" with check (((opened_by_user_id = auth.uid()) AND (status = 'OPEN'::text) AND (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = disputes.order_id) AND ((o.customer_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM providers p
          WHERE ((p.id = o.provider_id) AND (p.user_id = auth.uid()))))))))));

create policy "disputes_select_related" on public."disputes" as PERMISSIVE for SELECT to "authenticated" using ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = disputes.order_id) AND ((o.customer_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM providers p
          WHERE ((p.id = o.provider_id) AND (p.user_id = auth.uid()))))))))));

create policy "disputes_update_admin" on public."disputes" as PERMISSIVE for UPDATE to "authenticated" using (current_user_is_admin()) with check (current_user_is_admin());

create policy "order_payments_select_admin" on public."order_payments" as PERMISSIVE for SELECT to "authenticated" using (current_user_is_admin());

create policy "order_payments_select_customer" on public."order_payments" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_payments.order_id) AND (o.customer_id = auth.uid())))));

create policy "orders_select_admin" on public."orders" as PERMISSIVE for SELECT to "authenticated" using (current_user_is_admin());

create policy "orders_select_customer" on public."orders" as PERMISSIVE for SELECT to "authenticated" using ((customer_id = auth.uid()));

create policy "orders_select_provider" on public."orders" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM providers p
  WHERE ((p.id = orders.provider_id) AND (p.user_id = auth.uid())))));

create policy "orders_write_admin" on public."orders" as PERMISSIVE for ALL to "authenticated" using (current_user_is_admin()) with check (current_user_is_admin());

create policy "payouts_select_admin" on public."payouts" as PERMISSIVE for SELECT to "authenticated" using (current_user_is_admin());

create policy "payouts_select_provider" on public."payouts" as PERMISSIVE for SELECT to "authenticated" using ((EXISTS ( SELECT 1
   FROM providers p
  WHERE ((p.id = payouts.provider_id) AND (p.user_id = auth.uid())))));

create policy "request_reassignment_log_select_admin" on public."request_reassignment_log" as PERMISSIVE for SELECT to "authenticated" using (current_user_is_admin());

create policy "webhook_events_select_admin" on public."webhook_events" as PERMISSIVE for SELECT to "authenticated" using (current_user_is_admin());

grant all on public.orders,public.order_payments,public.payouts,public.disputes,public.webhook_events,public.app_settings,public.request_reassignment_log to service_role;
