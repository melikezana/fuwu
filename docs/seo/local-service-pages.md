# Local Service Pages Plan

Fuwu should grow local SEO pages from real marketplace supply, not from empty route generation. Turkish remains the default language and pages should only be published when they can show useful local provider, service, and trust content.

## Candidate routes

- `/istanbul/tesisat`
- `/kadikoy/temizlik`
- `/sisli-elektrik`
- `/istanbul/hali-yikama`

## Scalable route model

Use two route families once provider coverage is strong enough:

- City + service: `/:city/:service`
- District + service: `/:district-:service`

Each published page should resolve from normalized `districts` and `service_categories` records. Avoid hard-coded duplicate route lists; generate metadata and canonical URLs from the same source used by provider filters.

## Publish criteria

- At least one approved and active provider for the target area/service, or a clear nearby-provider fallback.
- Service category and district are active in Supabase.
- Page has unique Turkish title, description, FAQ, and provider list content.
- No private request, phone owner, address, or admin-only data is rendered.

## Page content

Each local page should include:

- Localized H1 such as `Kadıköy Temizlik Ustaları`.
- Filtered provider cards with availability, price range, rating, and WhatsApp lead buttons.
- Short service explanation focused on the local need.
- Nearby districts or related services.
- FAQ entries based on real customer questions once available.

## Technical notes

- Keep `/providers` as the canonical filtered marketplace until local pages are ready.
- Set `noindex` for thin, empty, or highly granular filter pages.
- Use server-side Supabase reads through existing public provider services.
- Do not create mass static pages until sitemap growth, internal links, and content quality are reviewed.
