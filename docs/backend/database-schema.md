# Fuwu Supabase Database Schema Plan

This document describes the planned Supabase database schema for Fuwu. It is intentionally beginner-friendly and focused on planning only.

No database connection is implemented here, and no real Supabase keys should be added to this file or committed to the project.

## Goals

- Keep the first schema simple enough to build and test.
- Use clear relationships between users, service requests, providers, and applications.
- Plan for production concerns like permissions, data validation, status tracking, and future growth.
- Keep sensitive configuration in environment variables, never in documentation or source code.

## General Supabase Notes

Supabase uses PostgreSQL, so these tables should be designed with strong types, foreign keys, indexes, and Row Level Security policies.

Recommended production-minded defaults:

- Use `uuid` primary keys.
- Add `created_at` and `updated_at` timestamps to important records.
- Use foreign keys for relationships instead of storing loose text references.
- Use status fields with a small set of allowed values.
- Enable Row Level Security before storing real user data.
- Add indexes for fields used often in filters, joins, and dashboards.

## Planned Tables

### `users`

#### Purpose

Stores public application profile information for people using Fuwu.

In Supabase, authentication accounts are usually managed by `auth.users`. This table should act as the app-level profile table that connects to Supabase Auth without duplicating passwords or login credentials.

#### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. Ideally matches the related `auth.users.id`. |
| `full_name` | `text` | Yes | Display name for the user. |
| `email` | `text` | Yes | User email. Should match auth email when possible. |
| `phone` | `text` | No | Optional contact number. |
| `avatar_url` | `text` | No | Optional profile image URL. |
| `role` | `text` | Yes | Example values: `customer`, `provider`, `admin`. |
| `is_active` | `boolean` | Yes | Allows soft disabling an account without deleting data. |
| `created_at` | `timestamptz` | Yes | Defaults to current timestamp. |
| `updated_at` | `timestamptz` | Yes | Updated when profile data changes. |

#### Relationships

- One `users` record can create many `service_requests`.
- One `users` record can have one `providers` profile if they become a provider.
- One `users` record can submit many `provider_applications`.
- `users.id` should reference `auth.users.id` when Supabase Auth is added.

#### Future Notes

- Add Row Level Security so users can read and update only their own profile, except admins.
- Consider separating private profile fields from public profile fields later.
- Validate `role` with a check constraint or PostgreSQL enum.
- Add a unique constraint on `email`.
- Do not store passwords, tokens, or Supabase keys in this table.

### `service_categories`

#### Purpose

Stores the list of service types available in Fuwu, such as cleaning, tutoring, repairs, moving help, pet care, or other local services.

This table helps keep service requests organized and searchable.

#### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `name` | `text` | Yes | Category name shown in the app. |
| `slug` | `text` | Yes | URL-friendly unique identifier, such as `home-cleaning`. |
| `description` | `text` | No | Short explanation of the category. |
| `icon_name` | `text` | No | Optional icon identifier used by the frontend. |
| `is_active` | `boolean` | Yes | Controls whether users can choose this category. |
| `sort_order` | `integer` | No | Optional display order. |
| `created_at` | `timestamptz` | Yes | Defaults to current timestamp. |
| `updated_at` | `timestamptz` | Yes | Updated when category data changes. |

#### Relationships

- One `service_categories` record can be used by many `service_requests`.
- One `service_categories` record can be linked to many `providers` in the future if providers support multiple categories.

#### Future Notes

- Add a unique constraint on `slug`.
- Consider parent and child categories if the service list grows.
- Admins should manage categories; regular users should usually only read active categories.
- If providers can offer multiple service types, add a future join table like `provider_service_categories`.

### `service_requests`

#### Purpose

Stores requests created by customers who need a service.

This is one of the central workflow tables in Fuwu. It should capture what the customer needs, where it is needed, when it is needed, and the current request status.

#### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `customer_id` | `uuid` | Yes | References `users.id`. |
| `category_id` | `uuid` | Yes | References `service_categories.id`. |
| `title` | `text` | Yes | Short summary of the request. |
| `description` | `text` | Yes | Detailed explanation of the work needed. |
| `location_text` | `text` | Yes | Human-readable service location. |
| `latitude` | `numeric` | No | Optional coordinate for map or distance features. |
| `longitude` | `numeric` | No | Optional coordinate for map or distance features. |
| `preferred_date` | `date` | No | Requested service date. |
| `preferred_time_window` | `text` | No | Example: `morning`, `afternoon`, `evening`, or custom text. |
| `budget_min` | `numeric` | No | Optional minimum budget. |
| `budget_max` | `numeric` | No | Optional maximum budget. |
| `status` | `text` | Yes | Example values: `draft`, `open`, `matched`, `in_progress`, `completed`, `cancelled`. |
| `assigned_provider_id` | `uuid` | No | References `providers.id` once a provider is selected. |
| `created_at` | `timestamptz` | Yes | Defaults to current timestamp. |
| `updated_at` | `timestamptz` | Yes | Updated when request data changes. |

#### Relationships

