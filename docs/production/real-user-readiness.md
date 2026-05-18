# Real User Readiness

This note summarizes the production polish applied for public Fuwu usage without changing the current architecture or redesigning the marketplace experience.

## Trust Strategy

- Public provider surfaces use concrete signals only: `Onaylı Usta`, `Fuwu Güvencesi`, `Doğrulanmış Profil`, availability, rating, district, category, response speed, and direct contact actions.
- Trust copy avoids fake claims. Live provider trust signals are tied to approved Supabase provider records; fallback/preparation states are labelled clearly.
- Provider detail pages keep the CTA hierarchy simple: WhatsApp is the primary action, phone is secondary, and profile/list navigation is tertiary.
- Empty states avoid blame and explain the next useful action.

## Performance Notes

- Voice command accessibility UI is lazy-loaded because microphone and speech helpers are optional and should not block the main provider discovery path.
- Provider directory reads reuse the same provider result when there are no active filters, reducing duplicate list queries on the home and default directory views.
- Provider detail pages fetch related providers by category rather than reading every provider first.
- Provider cards avoid pre-detail analytics double counting; the detail page records the actual profile open event.
- Components remain split by responsibility: provider data stays in `services/providers`, analytics in `services/analytics`, and UI in components.

## Asset And Image Readiness

- Provider visuals now use a dedicated avatar component with stable dimensions.
- If a provider image URL is available later, `next/image` is used with fixed `sizes` to avoid layout shift.
- Category fallback visuals remain lightweight inline service icons, so cards stay fast even without provider photos.
- Supabase-hosted images are allowed through Next image remote patterns.

## Accessibility Notes

- Custom card-style radio controls now expose visible focus rings through `focus-within`.
- Public error and loading states use safe, readable messages with retry actions.
- Provider cards, filter controls, contact links, and floating help affordances keep explicit labels and larger touch targets.
- Result and empty states use live/status semantics where appropriate.

## SEO Readiness

- Shared metadata now has a title template, with generated SEO pages using absolute titles to avoid duplication.
- Canonical paths are normalized before being passed into page metadata.
- Open Graph and Twitter metadata continue to use the shared Fuwu defaults.
- Provider list and detail metadata remain dynamic and filter-aware; granular filtered result pages can stay no-indexed.

## Analytics Readiness

- Analytics events are centralized in `services/analytics`.
- Prepared events cover page views, provider detail opens, WhatsApp clicks, phone clicks, request submits, provider applications, and filter usage.
- Payloads intentionally avoid names, phone numbers, addresses, free-text request bodies, and other sensitive content.
- Google Analytics dispatch is gated by public environment flags; development/debug logging stays sanitized.

## Mobile-First Considerations

- Provider detail contact actions are available near the top on mobile, instead of only inside the desktop sidebar.
- Floating support uses a larger tap target and safe-area positioning.
- Filter controls keep selected values through navigation where practical, and category/district provider-card links merge with existing query params.
- Loading skeletons use stable blocks to reduce visual jumps during slower provider reads.

## Remaining Production Checks

- Connect production analytics only after confirming consent and cookie requirements.
- Keep legal/privacy copy reviewed before public launch.
- Confirm Supabase RLS and provider approval policies in staging with real accounts.
- Run mobile viewport QA after any major layout or navigation change.
