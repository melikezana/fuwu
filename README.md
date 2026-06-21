# Fuwu

Fuwu is an MVP for a curated home and lifestyle services marketplace. It presents the service concept, lets customers submit a service request, and lets providers apply for the first provider cohort.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- ESLint
- Supabase-ready placeholder names only

## Available Routes

- `/` - Landing page with services, process, trust signals, testimonials, FAQ, and coming-soon CTA.
- `/request` - Client-side service request form.
- `/provider-application` - Client-side provider application form.
- `/#services` - Services section on the landing page.
- `/#how-it-works` - Process section on the landing page.
- `/#faq` - FAQ section on the landing page.

## Running Locally

Install dependencies:

```bash
npm install
```

Create local environment variables when needed:

```bash
cp .env.example .env.local
```

For local development, put real Supabase project values in `.env.local` only. Keep `.env.example` blank and safe to commit.

Start the development server:

```bash
npm run dev
```

## Yerel Geliştirme Kurulumu

Supabase ile sıfırdan yerel geliştirme için önerilen akış:

```bash
supabase start
supabase db reset
```

Ardından uygulama üzerinden `ADMIN_SEED_EMAIL` ile eşleşen yerel admin kullanıcısını
oluşturun. Varsayılan geliştirme email'i `admin@fuwu.test` değeridir. Kullanıcı
Supabase Auth içinde oluştuktan sonra admin rolünü idempotent şekilde vermek için:

```bash
node scripts/promote-admin.mjs admin@fuwu.test
```

Son olarak geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Seed dosyası local geliştirme için `admin@fuwu.test` email'ini otomatik admin
rolüne yükselten bir profile trigger'ı da kurar. Production ortamında sabit email
kontrolü kullanılmamalı; bunun yerine service-role ile çalışan, environment
değişkenli ve kısıtlı bir allowlist veya manuel operasyon akışı tercih edilmelidir.

Build for production:

```bash
npm run build
```

Start the production server after building:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

## Scripts

- `npm run dev` - Start the Next.js development server.
- `npm run build` - Build the app for production.
- `npm run start` - Start the built production app.
- `npm run lint` - Run ESLint.
- `npm run maintenance:cleanup-audit-logs` - Delete non-security audit logs older than 90 days.

## Environment Variables

`.env.example` is included as a safe template and does not contain real credentials.

```bash
NEXT_PUBLIC_SUPABASE_URL=replace-with-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
```

Do not commit real `.env.local` values or private credentials.

## Production'a Deploy

Önerilen yayın sırası:

1. CI/CD ortamında `npm run preflight` çalıştır; env, lint, build ve backend DB
   sağlık kontrollerinin tamamının geçtiğini doğrula.
2. Migration'ları önce staging üzerinde test ettikten sonra production projesinde
   `supabase db push` ile uygula.
3. Vercel production deploy'unu başlat. Supabase, Upstash, Sentry ve gerekiyorsa
   Netgsm secret'larının doğru environment scope'unda bulunduğunu kontrol et.
4. Deploy sonrasında login, usta başvurusu, belge upload/görüntüleme, hizmet talebi,
   admin ataması ve Storage public/private erişimleri için smoke test çalıştır.

Ayrıntılı backup, rollback ve env envanteri için
[`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) dosyasına bakın.

## Current MVP Status

- Landing page is implemented.
- Customer request form is implemented and can store requests when Supabase env variables are configured.
- Provider application form is implemented and can store applications when Supabase env variables are configured.
- Login/auth UI supports Supabase Google and email magic-link flows when auth providers are configured.
- Provider, provider dashboard, and admin routes are implemented with Supabase fallbacks for unconfigured environments.
- No payment flow is included yet.
- Ready for Vercel deployment once `npm run build` passes and Supabase env variables are added in Vercel.
