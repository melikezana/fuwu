# Live Auth and Provider Application Repair

## Overview
This document outlines the fixes applied to production to ensure Google/Email Logins fully complete and to fix Provider Application submissions based on the live database schema.

## 1. Auth Callback and Profile Creation
If the `profiles` table does not automatically populate when an `auth.users` row is created, Google or Email login flows complete the OAuth/OTP exchange but users still face issues.
- **Fix:** In `src/app/auth/callback/route.ts`, after `supabase.auth.exchangeCodeForSession(code)` succeeds, we explicitly call `upsert` on the `profiles` table to create a profile entry using the metadata (name) provided by Google.
- **Resilience:** If the profile upsert fails, it only logs a warning but proceeds to redirect so the user's auth session is not blocked.

## 2. Provider Application Insert
The `provider_applications` live table was crashing because it did not expect `profile_image_path` or `profile_image_url` columns. The frontend was blindly appending these.
- **Fix:** Stripped `profile_image_path` and `profile_image_url` from the insert payload in `src/services/providers/applications.ts` and from the TypeScript interface `Insert` types in `types.ts`.
- **Validation:** The payload now exactly matches: `id, full_name, phone, category_id, district_id, experience_years, availability, has_equipment, introduction, portfolio_url, status`.
- **Foreign Keys:** Category and District names correctly undergo a lookup to resolve to UUIDs prior to insert.
- **Error Visibility:** Improved error messaging precisely to: *"Başvuru gönderilemedi. Lütfen bilgileri kontrol edip tekrar deneyin."*

## 3. Safe Logging
In the event of an insert error, `handleServiceError` logs the `tableName`, `payloadKeys`, and Supabase error details ONLY in development environments (`NODE_ENV !== "production"`). Production handles errors without leaking SQL internals to the client.

## Manual Test Checklist
- [ ] Attempt Google login -> Should redirect to home and create a row in the `profiles` table.
- [ ] Attempt Email Magic Link login -> Should behave the same as Google login.
- [ ] Submit a Provider Application -> Should succeed and create a row in `provider_applications` without triggering a 500 error on unknown columns.
