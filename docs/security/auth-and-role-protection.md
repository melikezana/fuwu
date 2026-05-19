# Authentication and Role Protection

This document details how the Fuwu marketplace handles identity, role-based access control (RBAC), and route protection safely.

## 1. Role Model
We utilize a custom `profiles` table tightly coupled to Supabase's `auth.users` via a database trigger. The `role` column uses a strictly defined Enum (`user_role`):

- **`customer`**: The default role assigned to any new user. Customers can only view public providers and their own service requests.
- **`provider`**: Professionals whose applications have been manually approved. Providers have access to their dashboard and assigned requests.
- **`admin`**: System administrators. Admins can view and mutate all requests and provider statuses.

## 2. Authentication Helpers (`src/services/auth.ts`)
The `authService` centralizes all session verification.
- `getSession()`: Safely returns the active Supabase session.
- `getProfile()`: Fetches the public profile (including the role) for a given User ID.
- `isAdmin()`, `isProvider()`, `isCustomer()`: Boolean helpers that securely verify the role by chaining `getSession` and `getProfile`.

## 3. Admin Route Protection
Admin routes (`/admin`, `/admin/requests`, `/admin/providers`) are wrapped by `<AdminProtectedRoute>`. 
- On mount, it checks `authService.isAdmin()`.
- If false or unauthenticated, it completely unmounts the admin UI and strictly renders a Turkish "Yetkisiz Erişim" (Access Denied) screen.
- This prevents sensitive actions or data structure exposure, even if the DB RLS policy blocked the data load.

## 4. Provider Dashboard Protection
The `/provider-dashboard` behaves similarly but gracefully degrades. 
- It checks `authService.isProvider()`.
- If false, it renders a friendly placeholder stating: *"Usta paneli için giriş ve profil eşleştirme yakında aktif olacak."* 
- This prevents customers from seeing broken provider interfaces while the full provider auth integration is pending.

## 5. Safe Redirects
All redirects following login or logout (e.g., in `authService.signOut()`) must explicitly use relative paths (e.g., `window.location.href = "/"`) or strictly validated URL parameters. We do not pass open redirect parameters (`?next=https://malicious.com`) to prevent Open Redirect Vulnerabilities.

## 6. Login UX Assumptions
The `/login` route prioritizes passwordless access to reduce friction:
- **Email Magic Link**: The primary flow for customers.
- **Google OAuth**: One-click registration.
- **Phone Login**: Marked as "Yakında" (Coming Soon) until Twilio/Supabase SMS setup is finalized.
