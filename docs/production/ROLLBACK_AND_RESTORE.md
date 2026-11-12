# Geri dönüş ve geri yükleme planı

10 Kasım 2026 denetimi · P1/7: "Yedekleme / geri yükleme denemesi ve canlı değişiklikten önce doğrulanmış geri dönüş planı."

Bu belge bir prosedürdür, kanıt değildir. Geri yükleme denemesi yapılmadan "kurtarma kanıtı hazır" denmez; deneme sonucu en alttaki tabloya işlenir.

## 1. Uygulamadan önce

1. Supabase panelinde Database → Backups ekranını aç. En son yedeğin tarihini not et. Free planda otomatik günlük yedek yoksa 2. adım zorunludur.
2. Mantıksal yedek al (yalnızca okur):

   ```bash
   supabase db dump --linked -f backup-schema-$(date +%Y%m%d-%H%M).sql
   supabase db dump --linked --data-only -f backup-data-$(date +%Y%m%d-%H%M).sql
   ```

   Dosyalar kişisel veri içerir. Repoya ekleme, paylaşma; şifreli bir yerde sakla.
3. Uygulanacak migration listesini doğrula: `supabase migration list --linked`. Üretimde 82 kayıt beklenir; bekleyenler aşağıdaki üç dosyadır.
4. Advisor çıktısını "önce" olarak kaydet (Security ve Performance sayıları).

## 2. Geri yükleme denemesi (üretime dokunmaz)

1. Boş bir Supabase projesi ya da yerel PostgreSQL aç.
2. Şema yedeğini, ardından veri yedeğini yükle:

   ```bash
   psql "$DENEME_DB_URL" -v ON_ERROR_STOP=1 -f backup-schema-….sql
   psql "$DENEME_DB_URL" -v ON_ERROR_STOP=1 -f backup-data-….sql
   ```

3. Sayıları üretimle karşılaştır: `provider_applications` 10, `providers` 4, `service_categories` aktif 11, `commerce_orders` 0.
4. Bekleyen migration'ları bu deneme veritabanına uygula ve `npm run audit:public-visibility` betiğini deneme ortamına karşı çalıştır.
5. Sonucu en alttaki tabloya yaz.

## 3. Bekleyen migration'lar ve geri alma

Üçü de veri satırı değiştirmez ve yeniden çalıştırılabilir. Geri alma komutları yalnızca bir sorun görülürse kullanılır.

### `20261110000100_audit_advisor_hardening.sql`

Ne yapar: 4 gereksiz EXECUTE yetkisini kaldırır, 7 tabloya "yalnızca sunucu" politikası ekler, FK indeksleri ekler, 3–4 çift indeksi kaldırır, RLS politikalarındaki `auth.*()` çağrılarını `(select …)` içine alır.

Belirti → geri alma:

- Kayıt olma ya da profil/usta güncelleme `permission denied for function` hatası veriyorsa:

  ```sql
  grant execute on function public.profile_role_is_unchanged(uuid,text) to anon;
  grant execute on function public.service_request_assignment_fields_are_unchanged(uuid,uuid,uuid) to anon;
  grant execute on function public.provider_owner_protected_fields_are_unchanged(uuid,uuid,uuid,uuid,text,numeric,numeric,numeric,boolean,boolean,boolean,boolean,boolean) to anon;
  ```

- Sunucu tarafı bir akış 7 tablodan birine erişemiyorsa (beklenmez; service_role RLS'i atlar), ilgili politikayı kaldır:

  ```sql
  drop policy if exists provider_publication_reviews_server_only on public.provider_publication_reviews;
  -- diğer tablolar: admin_provider_action_receipts, commerce_settlement_operations, launch_interest_consent_events,
  -- order_sms_dispatches, provider_document_uploads, provider_document_versions
  ```

- Eklenen indeksler zararsızdır; kaldırmak gerekirse adı `_fk_idx` ile biten indeksler bu migration'a aittir.
- Kaldırılan çift indeksler aynı kolonlarda eşi bulunan kopyalardır; geri eklemek gerekmez.
- RLS ifadeleri anlam olarak aynıdır. Yine de tam geri dönüş gerekirse şema yedeğindeki `CREATE POLICY` satırları kaynak alınır.

### `20261110000200_weekly_launch_metrics.sql`

Ne yapar: yalnızca admin'e açık bir okuma RPC'si ekler.

```sql
drop function if exists public.admin_weekly_launch_metrics(integer);
```

Panel bu durumda "Haftalık ölçümler okunamadı" gösterir; başka ekran etkilenmez.

### `20261111000100_application_source_review.sql`

Ne yapar: başvuru kaynak kararı için ayrı bir tablo ve iki admin RPC'si ekler. `provider_applications` tablosuna dokunmaz.

```sql
drop function if exists public.admin_classify_application(uuid,text,text);
drop function if exists public.admin_application_sources();
drop table if exists public.provider_application_source_reviews; -- verilen kaynak kararları silinir
```

Admin başvuru ekranı bu durumda "Başvuru kaynağı okunamadı" gösterir; onay/ret akışı çalışmaya devam eder.

## 4. Uygulama geri dönüşü (Vercel)

Kod değişikliği sorun çıkarırsa: Vercel → Deployments → son sağlıklı dağıtım → "Promote to Production". Migration'lar geriye uyumludur; eski kod yeni şemayla çalışır.

## 5. Uygulamadan sonra

1. `supabase migration list --linked` → 85 kayıt.
2. Security ve Performance Advisor'ı yeniden çalıştır; "sonra" sayılarını kaydet.
3. Kendi hesabınla giriş yap, profil adını değiştirip geri al (profil güncelleme politikası çalışıyor mu).
4. Admin ana sayfasında "Haftalık lansman ölçümleri" ve başvuru ekranında "Kaynak" sütunu açılıyor mu.
5. `npm run audit:public-visibility -- --site=https://www.fuwu.com.tr` → PASS.

## 6. Deneme kaydı

| Tarih | Yedek alındı | Geri yükleme denendi | Sayılar eşleşti | Migration deneme ortamında geçti | Yapan |
|---|---|---|---|---|---|
| — | hayır | hayır | — | — | — |
