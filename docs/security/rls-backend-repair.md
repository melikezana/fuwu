# RLS Backend Repair Requirements

This document outlines the required Row Level Security (RLS) policies for the Supabase backend to ensure the provider marketplace functions securely.

## `provider_applications`

- **Insert**: `public` (anon) must be able to insert rows so that users can submit provider applications without being logged in.
- **Select**: Only `authenticated` users with `role = 'admin'` can read the applications.
- **Update**: Only `authenticated` users with `role = 'admin'` can update the `status`.

## `service_requests`

- **Insert**: `public` or `authenticated` users can insert based on desired flow. Currently, users do not need to be authenticated to request a service.
- **Select**: `public` cannot read all rows. Only the user who created it (via matching ID/session) or an `admin` can read it.
- **Update**: Only `admin` or assigned `provider` can update status.

## `providers`

- **Insert**: Only `admin` can insert (when approving a provider application).
- **Select**: `public` can read ONLY where `is_active = true` AND `is_approved = true`.
- **Select**: `admin` can read all rows (including inactive/unapproved).
- **Update**: Only `admin` or the provider owner (via `user_id`) can update details.

## `profiles`

- **Insert**: Trigger-based (on `auth.users` insert).
- **Select**: Public can read limited profiles (e.g., provider names), but `admin` can read all.
- **Update**: User can update their own profile; `admin` can update any.
