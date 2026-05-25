# Backend Manual Test Checklist

Use this checklist during staging releases or massive architectural updates to guarantee the Fuwu backend operates robustly in production.

## 1. Auth Flow Tests
- [ ] **Login View**: Navigate to `/login` and ensure the guest prompt exists.
- [ ] **Email Magic Link**: Submit a valid email address and verify the Turkish toast success message appears. No PostgreSQL exceptions should leak.
- [ ] **Google OAuth (Optional)**: Click "Google ile Giriş Yap" and confirm the redirect targets your environment's Supabase instance correctly.

## 2. Provider Lifecycle Tests
- [ ] **Application Submission**: Fill out `/provider-application` using mock details. Confirm submission yields the "Başvurun alındı" Turkish success message.
- [ ] **Duplicate Application**: Submit the exact same application twice. Ensure no fatal 500 error surfaces and the system handles the constraint locally.
- [ ] **Admin Approve**: Open `/admin/provider-applications` and hit Approve on the mock application. Verify the row maps seamlessly to `providers` without throwing "missing column" exceptions.
- [ ] **Public Visibility**: Open the homepage (`/`) and verify the newly approved mock application appears in the active provider list instantly (RLS verification).

## 3. Service Request Tests
- [ ] **Request Submit**: As an authenticated or unauthenticated user (if RLS allows), fill out `/request`. Ensure you see "Talebin alındı. Fuwu ekibi uygun ustaları yönlendirecek."
- [ ] **Admin Status Update**: Inside `/admin/service-requests`, dynamically flip the status from `yeni` to `inceleniyor`. Refresh the page to confirm the database persisted the mutation.
- [ ] **Provider Assignment (Optional)**: Check if `assigned_provider_id` gracefully resolves to a Provider name if attached manually in the database.

## 4. Mobile Smoke Tests
- [ ] Open the application on a `< 500px` viewport. Verify horizontal scrolling does not overflow on provider cards.
- [ ] Test the filter expansion.
- [ ] Verify tap targets on CTA buttons ("WhatsApp", "Telefon", "Talep Oluştur") are easily accessible without zoom.

## 5. System Health Tests
- [ ] Access the backend health layer in the dev environment (or log outputs via `/api/health` if implemented). Confirm all checks read `true`.
