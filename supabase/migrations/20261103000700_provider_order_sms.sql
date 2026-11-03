-- FUWU: ödemesi doğrulanan siparişte ustaya giden "yeni randevu" SMS'inin tek seferlik kaydı.
-- Ödeme dönüşü ve iyzico bildirimi aynı anda gelse bile birincil anahtar ikinci SMS'i engeller.
-- Yalnızca sunucu (service_role) erişir; tarayıcıya kapalıdır. Kişisel veri tutmaz. Tekrar çalıştırmak güvenlidir.
begin;

create table if not exists public.order_sms_dispatches (
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  event text not null check (event in ('provider_new_order')),
  created_at timestamptz not null default now(),
  primary key (order_id, event)
);

alter table public.order_sms_dispatches enable row level security;
revoke all on public.order_sms_dispatches from public, anon, authenticated;
grant select, insert, delete on public.order_sms_dispatches to service_role;

comment on table public.order_sms_dispatches is 'Ustaya giden yeni randevu SMS''inin tek seferlik kaydı (yalnızca sunucu).';

commit;
