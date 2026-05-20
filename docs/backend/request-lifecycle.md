# Request Lifecycle & Admin Moderation Architecture

This document describes the flow of a customer's service request from creation to provider assignment and fulfillment in the Fuwu marketplace.

## Request Status Flow
Service requests (`service_requests` table) progress through the following statuses:
1. `yeni`: Customer creates a new request.
2. `inceleniyor`: Admin reviews the request for validity.
3. `ustaya_yonlendirildi`: Admin successfully matches and assigns the request to an approved provider.
4. `tamamlandi`: Provider successfully finishes the requested work.
5. `iptal`: Admin or Provider cancels the request due to conflicts or unavailability.

## Provider Assignment Architecture
Fuwu utilizes a strict 1-to-1 assignment model securely linking a request to a single verified provider:

### 1. Database Model
A non-destructive migration introduces the `assigned_provider_id` UUID column to the `service_requests` table, acting as a foreign key to the `providers` table.

### 2. Matching Logic (`getMatchedProviders`)
When an Admin opens a request in the dashboard, the backend triggers `getMatchedProviders(requestId)`:
- Queries `providers` where `category_id` matches the request's `category_id`.
- Filters exclusively for `is_active = true` AND `is_approved = true`.
- Sorts the array, heavily prioritizing providers sharing the exact `district_id`.

### 3. Admin Assignment
1. Admin views the request and selects a matched Usta from the dynamically populated `<AssignProviderForm>`.
2. The `assignServiceRequestAction` transitions the DB status to `ustaya_yonlendirildi` and strictly sets `assigned_provider_id`.
3. An `audit_logs` record tracks the admin's exact assignment timestamp and user ID.
4. Admin uses the WhatsApp Lead Generator to notify the provider.

### 4. Provider Dashboard Management
The provider navigates to `/provider-dashboard/requests`.
- `getProviderAssignedRequests(providerId)` fetches only the requests explicitly mapped to `assigned_provider_id`.
- The provider can view the customer's district, category, phone number, and preferred times.
- Once completed, the provider utilizes the `<form>` buttons invoking `providerUpdateRequestStatusAction` to gracefully migrate the status to `tamamlandi` or `iptal`. This action is securely locked by RLS and backend verification rules, rejecting modifications unless the caller's Provider ID exactly matches `assigned_provider_id` and the status is currently `ustaya_yonlendirildi`.

## Security & Reliability Notes
- **Zero Exposed Errors**: End users and providers only see sanitized Turkish fallback strings.
- **Data Protection**: Unassigned providers cannot scrape or see active customer requests. The mapping exclusively exposes customer phone numbers to the singular assigned `providerId`.
- **Stateless Validation**: Backend routines (`updateProviderAssignedRequestStatus`) re-verify `status` boundaries, preventing double-completion or cancellation races.
