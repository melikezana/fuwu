# Provider Data Flow & Architecture

This document describes how provider data is modeled, queried, mapped, and displayed securely in the Fuwu frontend, ensuring zero exposure of sensitive keys and high layout stability.

## Provider Table Fields

The current `providers` table holds essential information:
- `id` (UUID), `user_id` (UUID, relation to auth)
- `name`, `phone`, `whatsapp`
- `description`, `experience_years`, `rating`
- `average_price_min`, `average_price_max`
- `is_active`, `is_approved`
- `category_id`, `district_id`
- `created_at`, `updated_at`

*Note: There is currently no database column for `availability`. Usage across the admin and provider public boards safely falls back to a query without `availability` if a column check fails.*

## Public Provider Listing & Visibility

The `fetchProvidersFromSupabase` function exclusively retrieves providers where:
```sql
is_active = true
AND is_approved = true
```
If a provider lacks approval or becomes inactive, they will **not** appear on the public marketplace `/providers` page, avoiding premature exposure to end customers. No mock/sample providers will be forcefully merged alongside database providers in production if `source === "supabase"`.

## Category and District Joins

Category and district data points are relational. Supabase fetches these via foreign key joins within the selection string:
```typescript
category:service_categories(name, slug),
district:districts(name, slug)
```
If the join results in multiple items (array), the fallback helper `getRelationName` safely retrieves the first available name without crashing the mapping layer.

## WhatsApp Message Generation

A dynamic lead message is injected into the provider's WhatsApp URL whenever a customer clicks the WhatsApp CTA:
```typescript
const message = encodeURIComponent(
  `Merhaba, Fuwu üzerinden ulaşıyorum. ${provider.district} için ${provider.category} hizmeti almak istiyorum.`
);
```
This safely inserts the fetched relational `district` and `category` directly into the encoded message URL.

## Future Availability Migration

In the future, an `availability` enum or text column might be officially added to the database to support values like `"müsait"`, `"yoğun"`, or `"çevrimdışı"`.
Currently, UI components utilizing `availability` fallback correctly if it is undefined.
When the schema migration is deployed on Supabase, the Supabase `fetchProvidersFromSupabase` queries will seamlessly begin mapping the column without frontend codebase modifications.
