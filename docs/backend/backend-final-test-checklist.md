# Backend Final Test Checklist

Use this checklist to perform a definitive end-to-end smoke test of the Fuwu Backend in production.

## 1. Authentication Check
- [ ] **Email Magic Link Test**: Go to `/login`, enter an email, and hit Submit. Ensure no generic Postgres errors are thrown. You should receive an email with an auth callback link.
- [ ] **Google OAuth Test**: Click the Google login button. It must redirect you to Google's authentication page and safely back to `/auth/callback`, establishing a session.
- [ ] **Session Helpers**: Verify that the navbar updates to show "Hesabım" (Account) instead of "Giriş Yap" once logged in.

## 2. Provider Lifecycle Check
- [ ] **Provider Application Submit Test**: Go to `/provider-application`. Fill out the form. The UI should display the Turkish success prompt without raw errors.
- [ ] **Admin Application Approval Test**: Log in with an admin account, navigate to `/admin/provider-applications`. Approve an application. Ensure `is_active` and `is_approved` are correctly passed to the `providers` table and no duplicate row constraints fail.
- [ ] **Real Provider Visibility Test**: Go to `/providers` or the homepage (`/`). Ensure the newly approved provider (e.g. Erdem Isı Mühendislik) appears accurately mapped to its category and district.

## 3. Service Request Check
- [ ] **Request Submit Test**: Navigate to `/request` and fill in a dummy job requirement. The submission should resolve with "Talebin alındı. Fuwu ekibi uygun ustaları yönlendirecek."
- [ ] **Admin Status Update Test**: Navigate to `/admin/service-requests`. Change the request status from `yeni` (pending) to `inceleniyor` (reviewing). Verify the status immediately updates in the list.
- [ ] **Provider Assignment (Optional)**: If testing assignment, trigger the assignment action. The system will use `assigned_provider_id` natively and correctly link the provider.

## 4. Security & Environment Checks
- [ ] **Vercel Env Checklist**:
  - `NEXT_PUBLIC_SUPABASE_URL` is set to the live project.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set to the live anon key.
  - No `SERVICE_ROLE_KEY` is leaked on the client.
- [ ] **Supabase URL Redirect Checklist**: Ensure `Site URL` and `Redirect URLs` in the Supabase Auth dashboard include your production domain (e.g., `https://fuwu.com/auth/callback`).
- [ ] **RLS Checklist**: Run the `checkBackendHealth()` function or verify that unauthenticated users cannot insert directly into the `providers` table.
