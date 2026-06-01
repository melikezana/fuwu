# Supabase OAuth Session Callback Fix

## Overview
This document outlines the repairs deployed for Google OAuth and Email Magic Link callback session persistence failures.

## Root Cause
When the application is deployed behind a reverse proxy (like Vercel), the application process evaluates `request.nextUrl.origin` dynamically based on internal routing headers (often resolving to an internal domain like `fuwu.vercel.app` rather than the requested domain `fuwu.com`). 
If a user authenticates on `fuwu.com`, Supabase's `exchangeCodeForSession` successfully acquires the session and attempts to `Set-Cookie`. However, if `NextResponse.redirect` forwards the user to the `request.nextUrl.origin` internal domain, the browser treats it as a cross-origin jump and **drops the auth session cookies**, resulting in the user appearing "logged out" after returning to the application.

## 1. Route Refactoring
`src/app/auth/callback/route.ts` was refactored to align with the latest official `@supabase/ssr` specification:
- **`x-forwarded-host` Parsing**: Before redirecting, the route checks the `x-forwarded-host` HTTP header.
- **Proxy Matching**: If `x-forwarded-host` exists (and we are not in local dev), the redirect URL strictly utilizes `https://${forwardedHost}` instead of the volatile `origin`.
- **Cookie Preservation**: The browser stays perfectly on the requested domain, preserving all `sb-...-auth-token` session cookies.

## 2. Server Client Validation
- Checked `src/lib/supabase/server.ts` to ensure `cookieStore.getAll()` and `cookieStore.setAll()` are correctly utilized.
- Added warning logs in `catch` blocks to surface silent failures where Next.js React Server Component contexts prohibit cookie mutation.

## Verification
- [x] Verified `route.ts` strictly handles absolute URL reconstruction.
- [x] Confirmed callback gracefully falls back to `/login?error=auth-callback-failed` if the code verifier is invalid or session acquisition fails.
- [x] User Navbar state fully reads cookies and behaves correctly.
