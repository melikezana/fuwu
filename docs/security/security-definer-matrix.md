# SECURITY DEFINER yetki matrisi

9 Kasım 2026 denetimindeki "16 anonim / 75 oturumlu SECURITY DEFINER uyarısı" bulgusunun fonksiyon bazında incelemesi.

- Kaynak: tam migration zinciri, izole PostgreSQL. Üretimdeki advisor sayısı şema sapması nedeniyle birkaç fonksiyon farklı olabilir; `20261110000100_audit_advisor_hardening.sql` uygulandıktan sonra Security Advisor yeniden çalıştırılmalıdır.
- Makine tarafından okunan kaynak: `security-definer-matrix.json`. `scripts/audit-advisor-db-checks.mjs` her CI koşusunda veritabanındaki gerçek listeyi bu dosyayla karşılaştırır; incelenmemiş yeni bir fonksiyon testi düşürür.
- Tüm fonksiyonlarda sabit `search_path` vardır.
- BOLA/IDOR: `scripts/bola-db-checks.mjs` yabancı bir oturumla her fonksiyonu kurbanın usta ve başvuru kimlikleriyle dener; veri dönen ya da kayıt değiştiren fonksiyon testi düşürür.

Toplam: 75 fonksiyon · anonim çağrılabilir: 9 · oturumlu çağrılabilir: 75

| Fonksiyon | anon | authenticated | Koruma | Not |
|---|---|---|---|---|
| `admin_application_sources` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_classify_application` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_control_snapshot` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_prelaunch_snapshot` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_provider_action` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_provider_detail` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_provider_directory` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_provider_quality_queue` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_trust_alerts` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `admin_weekly_launch_metrics` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `bind_provider_applications_to_current_user` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `clear_legacy_announcement` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_health` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_legacy_checkout_queue` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_reconciliation` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_request_refund` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_save_category` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_save_service` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_settlement_queue` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_admin_summary` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_ceo_insights` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_create_variant` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `commerce_hold_order` | hayır | evet | Korunan fonksiyona devreder | commerce_hold_order_priced() içinde auth.uid() ve fiyat/slot doğrulaması yapılır. |
| `commerce_hold_order_priced` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `commerce_offers` | evet | evet | Bilinçli olarak herkese açık | Yalnızca yayımlı gerçek ustaların aktif tekliflerini döndürür; telefon/finans alanı içermez. |
| `commerce_order_finance` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_order_trust` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_provider_capacity` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_provider_finance` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_provider_operations` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_provider_private` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_public_fee_rates` | evet | evet | Bilinçli olarak herkese açık | Yalnızca müşteri hizmet bedeli oranlarını döndürür. |
| `commerce_public_schedule` | evet | evet | Bilinçli olarak herkese açık | Yalnızca yayımlı ustanın haftalık çalışma saatleri. |
| `commerce_quote` | evet | evet | Bilinçli olarak herkese açık | Yalnızca yayımda olan teklifin fiyat dökümü; teklif yayımda değilse hata. |
| `commerce_review_settlement` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_save_store` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `commerce_set_daily_limit` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `commerce_slots` | evet | evet | Bilinçli olarak herkese açık | Yalnızca yayımlı ustanın boş saatleri. |
| `commerce_submit_review` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `commerce_transition_order` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `consume_user_rate_limit` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `current_user_has_provider` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `current_user_is_admin` | evet | evet | RLS yardımcı fonksiyonu | Yalnızca çağıranın kendi admin durumunu döndürür; RLS politikalarında kullanılır. |
| `launch_interest_health` | evet | evet | Bilinçli olarak herkese açık | Tek bir açık/kapalı bayrağı döndürür. |
| `notify_eligible_providers_for_request` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `partner_attach_document` | hayır | evet | Korunan fonksiyona devreder | trust_attach_document() içinde auth.uid() ve başvuru sahipliği doğrulanır. |
| `partner_save_calendar` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `partner_save_profile` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `partner_save_services` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `profile_role_is_unchanged` | hayır | evet | RLS yardımcı fonksiyonu | auth.uid() ile yalnızca çağıranın kendi profili; UPDATE politikası yardımcı fonksiyonu. |
| `provider_is_published` | evet | evet | Bilinçli olarak herkese açık | RLS politikası yardımcı fonksiyonu; yalnızca boolean döndürür. |
| `provider_owner_protected_fields_are_unchanged` | hayır | evet | RLS yardımcı fonksiyonu | auth.uid() ile yalnızca çağıranın kendi usta kaydı; UPDATE politikası yardımcı fonksiyonu. |
| `provider_partner_readiness` | hayır | evet | Korunan fonksiyona devreder | provider_partner_readiness_before_* zinciri sahiplik/admin kontrolü yapar; yabancı kullanıcı forbidden alır (DB testi). |
| `provider_publication_gate` | evet | evet | Bilinçli olarak herkese açık | Yalnızca yayımlı gerçek ustaların kimlik ve doğrulama bayrakları. |
| `provider_quality_snapshot` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `review_eligible_sources` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `review_provider_publication` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `save_launch_interest` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `service_request_assignment_fields_are_unchanged` | hayır | evet | RLS yardımcı fonksiyonu | Yalnızca authenticated UPDATE politikasında kullanılır; boolean döndürür. |
| `submit_provider_review` | hayır | evet | Korunan fonksiyona devreder | review_eligible_sources() ve submit_service_review() auth.uid() ile yalnızca tamamlanmış kendi işini kabul eder. |
| `submit_service_review` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `trust_admin_queue` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_application_file` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_application_summaries` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_attach_document` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `trust_document_access` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_issue_service_code` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `trust_report_account` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `trust_report_case` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `trust_resolve_case` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_review_document` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_save_document_type` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_save_rule` | hayır | evet | Admin kontrolü | Gövdede current_user_is_admin() kontrolü; admin olmayan forbidden alır. |
| `trust_scope_change` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |
| `withdraw_launch_interest` | hayır | evet | Oturum + sahiplik | Gövdede auth.uid() ile oturum ve kayıt sahipliği kontrolü. |

## Bu incelemede kaldırılan yetkiler

| Fonksiyon | Kaldırılan | Gerekçe |
|---|---|---|
| `handle_new_user` | anon, authenticated | Yalnızca auth.users tetikleyicisi; API üzerinden çağrılması gerekmez. |
| `profile_role_is_unchanged` | anon | Yalnızca authenticated UPDATE politikasında kullanılır. |
| `provider_owner_protected_fields_are_unchanged` | anon | Yalnızca authenticated UPDATE politikasında kullanılır. |
| `service_request_assignment_fields_are_unchanged` | anon | Yalnızca authenticated UPDATE politikasında kullanılır. |
