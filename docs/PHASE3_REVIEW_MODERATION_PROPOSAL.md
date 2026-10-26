# Yorum moderasyonu yetki ve audit düzeltmesi — ek onay kapsamı

İnceleme: `deleteAdminReview` uygulamada admin kontrolü yapıp doğrudan `reviews.delete()` kullanıyor. Review migration'ları müşteri delete policy'sini kapatıyor; bu akış için açık admin DELETE policy/RPC garantisi bulunmuyor. Mevcut izole test moderasyonun puan özetini root SQL ile sınadığı için gerçek admin moderasyon yetkisini ayrıca doğrulamak gerekiyor.

Önerilen kesin kaynak değişikliği:

- Yalnızca veritabanından doğrulanan admin'in çağırabildiği `commerce_admin_delete_review(review_id)` RPC'si.
- Mevcut admin silme eylemini bu RPC'ye geçirmek; müşteri veya usta eylemi eklememek.
- Usta satırı kilidiyle aynı yorumun silinmesi, puan özetinin mevcut trigger ile yenilenmesi ve `review.deleted` audit kaydının aynı transaction'da oluşması. Audit'e yorum metni veya müşteri bilgisi yazılmaz.
- Doğrudan istemci DELETE iznini kapatmak; yetkili moderasyon yalnızca dar RPC üzerinden geçer. Daha önce eklenen review receipt silinmez; aynı sipariş tekrar değerlendirilemez.
- Müşteri/usta/misafir reddi, admin başarısı, tek audit kaydı, puan özeti ve tekrar değerlendirme yasağını izole PostgreSQL'de sınamak.

Bu işlem migration kaynak dosyası ve yerel testle sınırlı; gerçek yorum silinmeyecek, production migration/deploy/commit/push yapılmayacak. Otomatik onay incelemesi yeni silme RPC'si ve DELETE yetkisi değişikliğini ayrı açık onaya bağladı. Henüz uygulanmadı.
