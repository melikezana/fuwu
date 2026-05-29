# Trust Layer and Provider Reputation

This document defines the Fuwu trust layer for public provider discovery, emergency requests, and admin maintenance.

## Trust System

Provider trust signals are stored on the provider profile and rendered as compact public badges:

- **Fuwu Onaylı**: `providers.is_verified = true`
- **Kimlik Doğrulandı**: `providers.identity_verified = true`
- **Telefon Doğrulandı**: `providers.phone_verified = true`
- **Son 24 Saatte Aktif**: `providers.last_active_at` is within the last 24 hours

Badges are shown only when the backing provider data exists. The UI must not invent verification states for providers.

## Verification Rules

Admin users can publish/unpublish providers through `is_approved`, activate/deactivate providers through `is_active`, and add/remove the Fuwu verification badge through `is_verified`.

Phone and identity verification are independent provider fields. They should only be enabled after the matching operational check is completed.

## Profile Completion Logic

The completion score is calculated from six fields:

- profile photo
- phone
- district
- services/category
- description
- availability and working hours

Each completed field contributes one sixth of the score. Admin sees missing field names so operations can quickly repair incomplete profiles.

## Response Speed Logic

Average response speed comes from `providers.response_time_minutes`.

- Valid positive values render as `Ortalama cevap: X dk`
- Empty or invalid values render as `Yeni Usta`

No random or synthetic response time values should be generated.

## Working Hours and Availability

Supported working-hour values:

- `09:00-18:00`
- `09:00-22:00`
- `7/24`

The public status is derived from working hours and provider availability:

- `Müsait` when the provider is currently inside working hours and not marked busy/offline
- `Yakında müsait` when the provider is before the opening window or marked busy
- `Şu anda çevrimdışı` when the provider is outside the working window or marked offline

## Admin Workflow

Admin provider tools support:

- activate or deactivate a provider
- publish or unpublish a provider
- verify or unverify the Fuwu badge
- update availability
- update working hours
- update average response time
- inspect profile completion score and missing fields

All admin writes continue to require the existing authenticated admin role checks.

## Emergency Trust Flow

After an emergency request is created, the customer sees:

- `Acil talebiniz uygun ustalara iletildi.`
- ETA estimate when available
- notified provider count when count data is available
- payment preference
- verification-code status

The flow does not show a fake provider assignment. Assignment only appears after a real provider/admin action.
