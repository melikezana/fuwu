# FUWU Fusion — Individual local acceptance results

22 October 2026. External Google, real iyzico sandbox and authenticated full Supabase E2E remain BLOCKED, not PASS.

## Database / RLS / concurrency

| # | Expected invariant | Actual |
| --- | --- | --- |
| 1 | Catalog has product definitions and no invented provider offerings | PASS — runner assertions satisfied |
| 2 | Only store owner can change offerings, including ownerless profile | PASS — runner assertions satisfied |
| 3 | Variant must belong to the offered service | PASS — runner assertions satisfied |
| 4 | Slots use Istanbul timezone, service duration and weekly hours | PASS — runner assertions satisfied |
| 5 | Wrong service region and past day expose no slots | PASS — runner assertions satisfied |
| 6 | Time off closes all slots | PASS — runner assertions satisfied |
| 7 | Inactive and unapproved providers cannot be purchased | PASS — runner assertions satisfied |
| 8 | Client price manipulation rejected before reservation | PASS — runner assertions satisfied |
| 9 | Two separate concurrent transactions: exactly one can reserve the same slot | PASS — runner assertions satisfied |
| 10 | Overlapping start times blocked, adjacent appointment stays available | PASS — runner assertions satisfied |
| 11 | 10 percent commission stored separately in minor units | PASS — runner assertions satisfied |
| 12 | Legacy assignment cannot bypass a held commerce slot | PASS — runner assertions satisfied |
| 13 | Legacy reservation blocks its full day until duration is reconciled | PASS — runner assertions satisfied |
| 14 | RLS isolates customer, assigned provider, other provider and admin | PASS — runner assertions satisfied |
| 15 | Payment session has a single initializer and no public token access | PASS — runner assertions satisfied |
| 16 | Verified payment confirms once and duplicate callback is idempotent | PASS — runner assertions satisfied |
| 17 | Only assigned provider advances paid order, completion requires customer code | PASS — runner assertions satisfied |
| 18 | Only completed order owner can review; real rating aggregated | PASS — runner assertions satisfied |
| 19 | Completion payout has one durable external-operation claim | PASS — runner assertions satisfied |
| 20 | Hold idempotency returns the same order without extending expiry | PASS — runner assertions satisfied |
| 21 | Expired holds immediately stop blocking, before cron cleanup | PASS — runner assertions satisfied |
| 22 | Late paid callback becomes REFUND_PENDING and never steals a rebooked slot | PASS — runner assertions satisfied |
| 23 | Refund is only final after verified processor completion and cannot be claimed twice | PASS — runner assertions satisfied |
| 24 | Failed payment releases the slot | PASS — runner assertions satisfied |
| 25 | Expiry cleanup is restricted and idempotent | PASS — runner assertions satisfied |
| 26 | Admin finance RPC rejects customers, providers and guests | PASS — runner assertions satisfied |
| 27 | Server financial totals separate successful GMV, commission, refunds and sandbox environment | PASS — runner assertions satisfied |
| 28 | Provider finance is scoped and reports processor costs separately | PASS — runner assertions satisfied |
| 29 | Participant finance has no token, URL, external transaction ID or completion code | PASS — runner assertions satisfied |
| 30 | Saved address RLS prevents spoofed owner and cross-customer reads or deletes | PASS — runner assertions satisfied |
| 31 | Order and payment changes write redacted audit records atomically | PASS — runner assertions satisfied |
| 32 | Real order transitions notify both participants with safe order links | PASS — runner assertions satisfied |
| 33 | Users cannot forge commerce notifications or edit notification content | PASS — runner assertions satisfied |
| 34 | Captured payment date survives settlement updates | PASS — runner assertions satisfied |
| 35 | Admin refund requests cannot invent payment success or refund an unpaid order | PASS — runner assertions satisfied |
| 36 | Historical refund and payout share one durable claim; no duplicate external operation | PASS — runner assertions satisfied |
| 37 | Catalog definitions and variants are admin-only and never fabricate provider prices | PASS — runner assertions satisfied |
| 38 | Customer cannot self-promote by profile insert or role update | PASS — runner assertions satisfied |
| 39 | Role and commission changes create database audit evidence | PASS — runner assertions satisfied |
| 40 | Order retains included/excluded scope when catalogue changes | PASS — runner assertions satisfied |