- Many `service_requests` belong to one `users` record through `customer_id`.
- Many `service_requests` belong to one `service_categories` record through `category_id`.
- A `service_requests` record can optionally be assigned to one `providers` record.

#### Future Notes

- Add Row Level Security so customers can manage their own requests.
- Providers should only see requests that are open, relevant, or assigned to them.
- Validate `status` with a check constraint or PostgreSQL enum.
- Add indexes on `customer_id`, `category_id`, `status`, and `assigned_provider_id`.
- Consider a separate offers or bids table if multiple providers can respond to one request.
- Consider a messages table later for customer-provider communication.

### `providers`

#### Purpose

Stores approved provider profiles.

A provider is a user who has been approved to offer services through Fuwu. This table should store business-facing details, verification state, availability, and public provider profile information.

#### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `user_id` | `uuid` | Yes | References `users.id`. |
| `display_name` | `text` | Yes | Public provider name. Could be a person or business name. |
| `bio` | `text` | No | Short provider introduction. |
| `service_area` | `text` | No | Human-readable area covered by the provider. |
| `base_location_text` | `text` | No | Provider's general operating location. |
| `is_verified` | `boolean` | Yes | Whether Fuwu has verified the provider. |
| `is_available` | `boolean` | Yes | Whether the provider is currently accepting requests. |
| `rating_average` | `numeric` | No | Cached rating average for display. |
| `rating_count` | `integer` | Yes | Number of ratings received. Defaults to `0`. |
| `created_at` | `timestamptz` | Yes | Defaults to current timestamp. |
| `updated_at` | `timestamptz` | Yes | Updated when provider data changes. |

#### Relationships

- One `providers` record belongs to one `users` record.
- One `providers` record can be assigned to many `service_requests`.
- One `providers` record may be created after a `provider_applications` record is approved.

#### Future Notes

- Add a unique constraint on `user_id` so one user has only one provider profile.
- Keep verification and approval changes restricted to admins.
- Consider adding a future `provider_service_categories` join table.
- Consider adding reviews, portfolio images, certifications, and availability schedules later.
- Do not rely only on cached rating fields for source-of-truth review data; add a reviews table later.

### `provider_applications`

#### Purpose

Stores applications from users who want to become providers.

This table keeps provider approval separate from provider profiles, which makes the onboarding and review process easier to manage.

#### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | Yes | Primary key. |
| `user_id` | `uuid` | Yes | References `users.id`. |
| `requested_display_name` | `text` | Yes | Name the applicant wants to use as a provider. |
| `experience_summary` | `text` | Yes | Applicant's description of their experience. |
| `service_area` | `text` | No | Area where the applicant wants to provide services. |
| `phone` | `text` | No | Optional contact number for application review. |
| `status` | `text` | Yes | Example values: `pending`, `in_review`, `approved`, `rejected`, `withdrawn`. |
| `reviewed_by_user_id` | `uuid` | No | References `users.id` for the admin who reviewed it. |
| `review_notes` | `text` | No | Internal notes from the review process. |
| `submitted_at` | `timestamptz` | Yes | Defaults to current timestamp. |
| `reviewed_at` | `timestamptz` | No | Set when an admin reviews the application. |
| `created_at` | `timestamptz` | Yes | Defaults to current timestamp. |
| `updated_at` | `timestamptz` | Yes | Updated when application data changes. |

#### Relationships

- Many `provider_applications` records can belong to one `users` record.
- `reviewed_by_user_id` references the admin user who reviewed the application.
- An approved `provider_applications` record can lead to one new `providers` record.

#### Future Notes

- Add Row Level Security so users can see their own applications and admins can review all applications.
- Validate `status` with a check constraint or PostgreSQL enum.
- Consider allowing only one active pending application per user.
- Store uploaded documents in Supabase Storage later, then reference those files from this table or a related documents table.
- Keep internal `review_notes` hidden from non-admin users.

## Relationship Summary

```text
auth.users
  -> users

users
  -> service_requests.customer_id
  -> providers.user_id
  -> provider_applications.user_id
  -> provider_applications.reviewed_by_user_id

service_categories
  -> service_requests.category_id

providers
  -> service_requests.assigned_provider_id
```

## Suggested Implementation Order

1. Create `users` profiles connected to Supabase Auth.
2. Create `service_categories` so requests can be organized.
3. Create `service_requests` for customer demand.
4. Create `provider_applications` for onboarding providers.
5. Create `providers` after the approval flow is clear.

## Security Planning

Before production, plan these policies carefully:

- Users can read and update their own profile.
- Users can create and manage their own service requests.
- Providers can read requests that are public, relevant, or assigned to them.
- Provider applicants can create and view their own applications.
- Admins can manage service categories, provider applications, and provider verification.
- Public users should not be able to read private contact details or internal review notes.

## Environment Planning

When Supabase is implemented later:

- Store Supabase URL and anon key in local environment files.
- Never commit real Supabase service role keys.
- Use `.env.example` only for placeholder variable names.
- Keep server-only keys out of browser-exposed code.

Example placeholders only:

```env
NEXT_PUBLIC_SUPABASE_URL=replace-with-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
```

Do not fill these placeholders with real credentials in documentation.
