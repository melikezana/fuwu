-- Usta doğrulaması için TASLAK belge kuralları. Taslaklar hiçbir ustaya uygulanmaz;
-- admin, hukuki inceleme sonrası Admin › Doğrulama ekranındaki kural düzenleyiciden onaylayıp
-- etkinleştirir (tablo kısıtı: enabled ancak approved + reviewed_by ile mümkün).
-- Not: Adli sicil kaydı KVKK'ya göre özel nitelikli kişisel veridir; açık rıza ve
-- aydınlatma metni güncellenmeden etkinleştirilmemelidir. Tekrar çalıştırmak güvenlidir.
begin;

insert into public.provider_document_rules(category_id, document_type, stage, scope, regulatory_rule_version, source_url, effective_date)
select null, 'identity', 'publication',
  'Tüm ustalar: kimlik kartı ön/arka yüz. Ad-soyad başvuru ve ödeme hesabıyla eşleşmeli.',
  'fuwu-trust-2026-11-03', 'https://www.nvi.gov.tr', date '2026-11-03'
where not exists (
  select 1 from public.provider_document_rules
  where document_type = 'identity' and stage = 'publication' and category_id is null and provider_id is null
);

insert into public.provider_document_rules(category_id, document_type, stage, scope, regulatory_rule_version, source_url, effective_date)
select null, 'criminal_record', 'publication',
  'Tüm ustalar: e-Devlet barkodlu adli sicil kaydı, son 3 ay. Barkod ve içerik turkiye.gov.tr belge doğrulama ile karşılaştırılır. Etkinleştirmeden önce KVKK açık rıza metni güncellenmeli.',
  'fuwu-trust-2026-11-03', 'https://www.turkiye.gov.tr/adli-sicil-kaydi', date '2026-11-03'
where not exists (
  select 1 from public.provider_document_rules
  where document_type = 'criminal_record' and stage = 'publication' and category_id is null and provider_id is null
);

commit;
