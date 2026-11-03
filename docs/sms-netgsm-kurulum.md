# SMS doğrulama kodları: NetGSM kurulumu

Telefonla giriş ve usta telefon doğrulaması Supabase Auth üzerinden çalışır. Supabase kodu kendisi
üretir; gönderimi `/api/auth/sms-hook` kancası NetGSM ile yapar. Kanca:

- Supabase imzasını (Standard Webhooks) doğrular; imzasız istek SMS göndermez.
- Yalnızca Türkiye cep numaralarına (+90 5xx) gönderir. Yurt dışı numaralara gönderim reddedilir (SMS pompalama koruması).
- Aynı numaraya 15 dakikada en fazla 5, günde en fazla 15 kod gönderir.
- Canlıda NetGSM ayarlı değilse "gönderildi" demez, hata döner.

## 1. NetGSM

1. NetGSM hesabı aç, SMS başlığını (ör. `FUWU`) onaylat.
2. Panelden API kullanıcı kodu ve şifresini al.

## 2. Vercel › Settings › Environment Variables (Production)

| Değişken | Değer |
| --- | --- |
| `SMS_PROVIDER` | `netgsm` |
| `NETGSM_USERCODE` | NetGSM API kullanıcı kodu |
| `NETGSM_PASSWORD` | NetGSM API şifresi |
| `NETGSM_HEADER` | Onaylı SMS başlığı |
| `SUPABASE_SEND_SMS_HOOK_SECRET` | 3. adımda Supabase'in ürettiği anahtar |

Değişkenleri ekledikten sonra Vercel'de yeniden deploy et.

## 3. Supabase › Authentication › Hooks › Send SMS

1. Hook type: **HTTPS**.
2. URL: `https://www.fuwu.com.tr/api/auth/sms-hook`
3. **Generate secret** ile anahtar üret, `v1,whsec_...` değerinin tamamını Vercel'e `SUPABASE_SEND_SMS_HOOK_SECRET` olarak ekle.
4. Kancayı etkinleştir. Supabase › Authentication › Sign In / Providers › Phone açık olmalı.

## 4. Deneme

Siteden kendi numaranla telefonla giriş yap. Kod 10 saniye içinde gelmeli. Gelmezse:

- Vercel › Logs'ta `/api/auth/sms-hook` isteğine bak: 401 imza/anahtar uyumsuz, 503 eksik ayar, 502 NetGSM hatası demektir.
- NetGSM panelinde gönderim raporunu kontrol et (başlık onayı ve bakiye).
