-- 9 Kasım 2026 CEO & CTO denetimi · Güvenlik ve performans bulguları (P1).
-- Yalnızca yetki, politika ve indeks düzeyinde çalışır: hiçbir satır, kolon, fonksiyon gövdesi
-- veya mevcut politika kuralı değiştirilmez. Yeniden çalıştırılabilir (idempotent).
-- Üretime uygulamadan önce staging/izole ortamda doğrulanmalıdır.
-- Eski sipariş/ödeme tabloları (orders, order_payments, payouts, disputes, webhook_events) korunan geçmiş
-- kayıtlardır; indeks ve politika setleri bilinçli olarak değiştirilmez.
begin;

-- 1) SECURITY DEFINER yüzeyi: API rollerinin ihtiyaç duymadığı EXECUTE yetkileri kaldırılır.
--    handle_new_user() yalnızca auth.users tetikleyicisidir; tetikleyici çalışması EXECUTE yetkisi gerektirmez.
--    *_unchanged yardımcıları yalnızca "authenticated" UPDATE politikalarında kullanılır; anonim rolün çağırmasına gerek yoktur.
--    Bir yardımcı, anonim/public role uygulanan bir politikada kullanılıyorsa (şema sapması) yetkisi korunur.
do $$
declare fn regprocedure; helper text;
begin
 if to_regprocedure('public.handle_new_user()') is not null then
  revoke all on function public.handle_new_user() from public, anon, authenticated;
 end if;
 foreach helper in array array[
  'public.profile_role_is_unchanged(uuid,text)',
  'public.service_request_assignment_fields_are_unchanged(uuid,uuid,uuid)',
  'public.provider_owner_protected_fields_are_unchanged(uuid,uuid,uuid,uuid,text,numeric,numeric,numeric,boolean,boolean,boolean,boolean,boolean)'
 ] loop
  fn := to_regprocedure(helper);
  continue when fn is null;
  if exists(
   select 1 from pg_catalog.pg_policy pol
   where (coalesce(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), '') || coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), ''))
         like '%' || (select proname from pg_catalog.pg_proc where oid = fn) || '(%'
     and (pol.polroles operator(pg_catalog.@>) array[0::oid]
          or pol.polroles operator(pg_catalog.@>) array[(select oid from pg_catalog.pg_roles where rolname = 'anon')])
  ) then
   raise notice 'audit_advisor_hardening: % anonim politika tarafından kullanılıyor, yetki korunuyor', helper;
  else
   execute format('revoke all on function %s from public, anon', fn);
   execute format('grant execute on function %s to authenticated, service_role', fn);
  end if;
 end loop;
end $$;

-- 2) RLS etkin ama politikası olmayan yalnızca-sunucu tabloları.
--    Bu tablolara erişim bilinçli olarak yalnızca service_role ve SECURITY DEFINER RPC'ler üzerinden yapılır.
--    Kısıtlayıcı (restrictive) "false" politikası mevcut davranışı (API rollerine tam ret) açık ve belgeli hâle getirir;
--    izin veren hiçbir politika eklenmediği için erişim genişlemez.
do $$
declare t text;
begin
 foreach t in array array[
  'admin_provider_action_receipts','commerce_settlement_operations','launch_interest_consent_events',
  'order_sms_dispatches','provider_document_uploads','provider_document_versions','provider_publication_reviews'
 ] loop
  continue when to_regclass('public.' || t) is null;
  continue when exists(select 1 from pg_catalog.pg_policy where polrelid = to_regclass('public.' || t));
  execute format('create policy %I on public.%I as restrictive for all to anon, authenticated using (false) with check (false)', t || '_server_only', t);
  execute format('comment on policy %I on public.%I is %L', t || '_server_only', t,
   'Yalnızca sunucu: erişim service_role ve yetki kontrollü SECURITY DEFINER RPC''ler üzerinden. API rolleri için bilinçli tam ret.');
 end loop;
end $$;