Evidence: `database-tests.json`. Exact expected values are asserted in the corresponding test runner.

## Payment / mocked processor HTTP

| # | Expected invariant | Actual |
| --- | --- | --- |
| 1 | Verified matching result accepted | PASS — runner assertions satisfied |
| 2 | Verified failed result is a failed payment | PASS — runner assertions satisfied |
| 3 | Reject tampered or non-final status | PASS — runner assertions satisfied |
| 4 | Reject tampered or non-final token | PASS — runner assertions satisfied |
| 5 | Reject tampered or non-final conversationId | PASS — runner assertions satisfied |
| 6 | Reject tampered or non-final basketId | PASS — runner assertions satisfied |
| 7 | Reject tampered or non-final currency | PASS — runner assertions satisfied |
| 8 | Reject tampered or non-final price | PASS — runner assertions satisfied |
| 9 | Reject tampered or non-final paidPrice | PASS — runner assertions satisfied |
| 10 | Reject tampered or non-final paymentId | PASS — runner assertions satisfied |
| 11 | Reject tampered or non-final fraudStatus | PASS — runner assertions satisfied |
| 12 | Reject tampered or non-final paymentStatus | PASS — runner assertions satisfied |
| 13 | Reject tampered or non-final itemTransactions | PASS — runner assertions satisfied |
| 14 | Reject mismatched provider payout | PASS — runner assertions satisfied |
| 15 | Reject mismatched item identity | PASS — runner assertions satisfied |
| 16 | Payout approval requires successful matching external transaction | PASS — runner assertions satisfied |
| 17 | Refund requires matching external transaction, full amount and TRY | PASS — runner assertions satisfied |
| 18 | Live payment endpoint is always disabled | PASS — runner assertions satisfied |
| 19 | Sandbox configuration accepted | PASS — runner assertions satisfied |
| 20 | Hosted checkout only accepts known sandbox HTTPS origins | PASS — runner assertions satisfied |
| 21 | Webhook signature rejects unsigned payloads and accepts exact HMAC | PASS — runner assertions satisfied |
| 22 | Sandbox initialization preserves server amount, TRY and 10 percent split (mock HTTP) | PASS — runner assertions satisfied |
| 23 | Server retrieves processor result using authenticated sandbox request (mock HTTP) | PASS — runner assertions satisfied |

Evidence: `payment-tests.json`. Exact expected values are asserted in the corresponding test runner.

## OAuth / mocked Auth HTTP + real SSR cookies

