# Marketplace Engine Foundation

This document outlines the architecture and lifecycle flows of the Fuwu Marketplace backend.

## 1. Backend Operation Flow
The application follows a strictly defined layered architecture:
- **UI Components:** `src/components/*`
- **Pages:** `src/app/*`
- **Business Logic & External API Calls:** `src/services/*`
- **Shared Utilities (like i18n, Supabase Client):** `src/lib/*`

## 2. Role System Plan
We have a unified `profiles` table that extends the Supabase auth users.
Roles include:
- `customer`: Can create service requests.
- `provider`: Can accept requests, manage availability, view their dashboard.
- `admin`: Can approve/reject provider applications, oversee all requests.

## 3. Provider Lifecycle
1. **Application:** Provider submits a form (`status: pending`).
2. **Review:** Admin reviews the application via Admin Dashboard.
3. **Approval:** Admin updates status to `approved`. Provider becomes visible in public search.
4. **Availability:** Providers can update their status to `müsait` (available), `yoğun` (busy), or `çevrimdışı` (offline).

## 4. Request Lifecycle
1. **yeni:** Customer creates a request.
2. **inceleniyor:** Admin or automated system reviews the request.
3. **ustaya_yonlendirildi:** Request is assigned/forwarded to an appropriate provider.
4. **tamamlandi:** Service is completed.
5. **iptal:** Request is cancelled by either party.

## 5. Security Checklist
- [x] All Supabase client operations use RLS policies on the database level.
- [x] Service Role key (`SUPABASE_SERVICE_ROLE_KEY`) is **NEVER** exposed in the frontend.
- [x] Environment variables using `NEXT_PUBLIC_` are limited only to the Anon Key and URL.
- [x] UI handles errors gracefully without exposing raw database exceptions to the end user.
- [x] User input (e.g., search, text fields) is validated before submission in `src/services/*`.

## 6. Mobile UX Plan
- **Navbar:** The navigation bar collapses into a compact hamburger menu on mobile devices to prevent overlapping important content.
- **Provider Cards:** The layout uses flexbox to ensure no horizontal scrolling and adequate tap targets (44px minimum height for buttons).
- **Voice Commands:** Implemented using Web Speech API with a fallback for unsupported browsers. It provides a visual indicator when listening.
