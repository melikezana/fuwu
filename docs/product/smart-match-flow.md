# Smart Match Flow

## Summary

Smart Match adds a guided customer flow on the Fuwu homepage without replacing the existing provider listing, provider profile, request, or admin flows.

The customer path is:

1. Hizmet seç
2. İlçe seç
3. Bütçe tercihi seç
4. Uygun ustaları göster

The flow is intentionally lightweight. It reads the same provider records used by the public directory and only ranks eligible live providers; it does not introduce fake provider data or require new Supabase columns.

## Matching Logic

The implementation lives in `src/services/matching`.

Main functions:

- `createMatchQuery()` normalizes service, district, budget tag, and notes into a safe query object.
- `getMatchedProviders()` reads matching providers through the existing provider service.
- `mapBudgetTagToPriceRange()` maps customer budget tags to price ranges.
- `rankProviders()` sorts eligible providers by match quality.

Rules:

- Category/service match is the first gate.
- District relevance is the second ranking signal.
- Budget tag is mapped against `average_price_min` and `average_price_max`.
- Providers must still satisfy the existing provider service rules: `is_active = true` and `is_approved = true`.
- Results are sorted by category relevance, district relevance, budget relevance, rating, completed jobs, and name.

The current Smart Match flow does not add or require any new database columns.

## Budget Tags

| Tag | Price mapping | Notes |
| --- | --- | --- |
| Ekonomik | up to 1,000 TL | Compares against provider starting range. |
| Standart | 1,000-2,500 TL | Allows overlapping provider ranges. |
| Premium | 2,500 TL and above | Compares against provider upper range. |
| Acil Hizmet | no hard price filter | Treated as urgent intent until real-time availability exists. |

`Acil Hizmet` currently prioritizes available providers during ranking where availability is known, but it does not require a new urgent-service column.

## Request Integration

Smart Match result cards include `Talep Oluştur`.

The request form can be prefilled from query params:

- `service`
- `district`
- `budget`
- `notes`

Budget is stored as part of the request description text instead of a new schema column. If `Acil Hizmet` is selected, the request form starts with the urgent option selected.

## Future Active Bidding Model

The current flow is directory-first: customers see suitable providers and can call, message, or create a request.

A future active bidding model can build on this without breaking the existing data model:

- Create a request with service, district, notes, preferred time, and budget tag.
- Notify eligible providers in the same category and relevant districts.
- Let providers submit an offer, ETA, and short note.
- Show customer ranked offers with provider profile, rating, ETA, and price.
- Allow customer acceptance, then assign the provider to the request.

Potential future tables:

- `request_offers`
- `provider_availability_windows`
- `provider_service_areas`
- `provider_budget_preferences`

These should be additive tables, not changes that block the current provider/request/admin backend.

## Martı TAG-like Evolution Path

1. Current: guided Smart Match with ranked provider results.
2. Next: create request from match result with prefilled details.
3. Later: notify eligible providers and collect active offers.
4. Mature: real-time offer feed with ETA, price, and acceptance state.
5. Advanced: demand heatmap, provider availability, surge/urgent pricing policy, and quality-based ranking.

The core principle stays the same: customer intent first, provider eligibility second, transparent choice before commitment.
