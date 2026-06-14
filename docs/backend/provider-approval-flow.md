# Provider Approval Flow

Fuwu usta onay akışı Supabase üzerinde iki tabloyu birlikte kullanır:

- `provider_applications`: Usta adayının gönderdiği başvuru kuyruğu.
- `providers`: Admin onayından sonra public listelerde görünebilen usta kaydı.

## Başvuru Gönderimi

`/provider-application` formu public kullanıcıdan başvuru alır ve Supabase anon client ile `provider_applications` tablosuna kayıt ekler.

Kaydedilen temel alanlar:

- `full_name`
- `phone`
- `whatsapp`
- `category_id`
- `district_id`
- `experience_years`
- `description`
- `status = 'pending'`

Formdaki açıklama alanı hem yeni `description` kolonuna hem de eski uyumluluk için `introduction` kolonuna yazılır. Profil görseli yüklenirse mevcut storage alanları da aynı başvuruya eklenir.

## Admin İnceleme Akışı

`/admin/provider-applications` sayfası yalnızca `status = 'pending'` başvuruları listeler. Admin bu ekrandan iki işlem yapabilir:

- `Onayla`
- `Reddet`

Sayfaya erişim ve server action işlemleri `profiles.role = 'admin'` kontrolünden geçer. Admin olmayan kullanıcılar panel verisini okuyamaz ve onay/ret işlemi çalıştıramaz.

## Onay Mantığı

Admin bir başvuruyu onayladığında:

1. Başvuru `pending` durumundaysa `approved` yapılır.
2. Başvurudaki bilgilerle yeni bir `providers` kaydı oluşturulur.
3. Yeni provider kaydında `is_active = true` ve `is_approved = true` set edilir.
4. Provider oluşturma başarısız olursa başvuru durumu tekrar `pending` yapılmaya çalışılır.

Provider kaydına kopyalanan alanlar:

- `name = provider_applications.full_name`
- `phone`
- `whatsapp`
- `category_id`
- `district_id`
- `experience_years`
- `description`
- `is_active = true`
- `is_approved = true`

## Ret Mantığı

Admin bir başvuruyu reddettiğinde yalnızca başvuru durumu güncellenir:

- `status = 'rejected'`

Reddedilen başvuru için provider kaydı oluşturulmaz.

## Durum Tipleri

Desteklenen başvuru durumları:

- `pending`
- `approved`
- `rejected`

## RLS Uyumluluğu

Akış mevcut RLS modeline uygun çalışır:

- Public kullanıcılar sadece `status = 'pending'` başvuru ekleyebilir.
- Başvuruları yalnızca admin kullanıcılar okuyabilir.
- Başvuru durumunu yalnızca admin kullanıcılar güncelleyebilir.
- Provider kaydını yalnızca admin kullanıcılar oluşturabilir.
- Public provider listeleri yalnızca `is_active = true` ve `is_approved = true` kayıtları gösterir.

## Mevcut Veritabanı Güncellemesi

Canlı Supabase veritabanında daha eski şema varsa aşağıdaki SQL ile yeni kolonlar ve durum kontrolü eklenmelidir:

```sql
alter table public.provider_applications
  add column if not exists whatsapp text,
  add column if not exists description text;

update public.provider_applications
set
  whatsapp = coalesce(nullif(whatsapp, ''), phone),
  description = coalesce(
    nullif(description, ''),
    nullif(introduction, ''),
    full_name || ' Fuwu usta başvurusu.'
  )
where whatsapp is null
   or whatsapp = ''
   or description is null
   or description = '';

alter table public.provider_applications
  alter column whatsapp set not null,
  alter column description set not null;

alter table public.provider_applications
  drop constraint if exists provider_applications_status_check;

alter table public.provider_applications
  add constraint provider_applications_status_check
  check (status in ('pending', 'approved', 'rejected'));
```

Yeni kurulumlarda `supabase/migrations/20260605000000_initial_schema.sql` ve takip eden migration zinciri bu alanları doğrudan oluşturur.

## Admin Boş Durum

Bekleyen başvuru yoksa admin ekranı şu temiz boş durumu gösterir:

`Bekleyen başvuru yok`

Yeni başvurular geldiğinde onay ve ret aksiyonlarıyla aynı ekranda görünür.
