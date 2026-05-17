# Fuwu Backend Architecture Plan

This document is a planning guide for the future Fuwu backend. It does not implement the database, connect Supabase, add real credentials, or change the current frontend.

Planned stack:

- Supabase
- PostgreSQL
- Supabase Auth
- Next.js App Router

## Goals

- Let customers browse providers without an account.
- Require customers to log in before creating a service request.
- Let providers apply and later manage provider profiles.
- Let admins approve provider profiles in a future admin workflow.
- Keep the current website structure, pages, links, buttons, styling, and mock data working while backend integration is added gradually.

## User Roles

### `customer`

Customers are people looking for services.

Customers can:

- Browse public provider listings without logging in.
- View public provider details.
- Log in with Supabase Auth.
- Create service requests after logging in.
- View and manage their own service requests after backend logic is added.
- Leave reviews for completed services later.

### `provider`

Providers are people or businesses offering services.

Providers can:

- Submit a provider application.
- Create or receive a provider profile after approval.
- Maintain public provider information such as display name, bio, service categories, district, and availability.
- View relevant service requests later, depending on the matching and permissions model.
- Receive reviews for completed work later.

### `admin`

Admins manage platform quality and operational data.

Admins can eventually:

- Review provider applications.
- Approve or reject provider profiles.
- Manage service categories and districts.
- Moderate reviews.
- View operational dashboards and internal status fields.

Admin tools are planned for later and should not be exposed through public UI until permissions and Row Level Security are designed.

## Main Database Tables

All tables should use PostgreSQL in Supabase. The final schema should prefer `uuid` primary keys, `created_at`, `updated_at`, clear foreign keys, and status fields with constrained values.

### `profiles`

Purpose:

Stores app-level user profile data connected to Supabase Auth. Supabase Auth owns login credentials in `auth.users`; `profiles` stores Fuwu-specific account information.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key. Should match `auth.users.id`. |
| `full_name` | User display name. |
| `email` | User email for account display and admin context. |
| `phone` | Optional contact number. |
| `role` | One of `customer`, `provider`, or `admin`. |
| `avatar_url` | Optional profile image URL. |
| `is_active` | Allows soft disabling an account. |
| `created_at` | Record creation timestamp. |
| `updated_at` | Last profile update timestamp. |

Notes:

- Do not store passwords in this table.
- The source of truth for authentication is Supabase Auth.
- Later RLS should allow users to read and update their own profile, with broader access for admins.

### `service_categories`

Purpose:

Stores the services Fuwu supports, such as cleaning, repairs, moving help, tutoring, or beauty services.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key. |
| `name` | Category name shown in the UI. |
| `slug` | Stable URL-friendly identifier. |
| `description` | Short category explanation. |
| `icon_name` | Optional frontend icon key. |
| `is_active` | Controls whether the category is selectable. |
| `sort_order` | Optional ordering for category lists. |
| `created_at` | Record creation timestamp. |
| `updated_at` | Last category update timestamp. |

Notes:

- Public users may read active categories.
- Admins should manage categories later.
- If providers can offer multiple services, use a future join table such as `provider_service_categories`.

### `providers`

Purpose:

Stores approved provider profiles shown to customers in public browsing pages.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key. |
| `profile_id` | References `profiles.id` for the user who owns this provider profile. |
| `display_name` | Public provider or business name. |
| `bio` | Public provider introduction. |
| `category_id` | Optional primary service category reference. |
| `district_id` | Optional main district reference. |
| `service_area` | Human-readable coverage area. |
| `is_approved` | Whether admin approval has been granted. |
| `is_available` | Whether the provider is currently accepting work. |
| `rating_average` | Cached average review rating for display. |
| `rating_count` | Cached number of reviews for display. |
| `created_at` | Record creation timestamp. |
| `updated_at` | Last provider update timestamp. |

Notes:

- Public browsing should only show approved and active provider profiles.
- Admin approval should be required before a provider appears publicly.
- Ratings should be derived from `reviews`; cached rating fields are only display optimizations.

### `provider_applications`

Purpose:

Stores applications from people who want to become providers. This keeps application review separate from public provider profiles.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key. |
| `profile_id` | References `profiles.id` when the applicant is logged in. |
| `full_name` | Applicant name, useful if public applications are allowed first. |
| `email` | Applicant contact email, useful if public applications are allowed first. |
| `phone` | Optional applicant contact number. |
| `requested_display_name` | Desired provider profile name. |
| `category_id` | Requested primary service category. |
| `district_id` | Requested main service district. |
| `experience_summary` | Applicant experience details. |
| `status` | Canonical values: `pending`, `approved`, `rejected`. |
| `reviewed_by_profile_id` | Admin profile that reviewed the application. |
| `review_notes` | Internal admin notes. |
| `submitted_at` | Submission timestamp. |
| `reviewed_at` | Review timestamp. |
| `created_at` | Record creation timestamp. |
| `updated_at` | Last application update timestamp. |

Notes:

- The first version may allow public applications without login, or login can be required later.
- If public applications are allowed, store only the minimum contact information needed.
- Internal review notes should never be public.
- Approval should create or activate a related `providers` record later.

### `service_requests`

Purpose:

