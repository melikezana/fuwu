# Live Authentication and Provider Application Repair Report

**Date**: May 31, 2026
**Status**: Repaired and verified locally.

## 1. Provider Applications Schema Mapping
The `provider_applications` table insert payload has been audited and fixed to match the exact live production database columns.

**Allowed & Mapped Columns**:
- `full_name` (Mapped from `fullName`)
- `phone` (Mapped from `phoneNumber`)
- `category_id` (Mapped from `categoryId`)
- `district_id` (Mapped from `districtId`)
- `experience_years` (Mapped from `yearsOfExperience`)
- `availability` (Mapped from `availability`)
- `has_equipment` (Mapped from `hasEquipment`)
- `introduction` (Mapped from `shortIntroduction`)
- `portfolio_url` (Mapped from `referenceLink`)
- `status` (Set to `pending`)
- `profile_image_path` (Optional)
- `profile_image_url` (Optional)

**Removed Non-Existent Columns**:
- `whatsapp`
- `description`

**Changes**: Removed the `whatsapp` and `description` fields from the TypeScript schema (`src/lib/supabase/types.ts`) and the payload construction in `applications.ts`. The backend now throws a proper, real Turkish error if the insert fails instead of showing a fake success.

## 2. Google OAuth Setup Checklist
The Google Login UI is built to unconditionally show the Google button in `/login` as long as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided.

To ensure Google OAuth works in production on Supabase:
1. Go to the Supabase Dashboard -> Authentication -> Providers.
2. Enable **Google**.
3. Enter the `Client ID` and `Client Secret` obtained from the Google Cloud Console.
4. Ensure the callback URL (`https://<project>.supabase.co/auth/v1/callback`) is added to the Authorized redirect URIs in Google Cloud Console.
5. If it fails, the frontend now properly catches the misconfiguration error and returns a friendly Turkish message: "Google girişi şu anda açılamıyor. Lütfen tekrar dene."

## 3. RLS Policy Checklist
If public inserts are still failing despite payload corrections, ensure the live database uses the RLS policies created in the previous task (`0003_live_backend_repair.sql`):
- `provider_applications` must have a `FOR INSERT WITH CHECK (true)` policy.
- `service_requests` must have a `FOR INSERT WITH CHECK (true)` policy.
- `service_requests.user_id` must have the `NOT NULL` constraint dropped (`ALTER TABLE public.service_requests ALTER COLUMN user_id DROP NOT NULL;`).

## 4. Manual Test Checklist
- [ ] Submit a new **Provider Application** on the live site. Verify it inserts successfully and no longer triggers a 500 error due to unknown columns.
- [ ] Go to `/login` and click **Google ile devam et**. Verify it redirects to the Google account selection screen.
- [ ] Complete the Google login flow and verify it returns to `/auth/callback` and correctly redirects to `/providers` (or the intended page).
- [ ] Submit a **Service Request** (normal or emergency). Verify it inserts successfully.
