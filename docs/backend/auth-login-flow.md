# Supabase Auth Login Flow

This document details the configuration and behavior of the Supabase Authentication flow for Fuwu, covering Google OAuth and Email Magic Link login strategies.

## Overview

Fuwu uses a passwordless authentication flow via Supabase. All sensitive auth operations happen within the `/login` route, and callback exchanges happen inside the Next.js App Router at `/auth/callback`.

## Google OAuth Flow

**Implementation:** `signInWithGoogle` (via `@supabase/supabase-js`)
**Provider ID:** `google`

### Requirements
1. The Google Auth provider must be enabled in the Supabase Dashboard (`Authentication -> Providers -> Google`).
2. Google Cloud Platform (GCP) credentials (Client ID and Secret) must be provisioned and saved in Supabase.
3. The redirect URI within GCP must explicitly point to `https://[YOUR_SUPABASE_PROJECT].supabase.co/auth/v1/callback`.
4. If this is not set up correctly, attempting to log in will yield a safe, user-friendly error in Turkish.

## Email Magic Link Flow

**Implementation:** `signInWithEmailMagicLink`
**Supported Providers:** Gmail, iCloud, Outlook, Yahoo, and standard custom domains. (iCloud does not require a separate OAuth provider and functions simply as an email inbox).

### Requirements
1. Email provider must be enabled in the Supabase Dashboard (`Authentication -> Providers -> Email`).
2. **"Confirm email"** and **"Enable Magic Link log in"** toggles must be checked.
3. SMTP settings (if customized) should be correctly validated.
4. When the user inputs their email, a validation check occurs natively. On success, they receive an email link that directs them back to the `auth/callback` route.

## Callback Route (`/auth/callback`)

The callback is handled centrally by a Next.js App Route (`src/app/auth/callback/route.ts`).
1. It reads the PKCE `code` from the URL parameters.
2. It exchanges the `code` for a session securely server-side.
3. Errors are handled silently—they are caught in a `try/catch` block and the user is redirected safely to the fallback destination (usually `/providers` or `/`) instead of crashing the server.

## Required Environment Variables

The frontend architecture only requires the public, anonymized keys to instantiate the auth client. 
Ensure these are set in your deployment environment (e.g. Vercel) or `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: The project endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public API key

> **WARNING**: Never prefix the service role key with `NEXT_PUBLIC_` or use it anywhere in the frontend auth flow. Doing so poses a severe security risk.

## Admin and Provider Compatibility

- The `getCurrentProfile()` abstraction reliably provides the user's `role` (`admin` or `provider`).
- If a profile matches `role: 'admin'`, the Navbar will render the "Hesabım" button linking to `/admin`.
- If a profile matches `role: 'provider'`, the "Hesabım" button links to `/provider-dashboard`.
- If unauthenticated, the user experiences guest browsing securely and the Navbar renders "Giriş Yap".
