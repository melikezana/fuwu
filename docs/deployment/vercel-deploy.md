# Vercel Deployment Guide

This project is a Next.js App Router application. Vercel should auto-detect the framework and use the default install and build settings.

## Pre-Deploy Checklist

- Push only source, docs, and configuration files to GitHub.
- Keep `.env.local` local. It is ignored by `.gitignore` and must not be committed.
- Keep `.env.example` as a blank, safe template.
- Run `npm run build` before the final push.
- Confirm there are no `localhost` or `127.0.0.1` URLs hardcoded in `src`.

## Import the GitHub Repo into Vercel

1. Open the Vercel dashboard and choose **New Project**.
2. Select the GitHub account or organization that owns the Fuwu repository.
3. Find the repository and choose **Import**.
4. Keep the framework preset as **Next.js**.
5. Keep the root directory as the repository root unless the repo is moved into a monorepo later.
6. Keep the default build command, `npm run build`.
7. Add the required environment variables before clicking **Deploy**.

Vercel creates Preview deployments for non-production branches and a Production deployment from the production branch, usually `main`.

## Environment Variables

Add variables in **Project Settings -> Environment Variables**. Apply each required variable to **Production** and **Preview** unless a separate staging Supabase project is used.

Required for Supabase-backed features:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional analytics and monitoring variables:

```bash
NEXT_PUBLIC_ANALYTICS_ENABLED=
NEXT_PUBLIC_ANALYTICS_DEBUG=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Safety notes:

- `NEXT_PUBLIC_*` variables are exposed to browser code. Only put values there that are intended to be public.
- The Supabase anon key is designed for public browser use when Row Level Security policies are correct.
- Never add Supabase service-role keys to this app or to `NEXT_PUBLIC_*` variables.
- `SENTRY_AUTH_TOKEN` is secret. Store it only in Vercel or CI settings if source-map uploads are enabled later.
- After changing any Vercel environment variable, redeploy so the new value is included in the deployment.

## Redeploy

Use one of these options:

- Push a new commit to the connected GitHub branch.
- In Vercel, open the project, go to **Deployments**, choose the deployment menu, and select **Redeploy**.
- If automatic deployments are interrupted, create a deployment from a branch or commit SHA from the project **Deployments** page.

## Check Build Logs

1. Open the Vercel project dashboard.
2. Go to **Deployments**.
3. Select the latest Preview or Production deployment.
4. Open the build details and logs.
5. Confirm the install step, `npm run build`, App Router route generation, and final deployment status all complete successfully.

## Production Notes

- App Router routes live under `src/app`.
- The app uses request origins for auth callback redirects, so local and production hosts both work without hardcoded hostnames.
- Configure the final production domain in Supabase Auth redirect URLs before enabling Google or email magic-link auth in production.
- If Supabase env variables are missing, public provider pages fall back to bundled sample data and protected/admin flows show unavailable states instead of using local-only logic.

References:

- Vercel Git deployments: https://vercel.com/docs/git
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel builds and logs: https://vercel.com/docs/builds
