# Fuwu Security and Error Handling

This document describes the production security, validation, logging, and error-handling foundation added for the current domain-based Fuwu architecture.

## Error Handling Architecture

Shared error utilities live in `src/lib/errors`.

- `AppError` is the base operational error. It carries an internal `message`, stable `code`, HTTP-like `statusCode`, and safe Turkish `publicMessage`.
- `ValidationError` is used for invalid form or action input.
- `AuthError` is used when a user must sign in.
- `PermissionError` is used when a signed-in user lacks access.
- `NotFoundError` is used when a requested record or lookup is missing.
- `DatabaseError` wraps Supabase and persistence failures without exposing database details.
- `handleServiceError(error)` converts unknown or Supabase-like failures into safe `AppError` instances and logs sanitized internal context.
- `getPublicErrorMessage(error)` is the only helper UI code should use when showing caught service errors.

User-facing errors must stay friendly and Turkish, for example:

- `İşlem sırasında bir sorun oluştu. Lütfen tekrar dene.`
- `Bu işlem için giriş yapmalısın.`
- `Bu alana erişim yetkin yok.`
- `Kayıt bulunamadı.`

Raw Supabase errors, SQL details, table names, constraint names, tokens, and stack traces must never be shown directly to users.

## Validation Strategy

Shared validation utilities live in `src/lib/validations`.

- `sanitizeText()` removes control characters, strips angle brackets, normalizes spacing, trims, and caps length.
- `sanitizePhone()` normalizes common Turkish phone inputs into a compact international form.
- `sanitizeEmail()` trims and lowercases email input.
- `normalizeTurkishText()` creates search/filter-friendly Turkish-normalized text.
- `validateProviderApplicationInput()` validates provider application form input.
- `validateServiceRequestInput()` validates service request form input.
- `validateLoginEmailInput()` validates email login input.
- `validateReviewInput()` validates future review submission input.

Validation stays lightweight TypeScript because `zod` is not currently installed. If a schema library is introduced later, keep the public return shape compatible or migrate forms and services together.

## Logging Rules

Shared logging utilities live in `src/lib/logger`.

- Use `logInfo()`, `logWarn()`, and `logError()` instead of direct `console.*`.
- Development logs go to the console with redacted context.
- Production logging is intentionally a no-op until a monitoring backend is configured.
- Future Sentry integration should send only sanitized breadcrumbs and errors.

Never log:

- passwords
- secret keys
- full auth tokens
- cookies or authorization headers
- private environment variable values
- raw form payloads containing user contact details
- Supabase `details` or `hint` fields when they may expose database internals

## Security Utilities

Shared security utilities live in `src/lib/security`.

- `securityHeaders.ts` defines recommended headers for Next/Vercel:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - a documented `Content-Security-Policy` placeholder
- `safeRedirect.ts` only allows internal redirect paths and falls back to `/` or a supplied fallback route.
- `rateLimit.ts` provides a local in-memory foundation for simple limits.

The current Next config applies the non-CSP headers globally. CSP is documented but not enabled yet because it needs a full audit of scripts, images, fonts, and Supabase endpoints.

## Future Sentry Plan

When Sentry is added:

- initialize it through the official Next.js setup
- send sanitized `AppError` metadata only
- keep `publicMessage` separate from internal `message`
- do not attach full request bodies or form payloads
- scrub tokens, cookies, passwords, and environment values in `beforeSend`
- tag errors by domain, for example `auth`, `providers`, `requests`, `admin`

## Future Rate Limiting Plan

The in-memory rate limiter is safe as a placeholder but is not enough for distributed production enforcement.

Before launch, move high-value limits to Upstash or Redis:

- login and magic-link requests
- provider application submissions
- service request submissions
- admin write actions
- review submissions

Use a key format that avoids storing raw personal data. Prefer hashed email/IP/user IDs when persistent tracking is required.

## Supabase RLS Reminder

Client-side validation and service checks are not authorization boundaries. Supabase Row Level Security must stay enabled and tested for:

- `profiles`
- `providers`
- `provider_applications`
- `service_requests`
- `reviews`
- storage buckets such as `provider-images`

Admin actions must require an authenticated admin profile and matching RLS policies. Never rely only on hidden UI routes.

## Production Security Checklist

- Confirm `.env.local` and Vercel environment variables contain no committed secrets.
- Keep anon keys public only; never expose service-role keys in the browser.
- Verify Supabase RLS policies for every table and bucket.
- Test login callback redirects with external, protocol-relative, and malformed `next` values.
- Enable CSP after auditing all required sources.
- Add distributed rate limiting for auth and write-heavy endpoints.
- Add Sentry with strict scrubbing.
- Confirm forms show only safe Turkish errors.
- Confirm `npm run build` passes before deploy.
