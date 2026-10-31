-- Observed production metadata only; no rows, credentials or production writes.
-- PK indexes are already created by the exact table constraints in the overlay.
CREATE INDEX disputes_order_id_idx ON public.disputes USING btree (order_id);
CREATE UNIQUE INDEX disputes_order_id_open_unique_idx ON public.disputes USING btree (order_id) WHERE (status = ANY (ARRAY['OPEN'::text, 'UNDER_REVIEW'::text]));
CREATE INDEX disputes_status_idx ON public.disputes USING btree (status);
CREATE UNIQUE INDEX order_payments_conversation_id_unique_idx ON public.order_payments USING btree (iyzico_conversation_id) WHERE (iyzico_conversation_id IS NOT NULL);
CREATE UNIQUE INDEX order_payments_iyzico_payment_id_unique_idx ON public.order_payments USING btree (iyzico_payment_id) WHERE (iyzico_payment_id IS NOT NULL);
CREATE INDEX order_payments_order_id_idx ON public.order_payments USING btree (order_id);
CREATE INDEX order_payments_payment_transaction_id_idx ON public.order_payments USING btree (iyzico_payment_transaction_id) WHERE (iyzico_payment_transaction_id IS NOT NULL);
CREATE INDEX order_payments_status_idx ON public.order_payments USING btree (status);
CREATE INDEX orders_auto_approve_at_idx ON public.orders USING btree (auto_approve_at) WHERE (status = 'COMPLETED_PENDING_APPROVAL'::text);
CREATE INDEX orders_created_at_idx ON public.orders USING btree (created_at DESC);
CREATE INDEX orders_customer_id_idx ON public.orders USING btree (customer_id);
CREATE INDEX orders_provider_id_idx ON public.orders USING btree (provider_id);
CREATE UNIQUE INDEX orders_request_id_active_unique_idx ON public.orders USING btree (request_id) WHERE (status <> ALL (ARRAY['CANCELLED'::text, 'PAYMENT_FAILED'::text]));
CREATE INDEX orders_status_idx ON public.orders USING btree (status);
CREATE UNIQUE INDEX payouts_iyzico_transfer_id_unique_idx ON public.payouts USING btree (iyzico_transfer_id) WHERE (iyzico_transfer_id IS NOT NULL);
CREATE UNIQUE INDEX payouts_order_id_active_unique_idx ON public.payouts USING btree (order_id) WHERE (status <> 'FAILED'::text);
CREATE INDEX payouts_provider_id_idx ON public.payouts USING btree (provider_id);
CREATE INDEX payouts_status_idx ON public.payouts USING btree (status);
CREATE INDEX request_reassignment_log_created_idx ON public.request_reassignment_log USING btree (created_at DESC);
CREATE INDEX request_reassignment_log_new_provider_idx ON public.request_reassignment_log USING btree (new_provider_id) WHERE (new_provider_id IS NOT NULL);
CREATE INDEX request_reassignment_log_request_created_idx ON public.request_reassignment_log USING btree (request_id, created_at DESC);
CREATE INDEX request_reassignment_log_request_idx ON public.request_reassignment_log USING btree (request_id, created_at DESC);
CREATE INDEX webhook_events_created_at_idx ON public.webhook_events USING btree (created_at DESC);
CREATE INDEX webhook_events_order_id_idx ON public.webhook_events USING btree (order_id);
CREATE UNIQUE INDEX webhook_events_provider_external_unique_idx ON public.webhook_events USING btree (provider, external_event_id) WHERE (external_event_id IS NOT NULL);
CREATE INDEX webhook_events_status_idx ON public.webhook_events USING btree (status);
