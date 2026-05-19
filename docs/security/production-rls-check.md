# Row Level Security (RLS) - Production Checks

This document outlines the required Row Level Security policies to be implemented directly in the Supabase Dashboard before launch. Since the frontend only holds the `NEXT_PUBLIC_SUPABASE_ANON_KEY`, these database-level constraints are our primary line of defense.

## 1. Profiles Table (`profiles`)
- **Enable RLS**: Yes.
- **Read Access**: Authenticated users can read their own profile (`auth.uid() = id`). Admin users (role = 'admin') can read all profiles.
- **Insert**: Users can insert their own profile upon signup.
- **Update**: Users can update only their own profile. Admins can update any profile.

## 2. Providers Table (`providers`)
- **Enable RLS**: Yes.
- **Read Access (Public)**: ANYONE (anon or authenticated) can read providers WHERE `status = 'approved'`.
- **Read Access (Admin)**: Admins can read ALL providers, including `pending` and `rejected`.
- **Read Access (Self)**: Providers can read their own row regardless of status (`user_id = auth.uid()`).
- **Insert (Public/Authenticated)**: ANYONE can insert (apply to be a provider). The `status` field should default to `pending` on the DB level to prevent spoofing.
- **Update (Self)**: Providers can update ONLY their `availability`, `price_range`, and `description`.
- **Update (Admin)**: Admins can update ALL fields (e.g. approving status).

## 3. Service Requests Table (`requests`)
- **Enable RLS**: Yes.
- **Read Access (Admin)**: Admins can read ALL requests.
- **Read Access (Customer)**: Authenticated customers can read their own requests (`customer_id = auth.uid()`).
- **Read Access (Assigned Provider)**: Providers can read requests where `assigned_provider_id = auth.uid()`.
- **Insert (Public/Authenticated)**: ANYONE can insert a request.
- **Update (Admin)**: Admins can update ALL fields.
- **Update (Provider/Customer)**: Neither can directly mutate the request after submission (except possibly for cancellation by the customer, where `status = 'iptal'`).

## 4. Required Database Triggers
- **New User Trigger**: Automatically create a `profile` row when a new user signs up in `auth.users`.

## Important Security Reminders
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the Next.js frontend.
- Do not trust client-side data for setting roles. Admin status must be strictly enforced via `profiles.role` validated server-side.
- Ensure all Supabase tables enforce constraints, e.g. `phone` lengths and not-null constraints for names.
