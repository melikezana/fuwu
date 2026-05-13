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

## Environment Variables

`.env.example` is included as a safe template and does not contain real credentials.

```bash
NEXT_PUBLIC_SUPABASE_URL=replace-with-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
```

Do not commit real `.env.local` values or private credentials.

## Current MVP Status

- Landing page is implemented.
- Customer request form is implemented and can store requests when Supabase env variables are configured.
- Provider application form is implemented and can store applications when Supabase env variables are configured.
- Login/auth UI supports Supabase Google and email magic-link flows when auth providers are configured.
- Provider, provider dashboard, and admin routes are implemented with Supabase fallbacks for unconfigured environments.
- No payment flow is included yet.
- Ready for Vercel deployment once `npm run build` passes and Supabase env variables are added in Vercel.
