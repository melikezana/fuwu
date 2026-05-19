# Launch Checklist for Fuwu

This checklist ensures all technical and legal dependencies are fulfilled before officially redirecting traffic to the Fuwu application.

## Infrastructure & Environment
- [ ] Connect custom domain in Vercel.
- [ ] Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set properly in Vercel Environment Variables.
- [ ] Make sure no secret keys (`SUPABASE_SERVICE_ROLE_KEY`) are exposed in the Vercel dashboard or in the frontend codebase.

## Database (Supabase)
- [ ] Confirm all tables (`profiles`, `providers`, `requests`) are created.
- [ ] Confirm Row Level Security (RLS) is enabled for all tables.
- [ ] Ensure correct execution of the RLS policies defined in `production-rls-check.md`.
- [ ] Set up at least one root admin user (assign `role = 'admin'` in `profiles`).
- [ ] (Optional) Enable Database Backup automation inside Supabase settings.

## Legal & Compliance
- [ ] Replace placeholder text in `/kvkk`, `/gizlilik`, `/kullanim-sartlari`, and `/cerez-politikasi` with final texts approved by legal counsel.
- [ ] Ensure cookie consent banner (if required by local regulations) is active.

## Analytics & SEO
- [ ] Set up Google Search Console and verify the domain.
- [ ] Set up Google Analytics or Plausible Analytics and insert tracking scripts (respecting KVKK/Cookie policies).
- [ ] Verify `next.config.ts` handles trailing slashes or preferred routing architecture correctly.

## Mobile QA & Stability
- [ ] Test the full request flow (`/request`) on actual physical iOS and Android devices.
- [ ] Test the WhatsApp Lead Generator button on mobile to ensure deep-linking into the WhatsApp app works correctly.
- [ ] Validate that there are no horizontal scroll bars due to overflow.
