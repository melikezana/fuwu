# Backend Release Checklist

Before actively onboarding real providers and customers to Fuwu, execute the following audit flow in the production environment.

## 1. Environment Variables Configuration
- [ ] **Vercel Env Vars**: Ensure the following variables are strictly populated:
  - `NEXT_PUBLIC_SUPABASE_URL` (Must point to production Supabase project)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production anon key only, absolutely NEVER the Service Role Key)

## 2. Supabase Auth Configuration
- [ ] **Site URL**: Navigate to Authentication -> URL Configuration. Set `Site URL` to your live domain (e.g., `https://fuwu.com`).
- [ ] **Redirect URLs**: Add `https://fuwu.com/auth/callback` to the exact redirect list to ensure OAuth and Magic Links route securely.
- [ ] **Email Templates**: Ensure Magic Link templates append `?next=/provider-dashboard` correctly if required.
- [ ] **Google OAuth**: Navigate to Authentication -> Providers -> Google. Enable it and paste the valid Client ID and Secret from the GCP Console.

## 3. Database RLS Policies Verification
- [ ] **Providers Table**: Run `SELECT * FROM providers` as an unauthenticated user. You must only see rows where `is_active = true` AND `is_approved = true`.
- [ ] **Applications Table**: Verify that unauthenticated or authenticated users can INSERT but CANNOT SELECT existing applications. Only Admins can SELECT.
- [ ] **Audit Logs**: Verify that normal users cannot write to `audit_logs` directly through the client API.

## 4. End-to-End Application Integrity
- [ ] **Provider Submit Test**: Open `/provider-application` in incognito mode. Submit dummy data. It must yield a green success state without leaking SQL codes.
- [ ] **Admin Approval Test**: Log into the admin portal. Approve the dummy application. Verify the application becomes `approved` and exactly one row is generated in `providers`. Duplicate clicking should fail gracefully.
- [ ] **Customer Request Test**: Open `/request`. Submit a test request. Confirm `status` natively drops as `yeni` inside `service_requests`.
- [ ] **Provider Visibility Test**: Open `/providers`. Verify that the dummy approved provider appears accurately without overflow on mobile views.

## 5. Rollback Plan
If critical transaction failures occur:
- Immediately pause Vercel deployments.
- Lock Supabase Database using temporary RLS rules to reject all INSERT operations until the schema mismatch is resolved.
