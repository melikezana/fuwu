# Fuwu Production Backend Monitoring

This checklist prepares backend operations without adding paid services, real keys, or frontend service-role usage.

## Future Sentry Plan

- Add Sentry only through server-safe environment variables.
- Capture sanitized server action and service errors from `src/lib/errors`.
- Keep public UI messages Turkish and friendly; never forward raw Supabase errors.
- Redact keys, tokens, cookies, phone numbers when used outside operational context, and long payloads before sending events.
- Tag events by workflow: `providers`, `provider_applications`, `service_requests`, `admin`, `analytics`.

## Uptime Monitoring Plan

- Monitor `/`, `/providers`, `/login`, and `/admin` for basic availability.
- Add a lightweight health route later if the project needs a dedicated backend check.
- Alert on repeated 5xx responses, slow responses, and failed deploy health checks.
- Keep checks read-only and anonymous; do not use admin credentials or service-role keys.

## Supabase Logs Checklist

- Review Auth errors for login and session failures.
- Review PostgREST errors for RLS denials, schema mismatches, and invalid status updates.
- Watch `provider_applications` inserts and admin approval updates.
- Watch `service_requests` inserts and status changes.
- Watch `providers` publication changes: `is_active`, `is_approved`, `availability`.
- Confirm no frontend request uses a service-role key.

## Admin Operation Audit Checklist

- Confirm approval, rejection, provider publication, and request status changes write to `audit_logs`.
- Review duplicate provider approval attempts for `application-already-approved` and `application-approved-provider-exists`.
- Check status transition failures for requests that skip the operational sequence.
- Confirm audit metadata stores IDs and result codes, not secrets.
- Periodically compare admin actions with expected RLS policies.

## Analytics Event Checklist

- Track page views, provider detail opens, WhatsApp clicks, phone clicks, filter usage, request submits, and provider application submits.
- Keep event payloads small: category, district, provider ID, source, request code, and mode only.
- Do not send addresses, full descriptions, secret values, or raw Supabase errors.
- Verify analytics stays disabled unless explicit public analytics environment flags are set.
- Use development logs only for local debugging.