-- 3) Yinelenen indeksler: aynı tabloda kolon, sıra, operatör sınıfı ve koşulu birebir aynı olan bir eşi
--    varken kopya kaldırılır. Eş bulunamazsa ya da tanımlar farklıysa hiçbir şey silinmez.
--    request_reassignment_log_request_idx yalnızca üretimde gözlenen, migration dışı kopyadır.
do $$
declare pair text[];
begin
 foreach pair slice 1 in array array[
  array['districts_city_name_idx','districts_city_name_unique'],
  array['payments_request_id_idx','payments_request_id_unique'],
  array['commerce_reviews_provider_idx','reviews_provider_created_at_idx'],
  array['request_reassignment_log_request_idx','request_reassignment_log_request_created_idx']
 ] loop
  if exists(
   select 1 from pg_catalog.pg_index d join pg_catalog.pg_index k
     on k.indrelid = d.indrelid and k.indkey = d.indkey and k.indclass = d.indclass and k.indoption = d.indoption
    and coalesce(pg_catalog.pg_get_expr(k.indexprs, k.indrelid), '') = coalesce(pg_catalog.pg_get_expr(d.indexprs, d.indrelid), '')
    and coalesce(pg_catalog.pg_get_expr(k.indpred, k.indrelid), '') = coalesce(pg_catalog.pg_get_expr(d.indpred, d.indrelid), '')
   where d.indexrelid = to_regclass('public.' || pair[1]) and k.indexrelid = to_regclass('public.' || pair[2])
     and not d.indisunique and not d.indisprimary
  ) then
   execute format('drop index public.%I', pair[1]);
  end if;
 end loop;
end $$;

-- 4) İndeksi olmayan yabancı anahtarlar. Üretimdeki olası şema sapmasını da kapsamak için katalogdan okunur;
--    yalnızca FK kolonlarıyla başlayan tam (kısmi olmayan) indeksi bulunmayan kısıtlar için indeks oluşturulur.
do $$
declare fk record; index_name text;
begin
 for fk in
  select c.conrelid::regclass as tbl, cl.relname,
         (select string_agg(quote_ident(a.attname), ',' order by k.ord)
            from unnest(c.conkey) with ordinality k(att, ord)
            join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.att) as cols,
         (select string_agg(a.attname, '_' order by k.ord)
            from unnest(c.conkey) with ordinality k(att, ord)
            join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.att) as col_names
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class cl on cl.oid = c.conrelid
  where c.contype = 'f' and c.connamespace = 'public'::regnamespace and cl.relkind = 'r'
    and cl.relname <> all(array['orders','order_payments','payouts','disputes','webhook_events'])
    and not exists(
     select 1 from pg_catalog.pg_index i
     where i.indrelid = c.conrelid and i.indpred is null and i.indisvalid
       and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] operator(pg_catalog.@>) c.conkey)
  order by cl.relname, c.conname
 loop
  index_name := left(fk.relname || '_' || fk.col_names, 55) || '_fk_idx';
  continue when to_regclass('public.' || quote_ident(index_name)) is not null;
  execute format('create index %I on %s (%s)', index_name, fk.tbl, fk.cols);
 end loop;
end $$;

-- 5) RLS initplan: politikalardaki auth.uid()/auth.role()/auth.jwt()/auth.email() çağrıları satır başına
--    yeniden hesaplanmasın diye (select ...) içine alınır. Kural, roller ve komut aynı kalır; yalnızca
--    değerlendirme sayısı düşer. İfade katalogdan okunur ve değişmeden geri yazılır.
do $$
declare pol record; new_qual text; new_check text; pattern constant text := '(?<!SELECT )auth\.(uid|role|jwt|email)\(\)';
        legacy constant text[] := array['orders','order_payments','payouts','disputes','webhook_events'];
        before_count integer; after_count integer; previous_path text := current_setting('search_path');
begin
 -- Boş search_path, ifadelerin şema adlarıyla tam nitelikli okunmasını sağlar; blok sonunda geri yüklenir.
 perform set_config('search_path', '', true);
 select count(*) into before_count from pg_catalog.pg_policies where schemaname = 'public';
 for pol in
  select schemaname, tablename, policyname, qual, with_check
  from pg_catalog.pg_policies
  where schemaname = 'public' and tablename <> all(legacy) and (coalesce(qual, '') ~ pattern or coalesce(with_check, '') ~ pattern)
  order by tablename, policyname
 loop
  new_qual := regexp_replace(pol.qual, pattern, '(select auth.\1())', 'g');
  new_check := regexp_replace(pol.with_check, pattern, '(select auth.\1())', 'g');
  execute format('alter policy %I on %I.%I%s%s', pol.policyname, pol.schemaname, pol.tablename,
   case when new_qual is not null then ' using (' || new_qual || ')' else '' end,
   case when new_check is not null then ' with check (' || new_check || ')' else '' end);
 end loop;
 select count(*) into after_count from pg_catalog.pg_policies where schemaname = 'public';
 if after_count <> before_count then raise exception 'audit_advisor_hardening: politika sayısı değişti (% -> %)', before_count, after_count; end if;
 if exists(select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename <> all(legacy) and (coalesce(qual, '') ~ pattern or coalesce(with_check, '') ~ pattern)) then
  raise exception 'audit_advisor_hardening: sarmalanmamış auth çağrısı kaldı';
 end if;
 perform set_config('search_path', previous_path, true);
end $$;

commit;
