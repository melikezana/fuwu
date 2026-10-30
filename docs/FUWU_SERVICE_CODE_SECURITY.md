# FUWU Güvence kodu ve hizmet onayı

31 Ekim 2026. Güvence, mevcut commerce `orders`, `order_completion_codes` ve `commerce_transition_order` üzerinde kuruldu; ikinci bir kapı kodu tablosu açılmadı.

## Önceki durum

Commerce kodu sipariş oluşturulurken açık metinle tutuluyor, süre ve tek kullanım işaretleri olmadan provider'ın COMPLETED geçişini yetkilendiriyordu. Legacy `service_requests.confirmation_code` ise ayrı, eski talep/ödeme akışının koduydu. Bunlar birbirinin kimlik kanıtı değildir. Legacy talep ekranları artık bunu “talep referansı” diye açıklar; eski ödeme onay UI'ı kapalıdır ve Server Action sandbox anahtarı kapalıyken reddeder. Eski talep kodu Güvence RPC'sine kabul edilmez. Tarihsel veri yeniden yazılmadı; eski uygulama sürümlerine geri dönüşte açık kod güvenlik varsayımları yeniden geçerli sayılmamalı.

## Kod sözleşmesi

1. Yalnız ilgili customer, CONFIRMED/PROVIDER_ON_THE_WAY siparişi için ve randevu başlangıcından en fazla 2 saat önce / bitişinden en fazla 2 saat sonraya kadar kod ister.
2. `pgcrypto.gen_random_bytes` ile rejection sampling uygulanır; rastgele altı hane, bcrypt cost 10 hash. Kod yalnız üretildiği yanıtta müşteriye verilir. Log/audit'e açık kod girmez. İstemci kalıcı depoya yazmaz.
3. Geçerlilik 15 dakika. Aynı siparişte 15 dakika dolmadan yeni kod çıkarılamaz. Yenileme deneme sayacını erken sıfırlayamaz. Sayfa kapanırsa kod geri okunamaz; süre sonrası yenileme veya destek gerekir.
4. Atanmış provider, PROVIDER_ON_THE_WAY → IN_PROGRESS sırasında kodu girer. Customer kendi provider rolünü kullanarak bunu atlayamaz. `issued_provider_id`, order ID, aktör, durum, expiry ve tüketim kontrol edilir.
5. En çok beş hatalı giriş; kilit kodun süresi sonuna kadar. İptal edilmiş, yanlış provider/order, süresi geçmiş veya tüketilmiş kodda işlem yapılmaz. Kullanıcıya güvenli genel hata gider.
6. Provider → order → code satır kilit sırası ile doğrulama/tüketim ve audit aynı transaction'dadır. İki bağlantıdan çift kullanımda yalnız biri geçer. Başarılı tüketimde hash kaldırılır ve `consumed_at` / `arrival_verified_at` yazılır.
7. Browser rollerinin kod tablosunu okuma/yazma yetkisi yoktur. Eski checkout'un üretmeye çalıştığı açık kod BEFORE trigger ile kalıcı yazımdan önce silinir. Tarihsel eski kod kolonları browser'a açılmaz ve yeni doğrulamada kullanılmaz.

Altı haneli kod uzaktan kimlik ispatı değildir. Müşteri gerçek usta ismi ve profil fotoğrafını karşılaştırır; emin değilse paylaşmaz, destek kaydı açar. Kod; kimlik, meslek belgesi veya yetkili servis kontrolünün yerine geçmez.

## Hizmet tamamlama ve ek iş

`IN_PROGRESS` durumunda provider tamamlandı bildirimi yapınca yalnız `service_completed_at` yazılır; sipariş aynı durumda kalır. Müşteri **Hizmeti Onayla** ile `COMPLETED` / `customer_confirmed_at` oluşturur veya **Sorun Bildir** ile inceleme açar. Provider tamamlandı bildirimi otomatik müşteri onayı veya otomatik hak ediş değildir. Ödeme altyapısı mevcut sandbox/kapalı sınırındadır.

Provider ek iş kapsamını ve ek fiyatını önerir. Customer ilgili öneriyi kabul/reddeder. Bekleyen öneri varken tamamlama bildirimi engellenir; provider kendi fiyatını onaylayamaz. Kabul kaydı aktör/zamanla tutulur. Eski ödenmiş tutar/snapshot değiştirilmez, ek bedel kendiliğinden tahsil edilmez. Satış açılışında ek bedelin ödeme kuruluşu süreci ayrıca tasarlanıp test edilmelidir.

## Gecikme, uyuşmazlık ve itiraz

48 saat geçmiş tamamlama bildirimleri admin kuyruğuna sayılır; otomatik tamamlanma yoktur. Destek müşteriyle ve ustayla iletişim kurar, kanıt ister, `unreachable`/`no_show`/şikâyet kaydı üzerinden gerekçeli inceleme yürütür. Customer şikâyeti siparişi DISPUTED yapar. Provider'ın ayrı itirazı aynı siparişe kendi reporter kimliğiyle kaydedilir; taraflar birbirinin özel başvurusuna erişmez. Admin inceleme, çözüm ve yeniden açma kararını gerekçeli audit ile verir. Admin vaka kararı müşteri yerine onay oluşturmaz veya para serbest bırakmaz. DISPUTED siparişin yeniden hizmete / finansal uzlaşmaya alınması ayrıca yetkili ve müşteri rızalı operasyon gerektirir; bu patch otomatik yeniden başlatma eklemez.

## Kanıt ve sınır

Gerçek yerel PostgreSQL: üretim, hash/expiry, yanlış aktör, deneme sayacı, iptal/yanlış sipariş, tüketim, iki eşzamanlı bağlantı, müşteri onayı, şikâyet/itiraz ve audit arızası rollback'i. [Migration testi](../artifacts/backend-reliability/migration-chain.json). Local HTTP/React fixture gerçek hosted Supabase kabulü değildir. Production'da sentetik sipariş oluşturulmadı; staging yokken gerçek E2E **BLOCKED**.
