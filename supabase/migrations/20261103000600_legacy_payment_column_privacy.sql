-- FUWU: eski ödeme tablolarında kolon gizliliği.
-- Bu koruma 20261031105613 dosyasına sonradan eklendi; o sürüm canlıda önceden uygulandığı için
-- `db push` eklenen kısmı hiç çalıştırmaz. Aynı koruma burada yeni bir sürümle uygulanır.
-- RLS satırı kısıtlar, kolonu kısıtlamaz: tablo genelindeki SELECT yetkisi, müşteriye ve ustaya
-- ödeme kuruluşu anahtarlarını ve ham yanıtları da açıyordu. Tarayıcı yalnızca özet kolonları okur.
-- Kolon listesi canlı şemadan okunur; olmayan bir kolon migration'ı durdurmaz.
-- Uygulama kodu bu tabloları tarayıcı istemcisiyle okumaz. Tekrar çalıştırmak güvenlidir.
begin;

do $$
declare
  t record;
  all_columns text;
  safe_columns text;
begin
  for t in
    select * from (values
      ('order_payments', array['id', 'order_id', 'paid_price', 'installment', 'card_last_four', 'status', 'created_at', 'updated_at', 'refunded_amount', 'refunded_at']),
      ('payouts', array['id', 'order_id', 'provider_id', 'amount', 'currency', 'status', 'initiated_at', 'completed_at', 'created_at', 'updated_at'])
    ) as v(table_name, safe)
  loop
    if to_regclass(format('public.%I', t.table_name)) is null then
      continue;
    end if;

    -- Tablo yetkisini ve eski onarımlardan kalmış bağımsız kolon yetkilerini birlikte kaldır.
    execute format('revoke select on public.%I from public, anon, authenticated', t.table_name);
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into all_columns
    from pg_attribute a
    where a.attrelid = format('public.%I', t.table_name)::regclass and a.attnum > 0 and not a.attisdropped;
    if all_columns is not null then
      execute format('revoke select (%s) on public.%I from public, anon, authenticated', all_columns, t.table_name);
    end if;

    -- Satır erişimi mevcut RLS politikalarıyla sınırlı kalır; yalnızca özet kolonlar okunabilir.
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into safe_columns
    from pg_attribute a
    where a.attrelid = format('public.%I', t.table_name)::regclass and a.attnum > 0 and not a.attisdropped
      and a.attname = any(t.safe);
    if safe_columns is not null then
      execute format('grant select (%s) on public.%I to authenticated', safe_columns, t.table_name);
    end if;
  end loop;
end
$$;

commit;