| # | Expected invariant | Actual |
| --- | --- | --- |
| 1 | Open redirect denied: "https://evil.test" | PASS — runner assertions satisfied |
| 2 | Open redirect denied: "//evil.test" | PASS — runner assertions satisfied |
| 3 | Open redirect denied: "/\\evil.test" | PASS — runner assertions satisfied |
| 4 | Open redirect denied: "/\t/evil.test" | PASS — runner assertions satisfied |
| 5 | Open redirect denied: "/\n/evil.test" | PASS — runner assertions satisfied |
| 6 | Open redirect denied: "/%2f%2fevil.test" | PASS — runner assertions satisfied |
| 7 | Open redirect denied: "/%5cevil.test" | PASS — runner assertions satisfied |
| 8 | Open redirect denied: "/%09/evil.test" | PASS — runner assertions satisfied |
| 9 | Open redirect denied: "javascript:alert(1)" | PASS — runner assertions satisfied |
| 10 | Open redirect denied: "/%invalid" | PASS — runner assertions satisfied |
| 11 | Callback stays on its initiating origin: https://www.fuwu.com.tr | PASS — runner assertions satisfied |
| 12 | Callback stays on its initiating origin: https://fuwu.com.tr | PASS — runner assertions satisfied |
| 13 | Callback stays on its initiating origin: https://fuwu-preview.vercel.app | PASS — runner assertions satisfied |
| 14 | Callback stays on its initiating origin: http://localhost:3000 | PASS — runner assertions satisfied |
| 15 | Safe next retains service selection parameters | PASS — runner assertions satisfied |
| 16 | Loopback OAuth callback retains 127.0.0.1 cookie origin without trusting arbitrary Host | PASS — runner assertions satisfied |
| 17 | PKCE exchange and verified user precede profile creation | PASS — runner assertions satisfied |
| 18 | Expired/invalid PKCE code never creates a profile | PASS — runner assertions satisfied |
| 19 | Missing verified user cannot continue checkout | PASS — runner assertions satisfied |
| 20 | Auth network failure returns an actionable error | PASS — runner assertions satisfied |
| 21 | Profile failure is not reported as completed sign-in | PASS — runner assertions satisfied |
| 22 | Refreshed SSR cookie reaches both response and downstream server request | PASS — runner assertions satisfied |
| 23 | Public service page also refreshes an existing session | PASS — runner assertions satisfied |
| 24 | User-editable admin metadata grants no admin access; redirect retains renewed cookies | PASS — runner assertions satisfied |
| 25 | Unauthenticated redirect preserves page and query for login resume | PASS — runner assertions satisfied |

Evidence: `auth-tests.json`. Exact expected values are asserted in the corresponding test runner.

## Actual Next.js guest application

| # | Expected invariant | Actual |
| --- | --- | --- |
| 1 | home at all seven widths | PASS — runner assertions satisfied |
| 2 | catalog at all seven widths | PASS — runner assertions satisfied |
| 3 | service at all seven widths | PASS — runner assertions satisfied |
| 4 | providers at all seven widths | PASS — runner assertions satisfied |
| 5 | login at all seven widths | PASS — runner assertions satisfied |
| 6 | Homepage service search | PASS — runner assertions satisfied |
| 7 | Protected customer, provider and admin routes | PASS — runner assertions satisfied |
| 8 | Guest commerce mutations and unauthenticated cron | PASS — runner assertions satisfied |
| 9 | Actual OAuth denial and malicious redirect | PASS — runner assertions satisfied |

Evidence: `app-browser-tests.json`. Exact expected values are asserted in the corresponding test runner.

## React component fixture UI

| # | Expected invariant | Actual |
| --- | --- | --- |
| 1 | Real booking component with explicit fixture API: district, provider, slot, address and authoritative-price expectation payload | PASS — runner assertions satisfied |
| 2 | Variant updates price and duration in real booking component | PASS — runner assertions satisfied |
| 3 | Slot API failure and empty day disable purchase and show actionable feedback | PASS — runner assertions satisfied |
| 4 | Pending checkout, confirmed progress, provider completion and store component fixtures fit seven widths; provider submits completion code | PASS — runner assertions satisfied |
| 5 | Store component saves selected price, service, region and working hours via fixture API | PASS — runner assertions satisfied |
| 6 | Guest checkout 401 retains provider, slot and address draft across reload; login return is internal | PASS — runner assertions satisfied |
| 7 | Admin read-only order view has no customer mutation controls | PASS — runner assertions satisfied |
| 8 | Provider/package deep link selects the intended variant and does not inherit another booking draft | PASS — runner assertions satisfied |
| 9 | Expired hold cannot offer a payment action | PASS — runner assertions satisfied |
| 10 | Real admin metrics component distinguishes test GMV, commission, refunds and payouts at all seven widths | PASS — runner assertions satisfied |

Evidence: `components/browser-tests.json`. Exact expected values are asserted in the corresponding test runner.

## Existing Playwright suite

7 passed: homepage CSP, login CSP, unauthenticated admin CSP, and guest redirects for /admin, /provider-dashboard, /account, /dashboard. Expected: nonce CSP without violations; protected paths redirect to login. Actual: PASS. Evidence: `playwright-final.log`.
