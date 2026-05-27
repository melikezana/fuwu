# Fuwu Notifications Plan

This document prepares the email notification direction without sending real email, adding provider credentials, or changing the public Turkish UI.

## Current Mock Layer

The helper functions live in `src/services/notifications/index.ts`:

- `notifyProviderApplicationSubmitted()`
- `notifyProviderApplicationApproved()`
- `notifyProviderApplicationRejected()`
- `notifyServiceRequestCreated()`
- `notifyEmergencyRequestDispatched()`

Today these helpers return a mock success response with `sent: false`. In development they also write a small console message that includes only safe event metadata such as application code, request code, or internal ids. They do not read API keys, do not call an email provider, and do not expose secrets.

## Trigger Points

The mock helpers are prepared at the service layer so future email delivery can be enabled without redesigning pages:

| Event | Current trigger point |
| --- | --- |
| Provider application submitted | After `submitProviderApplication()` creates a live or demo result |
| Provider application approved | After `approveAdminProviderApplication()` successfully approves the application and provider state |
| Provider application rejected | After `rejectAdminProviderApplication()` successfully rejects the application |
| Service request created | After `submitServiceRequest()` creates a service request |
| Emergency request dispatched | After an Acil Hizmet request is saved as `pending` for eligible providers/admin views |

## Emergency Notification Foundation

Acil Hizmet does not send real push, SMS, or WhatsApp messages yet. The safe foundation is:

- `service_requests.status = pending`
- `service_requests.emergency_status = pending`
- eligible provider/admin dashboards can surface the urgent request
- the customer UI says "Uygun ustalara bildirim gönderildi."

Future delivery channels should preserve the same service helper and add adapters in this order:

- Provider dashboard polling or realtime
- WhatsApp provider alert
- SMS provider alert
- Native/browser push notification

Do not expose full IBAN data in notifications. If IBAN is selected, send only the payment preference; IBAN details are shared after a provider accepts.

## Future Option: Resend

Resend is the simplest future path for transactional email from the Next.js side.

- Add `RESEND_API_KEY` only as a server-side environment variable.
- Send email from a server-only route, server action, or backend service.
- Keep all recipient lists and template rendering away from browser code.
- Keep the current mock helpers as the public service contract and replace their internals with a real adapter.

## Future Option: Supabase Edge Functions

Supabase Edge Functions can own notification delivery when Fuwu wants email to be closer to database events.

- Store provider API keys as Supabase function secrets.
- Call an Edge Function after service writes, or trigger it from database webhooks later.
- Keep retries and delivery logs in the backend.
- Keep service role keys and email provider keys out of Next.js client bundles.

## Email Templates

Future templates should be stored as versioned code, not inline strings spread through UI components.

Recommended first templates:

- Provider application received confirmation
- Provider application approved
- Provider application rejected
- New service request admin alert

Template requirements:

- Use Turkish customer-facing copy.
- Include only the minimum needed data.
- Avoid exposing internal admin notes, Supabase ids, service role details, or hidden status fields.
- Render both HTML and plain-text versions when real sending starts.

## Admin Notification Emails

Admin emails should be configured separately from user-facing emails.

- Use environment variables such as `ADMIN_NOTIFICATION_EMAILS` on the server.
- Support one or more comma-separated admin recipients.
- Send admin alerts for new provider applications and new service requests.
- Keep applicant and customer contact details limited to what admins need for operations.

## Rollout Steps

1. Keep the mock helpers in place until the product owner confirms sender domain, reply-to rules, and admin recipient policy.
2. Choose either Resend from the Next.js server or Supabase Edge Functions.
3. Add server-side environment variables and provider verification outside the public bundle.
4. Replace the mock internals with a real adapter while preserving the existing helper names.
5. Add delivery logging and non-blocking error handling so failed email attempts do not break public page flows.
