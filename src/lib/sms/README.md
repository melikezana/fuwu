# FUWU SMS Sağlayıcı Altyapısı

FUWU giriş akışı telefon OTP'yi zaten Supabase Auth üzerinden
`signInWithOtp({ phone })` ve `verifyOtp({ type: "sms" })` ile destekler. Bu klasördeki
abstraction Supabase Auth'un yerine geçmez; gelecekte acil talep veya operasyonel
bildirim gibi sunucu tarafı SMS ihtiyaçları için hazırlanmıştır.

## Dosyalar

- `types.ts`: `SmsProvider` arayüzü ve ortak sonuç tipi.
- `MockSmsProvider.ts`: development/test ortamında gerçek SMS göndermeden kodu loglar.
- `NetgsmSmsProvider.ts`: Netgsm HTTP API üzerinden SMS gönderir.
- `index.ts`: `SMS_PROVIDER` değerine göre sağlayıcıyı seçen `getSmsProvider()` factory'si.

## Yerel kullanım

```env
SMS_PROVIDER=mock
```

```ts
import { getSmsProvider } from "@/lib/sms";

const result = await getSmsProvider().sendOtp("+905551112233", "123456");
```

Mock sağlayıcı yalnızca production dışındaki ortamlarda telefon ve kodu konsola yazar.

## Netgsm'i etkinleştirme

```env
SMS_PROVIDER=netgsm
NETGSM_USERCODE=
NETGSM_PASSWORD=
NETGSM_HEADER=
```

Bu değerler yalnızca sunucu ortamında tutulmalıdır. Vercel'de Production ve gerekli
Preview ortamlarına secret olarak eklenmeli, `NEXT_PUBLIC_` öneki kullanılmamalıdır.
Canlıya geçmeden önce Netgsm hesabının gönderici başlığı, hedef ülke izinleri ve API
yanıt kodları gerçek hesapla staging ortamında doğrulanmalıdır.

## Mevcut ürün kararı

Provider application ve service request formlarına ek bir SMS doğrulama zorunluluğu
getirilmemiştir. Kullanıcı oturumu ve Supabase Auth doğrulaması yeterli kabul edilir.
Bu altyapı şu anda hiçbir ürün akışından otomatik çağrılmaz.
