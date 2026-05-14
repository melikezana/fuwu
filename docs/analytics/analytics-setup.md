# Fuwu Analytics and Error Monitoring Setup

This document prepares Fuwu for production growth tracking. It does not activate real analytics, add live tracking IDs, expose secret keys, or change the public website.

Current status:

- Google Analytics helper structure exists in `src/lib/analytics.ts`.
- Analytics remain disabled unless environment variables are explicitly configured.
- Vercel Web Analytics is documented for future enablement, but the package and layout component are not installed yet.
- Sentry is documented as the future production error monitoring path, but the SDK is not installed yet.

## Environment Variables

Use placeholders in `.env.example` and real values only in `.env.local` or Vercel environment variables.

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_ANALYTICS_DEBUG=false
NEXT_PUBLIC_GA_MEASUREMENT_ID=

NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Notes:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` is a public browser value such as `G-XXXXXXXXXX`; do not hardcode it in source files.
- `NEXT_PUBLIC_ANALYTICS_ENABLED` must stay `false` until tracking, consent, and production release rules are approved.
- `NEXT_PUBLIC_SENTRY_DSN` is public by design, but still should be configured through environment variables.
- `SENTRY_AUTH_TOKEN` is secret. Store it only in Vercel or CI secrets and never expose it with a `NEXT_PUBLIC_` prefix.

## Google Analytics Preparation

The helper in `src/lib/analytics.ts` centralizes event names and payloads. It is intentionally no-op by default:

- It sends nothing when `NEXT_PUBLIC_ANALYTICS_ENABLED` is not `true`.
- It sends nothing when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is missing.
- It sends nothing when the Google tag is not loaded.
- It can print local debug messages only when `NEXT_PUBLIC_ANALYTICS_DEBUG=true`.

Future integration steps:

1. Create a GA4 property and web data stream.
2. Add the measurement ID to Vercel as `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
3. Set `NEXT_PUBLIC_ANALYTICS_ENABLED=true` only after consent and privacy checks are ready.
4. Add the Google tag loader in the root layout or a dedicated analytics component.
5. Wire UI events to the typed helper functions.
6. Verify events in GA4 Realtime or DebugView before marking them as production key events.

Google's event model uses `gtag("event", eventName, parameters)`, so the Fuwu helper mirrors that shape while keeping event names consistent.

## Vercel Analytics Preparation

Vercel Web Analytics can be enabled later without adding tracking IDs to the repository.

Future setup:

1. In the Vercel dashboard, open the Fuwu project.
2. Go to the Analytics section and click Enable.
3. Install the package:

```bash
npm install @vercel/analytics
```

4. Add the component to `src/app/layout.tsx`:

```tsx
import { Analytics } from "@vercel/analytics/next";

// inside <body>, after the app content:
<Analytics />
```

5. Deploy to Vercel and confirm data appears in the Vercel dashboard.

This task does not install `@vercel/analytics` or add `<Analytics />`, because that would prepare pageview collection before the final production tracking decision.

## Error Monitoring Preparation

Sentry is the planned production error monitoring tool. Add it only when the project is ready to send real errors.

Future Sentry setup:

1. Create a Sentry organization and Next.js project.
2. Install the SDK:

```bash
npm install @sentry/nextjs --save
```

3. Add environment variables in Vercel:

```env
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

4. Add Sentry config files for the App Router:

- `instrumentation-client.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`
- optional `src/app/global-error.tsx`

5. Wrap `next.config.ts` with `withSentryConfig` only after the SDK is installed.
6. Upload source maps from CI using `SENTRY_AUTH_TOKEN`; never commit that token.
7. Configure conservative production sample rates before enabling tracing or replay.

Recommended Sentry defaults for Fuwu:

- Capture unhandled client and server errors.
- Strip form payloads and contact details before sending events.
- Keep `sendDefaultPii` disabled unless there is a documented legal/privacy reason.
- Start with low tracing and replay sample rates.
- Tag errors with route, runtime, release, and environment.

## Console-Safe Logging

Production logging should be sanitized and intentional.

Rules:

- Do not log full names, phone numbers, email addresses, addresses, request descriptions, profile image file names, Supabase tokens, auth tokens, or raw form payloads.
- Use `console.info`, `console.warn`, and `console.error` only for development diagnostics unless a future logger routes sanitized messages to Sentry.
- Prefer structured context such as `route`, `provider_id`, `category`, `district`, `status`, and `error_code`.
- In production, report sanitized exceptions to Sentry after it is configured instead of relying on browser console output.
- Keep user-facing errors generic and operational logs specific but privacy-safe.

## Event Strategy

All event names use lowercase snake_case. Payloads must avoid direct personal data.

| Event | Trigger | Suggested parameters | Notes |
| --- | --- | --- | --- |
| `provider_profile_view` | Provider detail page becomes visible | `provider_id`, `category`, `district`, `source` | Track interest in specific provider profiles. |
| `whatsapp_click` | User clicks a WhatsApp action | `provider_id`, `category`, `district`, `source` | Candidate key event for lead intent. |
| `phone_click` | User clicks a Telefon action | `provider_id`, `category`, `district`, `source` | Candidate key event for lead intent. |
| `request_submit` | Service request is successfully submitted | `request_code`, `category`, `district`, `urgency_level`, `source` | Fire only after a successful backend response. Do not send address, phone, name, or description. |
| `provider_application_submit` | Provider application is successfully submitted | `category`, `service_area`, `mode` | Fire only after a successful backend response. Do not send phone, applicant name, or file details. |
| `login_attempt` | User starts, succeeds, fails, or is blocked from a login method | `method`, `status` | Track method health without sending email or phone values. |

Suggested key events once analytics is approved:

- `whatsapp_click`
- `phone_click`
- `request_submit`
- `provider_application_submit`

## Helper Examples

The helper functions are ready for future wiring. They are safe to import today because they remain no-op unless analytics is explicitly enabled and the Google tag exists.

Provider profile view:

```tsx
import { trackProviderView } from "@/lib/analytics";

trackProviderView({
  providerId: provider.id,
  category: provider.category,
  district: provider.district,
  source: "provider_detail",
});
```

WhatsApp click:

```tsx
import { trackWhatsappClick } from "@/lib/analytics";

trackWhatsappClick({
  providerId: provider.id,
  category: provider.category,
  district: provider.district,
  source: "provider_card",
});
```

Request submit:

```tsx
import { trackRequestSubmit } from "@/lib/analytics";

trackRequestSubmit({
  requestCode: result.requestCode,
  category: normalizedRequest.serviceCategory,
  district: normalizedRequest.district,
  urgencyLevel: normalizedRequest.urgencyLevel,
  source: "request_form",
});
```

Login attempt:

```tsx
import { trackLoginAttempt } from "@/lib/analytics";

trackLoginAttempt({
  method: "email",
  status: "attempted",
});
```

## Production Rollout Checklist

Before enabling real analytics:

- Confirm cookie consent, privacy policy, and user notification requirements.
- Confirm the final GA4 property and Vercel project.
- Add real environment variables only in Vercel or `.env.local`.
- Add the Google tag loader or Vercel Analytics component in a small PR.
- Wire one event at a time and verify it in a preview deployment.
- Confirm no event includes private contact details or raw form text.
- Add Sentry only with sanitized defaults and secret source-map token handling.
- Run `npm run build` before deployment.

## References

- Google Analytics events: https://developers.google.com/analytics/devguides/collection/ga4/events
- Vercel Web Analytics: https://vercel.com/docs/analytics/quickstart
- Sentry for Next.js manual setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
