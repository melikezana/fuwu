# Fuwu Project Structure

Fuwu keeps route files in `src/app` and moves reusable code into domain folders.

## Application Code

- `src/components/ui` contains reusable primitives such as buttons, cards, containers, and section intros.
- `src/components/layout` contains shell-level layout components.
- `src/components/home`, `src/components/providers`, `src/components/request`, `src/components/auth`, `src/components/admin`, and `src/components/dashboard` contain domain UI.
- `src/services` contains domain service modules for auth, providers, requests, admin, notifications, reviews, and storage.
- `src/lib/constants` contains shared app constants and fallback option lists.
- `src/lib/supabase` contains Supabase client/server setup and generated database types.
- `src/lib/utils` contains reusable formatting, validation, and class-name helpers.
- `src/types` exposes domain contracts for provider, request, auth, and admin code.
- `src/data/fallback` contains fallback data entrypoints for unconfigured environments.
- `src/styles` contains global styles.

## Supporting Files

- `docs/deployment` contains deployment guides.
- `docs/backend` contains Supabase and backend operation notes.
- `docs/architecture` contains architecture plans and structure notes.
- `docs/analytics` contains analytics setup.
- `supabase/migrations` contains the canonical ordered Supabase schema and RLS migration chain.
- `supabase/seed` contains database seed SQL.