Stores customer requests for service work. Customers must be logged in before creating a request.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key. |
| `customer_profile_id` | References `profiles.id` for the logged-in customer. |
| `category_id` | References `service_categories.id`. |
| `district_id` | References `districts.id`. |
| `title` | Short request summary. |
| `description` | Details of the work needed. |
| `address_text` | Human-readable location details. |
| `preferred_date` | Optional requested date. |
| `preferred_time_window` | Optional time preference. |
| `budget_min` | Optional minimum budget. |
| `budget_max` | Optional maximum budget. |
| `status` | Canonical values: `yeni`, `inceleniyor`, `ustaya_yonlendirildi`, `tamamlandi`, `iptal`. |
| `assigned_provider_id` | Optional reference to the selected provider. |
| `created_at` | Record creation timestamp. |
| `updated_at` | Last request update timestamp. |

Notes:

- Request creation requires Supabase Auth.
- Customers should manage only their own requests.
- Providers should only access relevant new, routed, or assigned requests after RLS policies are defined.

### `districts`

Purpose:

Stores supported service areas so provider browsing and service requests can use consistent district data.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key. |
| `name` | District name shown in the UI. |
| `slug` | Stable URL-friendly identifier. |
| `city` | City or municipality name. |
| `is_active` | Controls whether the district is selectable. |
| `sort_order` | Optional ordering for district lists. |
| `created_at` | Record creation timestamp. |
| `updated_at` | Last district update timestamp. |

Notes:

- Public users may read active districts.
- Service requests and providers can reference districts for filtering and matching.
- Admins should manage supported districts later.

### `reviews`

Purpose:

Stores customer reviews for completed services and provider profiles.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key. |
| `service_request_id` | References the completed service request. |
| `provider_id` | References the reviewed provider. |
| `customer_profile_id` | References the customer who wrote the review. |
| `rating` | Numeric score, usually 1 to 5. |
| `comment` | Optional written review. |
| `is_public` | Controls whether the review appears publicly. |
| `moderation_status` | Example values: `visible`, `hidden`, `flagged`, `removed`. |
| `created_at` | Record creation timestamp. |
| `updated_at` | Last review update timestamp. |

Notes:

- Customers should only review completed requests they participated in.
- Public provider pages should show only approved public reviews.
- Admins may moderate reviews later.

## Auth Rules

- Browsing providers does not require login. Public provider listing and provider detail pages should read approved provider data.
- Creating a service request requires login. Unauthenticated users should be sent to the login flow before request creation.
- Provider application can start as public or require login later. If public, only collect minimum contact fields and protect submission endpoints against spam. If login-gated, connect the application to `profiles.id`.
- Admin approval will be added later. Until the admin workflow exists, provider approval should be planned in the schema but not exposed through public controls.
- Supabase Auth should handle sign-up, login, session management, password recovery, and identity provider logic.

## Data Flow

### User browses providers

1. Visitor opens the provider listing page.
2. Next.js App Router renders the existing page structure.
3. The frontend reads fallback mock data until Supabase is connected.
4. Later, the page can read approved provider records from `providers`, joined with `service_categories`, `districts`, and public `reviews`.
5. No login is required for this browsing flow.

### User logs in

1. Customer chooses a login action.
2. Supabase Auth manages the login or sign-up session.
3. Fuwu creates or loads the matching `profiles` record.
4. The user role determines which future actions are available.

### User creates request

1. Customer opens the request page.
2. If there is no Supabase session, the user is sent to login.
3. After login, the request form submits service details.
4. Backend logic creates a `service_requests` record tied to `customer_profile_id`.
5. The request starts with the safe initial status `yeni`.

### Provider applies

1. Applicant opens the provider application page.
2. The application form collects provider onboarding details.
3. Depending on the chosen rule, the submission is public or tied to a logged-in `profiles` record.
4. Backend logic creates a `provider_applications` record with `status = pending`.
5. The applicant waits for admin review.

### Admin approves provider

1. Admin opens a future protected admin area.
2. Admin reviews pending `provider_applications`.
3. Admin approves or rejects the application.
4. Approval creates or updates a `providers` record and marks it as approved.
5. Approved providers become available for public browsing if `is_available` is true.

## Security Notes

- Do not commit real Supabase keys, service role keys, project URLs, tokens, or passwords.
- Use `.env.local` for local real credentials.
- Keep `.env.example` limited to placeholders such as:

```env
NEXT_PUBLIC_SUPABASE_URL=replace-with-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
```

- Never expose Supabase service role keys to browser code.
- Supabase Row Level Security will be required before real user data is stored.
- No passwords should be stored manually in PostgreSQL tables. Supabase Auth owns credential handling.
- Public queries should return only public provider data and should not expose private contact fields, internal notes, or admin-only status details.
- Admin-only writes should be protected by both server-side checks and RLS policies.

## Frontend Compatibility Plan

Backend integration should preserve the current website behavior while replacing mock data gradually.

- Keep fallback mock data available while Supabase is not configured.
- Do not redesign the UI during backend setup.
- Do not remove existing pages, components, links, buttons, or styling.
- Keep current routes working, including provider browsing, provider details, login, request creation, and provider application pages.
- Add Supabase reads and writes behind existing component boundaries where possible.
- If environment variables are missing, the app should continue using safe mock data instead of crashing public pages.
- Backend work should be introduced in small steps so `npm run build` continues to pass after each task.

## Implementation Boundaries For This Task

This task is documentation only.

- No database migration is added.
- No Supabase project is connected.
- No real Supabase keys are added.
- No UI redesign is performed.
- No existing frontend page or component is removed.
- Existing frontend structure remains intact.
