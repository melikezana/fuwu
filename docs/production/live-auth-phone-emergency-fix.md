# Live Auth, Phone, and Emergency Request Fixes

## Overview
This document outlines the fixes applied to production regarding Google OAuth, Phone Login, and Emergency Request Creation.

## 1. Google OAuth Callback
Google login was failing to complete because `NextResponse.redirect` without `cookieStore.set` mapping causes session cookies to be lost on server redirects. We fixed `/auth/callback/route.ts` to log errors properly and redirect to `/login?error=...` if session exchange fails.

## 2. Phone OTP Login
Added phone login safely.
- If Supabase SMS provider is not configured, `signInWithPhoneOtp` correctly falls back and the UI shows: "Telefonla giriş şu anda aktif değil. Lütfen e-posta veya Google ile devam edin."
- Validations ensure 6-digit OTP codes and valid Turkish phone numbers.

## 3. Emergency Request Fix
The `emergency.ts` service was attempting to insert "future-ready" columns (`urgency_type`, `offered_price`, `payment_preference`, `confirmation_code`) into the live `service_requests` table, causing hard 500 crashes because these columns do not exist in the live schema yet.
- Fixed `requestInsert` to pack these variables safely into the `description` text instead.
- Allowed `user_id` to be inserted as `null` for unauthenticated guests, avoiding type and constraint mismatch.

## Verification Checklist
- [x] Google Login redirect fixed.
- [x] Phone OTP form added gracefully.
- [x] Emergency Request inserts safely using only live DB columns.
- [x] Error handling is robust without fake success messages.
