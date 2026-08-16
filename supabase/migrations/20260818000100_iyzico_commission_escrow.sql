-- iyzico marketplace onboarding, commission and escrow tracking.

alter table public.providers
  add column if not exists payout_iban text,
  add column if not exists tax_identity_number text,
  add column if not exists tax_office text,
  add column if not exists legal_name text,
  add column if not exists payout_address text,
  add column if not exists iyzico_submerchant_key text,
  add column if not exists iyzico_submerchant_status text not null default 'missing',
  add column if not exists iyzico_submerchant_conversation_id text;

alter table public.providers
  drop constraint if exists providers_iyzico_submerchant_status_check;

alter table public.providers
  add constraint providers_iyzico_submerchant_status_check
  check (iyzico_submerchant_status in ('missing', 'pending_review', 'active', 'rejected'));

create index if not exists providers_iyzico_submerchant_status_idx
  on public.providers (iyzico_submerchant_status);

create unique index if not exists providers_iyzico_submerchant_key_unique_idx
  on public.providers (iyzico_submerchant_key)
  where iyzico_submerchant_key is not null;

alter table public.service_requests
  drop constraint if exists service_requests_payment_preference_check;

alter table public.service_requests
  add constraint service_requests_payment_preference_check
  check (payment_preference is null or payment_preference in ('cash', 'iban', 'online_soon', 'iyzico'));

alter table public.service_requests
  drop constraint if exists service_requests_payment_method_check;

alter table public.service_requests
  add constraint service_requests_payment_method_check
  check (payment_method is null or payment_method in ('cash', 'iban', 'online_soon', 'iyzico'));

alter table public.payments
  add column if not exists commission_rate numeric(5, 4),
  add column if not exists commission_amount numeric(10, 2),
  add column if not exists provider_payout_amount numeric(10, 2),
  add column if not exists iyzico_conversation_id text,
  add column if not exists iyzico_checkout_token text,
  add column if not exists iyzico_payment_id text,
  add column if not exists iyzico_payment_transaction_id text,
  add column if not exists escrow_held_at timestamptz,
  add column if not exists escrow_released_at timestamptz,
  add column if not exists escrow_released_by uuid references public.profiles(id) on delete set null,
  add column if not exists escrow_failed_at timestamptz,
  add column if not exists escrow_refunded_at timestamptz,
  add column if not exists refund_id text;

alter table public.payments
  drop constraint if exists payments_payment_method_check;

alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('cash', 'iban', 'online_soon', 'iyzico'));

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status in (
      'pending_confirmation',
      'confirmed',
      'escrow_held',
      'escrow_released',
      'escrow_failed',
      'escrow_refunded'
    )
  );

alter table public.payments
  drop constraint if exists payments_commission_rate_check;

alter table public.payments
  add constraint payments_commission_rate_check
  check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 1));

alter table public.payments
  drop constraint if exists payments_commission_amount_check;

alter table public.payments
  add constraint payments_commission_amount_check
  check (commission_amount is null or commission_amount >= 0);

alter table public.payments
  drop constraint if exists payments_provider_payout_amount_check;

alter table public.payments
  add constraint payments_provider_payout_amount_check
  check (provider_payout_amount is null or provider_payout_amount >= 0);

create index if not exists payments_iyzico_conversation_id_idx
  on public.payments (iyzico_conversation_id);

create unique index if not exists payments_iyzico_payment_id_unique_idx
  on public.payments (iyzico_payment_id)
  where iyzico_payment_id is not null;

create index if not exists payments_iyzico_payment_transaction_id_idx
  on public.payments (iyzico_payment_transaction_id);

grant update (
  confirmed_at,
  confirmed_by,
  status,
  updated_at,
  escrow_released_at,
  escrow_released_by
)
on table public.payments
to authenticated;

insert into public.app_settings (key, value)
values ('commission_rate', '0.10')
on conflict (key) do nothing;
