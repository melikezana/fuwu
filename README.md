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

For the current MVP, Supabase is not connected. Keep placeholder values unless a real backend is added later.

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
- Customer request form is implemented with client-side validation only; it does not send or store submitted data.
- Provider application form is implemented with client-side validation only; it does not send or store submitted data.
- Login/auth UI is marked inactive and does not collect passwords, OTPs, or sessions.
- Supabase type/config scaffolding exists, but `@supabase/supabase-js` is not installed and no database writes are connected.
- No authentication, payment flow, admin dashboard, or backend API is included yet.
- Ready for static/product review deployment once `npm run build` passes.
