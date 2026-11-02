-- FUWU: tek fiyat (her şey dahil) gösterimi.
-- Müşteriye vitrinde ve kartlarda ödeyeceği son tutar gösterilir; ücret kırılımı yalnızca
-- sipariş snapshot'ında, muhasebe ve admin raporlarında tutulur. Mevcut tablolar,
-- fiyat snapshot'ları ve commerce_quote sözleşmesi değişmez. Idempotent.
begin;

create or replace function public.commerce_public_fee_rates()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'default_customer_fee_bps',
    coalesce(
      (select (replace(value, ',', '.')::numeric * 100)::integer
         from public.app_settings
        where key = 'customer_fee_rate'
          and value ~ '^[0-9]{1,3}([.,][0-9]{1,2})?$'),
      0
    ),
    'categories',
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', c.id, 'customer_fee_bps', c.customer_fee_bps))
         from public.service_categories c
        where c.customer_fee_bps is not null),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.commerce_public_fee_rates() from public, anon, authenticated;
grant execute on function public.commerce_public_fee_rates() to anon, authenticated;

-- Güven katmanı: e-Devlet barkodlu adli sicil kaydı belge türü. Kural (zorunluluk) admin
-- panelinden provider_document_rules ile bağlanır; burada yalnızca tür tanımlanır.
insert into public.provider_document_types(code, label, purpose, retention_days)
values ('criminal_record', 'Adli sicil kaydı (e-Devlet barkodlu, son 3 ay)', 'identity', 365)
on conflict (code) do nothing;

commit;
