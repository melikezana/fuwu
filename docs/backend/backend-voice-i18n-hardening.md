# Backend, Voice and i18n Hardening

This note records the TASK 140 hardening pass for Fuwu. Turkish remains the
default language, the existing service boundaries stay in place, and frontend
code must not use a Supabase service role key.

## Backend hardening summary

- Provider listing keeps the existing availability-column guard and falls back
  safely when older Supabase schemas do not expose optional fields.
- Provider application submission no longer returns a fake success when the
  database insert fails or Supabase is not configured. Duplicate pending phone
  applications are blocked with a friendly message.
- Normal service request submission keeps required category, district, address,
  date and description validation, generates a request code, and blocks an
  already-open duplicate request for the same user/category/district.
- Admin moderation and provider assignment use server-side Supabase clients,
  friendly action codes, and provider eligibility checks before mutation.
- Provider assignment verifies request existence, provider existence, provider
  approval, active status, category compatibility, and non-terminal request
  status before updating.
- Payment preference, confirmation code and ETA fields are persisted on
  emergency requests, and provider assignment preserves or fills them safely.
- Logging sanitizes email and phone-like values before writing development logs.
  Raw Supabase errors are wrapped behind friendly public messages.

## Emergency request rules

Emergency creation must satisfy all of these rules before insert:

- `service` / service category is required and must match an active category.
- `district` is required and must match an active district.
- `offered_price` is required and must pass emergency price validation.
- `payment_preference` is required and normalized through the payment helper.
- `urgency_type` is persisted as `emergency`.
- `budget_tag` is persisted as `acil-hizmet`.
- `confirmation_code` is generated before insert.
- `status` and `emergency_status` start as `pending`.
- Duplicate open emergency requests for the same user/category/district are
  rejected.
- Admin request pages can read emergency metadata, including offered price,
  payment preference, confirmation code, ETA and tracking state.
- Provider assignment must not crash if the provider or request is missing; it
  returns a friendly action failure instead.

## Supported voice commands

Turkish commands are the primary command surface:

- `tesisat ara`
- `elektrik ara`
- `temizlik ara`
- `acil usta çağır`
- `profilleri oku`
- `sıfırla`
- `Kadıköy ustaları`
- `Sarıyer tesisat`

Voice command handling stays in client components. Browser-only APIs such as
`SpeechRecognition`, `webkitSpeechRecognition` and `speechSynthesis` must not be
used from server components.

## Browser support notes

- The voice button label is `Sesli Komut`.
- Unsupported browsers show `Tarayıcınız sesli komutu desteklemiyor.`.
- Listening state shows `Dinleniyor…` in the button and localized status text.
- Unknown commands show `Komutu anlayamadık. Örneğin: tesisat ara.`.
- The component aborts recognition on unmount and clears recognition state in
  `onend` / `onerror` to avoid infinite listening loops.
- Browsers without Web Speech API support should keep the rest of the page fully
  usable.

## i18n checklist

- Turkish translation keys are the default source of truth.
- English and Arabic fallback dictionaries contain the same translation keys as
  Turkish for the audited customer flow.
- Main customer flow labels stay Turkish by default: home hero, service cards,
  provider cards, request form, emergency match and voice command UI.
- Emergency metadata labels in admin request pages are Turkish and do not expose
  raw internal column names.
- Voice command labels, status messages, unsupported-browser copy and unknown
  command copy are translated through the existing i18n dictionaries.
- Missing translation keys must not be visible to users.

## Manual test checklist

- [ ] Run `npm run build` and confirm TypeScript/Next build passes.
- [ ] Open the home page on mobile width and confirm no horizontal overflow.
- [ ] Verify the voice button renders compactly as `Sesli Komut`.
- [ ] In a browser without Web Speech API, click voice command and confirm the
      unsupported-browser fallback appears without a crash.
- [ ] In a supported browser, test `tesisat ara`, `elektrik ara`, `temizlik ara`,
      `acil usta çağır`, `profilleri oku`, `sıfırla`, `Kadıköy ustaları` and
      `Sarıyer tesisat`.
- [ ] Submit an emergency request with service, district, offered price and
      payment preference; confirm `confirmation_code`, `pending` status and ETA
      are persisted.
- [ ] Try submitting the same open emergency request again and confirm the
      duplicate is rejected with a friendly message.
- [ ] Confirm provider matching and provider assignment do not crash when no
      eligible provider exists.
- [ ] Confirm admin service request pages show emergency requests and assignment
      actions return friendly status messages.
- [ ] Sweep the visible customer and admin flows for missing translation keys or
      mixed Turkish/English labels.
