# Strong Backend Architecture Guide

## Service Standardization
All backend services (`src/services/*`) adhere to the standard response pattern `ServiceResponse<T>` defined in `src/services/serviceResponse.ts`:
```ts
{ data: T | null; error: string | null }
```
- **Error Handling**: Raw Supabase errors are NEVER exposed to the frontend. Errors are intercepted by `handleServiceError` in `src/lib/errors.ts` and obfuscated using Turkish-friendly messaging.
- **Safety**: `console.warn` outputs detailed logs locally during development, while omitting payloads during production execution.

## Provider Lifecycle Hardening
1. **Application Submission**: Incoming schemas drop non-existent properties (e.g. `owner_name`, `availability`).
2. **Pending State**: Rows in `provider_applications` assume a `status: 'pending'` state and are completely walled off from the public.
3. **Approval Mechanism**: Admin approvals trigger a transactional insert into the `providers` table and concurrently switch the application status to `approved`.
4. **Duplicate Prevention**: Re-approving an already approved application will yield an `application-already-approved` conflict response rather than throwing a PostgreSQL constraint violation.

## Request Lifecycle Hardening
1. **Creation**: Customers submit requests natively to `service_requests`.
2. **Review**: `yeni` -> `inceleniyor` -> `ustaya_yonlendirildi`.
3. **Assignment Handling**: The `assigned_provider_id` schema remains optionally implemented. If provided, the UI logs an audit trail mapping the customer to the provider without forcing breaking schema references.

## Auth Session Reliability
- **Client Side**: Uses `getCurrentUser` and `getCurrentSession` via `@supabase/ssr` bridging directly to standard Next.js layouts.
- **Protection**: Guest users are permitted to read `providers` but cannot access `/admin` or `/provider-dashboard` scopes natively guarded by server-side hooks `hasAdminRole`.

## RLS Security Model
Supabase database access is bounded by strict Row-Level-Security (RLS):
- **Public**: Bound solely to `SELECT` on `is_active=true` and `is_approved=true` rows in `providers`.
- **Inserts**: Guarded by active authentication checks on applications and requests.
- **Admin**: Guarded by cross-referencing row data in `public.profiles`.

## Audit Logs Foundation
An `audit_logs` SQL migration supports optional, non-breaking write events securely mapping actor ids and entity metadata for provider approval and assignment tracking.

## Future Scaling
- Move all complex transaction logic into Postgres Stored Procedures to eliminate race conditions completely.
- Add Redis for distributed rate-limiting on unauthenticated inserts.
